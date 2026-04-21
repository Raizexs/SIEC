import os
import sys
import sqlite3
from sqlalchemy import create_engine, text

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# allow running from project root
sys.path.insert(0, repo_root)

def normalize_unidad_mano_obra(database_url=None):
    """Normalize unidad_medida variants for Mano de Obra to canonical values.
    Maps:
      - variants of 'jornada', 'día' -> 'DIA'
      - variants of 'hora', 'hh' -> 'HH'
    Works with sqlite (sqlite:///path) or any SQLAlchemy-supported DB via URL.
    Returns number of updated rows (approx) or None.
    """
    DATABASE_URL = database_url or os.getenv('DATABASE_URL', 'sqlite:///./test_siec.db')
    print('DATABASE_URL=', DATABASE_URL)

    updated = 0

    jornada_pred = ["%jornada%", "%dia%", "%d\u00eda%", "%por jornada%", "%jornadas%", "%por dia%", "%por día%"]
    hora_pred = ["%hora%", "%hh%", "%horas%"]

    if DATABASE_URL.startswith('sqlite:///'):
        db_path = DATABASE_URL.replace('sqlite:///', '')
        print('Using sqlite DB path:', db_path)
        if not os.path.exists(db_path):
            print('DB file not found:', db_path)
            raise SystemExit(1)
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        # Normalize jornada-like -> DIA
        for pat in ("%jornada%", "%jornad%", "%por jornada%", "%por dia%", "%dia%", "%d\u00eda%"):
            cur.execute(f"SELECT COUNT(*) FROM \"Insumo\" WHERE lower(\"Unidad_Medida\") LIKE ? AND \"Categoria\" = 'Mano de Obra'", (pat,))
            cnt = cur.fetchone()[0]
            if cnt > 0:
                print(f'Found {cnt} mano de obra records matching {pat}. Updating to DIA...')
                cur.execute("UPDATE \"Insumo\" SET \"Unidad_Medida\" = 'DIA' WHERE lower(\"Unidad_Medida\") LIKE ? AND \"Categoria\" = 'Mano de Obra'", (pat,))
                conn.commit()
                updated += cur.rowcount
        # Normalize hora-like -> HH
        for pat in ("%hora%", "%hh%", "%horas%"):
            cur.execute(f"SELECT COUNT(*) FROM \"Insumo\" WHERE lower(\"Unidad_Medida\") LIKE ? AND \"Categoria\" = 'Mano de Obra'", (pat,))
            cnt = cur.fetchone()[0]
            if cnt > 0:
                print(f'Found {cnt} mano de obra records matching {pat}. Updating to HH...')
                cur.execute("UPDATE \"Insumo\" SET \"Unidad_Medida\" = 'HH' WHERE lower(\"Unidad_Medida\") LIKE ? AND \"Categoria\" = 'Mano de Obra'", (pat,))
                conn.commit()
                updated += cur.rowcount
        conn.close()
    else:
        # Use SQLAlchemy for generic DBs
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            for pat in ("%jornada%", "%jornad%", "%por jornada%", "%por dia%", "%dia%", "%d\u00eda%"):
                res = conn.execute(text("SELECT COUNT(*) FROM \"Insumo\" WHERE lower(\"Unidad_Medida\") LIKE :pat AND \"Categoria\" = 'Mano de Obra'"), {'pat':pat}).scalar()
                if res and int(res) > 0:
                    print(f'Found {res} mano de obra records matching {pat}. Updating to DIA...')
                    upd = conn.execute(text("UPDATE \"Insumo\" SET \"Unidad_Medida\" = 'DIA' WHERE lower(\"Unidad_Medida\") LIKE :pat AND \"Categoria\" = 'Mano de Obra'"), {'pat':pat})
                    updated += upd.rowcount if hasattr(upd, 'rowcount') else 0
            for pat in ("%hora%", "%hh%", "%horas%"):
                res = conn.execute(text("SELECT COUNT(*) FROM \"Insumo\" WHERE lower(\"Unidad_Medida\") LIKE :pat AND \"Categoria\" = 'Mano de Obra'"), {'pat':pat}).scalar()
                if res and int(res) > 0:
                    print(f'Found {res} mano de obra records matching {pat}. Updating to HH...')
                    upd = conn.execute(text("UPDATE \"Insumo\" SET \"Unidad_Medida\" = 'HH' WHERE lower(\"Unidad_Medida\") LIKE :pat AND \"Categoria\" = 'Mano de Obra'"), {'pat':pat})
                    updated += upd.rowcount if hasattr(upd, 'rowcount') else 0

    print('Updated rows:', updated)
    return updated


if __name__ == '__main__':
    normalize_unidad_mano_obra()
