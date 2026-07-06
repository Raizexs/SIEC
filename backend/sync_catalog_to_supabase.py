"""Sincroniza catálogo de rendimiento (Matriz_Rendimiento) desde Docker local hacia Supabase.

Uso (desde contenedor backend):
  docker exec -e SUPABASE_DATABASE_URL=... siec_backend python sync_catalog_to_supabase.py
"""

from __future__ import annotations

import os
import sys

import psycopg2
from psycopg2.extras import execute_batch

DEFAULT_SOURCE = os.getenv(
    "SOURCE_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/siec",
)
DEFAULT_TARGET = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL", "")

MATRIZ_SELECT = """
SELECT "Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo"
FROM "Matriz_Rendimiento"
WHERE "Material_Estructural_ID" IN (1, 2)
ORDER BY 1, 2
"""

MATRIZ_UPSERT = """
INSERT INTO "Matriz_Rendimiento" (
    "Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo"
) VALUES (%s, %s, %s, %s, %s)
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO UPDATE SET
    "Factor_Multiplicador" = EXCLUDED."Factor_Multiplicador",
    "Unidad_Factor" = EXCLUDED."Unidad_Factor",
    "Activo" = EXCLUDED."Activo"
"""


def count_matriz(conn, material_id: int) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM "Matriz_Rendimiento"
            WHERE "Material_Estructural_ID" = %s AND "Activo" = TRUE
            """,
            (material_id,),
        )
        return cur.fetchone()[0]


def main() -> int:
    if not DEFAULT_TARGET:
        print("ERROR: define SUPABASE_DATABASE_URL o DATABASE_URL.")
        return 1

    src = psycopg2.connect(DEFAULT_SOURCE)
    tgt = psycopg2.connect(DEFAULT_TARGET)

    try:
        with src.cursor() as cur:
            cur.execute(MATRIZ_SELECT)
            matriz = cur.fetchall()

        if not matriz:
            print("ERROR: sin filas de matriz en origen para materiales 1-2.")
            return 1

        with tgt.cursor() as cur:
            cur.execute('DELETE FROM "Matriz_Rendimiento" WHERE "Material_Estructural_ID" IN (1, 2)')
            execute_batch(cur, MATRIZ_UPSERT, matriz, page_size=50)
        tgt.commit()

        print(f"OK: {len(matriz)} filas sincronizadas.")
        for mid in (1, 2):
            print(f"  material {mid}: {count_matriz(tgt, mid)} insumos activos")
        return 0
    finally:
        src.close()
        tgt.close()


if __name__ == "__main__":
    sys.exit(main())
