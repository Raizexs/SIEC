# scraper/construmart_scraper.py
"""
Scraper Construmart — microservicio SIEC.

Extrae precios de materiales de construcción desde Construmart Chile,
usando Playwright con playwright-stealth para evitar detección de bots.
Construmart requiere seleccionar tienda/sucursal para ver precios exactos.

Uso standalone (dentro del contenedor):
    python construmart_scraper.py

Importación desde main.py:
    from construmart_scraper import ConstrumartScraper, scrape_construmart
"""

import json
import logging
import sys

from playwright.sync_api import Page, TimeoutError as PWTimeout

from base_scraper import BaseScraper
from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY = "construmart"
STORE_CFG = STORES[STORE_KEY]
SELECTORS = STORE_CFG["selectors"]


class ConstrumartScraper(BaseScraper):
    """
    Scraper para Construmart Chile.

    Usa JSON-LD como fuente principal de precio porque el HTML visible
    puede mostrar $0 c/u cuando no hay tienda seleccionada.
    Aplica playwright-stealth para evitar CAPTCHAs.
    Timeout por producto: 30 segundos.
    """

    store_key = STORE_KEY

    def _get_urls(self) -> list[str]:
        return STORE_CFG["product_urls"]

    def _get_search_url(self, query: str) -> str:
        return STORE_CFG["search_url"].format(query=query.replace(" ", "+"))

    def _scrape_search_results(self, page: Page, query: str) -> list[dict]:
        """Extrae lista de productos desde la página de búsqueda de Construmart."""
        url = self._get_search_url(query)
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        self._dismiss_store_modal(page)
        
        sel_cont = STORE_CFG["search_selectors"]["container"]
        try:
            page.wait_for_selector(sel_cont, timeout=15_000)
        except Exception:
            return []

        products = []
        cards = page.locator(sel_cont).all()
        
        for card in cards[:10]:
            try:
                name_sel = STORE_CFG["search_selectors"]["name"]
                price_sel = STORE_CFG["search_selectors"]["price"]
                link_sel = STORE_CFG["search_selectors"]["link"]

                name_el = card.locator(name_sel).first
                price_el = card.locator(price_sel).first
                link_el = card.locator(link_sel).first

                if name_el.is_visible() and price_el.is_visible():
                    name = name_el.inner_text().strip()
                    price_raw = price_el.inner_text().strip()
                    link = link_el.get_attribute("href")
                    if link and not link.startswith("http"):
                        link = f"https://www.construmart.cl{link}"

                    products.append({
                        "tienda": self.store_key,
                        "nombre_producto": name,
                        "precio": self.parse_price(price_raw),
                        "url": link,
                        "exitoso": True
                    })
            except Exception:
                continue
        
        return products

    def _dismiss_store_modal(self, page: Page) -> None:
        """Cierra el modal de selección de tienda/sucursal."""
        selectors_cierre = [
            "button[aria-label='Cerrar']",
            "button.modal-close",
            ".modal-overlay .close",
            "button:has-text('Cerrar')",
            "button:has-text('×')",
            "[data-dismiss='modal']",
        ]
        for sel in selectors_cierre:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=2_000):
                    btn.click()
                    logger.debug("[Construmart] Modal de tienda cerrado.")
                    return
            except Exception:
                continue

    def _extract_product_jsonld(self, page: Page) -> dict | None:
        """Obtiene el bloque Product de JSON-LD si la página lo expone."""
        try:
            for raw in page.locator("script[type='application/ld+json']").all_inner_texts():
                if not raw.strip():
                    continue
                data = json.loads(raw)
                candidates = data if isinstance(data, list) else [data]
                for item in candidates:
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        return item
        except Exception:
            return None
        return None

    def _scrape_product(self, page: Page, url: str) -> dict:
        """
        Navega a la URL del producto y extrae datos.
        Timeout total: 30 segundos (configurado en base_scraper).
        """
        result = {
            "tienda": STORE_KEY,
            "url": url,
            "nombre_producto": None,
            "precio": None,
            "precio_descuento": None,
            "stock": None,
            "categoria": None,
            "insumo_id": None,
            "exitoso": False,
        }

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            self._dismiss_store_modal(page)

            # Esperar por cualquiera de los selectores disponibles para el nombre.
            page.wait_for_selector(SELECTORS["name"]["css"], timeout=30_000)

            product_jsonld = self._extract_product_jsonld(page) or {}
            offers = product_jsonld.get("offers") or {}

            def text(css: str) -> str | None:
                """Soporta selectores multiples separados por ','."""
                for sel in [s.strip() for s in css.split(",")]:
                    el = page.query_selector(sel)
                    if el:
                        value = el.inner_text().strip()
                        if value:
                            return value
                return None

            result["nombre_producto"] = text(SELECTORS["name"]["css"]) or product_jsonld.get("name")

            jsonld_price = self.parse_price(str(offers.get("price")))
            selector_price = self.parse_price(text(SELECTORS["price"]["css"]))
            result["precio"] = jsonld_price or selector_price

            result["precio_descuento"] = self.parse_discount_price(
                text(SELECTORS["price_discount"]["css"]),
                result["precio"],
            )

            availability = str(offers.get("availability") or "").lower()
            if "outofstock" in availability:
                result["stock"] = "Sin stock"
            elif "instock" in availability:
                result["stock"] = "En stock"
            else:
                result["stock"] = text(SELECTORS["stock"]["css"])

            result["categoria"] = text(SELECTORS["category"]["css"])
            if not result["categoria"]:
                result["categoria"] = product_jsonld.get("category")

            result["exitoso"] = result["nombre_producto"] is not None and result["precio"] is not None

            if result["exitoso"]:
                logger.info(f"[Construmart] ✅ {result['nombre_producto']} — ${result['precio']}")
            else:
                logger.warning(f"[Construmart] ⚠️  Datos incompletos para {url}")

        except PWTimeout:
            # Criterio 1: mensaje exacto con nombre del producto (o slug de URL como fallback)
            self._handle_timeout(url, result.get("nombre_producto"))
        except Exception as e:
            logger.error(f"[Construmart] ❌ Error inesperado en {url}: {e}")

        return result


def scrape_construmart() -> list[dict]:
    """
    Punto de entrada compatible con main.py (llamado por APScheduler).
    Retorna lista de dicts para insertar en precio_mercado.
    """
    return ConstrumartScraper().scrape()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )
    logger.info("=== Construmart Scraper — ejecucion standalone ===")
    resultados = scrape_construmart()

    exitosos = [r for r in resultados if r["exitoso"]]
    logger.info(f"\n{'='*60}")
    logger.info(f"Resultados: {len(exitosos)}/{len(resultados)} productos exitosos")
    logger.info(f"{'='*60}")

    for r in exitosos:
        if r["precio"] is not None:
            logger.info(
                f"  ✅ {str(r['nombre_producto'] or 'N/A'):<50} "
                f"${r['precio']:>10,.0f} CLP  |  "
                f"Stock: {r['stock'] or 'N/A'}  |  "
                f"Insumo_ID: {r.get('insumo_id', 'N/A')}"
            )
        else:
            logger.info(
                f"  ⚠️  {str(r['nombre_producto'] or 'N/A'):<50}  precio=None  |  "
                f"Stock: {r['stock'] or 'N/A'}  |  "
                f"Insumo_ID: {r.get('insumo_id', 'N/A')}"
            )
