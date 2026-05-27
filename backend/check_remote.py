import psycopg2

remote_db = "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

print("Conectando a Supabase para verificar los datos...")
try:
    conn = psycopg2.connect(remote_db)
    with conn.cursor() as cur:
        # Check how many recent records have real URLs (not oshop fallback)
        cur.execute("""
            SELECT "Tienda", "Nombre_Producto", "Precio", "URL"
            FROM precio_mercado 
            ORDER BY "Fecha_Scraping" DESC 
            LIMIT 5;
        """)
        rows = cur.fetchall()
        print("Últimos 5 precios guardados en Producción:")
        for r in rows:
            print(f"[{r[0]}] {r[1][:30]}... ${r[2]:.0f}")
            print(f"URL: {r[3]}")
except Exception as e:
    print(f"Error: {e}")
