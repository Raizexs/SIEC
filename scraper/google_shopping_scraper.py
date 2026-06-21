"""
Google Shopping Scraper — SIEC
===============================
Usa Playwright para buscar productos en Google Shopping (tbm=shop)
y extraer precios, nombres, tienda y URL.

A diferencia de los intentos previos (HTTP plano), este scraper usa
un browser real que renderiza el JavaScript que Google Shopping requiere.

Estrategia por producto:
  1. Cargar Google Shopping con query: "{insumo} sodimac" o "{insumo} easy"
  2. Extraer product cards del DOM + JSON-LD embebido
  3. Aplicar FuzzyNormalizer para mapear al catalogo de insumos
  4. Retornar dict estandar compatible con insertar_precios()
"""

import json
import logging
import random
import re
import time
from typing import Optional
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout

from normalizer import FuzzyNormalizer
from config import STORES

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => false });
Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
Object.defineProperty(navigator, 'languages', { get: () => ['es-CL', 'es', 'en'] });
window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (p) => p.name === 'notifications' ?
    Promise.resolve({ state: 'denied' }) : originalQuery(p);
"""

GOOGLE_SHOPPING_URL = "https://www.google.com/search?tbm=shop&q={query}&hl=es-419&gl=cl&uule=w+CAIQICINQ2hpbGUgUmVnaW9u"

SEARCH_TEMPLATES = {
    "sodimac": 'site:sodimac.cl "{producto}"',
    "easy": 'site:easy.cl "{producto}"',
    "construmart": 'site:construmart.cl "{producto}"',
}


def _parse_clp(text: str) -> Optional[float]:
    """Extrae precio en CLP desde texto con formato chileno ($5.180, $1.599.000, $ 5.180)."""
    if not text:
        return None
    cleaned = text.replace(" ", "").replace("$", "").replace("CLP", "")
    if not cleaned:
        return None
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        val = float(cleaned)
        return val if val >= 100 else None
    except ValueError:
        return None


def _extract_shopping_results(page: Page) -> list[dict]:
    """Extrae productos visibles desde la pagina de Google Shopping."""
    products = []
    seen = set()

    # Estrategia 1: JSON-LD embebido (Google a veces incluye Product schema)
    try:
        for raw in page.locator("script[type='application/ld+json']").all_inner_texts():
            if not raw.strip():
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                if item.get("@type") == "Product":
                    name = (item.get("name") or "").strip()
                    offers = item.get("offers") or {}
                    if isinstance(offers, list):
                        offers = offers[0] if offers else {}
                    price_raw = offers.get("price")
                    price = _parse_clp(str(price_raw)) if price_raw else None
                    url_p = item.get("url") or ""
                    if name and price and name not in seen:
                        seen.add(name)
                        products.append({
                            "tienda": "sodimac",
                            "nombre_producto": name,
                            "precio": price,
                            "url": url_p,
                            "exitoso": True,
                        })
    except Exception:
        pass

    # Estrategia 2: DOM — buscar cards de producto con estructura conocida
    card_selectors = [
        "div.sh-dgr__grid-result",
        "div.sh-dlr__list-result",
        "div[data-docid]",
        "div.sh-pr__product-results-grid > div",
        "g-inner-card",
    ]
    for sel in card_selectors:
        try:
            cards = page.locator(sel).all()
            if cards:
                break
        except Exception:
            cards = []

    for card in cards:
        try:
            text = card.inner_text().strip()
            if not text or len(text) < 10:
                continue

            lines = [l.strip() for l in text.split("\n") if l.strip()]
            if not lines:
                continue

            name = lines[0][:120] if lines else ""
            price = None
            store = "sodimac"
            url_p = ""

            for line in lines:
                p = _parse_clp(line)
                if p:
                    price = p
                    break

            if "easy" in text.lower() and "sodimac" not in text.lower():
                store = "easy"
            elif "construmart" in text.lower():
                store = "construmart"

            if price and name not in seen:
                seen.add(name)
                products.append({
                    "tienda": store,
                    "nombre_producto": name,
                    "precio": price,
                    "url": url_p,
                    "exitoso": True,
                })
        except Exception:
            continue

    # Estrategia 3: Regex sobre HTML crudo — ultimo recurso
    if not products:
        try:
            html = page.content()
            price_pattern = re.compile(
                r'(?:[\$]|CLP\s*)\s*([\d]{1,3}(?:\.[\d]{3})*(?:,\d{2})?)\s*(?:CLP)?',
                re.IGNORECASE,
            )
            prices_found = []
            for m in price_pattern.finditer(html):
                raw = m.group(0).replace(" ", "").replace("$", "").replace("CLP", "")
                val = raw.replace(".", "").replace(",", ".")
                try:
                    p = float(val)
                    if 100 <= p <= 5000000:
                        prices_found.append(p)
                except ValueError:
                    continue
            if prices_found:
                logger.info(
                    f"[GoogleShopping] Regex fallback: {len(prices_found)} precios "
                    f"encontrados en HTML crudo (rango: ${min(prices_found):,.0f} - ${max(prices_found):,.0f})"
                )
        except Exception:
            pass

    logger.debug(f"[GoogleShopping] Extraidos {len(products)} productos del DOM + JSON-LD")
    return products


class GoogleShoppingScraper:
    """Scraper que consulta Google Shopping para encontrar precios de materiales."""

    def __init__(self, store_filter: str = "sodimac"):
        self.store_filter = store_filter
        self.store_key = "sodimac" if store_filter == "sodimac" else store_filter

    def scrape_by_keywords(self, insumos: list[dict]) -> list[dict]:
        """Busca cada insumo en Google Shopping y retorna los mejores matches."""
        results = []

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-extensions",
                ],
            )
            context = browser.new_context(
                user_agent=USER_AGENT,
                locale="es-CL",
                timezone_id="America/Santiago",
                viewport={"width": 1366, "height": 768},
                extra_http_headers={
                    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            )
            context.add_init_script(STEALTH_SCRIPT)
            page = context.new_page()
            page.set_default_timeout(20_000)

            for i, insumo in enumerate(insumos):
                query = self._build_query(insumo["nombre"])
                url = GOOGLE_SHOPPING_URL.format(query=quote_plus(query))
                unidad = insumo.get("unidad_medida")

                try:
                    logger.info(
                        f"[GoogleShopping:{self.store_filter}] "
                        f"({i+1}/{len(insumos)}) Buscando: '{insumo['nombre']}'"
                    )
                    page.goto(url, wait_until="domcontentloaded", timeout=20_000)
                    page.wait_for_timeout(random.randint(2000, 3500))

                    products = _extract_shopping_results(page)

                    if products:
                        normalizer = FuzzyNormalizer(threshold=65, unidad_medida=unidad)
                        match = normalizer.filter_results(insumo["nombre"], products)
                        if match:
                            match["insumo_id"] = insumo["id"]
                            match["tienda"] = self.store_key
                            match["precio_descuento"] = None
                            match["stock"] = "Disponible"
                            match["categoria"] = insumo.get("categoria", "Obra Gruesa")
                            results.append(match)
                            logger.info(
                                f"[GoogleShopping:{self.store_filter}] "
                                f"MATCH: '{insumo['nombre']}' -> "
                                f"'{match['nombre_producto'][:50]}' "
                                f"${match['precio']:,.0f} (score={match.get('match_score', 0)})"
                            )
                        else:
                            logger.info(
                                f"[GoogleShopping:{self.store_filter}] "
                                f"Sin match para '{insumo['nombre']}' "
                                f"({len(products)} candidatos)"
                            )
                    else:
                        logger.info(
                            f"[GoogleShopping:{self.store_filter}] "
                            f"Sin resultados para '{insumo['nombre']}'"
                        )
                except PWTimeout:
                    logger.warning(
                        f"[GoogleShopping:{self.store_filter}] "
                        f"Timeout buscando '{insumo['nombre']}'"
                    )
                except Exception as e:
                    logger.error(
                        f"[GoogleShopping:{self.store_filter}] "
                        f"Error buscando '{insumo['nombre']}': {e}"
                    )

                # Delay humano entre queries (2-4s) para evitar rate-limiting
                time.sleep(random.randint(2, 4))

            context.close()
            browser.close()

        logger.info(
            f"[GoogleShopping:{self.store_filter}] "
            f"Completado: {len(results)}/{len(insumos)} con precio"
        )
        return results

    def _build_query(self, nombre_insumo: str) -> str:
        """Construye query optimizado para Google Shopping con filtro de tienda."""
        template = SEARCH_TEMPLATES.get(self.store_filter, SEARCH_TEMPLATES["sodimac"])
        return template.format(producto=nombre_insumo)


def scrape_google_shopping(store: str = "sodimac") -> list[dict]:
    """Entry point standalone (testing)."""
    from db import get_insumos_activos
    insumos = get_insumos_activos()
    if not insumos:
        logger.warning("No hay insumos activos en la DB")
        return []
    scraper = GoogleShoppingScraper(store_filter=store)
    return scraper.scrape_by_keywords(insumos)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger.info("=== Google Shopping Scraper — ejecucion standalone ===")
    r = scrape_google_shopping("sodimac")
    exitosos = [x for x in r if x.get("precio")]
    logger.info(f"Resultado: {len(exitosos)}/{len(r)} productos con precio")
    for x in exitosos:
        logger.info(f"  {x['nombre_producto'][:60]} ${x['precio']:>8,.0f}")
