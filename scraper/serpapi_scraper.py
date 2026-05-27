"""
SerpAPI Google Shopping Scraper — SIEC
======================================
Usa la API de SerpAPI (serpapi.com) para obtener resultados estructurados
de Google Shopping sin necesidad de Playwright ni anti-bot evasion.

SerpAPI maneja CAPTCHAs, proxies, y renderizado JS. Retorna JSON limpio.

Free tier: 100 busquedas/mes (suficiente para 34 insumos).
Pago: $50/mes por 5,000 busquedas.

Configuracion:
  SERPAPI_KEY — API key de serpapi.com (obligatorio)

Uso:
  python serpapi_scraper.py
"""

import json
import logging
import os
import urllib.request
from typing import Optional
from urllib.parse import quote_plus, urlencode

from normalizer import FuzzyNormalizer

logger = logging.getLogger(__name__)

SERPAPI_URL = "https://serpapi.com/search"

STORE_MAPPING = {
    "sodimac": "sodimac",
    "easy": "easy",
    "construmart": "construmart",
    "easy.cl": "easy",
    "sodimac.cl": "sodimac",
    "construmart.cl": "construmart",
    "mercadolibre": "mercadolibre",
    "falabella": "falabella",
}


def _map_store(source: str) -> str:
    """Mapea el nombre de tienda de Google Shopping a nuestra clave interna."""
    source_lower = source.lower().strip()
    for key, value in STORE_MAPPING.items():
        if key in source_lower:
            return value
    return source_lower.replace(" ", "_").replace(".", "")


class SerpAPIScraper:
    """Scraper que consulta Google Shopping via SerpAPI."""

    def __init__(self, api_key: Optional[str] = None, store_filter: Optional[str] = None):
        self.api_key = api_key or os.environ.get("SERPAPI_KEY", "") or os.environ.get("SERPAPI_METALCON_API_KEY", "")
        self.store_filter = store_filter
        if not self.api_key:
            logger.warning("[SerpAPI] No API key set. Set SERPAPI_KEY env var.")

    def scrape_by_keywords(self, insumos: list[dict]) -> list[dict]:
        """Busca cada insumo en Google Shopping via SerpAPI."""
        if not self.api_key:
            logger.error("[SerpAPI] Missing API key. Cannot scrape.")
            return []

        results = []
        for insumo in insumos:
            nombre = insumo.get("nombre", "")
            unidad = insumo.get("unidad_medida")
            insumo_id = insumo.get("id")

            logger.info(f"[SerpAPI] Buscando: '{nombre}' (ID={insumo_id})")

            products = self._search(nombre)
            if not products:
                logger.info(f"[SerpAPI] Sin resultados para '{nombre}'")
                continue

            normalizer = FuzzyNormalizer(threshold=65, unidad_medida=unidad)
            match = normalizer.filter_results(nombre, products)

            if match:
                match["insumo_id"] = insumo_id
                match["precio_descuento"] = None
                match["stock"] = "Disponible"
                match["categoria"] = insumo.get("categoria", "Obra Gruesa")
                results.append(match)
                logger.info(
                    f"[SerpAPI] MATCH: '{nombre}' -> "
                    f"'{match['nombre_producto'][:50]}' "
                    f"${match['precio']:,.0f} "
                    f"(tienda={match['tienda']}, score={match.get('match_score', 0)})"
                )
            else:
                logger.info(
                    f"[SerpAPI] Sin match para '{nombre}' "
                    f"({len(products)} candidatos)"
                )

        logger.info(f"[SerpAPI] Completado: {len(results)}/{len(insumos)} matches")
        return results

    def _search(self, query: str) -> list[dict]:
        """Ejecuta una busqueda en Google Shopping via SerpAPI."""
        params = {
            "engine": "google_shopping",
            "q": query,
            "api_key": self.api_key,
            "gl": "cl",
            "hl": "es-419",
            "location": "Chile",
            "num": "20",
        }
        url = f"{SERPAPI_URL}?{urlencode(params)}"

        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "SIEC-Scraper/1.0",
            })
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            shopping_results = data.get("shopping_results", [])
            products = []

            for item in shopping_results[:20]:
                title = (item.get("title") or "").strip()
                price_val = item.get("extracted_price")
                source = item.get("source", "")
                link = item.get("product_link") or item.get("link") or ""

                if not title:
                    continue

                if price_val is None:
                    price_str = item.get("price", "")
                    price_val = self._parse_price(price_str)

                if not price_val or price_val < 100:
                    continue

                store = _map_store(source)

                if self.store_filter and store != self.store_filter:
                    continue

                products.append({
                    "tienda": store,
                    "nombre_producto": title,
                    "precio": float(price_val),
                    "url": link,
                    "exitoso": True,
                })

            logger.debug(
                f"[SerpAPI] '{query[:40]}': {len(products)} productos "
                f"de {len(shopping_results)} resultados"
            )
            return products

        except Exception as e:
            logger.error(f"[SerpAPI] Error buscando '{query[:40]}': {e}")
            return []

    @staticmethod
    def _parse_price(price_str: str) -> Optional[float]:
        """Convierte string de precio CLP a float (ej. '$5.180' -> 5180.0)."""
        if not price_str:
            return None
        cleaned = price_str.replace("$", "").replace(" ", "").replace("CLP", "")
        cleaned = cleaned.replace(".", "").replace(",", ".")
        try:
            val = float(cleaned)
            return val if val >= 100 else None
        except ValueError:
            return None


def scrape_serpapi(store_filter: Optional[str] = None) -> list[dict]:
    """Entry point standalone (testing)."""
    from db import get_insumos_activos
    insumos = get_insumos_activos()
    if not insumos:
        logger.warning("No hay insumos activos en la DB")
        return []
    scraper = SerpAPIScraper(store_filter=store_filter)
    return scraper.scrape_by_keywords(insumos)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    key = os.environ.get("SERPAPI_KEY", "") or os.environ.get("SERPAPI_METALCON_API_KEY", "")
    if not key:
        print("ERROR: Set SERPAPI_KEY or SERPAPI_METALCON_API_KEY environment variable")
        print("  Get a key at: https://serpapi.com/")
        print("  Usage: $env:SERPAPI_KEY='your_key_here'; python serpapi_scraper.py")
        exit(1)

    logger.info("=== SerpAPI Google Shopping Scraper ===")
    r = scrape_serpapi()
    exitosos = [x for x in r if x.get("precio")]
    logger.info(f"Resultado: {len(exitosos)}/{len(r)} productos con precio")
    for x in sorted(exitosos, key=lambda k: k.get("tienda", "")):
        logger.info(
            f"  [{x.get('tienda', '?'):15s}] "
            f"{x['nombre_producto'][:50]:50s} "
            f"${x['precio']:>10,.0f}"
        )
