import psycopg2

remote_db = "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

try:
    conn = psycopg2.connect(remote_db)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT "ID", "Insumo_ID", "Tienda", "Precio", "Fecha_Scraping", "URL"
            FROM precio_mercado 
            WHERE "Insumo_ID" = 1
            ORDER BY "Fecha_Scraping" DESC 
            LIMIT 10;
        """)
        rows = cur.fetchall()
        for r in rows:
            print(f"ID: {r[0]} | Tienda: {r[2]} | Precio: {r[3]} | Fecha: {r[4]} | URL: {r[5][:20]}...")
except Exception as e:
    print(f"Error: {e}")
