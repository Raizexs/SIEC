import os
from datetime import datetime
from importlib.machinery import SourceFileLoader


import sys
def _load_modules():
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
        
    os.environ["DATABASE_URL"] = "sqlite:///./test_siec.db"

    import database
    import models
    import schemas
    import main
    import mermas
    return database, models, schemas, main, mermas


def test_nesting_2d_y_1d_en_corredor_objetivo():
    _, _, _, _, mermas = _load_modules()

    panel = mermas.optimizar_compra_por_nesting(
        insumo="Volcanita RH Standard",
        categoria="Terminaciones",
        unidad_medida="plancha",
        unidad_factor="planchas por m2",
        descripcion="Placa de yeso cartón estándar 1.22x2.44m",
        cantidad_objetivo=72.5,
    )
    assert panel is not None
    assert panel["metodo"] == "nesting-2d"
    assert 4.0 <= panel["perdida_porcentual"] <= 12.0

    lineal = mermas.optimizar_compra_por_nesting(
        insumo="Cable H07Z1-K 1x2.5mm",
        categoria="Instalaciones",
        unidad_medida="rollo 100m",
        unidad_factor="rollos por m2",
        descripcion="Cable flexible libre de halógenos",
        cantidad_objetivo=9.4,
    )
    assert lineal is not None
    assert lineal["metodo"] == "nesting-1d"
    assert 4.0 <= lineal["perdida_porcentual"] <= 12.0


def test_calcular_insumos_expone_lista_compra_optimizada():
    database, models, schemas, main, _ = _load_modules()

    engine = database.engine
    session_local = database.SessionLocal
    base = database.Base
    base.metadata.create_all(bind=engine)

    session = session_local()
    for tbl in (
        models.MatrizRendimiento,
        models.PrecioMercado,
        models.Insumo,
        models.MaterialEstructural,
        models.ConfiguracionSimulacion,
    ):
        try:
            session.query(tbl).delete()
        except Exception:
            pass
    session.commit()

    material = models.MaterialEstructural(id=20, nombre="Metalcom", descripcion="", activo=True)
    insumo = models.Insumo(
        id=20,
        nombre="Volcanita RH Standard",
        categoria="Terminaciones",
        unidad_medida="plancha",
        descripcion="Placa de yeso cartón estándar 1.22x2.44m",
        activo=True,
    )
    session.add_all([material, insumo])
    session.commit()

    rendimiento = models.MatrizRendimiento(
        id=20,
        material_estructural_id=20,
        insumo_id=20,
        factor_multiplicador=0.42,
        unidad_factor="planchas por m2",
        activo=True,
    )
    precio = models.PrecioMercado(
        id=20,
        insumo_id=20,
        tienda="T1",
        nombre_producto="Volcanita 1.22x2.44",
        precio=9500.0,
        precio_descuento=None,
        fecha_scraping=datetime.now(),
        exitoso=True,
        url="http://a",
        categoria="Terminaciones",
        stock="OK",
    )
    simulacion = models.ConfiguracionSimulacion(
        id=20,
        m2_totales=180,
        material_estructural_id=20,
        habitaciones=0,
        banios=0,
        areas_comunes=0,
    )
    session.add_all([rendimiento, precio, simulacion])
    session.commit()

    result = main.calcular_insumos(20, payload=schemas.DeduccionMermasPayload(area_bruta_m2=180.0), db=session)
    item = result.desglose[0].items[0]

    assert result.items_optimizados == 1
    assert result.perdida_promedio_porcentual is not None
    assert 4.0 <= result.perdida_promedio_porcentual <= 12.0
    assert item.metodo_optimizacion == "nesting-2d"
    assert item.cantidad_compra is not None
    assert abs(item.cantidad - item.cantidad_compra) < 1e-6
    assert abs(item.cantidad - round(item.cantidad)) < 1e-6
    assert item.perdida_porcentual is not None
    assert 4.0 <= item.perdida_porcentual <= 12.0

    session.close()
