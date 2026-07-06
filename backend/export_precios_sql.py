"""Exporta precio_mercado desde Postgres local a SQL para importar en EC2."""
import os
import subprocess
import sys

OUT = os.path.join(os.path.dirname(__file__), "_precio_mercado_export.sql")

DUMP_CMD = [
    "docker", "exec", "siec_postgres",
    "pg_dump", "-U", "postgres", "-d", "siec",
    "--data-only", "--column-inserts",
    "-t", "precio_mercado",
]


def main() -> int:
    print("Exportando precio_mercado desde Docker local...")
    result = subprocess.run(DUMP_CMD, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        return 1
    sql = result.stdout
    if "INSERT INTO" not in sql and "COPY " not in sql:
        print("ERROR: export vacío. ¿Corrió el scraper en Docker?", file=sys.stderr)
        return 1
    # Reemplazar COPY por INSERT si hace falta; pg_dump --column-inserts ya genera INSERT
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("TRUNCATE precio_mercado RESTART IDENTITY CASCADE;\n")
        f.write(sql)
    lines = sql.count("INSERT INTO")
    print(f"OK: {lines} inserts -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
