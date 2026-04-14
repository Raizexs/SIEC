# scraper/scrapers/construmart.py
"""
Scraper Construmart — extrae nombre, precio, precio_descuento, stock y categoría
de las URLs de producto definidas en config.py usando Playwright (headless).

Nota: Construmart requiere seleccionar tienda/sucursal para precios exactos.
Los selectores genéricos (.product-name, h1) son más estables.
"""

import logging
import re
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY  = "construmart"
STORE_CFG  = STORES[STORE_KEY]
SELECTORS  = STORE_CFG["selectors"]
URLS       = STORE_CFG["product_urls"]


def _parse_price(raw: str | None) -> float | None:
    """Convierte '$3.990' / '3.990' → 3990.0"""
    if not raw:
        return None
    cleaned = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def _dismiss_store_modal(page) -> None:
    """Intenta cerrar el modal de selección de tienda/sucursal."""
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
        _dismiss_store_modal(page)

        # Intentar esperar el nombre del producto (selector multi)
        # Los selectores de Construmart son CSS multi-selector (", "); tomamos el primero
        primary_name_sel = SELECTORS["name"]["css"].split(",")[0].strip()
        page.wait_for_selector(primary_name_sel, timeout=20_000)

        def text(css: str) -> str | None:
            """Soporta selectores múltiples separados por ','."""
            for sel in [s.strip() for s in css.split(",")]:
                el = page.query_selector(sel)
                if el:
                    return el.inner_text().strip()
            return None

        result["nombre_producto"] = text(SELECTORS["name"]["css"])
        result["precio"]          = _parse_price(text(SELECTORS["price"]["css"]))
        result["precio_descuento"]= _parse_price(text(SELECTORS["price_discount"]["css"]))
        result["stock"]           = text(SELECTORS["stock"]["css"])
        result["categoria"]       = text(SELECTORS["category"]["css"])
        result["exitoso"]         = True

        logger.info(f"[Construmart] ✅ {result['nombre_producto']} — ${result['precio']}")

    except PWTimeout:
        logger.warning(f"[Construmart] ⏱ Timeout en {url}")
    except Exception as e:
        logger.error(f"[Construmart] ❌ Error en {url}: {e}")

    return result


def scrape_construmart() -> list[dict]:
    """
    Punto de entrada del scraper Construmart.
    Retorna lista de dicts listos para insertar en precio_mercado.
    """
    logger.info(f"[Construmart] Iniciando scraping de {len(URLS)} productos…")
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
    logger.info(f"[Construmart] Completado: {exitosos}/{len(results)} exitosos.")
    return results
