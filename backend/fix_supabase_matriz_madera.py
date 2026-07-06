"""Ejecuta migración 018 en Supabase (matriz madera/metalcon). Ver database/migrations/018_*.sql"""
import os
import sys

import psycopg2

from prepare_prod import run_matriz_fix

TARGET = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL", "")


def main() -> int:
    if not TARGET:
        print("ERROR: define SUPABASE_DATABASE_URL")
        return 1
    conn = psycopg2.connect(TARGET)
    try:
        run_matriz_fix(conn)
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
