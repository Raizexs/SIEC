# DEPRECATED — SCRUM-125 (2026-06-23)
# Este script está DESACTIVADO y NO debe ejecutarse ni integrarse al scheduler.
#
# Motivo: Los IDs 46-51 referenciados aquí (clavos, zinc, costaneras, lana de vidrio)
# NO EXISTEN en la tabla Insumo de la DB. El init.sql define insumos hasta ID 38.
# Ejecutar este script generaría SQL inválido (violación FK en precio_mercado).
#
# Alternativa: Los insumos complementarios deben agregarse primero a la tabla Insumo
# con una migración SQL, y luego registrar sus fallback_prices en fallback_prices.py.
# Ver SCRUM-125 para el contexto completo.
#
# Código original conservado abajo solo para referencia histórica.
# ─────────────────────────────────────────────────────────────────────────────
"""DEPRECATED — ver comentario de cabecera. Scrapea insumos complementarios via SerpAPI."""
import os, sys, json, logging
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))
from serpapi_scraper import SerpAPIScraper

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

INSUMOS = [
    {"id": 46, "nombre": "Clavos estriados 3 pulgadas", "unidad_medida": "caja 100un", "categoria": "Obra Gruesa"},
    {"id": 47, "nombre": "Clavos estriados 4 pulgadas", "unidad_medida": "caja 100un", "categoria": "Obra Gruesa"},
    {"id": 48, "nombre": "Lana vidrio 50mm rollo", "unidad_medida": "rollo", "categoria": "Obra Gruesa"},
    {"id": 49, "nombre": "Plancha zinc 0.85x2.5m", "unidad_medida": "unidad", "categoria": "Techumbre"},
    {"id": 50, "nombre": "Costanera pino 2x2", "unidad_medida": "pieza 3.2m", "categoria": "Techumbre"},
    {"id": 51, "nombre": "Tornillo techo golilla neopreno", "unidad_medida": "caja 100un", "categoria": "Techumbre"},
]

def main():
    key = os.environ.get("SERPAPI_KEY", "") or os.environ.get("SERPAPI_METALCON_API_KEY", "")
    if not key:
        print("ERROR: Set SERPAPI_METALCON_API_KEY env var")
        return

    scraper = SerpAPIScraper(api_key=key)
    results = scraper.scrape_by_keywords(INSUMOS)

    print(f"\nScraped {len(results)}/{len(INSUMOS)} insumos")
    output_path = os.path.join(os.path.dirname(__file__), "serpapi_complementarios.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Saved to: {output_path}")

    # Generate SQL for each result
    fecha = date.today().isoformat()
    for r in results:
        url = r.get("url", "")
        print(f"""
INSERT INTO precio_mercado ("Insumo_ID", "Tienda", "Nombre_Producto", "Precio", "Precio_Descuento", "Stock", "Categoria", "URL", "Fecha_Scraping", "Exitoso")
VALUES ({r['insumo_id']}, '{r['tienda']}', '{r['nombre_producto'].replace(chr(39), chr(39)+chr(39))}', {r['precio']}, NULL, 'Disponible', '{r.get('categoria', 'Obra Gruesa')}', '{url}', '{fecha}', TRUE);""")

if __name__ == "__main__":
    main()
