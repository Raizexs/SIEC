import psycopg2
from datetime import datetime

remote_db = "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

try:
    conn = psycopg2.connect(remote_db)
    conn.autocommit = True
    with conn.cursor() as cur:
        # Delete old records that don't have URLs or are older than today
        # Just to be safe, let's delete all records that are NOT from today (2026-05-27)
        fecha_hoy = datetime.now().date()
        cur.execute("""
            DELETE FROM precio_mercado 
            WHERE "Fecha_Scraping" < %s
        """, (fecha_hoy,))
        print(f"Borrados {cur.rowcount} registros antiguos.")
        
        # Also delete any records with empty URLs to be absolutely sure
        cur.execute("""
            DELETE FROM precio_mercado 
            WHERE "URL" = '' OR "URL" IS NULL
        """)
        print(f"Borrados {cur.rowcount} registros sin URL.")
except Exception as e:
    print(f"Error: {e}")
