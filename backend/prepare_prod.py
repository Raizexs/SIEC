"""Script único para preparar Supabase producción antes de la demo.

Ejecuta:
1. Migración 013 (categoría Techumbre en Insumo)
2. Seed 005 (insumos complementarios 46-51)
3. Re-inyección de precios scrapeados desde serpapi_results.json

Uso:
  python prepare_prod.py
"""

import json
import os
import psycopg2
from datetime import date

# ═══ CONFIGURACIÓN ═══
# Cambia esto si tu Supabase tiene otra URL
SUPABASE_URL = os.getenv(
    "SUPABASE_DATABASE_URL",
    "postgresql://postgres.lkerizeqxnmdlsqfhnrv:gOGTXO1EHHmctlu5@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
)


def run_sql(conn, sql, label=""):
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print(f"  [OK] {label}")
    except Exception as e:
        conn.rollback()
        print(f"  [SKIP] {label}: {e}")


def main():
    print("Conectando a Supabase...")
    conn = psycopg2.connect(SUPABASE_URL)
    conn.autocommit = False

    # 1. Migración 013: permitir categoría Techumbre
    print("\n1. Migración 013 - Categoría Techumbre")
    run_sql(conn, """
        ALTER TABLE "Insumo" DROP CONSTRAINT IF EXISTS "Insumo_Categoria_check";
    """, "drop old constraint")
    run_sql(conn, """
        ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_Categoria_check"
        CHECK ("Categoria" = ANY (ARRAY['Obra Gruesa', 'Terminaciones', 'Instalaciones', 'Mano de Obra', 'Techumbre']::text[]));
    """, "add new constraint with Techumbre")

    # 2. Seed 005: insumos complementarios
    print("\n2. Seed 005 - Insumos complementarios (46-51)")
    nuevos = [
        ("Clavos estriados 3 pulgadas", "Obra Gruesa", "caja 100un", "Clavos estriados 3 pulgadas para estructura de madera"),
        ("Clavos estriados 4 pulgadas", "Obra Gruesa", "caja 100un", "Clavos estriados 4 pulgadas para soleras de madera"),
        ("Lana vidrio 50mm", "Obra Gruesa", "rollo", "Aislante lana de vidrio 50mm rollo 14.4m2 para muros y techumbre"),
        ("Plancha zinc 0.85x2.5m", "Techumbre", "unidad", "Plancha de zinc para cubierta 0.85x2.5m"),
        ("Costanera pino 2x2", "Techumbre", "pieza 3.2m", "Costanera de pino 2x2 3.2m para soporte de cubierta"),
        ("Tornillo techo golilla neopreno", "Techumbre", "caja 100un", "Tornillo autoperforante con golilla de neopreno para techumbre"),
    ]
    with conn.cursor() as cur:
        inserted = 0
        for nombre, cat, unidad, desc in nuevos:
            try:
                cur.execute("""
                    INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo")
                    VALUES (%s, %s, %s, %s, TRUE)
                    ON CONFLICT ("Nombre") DO NOTHING
                """, (nombre, cat, unidad, desc))
                if cur.rowcount > 0:
                    inserted += 1
            except Exception as e:
                print(f"  [SKIP] {nombre}: {e}")
        conn.commit()
    print(f"  [OK] {inserted}/6 insumos insertados")

    # 3. Re-inyectar precios scrapeados
    print("\n3. Inyectando precios desde serpapi_results.json...")
    json_path = os.path.join(os.path.dirname(__file__), "serpapi_results.json")
    if not os.path.exists(json_path):
        print(f"  [ERROR] No se encontró {json_path}")
        conn.close()
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    fecha_hoy = date.today()
    with conn.cursor() as cur:
        insertadas = 0
        for item in data:
            if not item.get("exitoso") or not item.get("precio"):
                continue

            # Borrar precios viejos de hoy para evitar duplicados
            cur.execute("""
                DELETE FROM precio_mercado
                WHERE "Insumo_ID" = %s AND "Fecha_Scraping" = %s
            """, (item["insumo_id"], fecha_hoy))

            cur.execute("""
                INSERT INTO precio_mercado
                ("Insumo_ID", "Tienda", "Nombre_Producto", "Precio", "Precio_Descuento",
                 "Stock", "Categoria", "URL", "Fecha_Scraping", "Exitoso")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item["insumo_id"],
                item["tienda"],
                item["nombre_producto"],
                item["precio"],
                item.get("precio_descuento"),
                item.get("stock", "Disponible"),
                item.get("categoria", "Obra Gruesa"),
                item.get("url", ""),
                fecha_hoy,
                True,
            ))
            insertadas += 1

        conn.commit()
    print(f"  [OK] {insertadas} precios inyectados en Supabase")

    # Verificación final
    print("\n4. Verificación")
    with conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM precio_mercado WHERE "Exitoso" = true')
        total = cur.fetchone()[0]
        cur.execute("""SELECT COUNT(*) FROM precio_mercado WHERE "Exitoso" = true AND "URL" IS NOT NULL AND "URL" != ''""")
        con_url = cur.fetchone()[0]
        cur.execute('SELECT COUNT(*) FROM "Insumo" WHERE "Activo" = true')
        insumos = cur.fetchone()[0]
    print(f"  Precios en DB: {total} | Con URL: {con_url} | Insumos activos: {insumos}")

    conn.close()
    print("\n[LISTO] Supabase preparado para la demo.")


if __name__ == "__main__":
    main()
