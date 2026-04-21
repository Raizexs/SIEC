import os
import sys
import glob
import sqlite3
from sqlalchemy import create_engine, text

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# allow running from project root
sys.path.insert(0, repo_root)

DEFAULT_DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./test_siec.db')
SEEDS_DIR = os.path.join(repo_root, 'database', 'seeds')


def _exec_sqlite(sql_text, db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript(sql_text)
    conn.commit()
    conn.close()


def _exec_sqlalchemy(sql_text, db_url):
    engine = create_engine(db_url)
    with engine.connect() as conn:
        conn.execute(text(sql_text))
        conn.commit()


def run_seeds(database_url=None):
    url = database_url or DEFAULT_DB_URL
    print('Running seeds from', SEEDS_DIR, 'against', url)
    sql_files = sorted(glob.glob(os.path.join(SEEDS_DIR, '*.sql')))
    if not sql_files:
        print('No SQL seed files found in', SEEDS_DIR)
        return 0

    executed = 0
    if url.startswith('sqlite:///'):
        db_path = url.replace('sqlite:///', '')
        for f in sql_files:
            print('Executing', f)
            with open(f, 'r', encoding='utf-8') as fh:
                sql_text = fh.read()
            try:
                _exec_sqlite(sql_text, db_path)
                executed += 1
            except Exception as e:
                print(f'Warning: failed to execute {f}:', e)
                # continue with next seed to avoid failing entire pipeline
                continue
    else:
        for f in sql_files:
            print('Executing', f)
            with open(f, 'r', encoding='utf-8') as fh:
                sql_text = fh.read()
            try:
                _exec_sqlalchemy(sql_text, url)
                executed += 1
            except Exception as e:
                print(f'Warning: failed to execute {f}:', e)
                continue
    print('Executed', executed, 'seed files')
    return executed


def normalize_units(database_url=None):
    # Reuse existing normalization utility
    try:
        from backend.scripts.normalize_unidad_mano_obra import normalize_unidad_mano_obra
    except Exception:
        # fallback for direct invocation during development
        from scripts.normalize_unidad_mano_obra import normalize_unidad_mano_obra
    return normalize_unidad_mano_obra(database_url)


if __name__ == '__main__':
    run_seeds()
    normalize_units()
    print('Seeding and normalization completed.')
