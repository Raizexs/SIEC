# scraper/scrapers/sodimac.py
"""
Scraper Sodimac — extrae nombre, precio, precio_descuento, stock y categoría
de las URLs de producto definidas en config.py usando Playwright (headless).
"""

import logging
import re
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY  = "sodimac"
STORE_CFG  = STORES[STORE_KEY]
SELECTORS  = STORE_CFG["selectors"]
URLS       = STORE_CFG["product_urls"]


def _parse_price(raw: str | None) -> float | None:
    """Convierte '$ 2.851' → 2851.0"""
    if not raw:
        return None
    cleaned = re.sub(r"[^\d,]", "", raw).replace(",", ".")
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def _scrape_product(page, url: str) -> dict:
    """Navega a una URL de producto y extrae los campos definidos."""
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

        # Cerrar modal de región/cookies si aparece
        try:
            page.locator("button[aria-label='Cerrar'], button.modal-close, .modal-overlay button").first.click(timeout=4_000)
        except Exception:
            pass  # No hay modal

        # Esperar carga del nombre del producto
        page.wait_for_selector(SELECTORS["name"]["css"], timeout=20_000)

        def text(css: str) -> str | None:
            el = page.query_selector(css)
            return el.inner_text().strip() if el else None

        result["nombre_producto"] = text(SELECTORS["name"]["css"])
        result["precio"]          = _parse_price(text(SELECTORS["price"]["css"]))
        result["precio_descuento"]= _parse_price(text(SELECTORS["price_discount"]["css"]))
        result["stock"]           = text(SELECTORS["stock"]["css"])
        result["categoria"]       = text(SELECTORS["category"]["css"])
        result["exitoso"]         = True

        logger.info(f"[Sodimac] ✅ {result['nombre_producto']} — ${result['precio']}")

    except PWTimeout:
        logger.warning(f"[Sodimac] ⏱ Timeout en {url}")
    except Exception as e:
        logger.error(f"[Sodimac] ❌ Error en {url}: {e}")

    return result


def scrape_sodimac() -> list[dict]:
    """
    Punto de entrada del scraper Sodimac.
    Retorna lista de dicts listos para insertar en precio_mercado.
    """
    logger.info(f"[Sodimac] Iniciando scraping de {len(URLS)} productos…")
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
    logger.info(f"[Sodimac] Completado: {exitosos}/{len(results)} exitosos.")
    return results
