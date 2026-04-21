import os
import sqlite3
from datetime import datetime

def parse_sqlite_path(url):
    if not url:
        return './test_siec.db'
    if url.startswith('sqlite:///'):
        return url.replace('sqlite:///', '')
    return url

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./test_siec.db')
db_path = parse_sqlite_path(DATABASE_URL)
print('Using DB file:', db_path)

if not os.path.exists(db_path):
    print('DB file not found, aborting.')
    raise SystemExit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Helper
def fetch_all(query, params=()):
    try:
        cur.execute(query, params)
        return cur.fetchall()
    except Exception as e:
        print('Query failed:', query, 'Error:', e)
        return []

print('\nInspecting APU-related tables...')
insumos = fetch_all('SELECT rowid as id, * FROM "Insumo"')
print(f'Found {len(insumos)} insumos')

mano_obra = [r for r in insumos if (r['Categoria'] or '').lower().strip() == 'mano de obra']
print(f'Mano de Obra insumos: {len(mano_obra)}')

issues = []
for ins in mano_obra:
    iid = ins['ID'] if 'ID' in ins.keys() else ins['id']
    nombre = ins['Nombre'] if 'Nombre' in ins.keys() else ''
    unidad_medida = ins['Unidad_Medida'] if 'Unidad_Medida' in ins.keys() and ins['Unidad_Medida'] is not None else ''
    print('\n- Insumo:', nombre, 'ID=', iid, 'Unidad_Medida=', unidad_medida)
    # Matriz Rendimiento entries
    mrs = fetch_all('SELECT * FROM "Matriz_Rendimiento" WHERE "Insumo_ID" = ?', (iid,))
    if not mrs:
        print('  WARNING: No Matriz_Rendimiento entries for this insumo')
        issues.append((nombre, 'no_matriz'))
    else:
        for mr in mrs:
            fm = mr['Factor_Multiplicador'] if 'Factor_Multiplicador' in mr.keys() else None
            unidad_factor = mr['Unidad_Factor'] if 'Unidad_Factor' in mr.keys() else None
            print('  MatrizRendimiento: Factor_Multiplicador=', fm, 'Unidad_Factor=', unidad_factor)
            try:
                if fm is None or float(fm) <= 0:
                    issues.append((nombre, 'nonpositive_factor'))
            except Exception:
                issues.append((nombre, 'factor_parse_error'))
    # PrecioMercado
    pms = fetch_all('SELECT * FROM precio_mercado WHERE "Insumo_ID" = ? AND exitoso = 1', (iid,))
    if not pms:
        print('  WARNING: No successful PrecioMercado for this insumo')
        issues.append((nombre, 'no_price'))
    else:
        # show latest price
        latest = pms[-1]
        precio = None
        if 'Precio_Descuento' in latest.keys() and latest['Precio_Descuento'] is not None:
            precio = latest['Precio_Descuento']
        elif 'Precio' in latest.keys():
            precio = latest['Precio']
        tienda = latest['Tienda'] if 'Tienda' in latest.keys() else None
        print('  Latest price sample:', precio, 'tienda=', tienda)
    # Unit sanity
    if not unidad_medida or unidad_medida.strip().upper() not in ('HH', 'H', 'D', 'DIA', 'DÍA'):
        print('  NOTE: unidad_medida seems non-standard for labor (expected HH/H/DÍA):', unidad_medida)
        issues.append((nombre, 'unit_mismatch'))

# Cross-check calculate function presence and surcharge
print('\nChecking code for SOCIAL_LEY_FACTOR usage...')
# simple grep in file
import pathlib
main_py = pathlib.Path(__file__).parents[1] / 'main.py'
if main_py.exists():
    try:
        s = main_py.read_text(encoding='utf-8', errors='ignore')
    except TypeError:
        # older Python versions may not support encoding in read_text
        s = main_py.read_bytes().decode('utf-8', errors='ignore')
    uses = 'SOCIAL_LEY_FACTOR' in s and 'mano de obra' in s.lower()
    print('  SOCIAL_LEY_FACTOR applied in main.py:', uses)
else:
    print('  main.py not found for code check')

# Summary
print('\nAudit summary:')
if not issues:
    print('  No issues found. APU entries for Mano de Obra have matrices, prices, positive factors and units look OK.')
else:
    print(f'  Found {len(issues)} potential issues:')
    for it in issues:
        print('   -', it[0], ':', it[1])
    print('\nRecommendations:')
    print('  - Ensure PrecioMercado prices for Mano de Obra are expressed per HH (hora hombre) or add conversion logic if prices are por jornada (día).')
    print('  - Normalize unidad_medida to HH and document expected units in docs/reglas_negocio_siec.md')
    print('  - Add unit tests validating APU calculation (inverse rendimiento * tarifa) and irreversible application of SOCIAL_LEY_FACTOR')

conn.close()
