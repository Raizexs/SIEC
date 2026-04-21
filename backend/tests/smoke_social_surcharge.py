import os
import sys
# Ensure repo root is on sys.path so 'backend' package can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
# Forcing local sqlite DB and the social law factor before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///./test_siec.db"
os.environ["SOCIAL_LEY_FACTOR"] = "1.285"

from datetime import datetime

# Import DB and models (will use DATABASE_URL above)
from importlib.machinery import SourceFileLoader
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# Load database module as top-level 'database' so models can import it
database_path = os.path.join(repo_root, 'backend', 'database.py')
models_path = os.path.join(repo_root, 'backend', 'models.py')
database = SourceFileLoader('database', database_path).load_module()
models = SourceFileLoader('models', models_path).load_module()
engine = database.engine
SessionLocal = database.SessionLocal
Base = database.Base

# Create tables
Base.metadata.create_all(bind=engine)

session = SessionLocal()

# Clean tables (best-effort)
for tbl in (models.MatrizRendimiento, models.PrecioMercado, models.Insumo, models.MaterialEstructural, models.ConfiguracionSimulacion):
    try:
        session.query(tbl).delete()
    except Exception:
        pass
session.commit()

# Seed minimal data
mat = models.MaterialEstructural(id=1, nombre="Madera", descripcion="", activo=True)
session.add(mat)

insumo1 = models.Insumo(id=1, nombre="Albañil", categoria="Mano de Obra", unidad_medida="HH", descripcion="", activo=True)
insumo2 = models.Insumo(id=2, nombre="Cemento", categoria="Obra Gruesa", unidad_medida="kg", descripcion="", activo=True)
session.add_all([insumo1, insumo2])
session.commit()

mr1 = models.MatrizRendimiento(id=1, material_estructural_id=1, insumo_id=1, factor_multiplicador=0.05, activo=True)
mr2 = models.MatrizRendimiento(id=2, material_estructural_id=1, insumo_id=2, factor_multiplicador=5.0, activo=True)
session.add_all([mr1, mr2])
session.commit()

pm1 = models.PrecioMercado(id=1, insumo_id=1, tienda="T1", nombre_producto="Albañil jornada", precio=100.0, precio_descuento=None, fecha_scraping=datetime.now(), exitoso=True, url="http://a", categoria="Mano de Obra", stock="OK")
pm2 = models.PrecioMercado(id=2, insumo_id=2, tienda="T1", nombre_producto="Cemento 25kg", precio=10.0, precio_descuento=None, fecha_scraping=datetime.now(), exitoso=True, url="http://a", categoria="Obra Gruesa", stock="OK")
session.add_all([pm1, pm2])
session.commit()

sim = models.ConfiguracionSimulacion(id=1, m2_totales=100, material_estructural_id=1, habitaciones=1, banios=1, areas_comunes=0)
session.add(sim)
session.commit()

# Call the calcular_insumos function directly
# Instead of importing backend.main (which relies on package-level imports), load main.py via SourceFileLoader
# Load schemas module so main.py can import it as 'schemas'
schemas_path = os.path.join(repo_root, 'backend', 'schemas.py')
schemas = SourceFileLoader('schemas', schemas_path).load_module()

main_path = os.path.join(repo_root, 'backend', 'main.py')
main = SourceFileLoader('main', main_path).load_module()
# main.calcular_insumos expects a DB session passed as `db`
result = main.calcular_insumos(1, db=session)

# Print key checks
print("costo_total:", result.costo_total)
for cat in result.desglose:
    print("Categoria:", cat.categoria)
    for item in cat.items:
        print("  ", item.insumo, "cantidad=", item.cantidad, "subtotal=", item.subtotal)

# Manual verification: compute expected Albañil subtotal
# Albañil: factor 0.05 HH/m2 * 100 m2 = 5 HH. precio_unit = 100 -> raw = 500. After SOCIAL_LEY_FACTOR 1.285 -> 642.5
expected_albanil_raw = 0.05 * 100 * 100.0
expected_albanil_with_social = expected_albanil_raw * float(os.environ["SOCIAL_LEY_FACTOR"]) 
print("expected_albanil_raw=", expected_albanil_raw)
print("expected_albanil_with_social=", expected_albanil_with_social)

session.close()