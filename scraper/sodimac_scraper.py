# scraper/sodimac_scraper.py
"""
Scraper Sodimac — usa HTTP directo para PDP URLs.
Sin Playwright, sin browser. Extrae JSON-LD del HTML.
"""
import json
import logging
import re
import urllib.request

from base_scraper import BaseScraper
from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY = "sodimac"
STORE_CFG = STORES[STORE_KEY]


class SodimacScraper(BaseScraper):
    store_key = STORE_KEY
    browser_type = "chromium"

    def _get_urls(self) -> list[str]:
        return STORE_CFG["product_urls"]

    def scrape_by_keywords(self, insumos: list[dict]) -> list[dict]:
        """Scrapea las PDP URLs via HTTP directo, sin browser."""
        results = []
        for url in self._get_urls():
            prod = self._http_scrape_pdp(url)
            if prod and prod.get("precio"):
                insumo_id = self._map_insumo_id(prod.get("nombre_producto", ""))
                results.append({
                    "tienda": self.store_key,
                    "nombre_producto": prod["nombre_producto"],
                    "precio": prod["precio"],
                    "precio_descuento": None,
                    "stock": "Disponible",
                    "categoria": "Obra Gruesa",
                    "url": url,
                    "insumo_id": insumo_id,
                    "exitoso": True,
                })
        self.logger.info(f"[Sodimac] HTTP PDP: {len(results)}/{len(self._get_urls())} productos con precio")
        return results

    def _http_scrape_pdp(self, url: str) -> dict | None:
        """Fetch via HTTP + extrae JSON-LD. Sin browser, rapido."""
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-CL,es;q=0.9",
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode("utf-8", errors="replace")

            name, price = None, None
            for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
                try:
                    data = json.loads(match.group(1))
                    for item in data if isinstance(data, list) else [data]:
                        if isinstance(item, dict) and item.get("@type") == "Product":
                            name = item.get("name", "").strip() or name
                            offers = item.get("offers", {}) or {}
                            if isinstance(offers, list): offers = offers[0] if offers else {}
                            pv = offers.get("price")
                            if pv is not None:
                                try: price = float(pv) if isinstance(pv, (int, float)) else float(str(pv).replace(",", "."))
                                except: pass
                except: pass

            if name and price:
                logger.info(f"[Sodimac] {name[:60]} — ${price:,.0f}")
                return {"nombre_producto": name.strip(), "precio": price}
            logger.debug(f"[Sodimac] Sin datos en: {url[:80]}")
            return None
        except Exception as e:
            logger.debug(f"[Sodimac] Fallo HTTP: {url[:80]} — {e}")
            return None

    def _get_search_url(self, query: str) -> str:
        return STORE_CFG["search_url"].format(query=query.replace(" ", "+"))

    def _scrape_product(self, page, url: str) -> dict:
        """No usado. Sodimac usa HTTP directo."""
        return {"exitoso": False}


def scrape_sodimac() -> list[dict]:
    return SodimacScraper().scrape()
