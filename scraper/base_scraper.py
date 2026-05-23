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
    "Chrome/125.0.0.0 Safari/537.36"
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

    def search_and_match(self, page: Page, query: str, insumo_id: Optional[int] = None, unidad_medida: Optional[str] = None) -> Optional[dict]:
        """
        Busca un material por nombre genérico, extrae resultados y aplica 
        Fuzzy Matching para encontrar el mejor producto.
        
        Estrategia:
        1. HTTP directo + JSON-LD (sin browser, sin anti-bot)
        2. undetected-chromedriver (Chrome real, evade anti-bot)
        3. Playwright + Firefox + stealth (fallback)
        """
        self.logger.info(f"[{self.store_key}] Buscando material genérico: '{query}'")
        
        # ── Capa 1: HTTP directo ───────────────────────────────────────────
        try:
            search_url = self._get_search_url(query)
            candidatos = self._http_search(self.store_key, search_url, query)
            if candidatos:
                normalizer = FuzzyNormalizer(threshold=75, unidad_medida=unidad_medida)
                mejor_match = normalizer.filter_results(query, candidatos)
                if mejor_match:
                    self.logger.info(
                        f"[{self.store_key}] ✅ HTTP match para '{query}': "
                        f"'{mejor_match['nombre_producto']}' (Score: {mejor_match['match_score']}, "
                        f"Precio: ${mejor_match['precio']})"
                    )
                    mejor_match["insumo_id"] = insumo_id
                    self._normalize_prices_by_insumo_unit(mejor_match)
                    return mejor_match
        except Exception as e:
            self.logger.debug(f"[{self.store_key}] HTTP falló para '{query}': {e}")

        # ── Capa 2: undetected-chromedriver ────────────────────────────────
        try:
            search_url = self._get_search_url(query)
            candidatos = self._uc_search(self.store_key, search_url, query)
            if candidatos:
                normalizer = FuzzyNormalizer(threshold=75, unidad_medida=unidad_medida)
                mejor_match = normalizer.filter_results(query, candidatos)
                if mejor_match:
                    self.logger.info(
                        f"[{self.store_key}] ✅ UC match para '{query}': "
                        f"'{mejor_match['nombre_producto']}' (Score: {mejor_match['match_score']}, "
                        f"Precio: ${mejor_match['precio']})"
                    )
                    mejor_match["insumo_id"] = insumo_id
                    self._normalize_prices_by_insumo_unit(mejor_match)
                    return mejor_match
        except Exception as e:
            self.logger.debug(f"[{self.store_key}] UC falló para '{query}': {e}")

        # ── Capa 3: Playwright ─────────────────────────────────────────────
        try:
            candidatos = self._scrape_search_results(page, query)
            if not candidatos:
                self.logger.warning(f"[{self.store_key}] No se encontraron resultados para '{query}'")
                return None

            normalizer = FuzzyNormalizer(threshold=75, unidad_medida=unidad_medida)
            mejor_match = normalizer.filter_results(query, candidatos)

            if mejor_match:
                self.logger.info(
                    f"[{self.store_key}] ✅ Mejor match para '{query}': "
                    f"'{mejor_match['nombre_producto']}' (Score: {mejor_match['match_score']}, "
                    f"Precio: ${mejor_match['precio']})"
                )
                mejor_match["insumo_id"] = insumo_id
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
        Usa el motor de browser definido en self.browser_type (chromium o firefox).
        """
        import random
        browser_type = getattr(self, 'browser_type', 'chromium')
        self.logger.info(f"[{self.store_key}] Iniciando scraping por keywords para {len(insumos)} insumos… (browser={browser_type})")
        results: list[dict] = []

        with sync_playwright() as p:
            browser = self._launch_browser(p, browser_type)

            for i, insumo in enumerate(insumos):
                if i % 5 == 0:
                    if i > 0:
                        try: context.close()
                        except Exception: pass
                    context = self._new_context(browser, browser_type)
                    page = context.new_page()
                    page.set_default_timeout(PRODUCT_TIMEOUT_MS)
                    if STEALTH_AVAILABLE:
                        stealth_sync(page)
                    # Visitar homepage primero para simular navegación humana
                    try:
                        home = STORE_CFG.get("base_urls", [None])[0]
                        if home:
                            page.goto(home, wait_until="domcontentloaded", timeout=20_000)
                            page.wait_for_timeout(random.randint(1000, 2000))
                    except Exception:
                        pass

                # Delay humano aleatorio entre queries
                page.wait_for_timeout(random.randint(1500, 4000))

                match = self.search_and_match(page, insumo["nombre"], insumo["id"], insumo.get("unidad_medida"))
                if match:
                    results.append(match)

            try:
                context.close()
            except Exception:
                pass
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

    def _get_search_url(self, query: str) -> str:
        """Retorna la URL de búsqueda para un query dado. Opcional."""
        raise NotImplementedError

    def _scrape_search_results(self, page: Page, query: str) -> list[dict]:
        """
        Navega a la página de búsqueda y extrae una lista preliminar de productos.
        Opcional — solo necesario si la subclase usa búsqueda.
        """
        raise NotImplementedError

    # ──────────────────────────────────────────────────────────────────────────
    # Utilidades compartidas
    # ──────────────────────────────────────────────────────────────────────────

    # ── Stealth injection script (más completo que playwright-stealth) ────────
    STEALTH_SCRIPT = """
    // Override webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Override plugins
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es', 'en'] });
    // Override chrome runtime
    window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (p) => p.name === 'notifications' ? Promise.resolve({ state: 'denied' }) : originalQuery(p);
    // WebGL fingerprint mask
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(p) {
      if (p === 37445) return 'Intel Inc.';
      if (p === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter(p);
    };
    """

    def _launch_browser(self, playwright, browser_type: str = "chromium") -> Browser:
        """Lanza browser headless con flags recomendados para Docker.
        
        Args:
            browser_type: "chromium" (default) o "firefox"
        """
        browser_map = {
            "chromium": playwright.chromium,
            "firefox": playwright.firefox,
        }
        launcher = browser_map.get(browser_type, playwright.chromium)
        return launcher.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-extensions",
            ],
        )

    def _new_context(self, browser: Browser, browser_type: str = "chromium") -> BrowserContext:
        """Crea un contexto de browser con User-Agent, headers realistas y locale CL."""
        import random
        viewports = [(1280, 900), (1366, 768), (1440, 900), (1920, 1080)]
        vp = random.choice(viewports)
        context = browser.new_context(
            user_agent=USER_AGENT,
            locale="es-CL",
            timezone_id="America/Santiago",
            viewport={"width": vp[0], "height": vp[1]},
            extra_http_headers={
                "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
            },
        )
        context.add_init_script(BaseScraper.STEALTH_SCRIPT)
        return context

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
    def _http_search(store_key: str, search_url: str, query: str) -> list[dict]:
        """Busca productos via HTTP directo y extrae JSON-LD.
        
        Sin browser, sin JavaScript. Solo funciona si el sitio embebe
        datos estructurados (JSON-LD) en el HTML inicial (SSR).
        Retorna lista de dicts con nombre_producto, precio, url, exitoso.
        """
        import json, re, urllib.request
        try:
            req = urllib.request.Request(
                search_url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                },
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode("utf-8", errors="replace")

            # Buscar bloques JSON-LD
            products = []
            seen = set()
            for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
                try:
                    data = json.loads(match.group(1))
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        if item.get("@type") in ("ItemList", "Product"):
                            entries = item.get("itemListElement") or [item]
                            for entry in entries[:15]:
                                obj = entry.get("item") if isinstance(entry, dict) and "item" in entry else entry
                                if not isinstance(obj, dict):
                                    continue
                                name = obj.get("name", "").strip()
                                offers = obj.get("offers", {})
                                price_val = None
                                if isinstance(offers, dict):
                                    price_val = offers.get("price")
                                elif isinstance(offers, list) and len(offers) > 0:
                                    price_val = offers[0].get("price")
                                url_val = obj.get("url", "")
                                if not name or not price_val or name in seen:
                                    continue
                                seen.add(name)
                                try:
                                    price = float(price_val) if isinstance(price_val, (int, float)) else float(str(price_val).replace(",", "."))
                                except (ValueError, TypeError):
                                    continue
                                if price < 100:
                                    continue
                                products.append({
                                    "tienda": store_key,
                                    "nombre_producto": name,
                                    "precio": price,
                                    "url": url_val if url_val.startswith("http") else "",
                                    "exitoso": True,
                                })
                except (json.JSONDecodeError, Exception):
                    continue
            if products:
                logger.info(f"[HTTP] {store_key}: {len(products)} productos via JSON-LD para '{query[:40]}'")
            return products
        except Exception as e:
            logger.debug(f"[HTTP] {store_key}: fallo para '{query[:40]}': {e}")
            return []

    @staticmethod
    def _uc_search(store_key: str, search_url: str, query: str) -> list[dict]:
        """Busca productos usando undetected-chromedriver (evade anti-bot).
        
        Usa Chrome real con parches de deteccion en runtime.
        """
        try:
            import undetected_chromedriver as uc
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
        except ImportError:
            logger.warning("[UC] undetected-chromedriver no instalado")
            return []

        import json, re, time
        try:
            opts = uc.ChromeOptions()
            opts.add_argument("--headless=new")
            opts.add_argument("--no-sandbox")
            opts.add_argument("--disable-dev-shm-usage")
            opts.add_argument("--disable-blink-features=AutomationControlled")
            opts.add_argument("--window-size=1280,900")
            opts.add_argument(f"--user-agent={USER_AGENT}")
            
            driver = uc.Chrome(options=opts, version_main=125)
            driver.get(search_url)
            time.sleep(5)  # esperar carga JS

            html = driver.page_source
            driver.quit()

            # Extraer JSON-LD
            products = []
            seen = set()
            for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
                try:
                    data = json.loads(match.group(1))
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if not isinstance(item, dict): continue
                        if item.get("@type") not in ("ItemList", "Product"): continue
                        entries = item.get("itemListElement") or [item]
                        for entry in entries[:15]:
                            obj = entry.get("item", entry) if isinstance(entry, dict) else entry
                            if not isinstance(obj, dict): continue
                            name = obj.get("name", "").strip()
                            offers = obj.get("offers", {}) or {}
                            if isinstance(offers, list): offers = offers[0] if offers else {}
                            price = offers.get("price")
                            url_p = obj.get("url", "")
                            if not name or not price or name in seen: continue
                            seen.add(name)
                            try:
                                pval = float(price) if isinstance(price, (int, float)) else float(str(price).replace(",", "."))
                            except: continue
                            if pval < 100: continue
                            products.append({"tienda": store_key, "nombre_producto": name, "precio": pval, "url": url_p, "exitoso": True})
                except: continue

            if products:
                logger.info(f"[UC] {store_key}: {len(products)} productos via JSON-LD para '{query[:40]}'")
                return products

            # Extraer desde el DOM (texto + regex)
            for el in re.finditer(r'(?:product|card|item)[^>]*>.*?(\$\s*[\d.,]+).*?<', html, re.DOTALL | re.IGNORECASE):
                pass  # Placeholder para extraccion DOM via regex

            logger.info(f"[UC] {store_key}: sin productos JSON-LD para '{query[:40]}' ({len(html)} bytes)")
            return products

        except Exception as e:
            logger.debug(f"[UC] {store_key}: fallo para '{query[:40]}': {e}")
            return []

    @staticmethod
    def dump_html(page, store_key: str, query: str) -> None:
        """Guarda el HTML crudo en un archivo para debugging y logea resumen."""
        import os
        from datetime import datetime
        try:
            html = page.content()
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_q = "".join(c if c.isalnum() else "_" for c in query)[:40]
            fname = f"/tmp/debug_{store_key}_{safe_q}_{ts}.html"
            with open(fname, "w", encoding="utf-8") as f:
                f.write(html)
            # Loggear resumen del HTML
            title = ""
            import re as _re
            m = _re.search(r'<title[^>]*>(.*?)</title>', html, _re.IGNORECASE | _re.DOTALL)
            if m: title = m.group(1).strip()
            body_len = len(html)
            has_products = "product" in html.lower() or "articulo" in html.lower() or "price" in html.lower()
            logger.info(f"[Debug] HTML guardado: {fname}")
            logger.info(f"[Debug] Title: {title[:120]} | Tamaño: {body_len} bytes | Contiene productos: {has_products}")
        except Exception as e:
            logger.warning(f"[Debug] No se pudo guardar HTML: {e}")

    def _intercept_api_response(self, page, url_pattern: str, timeout: int = 10_000) -> Optional[dict]:
        """
        Intercepta una respuesta de red que coincida con url_pattern y
        devuelve su contenido parseado como JSON.

        Util para cuando la pagina carga datos via XHR/Fetch en vez de
        tenerlos en el HTML inicial.
        """
        from playwright.sync_api import expect
        response = None
        try:
            with page.expect_response(lambda resp: url_pattern in resp.url and resp.status == 200, timeout=timeout) as resp_info:
                pass
            response = resp_info.value
            data = response.json()
            self.logger.info(f"[API] Respuesta JSON interceptada: {response.url}")
            return data
        except Exception:
            return None

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
        """
        nombre_lower = nombre_producto.lower()
        INSUMO_ID_BY_NAME = {
            "Cemento Portland":        1,
            "Cemento Especial":        2,
            "Cemento Polpaico":        2,
            "Fierro A63-42H":          3,
            "Fierro de construccion":  3,
            "Arena Gruesa":            4,
            "Ripio":                   5,
            "Gravilla":                5,
            "Agua":                    6,
            "Pino MSD Construccion 2x3": 7,
            "Pino Dimensionado 2x3":   7,
            "Pino MSD Construccion 2x4": 8,
            "Pino Dimensionado 2x4":   8,
            "Volcanita RH Standard":   9,
            "Volcanita RH Reforzado":  10,
            "Yeso Carton Resistente a la humedad 12.5": 9,
            "Yeso Carton Resistente a la humedad 15": 10,
            "Pintura Acrilica Blanca": 11,
            "Esmalte al agua pieza":   11,
            "Pintura Esmalte":         12,
            "Esmalte sintetico":       12,
            "Ceramica Piso":           13,
            "Ceramica de piso":        13,
            "Ceramica Muro":           14,
            "Ceramica de muro":        14,
            "Piso Flotante":           15,
            "Adhesivo Ceramico":       16,
            "Lechada Ceramica":        17,
            "Frague impermeable":      17,
            "Cable H07Z1-K 1x2.5mm":   18,
            "Cable electrico H07Z1-K 2.5": 18,
            "Cable H07Z1-K 1x4mm":     19,
            "Cable electrico H07Z1-K 4": 19,
            "Cable H07Z1-K 1x6mm":     20,
            "Cable electrico H07Z1-K 6": 20,
            "Tubo PVC Agua 110mm":     21,
            "Tubo PVC sanitario 110":  21,
            "Tubo PVC Agua 75mm":      22,
            "Tubo PVC sanitario 75":   22,
            "Tubo PVC Agua 50mm":      23,
            "Tubo PVC sanitario 50":   23,
            "Tubo Cobre 15mm":         24,
            "Tubo cobre tipo L 12":    24,
            "Tubo Cobre 22mm":         25,
            "Tubo cobre tipo L 34":    25,
            "Caja Electrica Embutida": 26,
            "Caja distribucion embutida": 26,
            "Disyuntor Termomagnético": 27,
            "Automatico monofasico":   27,
            "Albañil":                 28,
            "Electricista":            29,
            "Gasfiter":                30,
            "Ayudante General":        31,
            "Perfil Metalcon C":       32,
            "Perfil C 60x38":          32,
            "Perfil Metalcon U":       33,
            "Perfil U 62x25":          33,
            "Perfil Omega":            34,
            "Perfil metalcon cielo":   34,
            "Terciado Estructural":    35,
            "Terciado estructural pino": 35,
            "Tornillo Volcanita":      36,
            "Tornillo Madera":         37,
            "Tornillo Autoperforante": 38,
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
