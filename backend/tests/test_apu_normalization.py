import os
import sys
from importlib.machinery import SourceFileLoader
from datetime import datetime

# Prepare import path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, repo_root)

# set env for sqlite DB and HOURS_PER_DAY and SOCIAL_LEY_FACTOR
os.environ['DATABASE_URL'] = 'sqlite:///./test_siec.db'
os.environ['HOURS_PER_DAY'] = '8'
os.environ['SOCIAL_LEY_FACTOR'] = '1.28'

from importlib.machinery import SourceFileLoader

# Load modules via SourceFileLoader to avoid package import issues
database = SourceFileLoader('database', os.path.join(repo_root, 'backend', 'database.py')).load_module()
models = SourceFileLoader('models', os.path.join(repo_root, 'backend', 'models.py')).load_module()
# Ensure schemas are loadable by main
schemas = SourceFileLoader('schemas', os.path.join(repo_root, 'backend', 'schemas.py')).load_module()
main = SourceFileLoader('main', os.path.join(repo_root, 'backend', 'main.py')).load_module()

# create DB and seed minimal data
engine = database.engine
SessionLocal = database.SessionLocal
Base = database.Base
Base.metadata.create_all(bind=engine)

session = SessionLocal()
# clean
for tbl in (models.MatrizRendimiento, models.PrecioMercado, models.Insumo, models.MaterialEstructural, models.ConfiguracionSimulacion):
    try:
        session.query(tbl).delete()
    except Exception:
        pass
session.commit()

# seed
mat = models.MaterialEstructural(id=1, nombre='Madera', descripcion='', activo=True)
insumo_lab = models.Insumo(id=1, nombre='Albañil', categoria='Mano de Obra', unidad_medida='HH', descripcion='', activo=True)
insumo_mat = models.Insumo(id=2, nombre='Cemento', categoria='Obra Gruesa', unidad_medida='kg', descripcion='', activo=True)
session.add_all([mat, insumo_lab, insumo_mat])
session.commit()

mr1 = models.MatrizRendimiento(id=1, material_estructural_id=1, insumo_id=1, factor_multiplicador=0.05, activo=True)
mr2 = models.MatrizRendimiento(id=2, material_estructural_id=1, insumo_id=2, factor_multiplicador=5.0, activo=True)
session.add_all([mr1, mr2])
session.commit()

# Price per jornada for Albañil
pm1 = models.PrecioMercado(id=1, insumo_id=1, tienda='T1', nombre_producto='Albañil por jornada', precio=800.0, precio_descuento=None, fecha_scraping=datetime.now(), exitoso=True, url='http://a', categoria='Mano de Obra', stock='OK')
# Price per unit for Cemento
pm2 = models.PrecioMercado(id=2, insumo_id=2, tienda='T1', nombre_producto='Cemento 25kg', precio=10.0, precio_descuento=None, fecha_scraping=datetime.now(), exitoso=True, url='http://a', categoria='Obra Gruesa', stock='OK')
session.add_all([pm1, pm2])
session.commit()

sim = models.ConfiguracionSimulacion(id=1, m2_totales=100, material_estructural_id=1, habitaciones=1, banios=1, areas_comunes=0)
session.add(sim)
session.commit()

# Run calculation
result = main.calcular_insumos(1, db=session)

# Find albanil item
mano_cat = [c for c in result.desglose if c.categoria == 'Mano de Obra'][0]
item = mano_cat.items[0]
# Albañil: factor 0.05 * 100 = 5 HH. Price per jornada 800 -> per HH = 800/8 =100 -> raw cost=500 -> with social factor 1.28 -> 640
expected_per_hh = 800.0 / float(os.environ['HOURS_PER_DAY'])
expected_raw = expected_per_hh * (0.05 * 100)
expected_with_social = expected_raw * float(os.environ['SOCIAL_LEY_FACTOR'])

assert abs(item.subtotal - expected_with_social) < 1e-6, f"Expected {expected_with_social}, got {item.subtotal}"

session.close()