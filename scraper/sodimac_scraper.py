# scraper/sodimac_scraper.py
"""
Scraper Sodimac — microservicio SIEC.

Usa PDP URLs directas para evitar el bloqueo anti-bot de Sodimac
en las páginas de búsqueda (que son SPA y no renderizan nada server-side).
"""
import logging

from playwright.sync_api import TimeoutError as PWTimeout

from base_scraper import BaseScraper
from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY = "sodimac"
STORE_CFG = STORES[STORE_KEY]
SELECTORS = STORE_CFG["selectors"]


class SodimacScraper(BaseScraper):
    store_key = STORE_KEY
    browser_type = "chromium"

    def _get_urls(self) -> list[str]:
        return STORE_CFG["product_urls"]

    def scrape_by_keywords(self, insumos: list[dict]) -> list[dict]:
        """
        Sodimac no usa búsqueda (el sitio bloquea). Usa PDP URLs directas.
        """
        raw_results = self.scrape()
        results = []
        for r in raw_results:
            if r.get("exitoso") and r.get("precio") is not None:
                insumo_id = self._map_insumo_id(r.get("nombre_producto", ""))
                results.append({
                    "tienda": self.store_key,
                    "nombre_producto": r.get("nombre_producto"),
                    "precio": r.get("precio"),
                    "precio_descuento": r.get("precio_descuento"),
                    "url": r.get("url"),
                    "insumo_id": insumo_id,
                    "exitoso": True,
                })
        self.logger.info(f"[Sodimac] PDP scrape: {len(results)}/{len(raw_results)} productos con precio")
        return results

    def _get_search_url(self, query: str) -> str:
        return STORE_CFG["search_url"].format(query=query.replace(" ", "+"))

    def _scrape_product(self, page, url: str) -> dict:
        result = {
            "tienda": STORE_KEY, "url": url,
            "nombre_producto": None, "precio": None,
            "precio_descuento": None, "stock": None,
            "categoria": None, "insumo_id": None, "exitoso": False,
        }
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_selector(SELECTORS["name"]["css"].split(',')[0].strip(), timeout=30_000)
            page.wait_for_timeout(2000)

            def text(css):
                for sel in [s.strip() for s in css.split(",")]:
                    el = page.query_selector(sel)
                    if el:
                        val = el.inner_text().strip()
                        if val: return val
                return None

            result["nombre_producto"] = text(SELECTORS["name"]["css"])
            result["precio"] = self.parse_price(text(SELECTORS["price"]["css"]))
            result["precio_descuento"] = self.parse_discount_price(text(SELECTORS["price_discount"]["css"]), result["precio"])
            result["stock"] = text(SELECTORS["stock"]["css"])
            result["categoria"] = text(SELECTORS["category"]["css"])
            result["exitoso"] = True
            logger.info(f"[Sodimac] {result['nombre_producto']} — ${result['precio']}")
        except PWTimeout:
            self._handle_timeout(url, result.get("nombre_producto"))
        except Exception as e:
            logger.error(f"[Sodimac] Error en {url}: {e}")
        return result


def scrape_sodimac() -> list[dict]:
    return SodimacScraper().scrape()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s", stream=sys.stdout)
    resultados = scrape_sodimac()
    exitosos = [r for r in resultados if r["exitoso"]]
    logger.info(f"Resultados: {len(exitosos)}/{len(resultados)} exitosos")
    for r in exitosos:
        if r['precio'] is not None:
            logger.info(f"OK {r['nombre_producto'][:50]} ${r['precio']:>8,.0f}")
