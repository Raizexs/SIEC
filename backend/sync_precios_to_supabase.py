"""Sincroniza precio_mercado desde Docker local hacia Supabase (producción Railway/Vercel).

Flujo recomendado tras scrapear en Docker:
  1. python fix_supabase_matriz_madera.py   (o sync_catalog_to_supabase.py)
  2. python sync_precios_to_supabase.py

Uso:
  set SUPABASE_DATABASE_URL=postgresql://...
  set SOURCE_DATABASE_URL=postgresql://postgres:postgres@db:5432/siec
  python backend/sync_precios_to_supabase.py
"""

from __future__ import annotations

import os
import sys
from datetime import date

import psycopg2
from psycopg2.extras import execute_batch

DEFAULT_SOURCE = os.getenv(
    "SOURCE_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/siec",
)
DEFAULT_TARGET = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL", "")

SELECT_LATEST = """
SELECT DISTINCT ON ("Insumo_ID", "Tienda")
    "Insumo_ID",
    "Tienda",
    "Nombre_Producto",
    "Precio",
    "Precio_Descuento",
    "Stock",
    "Categoria",
    COALESCE("URL", '') AS url,
    "Fecha_Scraping",
    "Exitoso"
FROM precio_mercado
WHERE "Exitoso" = TRUE
  AND "Precio" IS NOT NULL
  AND "Precio" > 0
ORDER BY "Insumo_ID", "Tienda", "Fecha_Scraping" DESC
"""

INSERT_SQL = """
INSERT INTO precio_mercado (
    "Insumo_ID", "Tienda", "Nombre_Producto", "Precio", "Precio_Descuento",
    "Stock", "Categoria", "URL", "Fecha_Scraping", "Exitoso"
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
"""


def stats(conn) -> tuple[int, int, list[tuple[str, int]]]:
    with conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM precio_mercado WHERE "Exitoso"=TRUE')
        total = cur.fetchone()[0]
        cur.execute(
            'SELECT COUNT(DISTINCT "Insumo_ID") FROM precio_mercado WHERE "Exitoso"=TRUE'
        )
        insumos = cur.fetchone()[0]
        cur.execute(
            """
            SELECT "Tienda", COUNT(*)
            FROM precio_mercado
            WHERE "Exitoso"=TRUE
            GROUP BY "Tienda"
            ORDER BY 2 DESC
            LIMIT 12
            """
        )
        tiendas = cur.fetchall()
    return total, insumos, tiendas


def fetch_rows(conn) -> list[tuple]:
    with conn.cursor() as cur:
        cur.execute(SELECT_LATEST)
        return cur.fetchall()


def valid_insumo_ids(conn) -> set[int]:
    with conn.cursor() as cur:
        cur.execute('SELECT "ID" FROM "Insumo"')
        return {row[0] for row in cur.fetchall()}


def normalize_tienda(name: str) -> str:
    return (name or "").strip().lower()


def main() -> int:
    if not DEFAULT_TARGET:
        print("ERROR: define SUPABASE_DATABASE_URL o DATABASE_URL (Supabase producción).")
        return 1

    print(f"Origen:  {DEFAULT_SOURCE.split('@')[-1]}")
    print(f"Destino: {DEFAULT_TARGET.split('@')[-1]}")

    src = psycopg2.connect(DEFAULT_SOURCE)
    tgt = psycopg2.connect(DEFAULT_TARGET)

    try:
        src_total, src_insumos, src_tiendas = stats(src)
        print(f"\nOrigen  → {src_total} precios | {src_insumos} insumos")
        for tienda, n in src_tiendas:
            print(f"  {tienda}: {n}")

        rows = fetch_rows(src)
        if not rows:
            print("\nERROR: no hay precios en el origen. ¿Corrió el scraper?")
            return 1

        fecha_sync = date.today()
        valid_ids = valid_insumo_ids(tgt)
        skipped = 0
        payload = []
        for r in rows:
            insumo_id = r[0]
            if insumo_id not in valid_ids:
                skipped += 1
                continue
            payload.append(
                (
                    insumo_id,
                    normalize_tienda(r[1]),
                    r[2],
                    r[3],
                    r[4],
                    r[5] or "Disponible",
                    r[6] or "Obra Gruesa",
                    r[7] or "",
                    fecha_sync,
                )
            )

        if skipped:
            print(f"\nAviso: {skipped} precios omitidos (insumo no existe en destino).")

        if not payload:
            print("\nERROR: ningún precio compatible con el catálogo de destino.")
            return 1

        tgt_total_before, _, _ = stats(tgt)
        print(f"\nDestino antes → {tgt_total_before} precios")

        with tgt.cursor() as cur:
            cur.execute('DELETE FROM precio_mercado WHERE "Fecha_Scraping" = %s', (fecha_sync,))
            execute_batch(cur, INSERT_SQL, payload, page_size=200)
        tgt.commit()

        tgt_total, tgt_insumos, tgt_tiendas = stats(tgt)
        print(f"\nDestino después → {tgt_total} precios | {tgt_insumos} insumos")
        for tienda, n in tgt_tiendas:
            print(f"  {tienda}: {n}")
        print(f"\nOK: {len(payload)} precios sincronizados a Supabase.")
        return 0
    finally:
        src.close()
        tgt.close()


if __name__ == "__main__":
    sys.exit(main())
