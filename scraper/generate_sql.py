"""Run SerpAPI scraper and export results as SQL file for psql import.
IDs corregidos segun orden real de la DB (init.sql)."""
import os, json
from datetime import datetime, timezone

os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/siec"

from serpapi_scraper import SerpAPIScraper
from fallback_prices import get_fallback_results

# CORRECT IDs from init.sql (verified against DB)
INSUMOS = [
    # Obra Gruesa (IDs 1-15)
    {"id": 1,  "nombre": "Cemento Portland", "categoria": "Obra Gruesa", "unidad_medida": "saco 25kg"},
    {"id": 2,  "nombre": "Cemento Especial", "categoria": "Obra Gruesa", "unidad_medida": "saco 25kg"},
    {"id": 3,  "nombre": "Fierro A63-42H", "categoria": "Obra Gruesa", "unidad_medida": "barra 4.71kg"},
    {"id": 4,  "nombre": "Arena Gruesa", "categoria": "Obra Gruesa", "unidad_medida": "metro cuadrado"},
    {"id": 5,  "nombre": "Ripio", "categoria": "Obra Gruesa", "unidad_medida": "metro cuadrado"},
    {"id": 6,  "nombre": "Agua", "categoria": "Obra Gruesa", "unidad_medida": "litro"},
    {"id": 7,  "nombre": "Perfil C 60x38", "categoria": "Obra Gruesa", "unidad_medida": "unidad"},
    {"id": 8,  "nombre": "Perfil U 62x25", "categoria": "Obra Gruesa", "unidad_medida": "unidad"},
    {"id": 9,  "nombre": "Perfil Omega", "categoria": "Obra Gruesa", "unidad_medida": "unidad"},
    {"id": 10, "nombre": "Pino Dimensionado 2x3", "categoria": "Obra Gruesa", "unidad_medida": "unidad"},
    {"id": 11, "nombre": "Pino Dimensionado 2x4", "categoria": "Obra Gruesa", "unidad_medida": "unidad"},
    {"id": 12, "nombre": "Terciado Estructural 12mm", "categoria": "Obra Gruesa", "unidad_medida": "plancha"},
    {"id": 13, "nombre": "Tornillo Volcanita", "categoria": "Obra Gruesa", "unidad_medida": "caja"},
    {"id": 14, "nombre": "Tornillo Madera", "categoria": "Obra Gruesa", "unidad_medida": "caja"},
    {"id": 15, "nombre": "Tornillo Autoperforante", "categoria": "Obra Gruesa", "unidad_medida": "caja"},
    # Terminaciones (IDs 16-24)
    {"id": 16, "nombre": "Volcanita RH Standard", "categoria": "Terminaciones", "unidad_medida": "plancha"},
    {"id": 17, "nombre": "Volcanita RH Reforzado", "categoria": "Terminaciones", "unidad_medida": "plancha"},
    {"id": 18, "nombre": "Pintura Acrilica Blanca", "categoria": "Terminaciones", "unidad_medida": "litro"},
    {"id": 19, "nombre": "Pintura Esmalte", "categoria": "Terminaciones", "unidad_medida": "litro"},
    {"id": 20, "nombre": "Ceramica Piso", "categoria": "Terminaciones", "unidad_medida": "metro cuadrado"},
    {"id": 21, "nombre": "Ceramica Muro", "categoria": "Terminaciones", "unidad_medida": "metro cuadrado"},
    {"id": 22, "nombre": "Piso Flotante", "categoria": "Terminaciones", "unidad_medida": "metro cuadrado"},
    {"id": 23, "nombre": "Adhesivo Ceramico", "categoria": "Terminaciones", "unidad_medida": "kg"},
    {"id": 24, "nombre": "Lechada Ceramica", "categoria": "Terminaciones", "unidad_medida": "kg"},
    # Instalaciones (IDs 25-34)
    {"id": 25, "nombre": "Cable H07Z1-K 1x2.5mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 26, "nombre": "Cable H07Z1-K 1x4mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 27, "nombre": "Cable H07Z1-K 1x6mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 28, "nombre": "Tubo PVC Agua 110mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 29, "nombre": "Tubo PVC Agua 75mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 30, "nombre": "Tubo PVC Agua 50mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 31, "nombre": "Tubo Cobre 15mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 32, "nombre": "Tubo Cobre 22mm", "categoria": "Instalaciones", "unidad_medida": "metro lineal"},
    {"id": 33, "nombre": "Caja Electrica Embutida", "categoria": "Instalaciones", "unidad_medida": "unidad"},
    {"id": 34, "nombre": "Disyuntor Termomagnetico", "categoria": "Instalaciones", "unidad_medida": "unidad"},
]

def escape_sql(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

print(f"Insumos: {len(INSUMOS)}")

scraper = SerpAPIScraper()
resultados = scraper.scrape_by_keywords(INSUMOS)
exitosos = [r for r in resultados if r.get("exitoso") and r.get("precio")]
print(f"SerpAPI: {len(exitosos)} matches")

cubiertos = set(r["insumo_id"] for r in exitosos if r.get("insumo_id"))
pendientes = [i for i in INSUMOS if i.get("id") not in cubiertos]
print(f"Cubiertos: {len(cubiertos)}, Pendientes: {len(pendientes)}")

fb_results = get_fallback_results(pendientes) if pendientes else []
print(f"Fallback: {len(fb_results)}")

all_results = exitosos + fb_results

ahora = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
sql_lines = []
sql_lines.append("-- SIEC scraped prices - SerpAPI + fallback")
sql_lines.append(f"-- Date: {ahora}")
sql_lines.append("")

for r in all_results:
    iid = r.get("insumo_id")
    if iid is None:
        continue
    tienda = str(r.get("tienda", ""))[:50]
    nombre = str(r.get("nombre_producto", ""))[:200]
    precio = r.get("precio")
    if precio is None:
        continue
    url = str(r.get("url", ""))[:500]
    stock = str(r.get("stock", "Disponible"))[:50]
    cat = str(r.get("categoria", "Obra Gruesa"))[:50]

    sql_lines.append(
        f"INSERT INTO precio_mercado "
        f"(\"Insumo_ID\", \"Tienda\", \"Nombre_Producto\", \"Precio\", \"Precio_Descuento\", "
        f"\"Stock\", \"Categoria\", \"URL\", \"Fecha_Scraping\", \"Exitoso\") VALUES ("
        f"{iid}, {escape_sql(tienda)}, {escape_sql(nombre)}, {precio}, NULL, "
        f"{escape_sql(stock)}, {escape_sql(cat)}, {escape_sql(url)}, "
        f"'{ahora}', TRUE);"
    )

output_file = os.path.join(os.path.dirname(__file__), "seeds_precios.sql")
with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"\nGenerated {len(sql_lines)-3} INSERTs -> {output_file}")

json_file = os.path.join(os.path.dirname(__file__), "serpapi_results.json")
with open(json_file, "w", encoding="utf-8") as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
print(f"JSON dump: {json_file}")
