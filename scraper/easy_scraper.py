# scraper/easy_scraper.py
"""
Scraper Easy — microservicio SIEC.

Extrae precios de materiales de construcción desde Easy Chile,
usando Playwright con playwright-stealth para evitar detección de bots.
Easy es un sitio Next.js que requiere JS para renderizar precios.

Uso standalone (dentro del contenedor):
    python easy_scraper.py

Importación desde main.py:
    from easy_scraper import EasyScraper, scrape_easy
"""

import logging
import sys

from playwright.sync_api import Page, TimeoutError as PWTimeout

from base_scraper import BaseScraper
from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY = "easy"
STORE_CFG = STORES[STORE_KEY]
SELECTORS  = STORE_CFG["selectors"]


class EasyScraper(BaseScraper):
    """
    Scraper para Easy Chile.

    Easy usa Next.js con precios dinámicos. Requiere manejo del modal
    de selección de ubicación. Los selectores CSS son generados (sc-*).
    Aplica playwright-stealth para evitar CAPTCHAs.
    Timeout por producto: 30 segundos.
    """

    store_key = STORE_KEY
    browser_type = "firefox"

    def _get_urls(self) -> list[str]:
        return STORE_CFG["product_urls"]

    def _get_search_url(self, query: str) -> str:
        return STORE_CFG["search_url"].format(query=query.replace(" ", "%20"))

    def _scrape_search_results(self, page: Page, query: str) -> list[dict]:
        """Extrae lista de productos desde la página de búsqueda de Easy."""
        url = self._get_search_url(query)
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        self._dismiss_location_modal(page)
        page.wait_for_timeout(3_000)

        candidates = page.locator("a[href*='/p/']").all()
        if not candidates:
            candidates = page.locator("a").all()

        products = []
        seen = set()
        for el in candidates[:30]:
            try:
                href = el.get_attribute("href") or ""
                if "/p/" not in href:
                    continue
                text = el.inner_text().strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                price_match = self.parse_price(text)
                if not price_match:
                    continue
                name = text.split("$")[0].strip() if "$" in text else text[:100]
                products.append({
                    "tienda": self.store_key,
                    "nombre_producto": name,
                    "precio": price_match,
                    "url": f"https://www.easy.cl{href}" if not href.startswith("http") else href,
                    "exitoso": True
                })
            except Exception:
                continue
            if len(products) >= 10:
                break

        if products:
            return products

        try:
            page.screenshot(path=f"/tmp/debug_easy_{query[:20]}.png", full_page=True)
        except Exception: pass
        BaseScraper.dump_html(page, self.store_key, query)
        return []

    def _dismiss_location_modal(self, page: Page) -> None:
        """Cierra el modal de selección de ubicación de Easy."""
        selectors_cierre = [
            "button[aria-label='Cerrar']",
            "button[aria-label='cerrar']",
            "button.sc-modal-close",
            "[data-testid='modal-close']",
            "button:has-text('Cerrar')",
            "button:has-text('×')",
            "button:has-text('Saltar')",
        ]
        for sel in selectors_cierre:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=2_000):
                    btn.click()
                    logger.debug("[Easy] Modal de ubicación cerrado.")
                    return
            except Exception:
                continue

    def _scrape_product(self, page: Page, url: str) -> dict:
        """
        Navega a la URL del producto y extrae datos.
        Timeout total: 30 segundos (configurado en base_scraper).
        """
        result = {
            "tienda":            STORE_KEY,
            "url":               url,
            "nombre_producto":   None,
            "precio":            None,
            "precio_descuento":  None,
            "stock":             None,
            "categoria":         None,
            "insumo_id":         None,
            "exitoso":           False,
        }

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            self._dismiss_location_modal(page)

            # Easy es Next.js — esperamos que el h1 esté presente
            page.wait_for_selector(SELECTORS["name"]["css"], timeout=30_000)

            def text(css: str) -> str | None:
                el = page.query_selector(css)
                return el.inner_text().strip() if el else None

            result["nombre_producto"]  = text(SELECTORS["name"]["css"])
            result["precio"]           = self.parse_price(text(SELECTORS["price"]["css"]))

            result["precio_descuento"] = self.parse_discount_price(
                text(SELECTORS["price_discount"]["css"]),
                result["precio"],
            )

            result["stock"]            = text(SELECTORS["stock"]["css"])
            result["categoria"]        = text(SELECTORS["category"]["css"])
            result["exitoso"]          = True

            logger.info(f"[Easy] ✅ {result['nombre_producto']} — ${result['precio']}")

        except PWTimeout:
            # Criterio 1: mensaje exacto con nombre del producto (o slug de URL como fallback)
            self._handle_timeout(url, result.get("nombre_producto"))
        except Exception as e:
            logger.error(f"[Easy] ❌ Error inesperado en {url}: {e}")

        return result


def scrape_easy() -> list[dict]:
    """
    Punto de entrada compatible con main.py (llamado por APScheduler).
    Retorna lista de dicts para insertar en precio_mercado.
    """
    return EasyScraper().scrape()


# ──────────────────────────────────────────────────────────────────────────────
# Ejecución standalone: python easy_scraper.py
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )
    logger.info("=== Easy Scraper — ejecución standalone ===")
    resultados = scrape_easy()

    exitosos = [r for r in resultados if r["exitoso"]]
    logger.info(f"\n{'='*60}")
    logger.info(f"Resultados: {len(exitosos)}/{len(resultados)} productos exitosos")
    logger.info(f"{'='*60}")

    for r in exitosos:
        logger.info(
            f"  ✅ {str(r['nombre_producto'] or 'N/A'):<50} "
            f"${r['precio']:>10,.0f} CLP  |  "
            f"Stock: {r['stock'] or 'N/A'}  |  "
            f"Insumo_ID: {r.get('insumo_id', 'N/A')}"
        ) if r['precio'] is not None else logger.info(
            f"  ⚠️  {str(r['nombre_producto'] or 'N/A'):<50}  precio=None  |  "
            f"Stock: {r['stock'] or 'N/A'}  |  "
            f"Insumo_ID: {r.get('insumo_id', 'N/A')}"
        )
