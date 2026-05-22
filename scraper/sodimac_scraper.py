# scraper/sodimac_scraper.py
"""
Scraper Sodimac — microservicio SIEC.

Extrae precios de materiales de construcción desde Sodimac Chile,
usando Playwright con playwright-stealth para evitar detección de bots.
Filtra productos relevantes para la Región de Valparaíso.

Uso standalone (dentro del contenedor):
    python sodimac_scraper.py

Importación desde main.py:
    from sodimac_scraper import SodimacScraper, scrape_sodimac
"""

import logging
import sys

from playwright.sync_api import Page, TimeoutError as PWTimeout

from base_scraper import BaseScraper
from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY = "sodimac"
STORE_CFG = STORES[STORE_KEY]
SELECTORS  = STORE_CFG["selectors"]


class SodimacScraper(BaseScraper):
    """
    Scraper para Sodimac Chile.

    Navega a URLs directas de producto (PDP) de la categoría
    materiales de construcción filtrados por Región de Valparaíso.
    Aplica playwright-stealth para evitar CAPTCHAs.
    Timeout por producto: 30 segundos.
    """

    store_key = STORE_KEY
    browser_type = "firefox"

    def _get_urls(self) -> list[str]:
        return STORE_CFG["product_urls"]

    def _get_search_url(self, query: str) -> str:
        return STORE_CFG["search_url"].format(query=query.replace(" ", "+"))

    def _scrape_search_results(self, page: Page, query: str) -> list[dict]:
        """Extrae lista de productos desde la página de búsqueda de Sodimac."""
        url = self._get_search_url(query)
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        self._dismiss_modal(page)
        page.wait_for_timeout(3_000)

        # Buscar cualquier elemento que parezca un producto por su href
        candidates = page.locator("a[href*='/articulo/'], a[href*='/sodimac-cl/']").all()
        if not candidates:
            candidates = page.locator("a").all()
        
        products = []
        seen = set()
        for el in candidates[:30]:
            try:
                href = el.get_attribute("href") or ""
                if "/articulo/" not in href:
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
                    "url": f"https://www.sodimac.cl{href}" if not href.startswith("http") else href,
                    "exitoso": True
                })
            except Exception:
                continue
            if len(products) >= 10:
                break
        
        if products:
            return products

        # Debug: screenshot + HTML
        try:
            page.screenshot(path=f"/tmp/debug_sodimac_{query[:20]}.png", full_page=True)
        except Exception: pass
        BaseScraper.dump_html(page, self.store_key, query)
        return []

        # 2. Intentar scraping por DOM con detección automática de contenedores
        candidates = page.locator("a[href*='/articulo/'], a[href*='/sodimac-cl/'], [class*='product'], [class*='card'], [data-testid]").all()
        if not candidates:
            candidates = page.locator("a").all()
        
        products = []
        seen = set()
        for el in candidates[:30]:
            try:
                href = el.get_attribute("href") or ""
                if "/articulo/" not in href and "/sodimac-cl/" not in href:
                    continue
                # Obtener todo el texto del elemento y sus hijos
                text = el.inner_text().strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                # Intentar extraer precio del texto (ej. "$1.234" o "$ 1.234")
                price_match = self.parse_price(text)
                if not price_match:
                    continue
                name = text.split("$")[0].strip() if "$" in text else text[:80]
                products.append({
                    "tienda": self.store_key,
                    "nombre_producto": name,
                    "precio": price_match,
                    "url": f"https://www.sodimac.cl{href}" if not href.startswith("http") else href,
                    "exitoso": True
                })
            except Exception:
                continue
            if len(products) >= 10:
                break
        
        if products:
            return products

        # 3. Fallback total: tomar screenshot y guardar HTML para debug
        try:
            ts = __import__("datetime").datetime.now().strftime("%Y%m%d_%H%M%S")
            page.screenshot(path=f"/tmp/debug_{self.store_key}_{query[:20]}_{ts}.png")
            logger.info(f"[Debug] Screenshot guardado")
        except Exception as e:
            logger.warning(f"[Debug] No se pudo tomar screenshot: {e}")
        BaseScraper.dump_html(page, self.store_key, query)
        return []

        products = []
        cards = page.locator(sel_cont).all()
        
        for card in cards[:10]: # Limitar a los primeros 10 resultados
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
                        link = f"https://www.sodimac.cl{link}"

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

    def _dismiss_modal(self, page: Page) -> None:
        """Cierra modal de región/cookies si aparece al cargar la página."""
        selectors_cierre = [
            "button[aria-label='Cerrar']",
            "button.modal-close",
            ".modal-overlay button",
            "button:has-text('Cerrar')",
            "[data-testid='close-button']",
        ]
        for sel in selectors_cierre:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=2_000):
                    btn.click()
                    logger.debug("[Sodimac] Modal cerrado.")
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
            self._dismiss_modal(page)

            # Sodimac es React/SPA — esperar que el contenido cargue
            page.wait_for_selector(SELECTORS["name"]["css"].split(',')[0].strip(), timeout=30_000)
            # Pequeña espera por el precio que suele cargar justo después
            page.wait_for_timeout(2000)

            def text(css: str) -> str | None:
                for sel in [s.strip() for s in css.split(",")]:
                    el = page.query_selector(sel)
                    if el:
                        val = el.inner_text().strip()
                        if val: return val
                return None

            result["nombre_producto"]  = text(SELECTORS["name"]["css"])
            result["precio"]           = self.parse_price(text(SELECTORS["price"]["css"]))

            result["precio_descuento"] = self.parse_discount_price(
                text(SELECTORS["price_discount"]["css"]),
                result["precio"],
            )

            result["stock"]            = text(SELECTORS["stock"]["css"])
            result["categoria"]       = text(SELECTORS["category"]["css"])
            result["exitoso"]          = True

            logger.info(f"[Sodimac] ✅ {result['nombre_producto']} — ${result['precio']}")

        except PWTimeout:
            # Criterio 1: mensaje exacto con nombre del producto (o slug de URL como fallback)
            self._handle_timeout(url, result.get("nombre_producto"))
        except Exception as e:
            logger.error(f"[Sodimac] ❌ Error inesperado en {url}: {e}")

        return result


def scrape_sodimac() -> list[dict]:
    """
    Punto de entrada compatible con main.py (llamado por APScheduler).
    Retorna lista de dicts para insertar en precio_mercado.
    """
    return SodimacScraper().scrape()


# ──────────────────────────────────────────────────────────────────────────────
# Ejecución standalone: python sodimac_scraper.py
# (Criterio de validación de la tarea)
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )
    logger.info("=== Sodimac Scraper — ejecución standalone ===")
    resultados = scrape_sodimac()

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
