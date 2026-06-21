import os
import psycopg2

remote_db = "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

print("Conectando a la DB remota...")
conn = psycopg2.connect(remote_db)
conn.autocommit = True
with conn.cursor() as cur:
    print("Relajando restricción de 15m2...")
    cur.execute("ALTER TABLE configuracion_simulacion DROP CONSTRAINT IF EXISTS configuracion_simulacion_m2_totales_check;")
    try:
        cur.execute('ALTER TABLE "Configuracion_Simulacion" DROP CONSTRAINT IF EXISTS "Configuracion_Simulacion_M2_Totales_check";')
    except Exception as e:
        pass
    
    cur.execute("ALTER TABLE configuracion_simulacion ADD CONSTRAINT configuracion_simulacion_m2_totales_check CHECK (m2_totales >= 1 AND m2_totales <= 1000);")
    print("Migración completada exitosamente en producción.")
