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
from urllib.parse import urlparse

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
from normalizer import FuzzyNormalizer

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

                # Normalizar precio a la unidad de consumo del insumo (kg/metro/saco 25kg)
                self._normalize_prices_by_insumo_unit(result)
                results.append(result)

            browser.close()

        exitosos = sum(1 for r in results if r.get("exitoso"))
        self.logger.info(f"[{self.store_key}] Completado: {exitosos}/{len(results)} exitosos.")
        return results

    def search_and_match(self, page: Page, query: str, insumo_id: Optional[int] = None) -> Optional[dict]:
        """
        Busca un material por nombre genérico, extrae resultados y aplica 
        Fuzzy Matching para encontrar el mejor producto.
        """
        self.logger.info(f"[{self.store_key}] Buscando material genérico: '{query}'")
        
        try:
            # 1. Obtener lista de productos candidatos desde la búsqueda
            candidatos = self._scrape_search_results(page, query)
            if not candidatos:
                self.logger.warning(f"[{self.store_key}] No se encontraron resultados para '{query}'")
                return None

            # 2. Aplicar Fuzzy Normalizer
            normalizer = FuzzyNormalizer(threshold=70)
            mejor_match = normalizer.filter_results(query, candidatos)

            if mejor_match:
                self.logger.info(
                    f"[{self.store_key}] ✅ Mejor match para '{query}': "
                    f"'{mejor_match['nombre_producto']}' (Score: {mejor_match['match_score']}, "
                    f"Precio: ${mejor_match['precio']})"
                )
                mejor_match["insumo_id"] = insumo_id
                
                # Normalización de unidad (kg/m/etc)
                self._normalize_prices_by_insumo_unit(mejor_match)
                
                return mejor_match
            
            self.logger.warning(f"[{self.store_key}] ⚠️  Ningún resultado de búsqueda superó el umbral de confianza para '{query}'")
            return None

        except Exception as e:
            self.logger.error(f"[{self.store_key}] ❌ Error en búsqueda de '{query}': {e}", exc_info=True)
            return None

    def scrape_by_keywords(self, insumos: list[dict]) -> list[dict]:
        """
        Ejecuta el scraping buscando cada insumo por su nombre genérico.
        """
        self.logger.info(f"[{self.store_key}] Iniciando scraping por keywords para {len(insumos)} insumos…")
        results: list[dict] = []

        with sync_playwright() as p:
            browser = self._launch_browser(p)
            context = self._new_context(browser)
            page = context.new_page()
            page.set_default_timeout(PRODUCT_TIMEOUT_MS)

            if STEALTH_AVAILABLE:
                stealth_sync(page)

            for insumo in insumos:
                match = self.search_and_match(page, insumo["nombre"], insumo["id"])
                if match:
                    results.append(match)

            browser.close()

        exitosos = len(results)
        self.logger.info(f"[{self.store_key}] Completado por keywords: {exitosos}/{len(insumos)} exitosos.")
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

    @abstractmethod
    def _get_search_url(self, query: str) -> str:
        """Retorna la URL de búsqueda para un query dado."""
        ...

    @abstractmethod
    def _scrape_search_results(self, page: Page, query: str) -> list[dict]:
        """
        Navega a la página de búsqueda y extrae una lista preliminar de productos.
        Cada dict debe tener: nombre_producto, precio, url.
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
    def _extract_name_from_url(url: str) -> str:
        """
        Extrae un nombre legible desde el slug de la URL como fallback.

        Se usa cuando el timeout ocurre antes de poder leer el nombre del
        producto desde el DOM, garantizando que el mensaje de log del criterio
        4 incluya siempre algo identificable:

            [ERROR] [Sodimac] Timeout de 30s excedido para producto
                    Hormigon Preparado Para Radieres. Manteniendo último precio válido.

        Ejemplos:
            sodimac.cl/.../hormigon-preparado-para-radieres-25-kg/110277137
                → "Hormigon Preparado Para Radieres Kg"
            easy.cl/cemento-especial-25-kg-polpaico-1195183/p
                → "Cemento Especial Kg Polpaico"
            construmart.cl/cemento-especial-saco-25-kg-san-juan-245005
                → "Cemento Especial Saco Kg San Juan"
        """
        path = urlparse(url).path.rstrip("/")
        segments = [s for s in path.split("/") if s]
        for segment in reversed(segments):
            # Ignorar segmentos que son solo dígitos o el sufijo "p" de Easy
            if segment.isdigit() or segment == "p":
                continue
            parts = [tok for tok in segment.split("-") if not tok.isdigit() and tok]
            friendly = " ".join(tok.capitalize() for tok in parts)
            if friendly:
                return friendly
        return url

    def _handle_timeout(self, url: str, nombre: Optional[str] = None) -> None:
        """
        Logea un timeout de 30s con el formato exacto requerido:

            [ERROR] [Sodimac] Timeout de 30s excedido para producto Cemento.
                    Manteniendo último precio válido.

        Args:
            url:    URL del producto que generó el timeout.
            nombre: Nombre del producto si ya fue extraído del DOM
                    (puede ser None si el timeout ocurrió antes de cargarlo).
        """
        display = nombre or self._extract_name_from_url(url)
        store_display = self.store_key.capitalize()
        self.logger.error(
            f"[{store_display}] Timeout de 30s excedido para producto {display}. "
            f"Manteniendo último precio válido."
        )

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
            "Pino MSD Construccion 2x3": 7,
            "Pino MSD Construccion 2x4": 8,
            "Volcanita RH Standard":   9,
            "Volcanita RH Reforzado":  10,
            "Pintura Acrílica Blanca": 11,
            "Pintura Esmalte":         12,
            "Cerámica Piso":           13,
            "Cerámica Muro":           14,
            "Piso Flotante":           15,
            "Adhesivo Cerámico":       16,
            "Lechada Cerámica":        17,
            "Cable H07Z1-K 1x2.5mm":  18,
            "Cable H07Z1-K 1x4mm":    19,
            "Cable H07Z1-K 1x6mm":    20,
            "Tubo PVC Agua 110mm":     21,
            "Tubo PVC Agua 75mm":      22,
            "Tubo PVC Agua 50mm":      23,
            "Tubo Cobre 15mm":         24,
            "Tubo Cobre 22mm":         25,
            "Caja Eléctrica Embutida": 26,
            "Disyuntor Termomagnético":27,
            "Albañil":                 28,
            "Electricista":            29,
            "Gasfíter":                30,
            "Ayudante General":        31,
        }

        for insumo_nombre, keywords in KEYWORD_INSUMO_MAP.items():
            if any(kw in nombre_lower for kw in keywords):
                return INSUMO_ID_BY_NAME.get(insumo_nombre)
        return None

    @staticmethod
    def _extract_kg_from_name(nombre_producto: str) -> Optional[float]:
        matches = re.findall(r"(\d+(?:[\.,]\d+)?)\s*kg\b", nombre_producto.lower())
        if not matches:
            return None
        values = []
        for m in matches:
            try:
                values.append(float(m.replace(",", ".")))
            except ValueError:
                continue
        return max(values) if values else None

    @staticmethod
    def _extract_meters_from_name(nombre_producto: str) -> Optional[float]:
        # Captura "100 m", "50 metros", "6 m", evita confundir "mm"
        matches = re.findall(r"(\d+(?:[\.,]\d+)?)\s*(?:metro\(s\)|metros|metro|m)\b", nombre_producto.lower())
        if not matches:
            return None
        values = []
        for m in matches:
            try:
                values.append(float(m.replace(",", ".")))
            except ValueError:
                continue
        return max(values) if values else None

    def _get_unit_factor(self, nombre_producto: str, insumo_id: Optional[int]) -> float:
        """
        Devuelve el factor para llevar el precio comercial a la unidad de insumo.
        factor=1.0 significa sin cambio.
        """
        nombre_lower = nombre_producto.lower()

        if insumo_id is None:
            # Fallback cuando no hay mapeo: inferencia por texto del producto
            meters_pack = self._extract_meters_from_name(nombre_producto)
            kg_pack = self._extract_kg_from_name(nombre_producto)

            if "cable" in nombre_lower and meters_pack and meters_pack > 0:
                return 1.0 / meters_pack
            if ("tubo" in nombre_lower or "tuber" in nombre_lower) and meters_pack and meters_pack > 0:
                return 1.0 / meters_pack
            if "cement" in nombre_lower and kg_pack and kg_pack > 0:
                return 25.0 / kg_pack

            return 1.0

        # Cemento en DB está modelado como saco 25kg
        if insumo_id in {1, 2}:
            kg_pack = self._extract_kg_from_name(nombre_producto)
            if kg_pack and kg_pack > 0:
                return 25.0 / kg_pack
            return 1.0

        # Fierro modelado en kg
        if insumo_id == 3:
            kg_piece = self._extract_kg_from_name(nombre_producto)
            if kg_piece and kg_piece > 0:
                return 1.0 / kg_piece
            return 1.0

        # Cables y tubos modelados en metro lineal
        if insumo_id in {16, 17, 18, 19, 20, 21}:
            meters_pack = self._extract_meters_from_name(nombre_producto)
            if meters_pack and meters_pack > 0:
                return 1.0 / meters_pack
            return 1.0

        return 1.0

    def _normalize_prices_by_insumo_unit(self, result: dict) -> None:
        precio = result.get("precio")
        nombre = result.get("nombre_producto")
        insumo_id = result.get("insumo_id")
        if precio is None or not nombre:
            return

        factor = self._get_unit_factor(nombre, insumo_id)
        if factor == 1.0:
            return

        result["precio"] = round(precio * factor, 4)
        if result.get("precio_descuento") is not None:
            result["precio_descuento"] = round(result["precio_descuento"] * factor, 4)
