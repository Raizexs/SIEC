# DEPRECATED — SCRUM-125 (2026-06-23)
# Este scraper NO está integrado al pipeline nocturno (main.py).
# El scraper activo es SerpAPIScraper, que consulta Google Shopping via API.
# SodimacScraper hace HTTP directo a PDPs específicos y falla frecuentemente
# por bloqueos de bot detection. Conservado para referencia futura.
# Para reactivar: agregar ("Sodimac", SodimacScraper()) a la lista scrapers en main.py.
# ─────────────────────────────────────────────────────────────────────────────
# scraper/sodimac_scraper.py
"""
Scraper Sodimac — standalone, sin Playwright.
Usa HTTP directo + JSON-LD del HTML.
"""
import json, logging, re, urllib.request
from config import STORES

logger = logging.getLogger(__name__)

STORE_KEY = "sodimac"
STORE_CFG = STORES[STORE_KEY]

INSUMO_ID_BY_NAME = {
    "Cemento Portland": 1, "Cemento Polpaico": 2, "Cemento Especial": 2,
    "Fierro A63-42H": 3, "Fierro de construccion": 3,
    "Arena Gruesa": 4, "Arena gruesa": 4, "Ripio": 5, "Gravilla": 5,
    "Agua": 6, "Pino 2x3": 7, "Pino 2x4": 8, "Pino Dimensionado 2x3": 7,
    "Pino Dimensionado 2x4": 8, "Volcanita RH Standard": 9,
    "Volcanita RH Reforzado": 10, "Pintura Acrilica Blanca": 11,
    "Pintura Esmalte": 12, "Esmalte": 12, "Ceramica Piso": 13,
    "Ceramica de piso": 13, "Ceramica Muro": 14, "Ceramica de muro": 14,
    "Piso Flotante": 15, "Adhesivo Ceramico": 16, "Lechada Ceramica": 17,
    "Cable 2.5mm": 18, "Cable 4mm": 19, "Cable 6mm": 20,
    "Tubo PVC 110": 21, "Tubo PVC 75": 22, "Tubo PVC 50": 23,
    "Tubo Cobre 15": 24, "Tubo Cobre 22": 25,
    "Caja Electrica": 26, "Disyuntor": 27,
    "Perfil C 60x38": 32, "Perfil Metalcon C": 32,
    "Perfil U 62x25": 33, "Perfil Metalcon U": 33,
    "Perfil Omega": 34, "Terciado": 35, "Terciado Estructural": 35,
    "Tornillo Volcanita": 36, "Tornillo Madera": 37, "Tornillo Autoperforante": 38,
}

def _map_insumo_id(nombre: str) -> int | None:
    n = nombre.lower().strip()
    for key, iid in INSUMO_ID_BY_NAME.items():
        if key.lower() in n:
            return iid
    return None


class SodimacScraper:
    store_key = STORE_KEY

    def scrape(self) -> list[dict]:
        return self.scrape_by_keywords([])

    def scrape_by_keywords(self, insumos: list[dict]) -> list[dict]:
        results = []
        for url in STORE_CFG["product_urls"]:
            prod = self._http_scrape_pdp(url)
            if prod and prod.get("precio"):
                iid = _map_insumo_id(prod["nombre_producto"])
                results.append({
                    "tienda": STORE_KEY, "nombre_producto": prod["nombre_producto"],
                    "precio": prod["precio"], "precio_descuento": None,
                    "stock": "Disponible", "categoria": "Obra Gruesa",
                    "url": url, "insumo_id": iid, "exitoso": True,
                })
        logger.info(f"[Sodimac] HTTP: {len(results)}/{len(STORE_CFG['product_urls'])} productos con precio")
        return results

    def _http_scrape_pdp(self, url: str) -> dict | None:
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
                logger.info(f"[Sodimac] {name[:60]} ${price:,.0f}")
                return {"nombre_producto": name.strip(), "precio": price}
            logger.debug(f"[Sodimac] Sin datos: {url[:80]}")
            return None
        except Exception as e:
            logger.debug(f"[Sodimac] Fallo: {url[:80]} — {e}")
            return None


def scrape_sodimac() -> list[dict]:
    return SodimacScraper().scrape()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    r = scrape_sodimac()
    ok = [x for x in r if x["exitoso"]]
    print(f"OK: {len(ok)}/{len(r)}")
    for x in ok:
        print(f"  {x['nombre_producto'][:50]} ${x['precio']:>8,.0f} -> insumo_id={x['insumo_id']}")
