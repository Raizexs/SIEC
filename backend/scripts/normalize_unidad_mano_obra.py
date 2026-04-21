import os
import sys
import sqlite3
from sqlalchemy import create_engine, text

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# allow running from project root
sys.path.insert(0, repo_root)

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./test_siec.db')
print('DATABASE_URL=', DATABASE_URL)

updated = 0

if DATABASE_URL.startswith('sqlite:///'):
    db_path = DATABASE_URL.replace('sqlite:///', '')
    print('Using sqlite DB path:', db_path)
    if not os.path.exists(db_path):
        print('DB file not found:', db_path)
        raise SystemExit(1)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Normalize Insumo.Unidad_Medida: jornada* -> DIA
    cur.execute("SELECT COUNT(*) FROM \"Insumo\" WHERE lower(\"Unidad_Medida\") LIKE '%jornada%' AND \"Categoria\" = 'Mano de Obra'")
    cnt = cur.fetchone()[0]
    if cnt > 0:
        print(f'Found {cnt} mano de obra records with unidad containing jornada. Updating to DIA...')
        cur.execute("UPDATE \"Insumo\" SET \"Unidad_Medida\" = 'DIA' WHERE lower(\"Unidad_Medida\") LIKE '%jornada%' AND \"Categoria\" = 'Mano de Obra'")
        conn.commit()
        updated = cur.rowcount
    conn.close()
else:
    # Use SQLAlchemy for generic DBs
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # count
        res = conn.execute(text("SELECT COUNT(*) FROM \"Insumo\" WHERE lower(\"Unidad_Medida\") LIKE :pat AND \"Categoria\" = 'Mano de Obra'"), {'pat':'%jornada%'}).scalar()
        if res and int(res) > 0:
            print(f'Found {res} mano de obra records with unidad containing jornada. Updating to DIA...')
            upd = conn.execute(text("UPDATE \"Insumo\" SET \"Unidad_Medida\" = 'DIA' WHERE lower(\"Unidad_Medida\") LIKE :pat AND \"Categoria\" = 'Mano de Obra'"), {'pat':'%jornada%'})
            updated = upd.rowcount if hasattr(upd, 'rowcount') else None

print('Updated rows:', updated)
print('Normalization completed.')
