import os
import psycopg2

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/siec")
conn = psycopg2.connect(db_url)
with conn.cursor() as cur:
    cur.execute('SELECT "Nombre_Producto", "Tienda", "Precio", "URL" FROM precio_mercado ORDER BY "Fecha_Scraping" DESC LIMIT 10;')
    rows = cur.fetchall()
    print("Últimos precios:")
    for r in rows:
        print(r)
