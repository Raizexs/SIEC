import os
import sys
from importlib.machinery import SourceFileLoader
from datetime import datetime

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# Ensure loading modules via SourceFileLoader
os.environ['DATABASE_URL'] = 'sqlite:///./test_siec.db'
os.environ['HOURS_PER_DAY'] = '8'
os.environ['SOCIAL_LEY_FACTOR'] = '1.28'

database = SourceFileLoader('database', os.path.join(repo_root, 'backend', 'database.py')).load_module()
models = SourceFileLoader('models', os.path.join(repo_root, 'backend', 'models.py')).load_module()
schemas = SourceFileLoader('schemas', os.path.join(repo_root, 'backend', 'schemas.py')).load_module()
main = SourceFileLoader('main', os.path.join(repo_root, 'backend', 'main.py')).load_module()

engine = database.engine
SessionLocal = database.SessionLocal
Base = database.Base
Base.metadata.create_all(bind=engine)

session = SessionLocal()
# Clean
for tbl in (models.MatrizRendimiento, models.PrecioMercado, models.Insumo, models.MaterialEstructural, models.ConfiguracionSimulacion):
    try:
        session.query(tbl).delete()
    except Exception:
        pass
session.commit()

# Seed material and insumos: Maestro (Albañil) and Ayudante
mat = models.MaterialEstructural(id=1, nombre='Madera', descripcion='', activo=True)
insumo_maestro = models.Insumo(id=10, nombre='Albañil', categoria='Mano de Obra', unidad_medida='jornada', descripcion='', activo=True)
insumo_ayud = models.Insumo(id=11, nombre='Ayudante General', categoria='Mano de Obra', unidad_medida='jornada', descripcion='', activo=True)
session.add_all([mat, insumo_maestro, insumo_ayud])
session.commit()

# MatrizRendimiento: unidad_factor as 'jornada por m2'
mr1 = models.MatrizRendimiento(id=101, material_estructural_id=1, insumo_id=10, factor_multiplicador=0.1, unidad_factor='jornada por m2', activo=True)
mr2 = models.MatrizRendimiento(id=102, material_estructural_id=1, insumo_id=11, factor_multiplicador=0.05, unidad_factor='jornada por m2', activo=True)
session.add_all([mr1, mr2])
session.commit()

# PrecioMercado: maestro 800 por jornada, ayudante 200 por jornada
pm1 = models.PrecioMercado(id=201, insumo_id=10, tienda='T1', nombre_producto='Albañil por jornada', precio=800.0, precio_descuento=None, fecha_scraping=datetime.now(), exitoso=True, url='http://a', categoria='Mano de Obra', stock='OK')
pm2 = models.PrecioMercado(id=202, insumo_id=11, tienda='T1', nombre_producto='Ayudante por jornada', precio=200.0, precio_descuento=None, fecha_scraping=datetime.now(), exitoso=True, url='http://a', categoria='Mano de Obra', stock='OK')
session.add_all([pm1, pm2])
session.commit()

# Simulation
sim = models.ConfiguracionSimulacion(id=1, m2_totales=100, material_estructural_id=1, habitaciones=1, banios=0, areas_comunes=0)
session.add(sim)
session.commit()

# Run calculation
result = main.calcular_insumos(1, db=session)

# tarifa_pura_local expected = (800 + 200) * (0.1 + 0.05) = 1000 * 0.15 = 150
assert result.tarifa_pura_local is not None
assert abs(result.tarifa_pura_local - 150.0) < 1e-6, f"Expected 150.0, got {result.tarifa_pura_local}"

session.close()
