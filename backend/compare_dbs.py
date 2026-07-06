"""Compara catálogo y precios entre DB local y Supabase."""
import os
import psycopg2

LOCAL = os.getenv("SOURCE_DATABASE_URL", "postgresql://postgres:postgres@db:5432/siec")
REMOTE = os.getenv(
    "SUPABASE_DATABASE_URL",
    os.getenv("DATABASE_URL", ""),
)


def q(url: str, sql: str):
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            return cur.fetchall()
    finally:
        conn.close()


def report(label: str, url: str) -> None:
    print(f"=== {label} ===")
    print("insumos activos:", q(url, 'SELECT COUNT(*) FROM "Insumo" WHERE "Activo"=true')[0][0])
    print(
        "matriz mat1:",
        q(
            url,
            'SELECT COUNT(*) FROM "Matriz_Rendimiento" WHERE "Material_Estructural_ID"=1 AND "Activo"=true',
        )[0][0],
    )
    print(
        "precios exitosos:",
        q(url, 'SELECT COUNT(*) FROM precio_mercado WHERE "Exitoso"=true')[0][0],
    )
    print(
        "insumos con precio:",
        q(
            url,
            'SELECT COUNT(DISTINCT "Insumo_ID") FROM precio_mercado WHERE "Exitoso"=true',
        )[0][0],
    )
    print("tiendas:")
    for row in q(
        url,
        'SELECT "Tienda", COUNT(*) FROM precio_mercado WHERE "Exitoso"=true GROUP BY "Tienda" ORDER BY 2 DESC LIMIT 10',
    ):
        print(f"  {row[0]}: {row[1]}")
    ids = q(
        url,
        """
        SELECT DISTINCT mr."Insumo_ID"
        FROM "Matriz_Rendimiento" mr
        JOIN "Insumo" i ON i."ID" = mr."Insumo_ID"
        WHERE mr."Material_Estructural_ID" = 1 AND mr."Activo" = true AND i."Activo" = true
        ORDER BY 1
        """,
    )
    print("matriz insumo ids:", [r[0] for r in ids])
    print()


def matrix_rows(url: str) -> None:
    sql = """
        SELECT mr."Material_Estructural_ID", mr."Insumo_ID", i."Nombre",
               mr."Factor_Multiplicador", mr."Unidad_Factor"
        FROM "Matriz_Rendimiento" mr
        JOIN "Insumo" i ON i."ID" = mr."Insumo_ID"
        WHERE mr."Activo" = true
        ORDER BY 1, 2
    """
    print("matriz completa:")
    for row in q(url, sql):
        print(" ", row)


def missing_insumos(local_url: str, remote_url: str) -> None:
    local_ids = {r[0] for r in q(local_url, 'SELECT "ID" FROM "Insumo"')}
    remote_ids = {r[0] for r in q(remote_url, 'SELECT "ID" FROM "Insumo"')}
    missing = sorted(local_ids - remote_ids)
    print(f"insumos en local pero no en remoto ({len(missing)}):", missing)
    if missing:
        sql = """
            SELECT "ID", "Nombre", "Categoria", "Unidad_Medida", "Activo"
            FROM "Insumo"
            WHERE "ID" = ANY(%s)
            ORDER BY "ID"
        """
        for row in q(local_url, sql.replace("%s", f"ARRAY{missing}")):
            print(" ", row)


def main() -> None:
    report("LOCAL", LOCAL)
    matrix_rows(LOCAL)
    if REMOTE:
        report("SUPABASE", REMOTE)
        matrix_rows(REMOTE)
        print("=== DIFF ===")
        missing_insumos(LOCAL, REMOTE)
    else:
        print("SUPABASE: sin DATABASE_URL")


if __name__ == "__main__":
    main()
