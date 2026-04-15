# scraper/base_scraper.py
"""
Clase base abstracta para todos los scrapers del microservicio SIEC.

Aplica playwright-stealth para evitar detección de bots y CAPTCHAs.
Define la interfaz común (scrape) y gestión del ciclo de vida del browser.
"""

import logging
import re
from abc import ABC, abstractmethod
from typing import Optional

from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page, TimeoutError as PWTimeout

try:
    from playwright_stealth import stealth_sync
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "[BaseScraper] playwright-stealth no disponible — "
        "instalando desde requirements.txt debería resolverlo."
    )

from models import ResultadoScraping, KEYWORD_INSUMO_MAP

logger = logging.getLogger(__name__)

# Timeout estándar por producto (criterio de validación: 30 segundos)
PRODUCT_TIMEOUT_MS = 30_000

# User-Agent real de Chrome para reducir detección
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class BaseScraper(ABC):
    """
    Clase base para scrapers de tiendas de construcción.

    Subclases deben implementar:
        - store_key: str  (ej. 'sodimac')
        - product_urls: list[str]
        - _scrape_product(page, url) -> ResultadoScraping
    """

    store_key: str = ""

    def __init__(self):
        self.logger = logging.getLogger(f"scraper.{self.__class__.__name__}")

    # ──────────────────────────────────────────────────────────────────────────
    # Interfaz pública
    # ──────────────────────────────────────────────────────────────────────────

    def scrape(self) -> list[dict]:
        """
        Ejecuta el scraping completo de la tienda.
        Retorna lista de dicts listos para insertar en precio_mercado.
        """
        urls = self._get_urls()
        self.logger.info(f"[{self.store_key}] Iniciando scraping de {len(urls)} productos…")
        results: list[ResultadoScraping] = []

        with sync_playwright() as p:
            browser = self._launch_browser(p)
            context = self._new_context(browser)
            page = context.new_page()
            page.set_default_timeout(PRODUCT_TIMEOUT_MS)

            # Aplicar playwright-stealth para evitar detección de bots
            if STEALTH_AVAILABLE:
                stealth_sync(page)
                self.logger.debug(f"[{self.store_key}] playwright-stealth aplicado.")

            for url in urls:
                result = self._scrape_product(page, url)
                # Intentar mapear insumo_id desde el nombre del producto
                if result.get("nombre_producto"):
                    result["insumo_id"] = self._map_insumo_id(result["nombre_producto"])
                results.append(result)

            browser.close()

        exitosos = sum(1 for r in results if r.get("exitoso"))
        self.logger.info(f"[{self.store_key}] Completado: {exitosos}/{len(results)} exitosos.")
        return results

    # ──────────────────────────────────────────────────────────────────────────
    # Métodos que las subclases DEBEN implementar
    # ──────────────────────────────────────────────────────────────────────────

    @abstractmethod
    def _get_urls(self) -> list[str]:
        """Retorna la lista de URLs de productos a scrapear."""
        ...

    @abstractmethod
    def _scrape_product(self, page: Page, url: str) -> dict:
        """
        Navega a una URL de producto y extrae los campos.
        Retorna dict con keys: tienda, url, nombre_producto, precio,
        precio_descuento, stock, categoria, exitoso.
        Timeout por producto: 30 segundos (PRODUCT_TIMEOUT_MS).
        """
        ...

    # ──────────────────────────────────────────────────────────────────────────
    # Utilidades compartidas
    # ──────────────────────────────────────────────────────────────────────────

    def _launch_browser(self, playwright) -> Browser:
        """Lanza Chromium headless con flags recomendados para Docker."""
        return playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-extensions",
            ],
        )

    def _new_context(self, browser: Browser) -> BrowserContext:
        """Crea un contexto de browser con User-Agent y locale CL."""
        return browser.new_context(
            user_agent=USER_AGENT,
            locale="es-CL",
            timezone_id="America/Santiago",
            viewport={"width": 1280, "height": 900},
        )

    @staticmethod
    def parse_prices(raw: Optional[str]) -> list[float]:
        """Extrae candidatos de precio desde un texto y los normaliza a float."""
        if not raw:
            return []

        matches = re.findall(r"\d[\d\.,]*", raw)
        prices: list[float] = []

        for token in matches:
            cleaned = re.sub(r"[^\d.,]", "", token)
            if not cleaned:
                continue

            # Decimal explícito (JSON-LD): 5210.00 / 5210,00
            if re.fullmatch(r"\d+[\.,]\d{2}", cleaned):
                try:
                    value = float(cleaned.replace(",", "."))
                except ValueError:
                    continue
            else:
                # Miles CLP: 1.598.000 / 1,598,000 / 8150
                digits_only = re.sub(r"\D", "", cleaned)
                if not digits_only:
                    continue
                value = float(digits_only)

            # Filtrar ruido como porcentajes (ej. 22% de descuento)
            if value < 100:
                continue
            prices.append(value)

        return prices

    @staticmethod
    def parse_price(raw: Optional[str]) -> Optional[float]:
        """Convierte formatos CLP y decimales JSON-LD a float normalizado."""
        prices = BaseScraper.parse_prices(raw)
        return prices[0] if prices else None

    @staticmethod
    def parse_discount_price(raw: Optional[str], base_price: Optional[float]) -> Optional[float]:
        """
        Extrae un precio de descuento plausible.
        Devuelve None cuando el texto de descuento contiene ruido o valores no comparables.
        """
        candidates = BaseScraper.parse_prices(raw)
        if not candidates:
            return None

        if base_price is None:
            return candidates[0]

        plausible = [
            p for p in candidates
            if p != base_price and (0.5 * base_price) <= p <= (2.0 * base_price)
        ]
        return plausible[0] if plausible else None

    @staticmethod
    def _map_insumo_id(nombre_producto: str) -> Optional[int]:
        """
        Mapea el nombre del producto scrapeado al Insumo_ID de la DB.
        Retorna None si no encuentra coincidencia (se guardará sin FK).

        NOTA: Este mapeo usa keywords locales para no requerir una query
        a la DB en cada producto. En producción se puede mejorar con
        una query fuzzy a la tabla Insumo.
        """
        nombre_lower = nombre_producto.lower()
        # Los IDs corresponden al orden de inserción en init.sql:
        # 1=Cemento Portland, 2=Cemento Especial, 3=Fierro, 4=Arena, 5=Ripio, 6=Agua
        # 7=Volcanita RH Standard, 8=Volcanita RH Reforzado, ...
        INSUMO_ID_BY_NAME = {
            "Cemento Portland":        1,
            "Cemento Especial":        2,
            "Fierro A63-42H":          3,
            "Arena Gruesa":            4,
            "Ripio":                   5,
            "Agua":                    6,
            "Volcanita RH Standard":   7,
            "Volcanita RH Reforzado":  8,
            "Pintura Acrílica Blanca": 9,
            "Pintura Esmalte":         10,
            "Cerámica Piso":           11,
            "Cerámica Muro":           12,
            "Piso Flotante":           13,
            "Adhesivo Cerámico":       14,
            "Lechada Cerámica":        15,
            "Cable H07Z1-K 1x2.5mm":  16,
            "Cable H07Z1-K 1x4mm":    17,
            "Cable H07Z1-K 1x6mm":    18,
            "Tubo PVC Agua 110mm":     19,
            "Tubo PVC Agua 75mm":      20,
            "Tubo PVC Agua 50mm":      21,
        }

        for insumo_nombre, keywords in KEYWORD_INSUMO_MAP.items():
            if any(kw in nombre_lower for kw in keywords):
                return INSUMO_ID_BY_NAME.get(insumo_nombre)
        return None
