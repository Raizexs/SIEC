# scraper/scrapers/easy.py
"""
Scraper Easy — extrae nombre, precio, precio_descuento, stock y categoría
de las URLs de producto definidas en config.py usando Playwright (headless).

Nota: Easy requiere seleccionar una ubicación para mostrar stock.
Los selectores usan clases CSS generadas (sc-*) que pueden cambiar.
"""

import logging
import re
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY  = "easy"
STORE_CFG  = STORES[STORE_KEY]
SELECTORS  = STORE_CFG["selectors"]
URLS       = STORE_CFG["product_urls"]


def _parse_price(raw: str | None) -> float | None:
    """Convierte '$ 5.510' → 5510.0"""
    if not raw:
        return None
    cleaned = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def _dismiss_location_modal(page) -> None:
    """Intenta cerrar el modal de selección de ubicación de Easy."""
    selectors_cierre = [
        "button[aria-label='Cerrar']",
        "button[aria-label='cerrar']",
        "button.sc-modal-close",
        "[data-testid='modal-close']",
        "button:has-text('Cerrar')",
        "button:has-text('×')",
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


def _scrape_product(page, url: str) -> dict:
    result = {
        "tienda": STORE_KEY,
        "url": url,
        "nombre_producto": None,
        "precio": None,
        "precio_descuento": None,
        "stock": None,
        "categoria": None,
        "exitoso": False,
    }

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        _dismiss_location_modal(page)

        # Easy es Next.js — esperamos que el h1 aparezca
        page.wait_for_selector(SELECTORS["name"]["css"], timeout=25_000)

        def text(css: str) -> str | None:
            el = page.query_selector(css)
            return el.inner_text().strip() if el else None

        result["nombre_producto"] = text(SELECTORS["name"]["css"])
        result["precio"]          = _parse_price(text(SELECTORS["price"]["css"]))
        result["precio_descuento"]= _parse_price(text(SELECTORS["price_discount"]["css"]))
        result["stock"]           = text(SELECTORS["stock"]["css"])
        result["categoria"]       = text(SELECTORS["category"]["css"])
        result["exitoso"]         = True

        logger.info(f"[Easy] ✅ {result['nombre_producto']} — ${result['precio']}")

    except PWTimeout:
        logger.warning(f"[Easy] ⏱ Timeout en {url}")
    except Exception as e:
        logger.error(f"[Easy] ❌ Error en {url}: {e}")

    return result


def scrape_easy() -> list[dict]:
    """
    Punto de entrada del scraper Easy.
    Retorna lista de dicts listos para insertar en precio_mercado.
    """
    logger.info(f"[Easy] Iniciando scraping de {len(URLS)} productos…")
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="es-CL",
        )
        page = context.new_page()
        page.set_default_timeout(30_000)

        for url in URLS:
            results.append(_scrape_product(page, url))

        browser.close()

    exitosos = sum(1 for r in results if r["exitoso"])
    logger.info(f"[Easy] Completado: {exitosos}/{len(results)} exitosos.")
    return results
