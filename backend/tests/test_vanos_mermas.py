import os
from datetime import datetime
from importlib.machinery import SourceFileLoader


def _load_modules():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    os.environ["DATABASE_URL"] = "sqlite:///./test_siec.db"

    database = SourceFileLoader("database", os.path.join(repo_root, "backend", "database.py")).load_module()
    models = SourceFileLoader("models", os.path.join(repo_root, "backend", "models.py")).load_module()
    schemas = SourceFileLoader("schemas", os.path.join(repo_root, "backend", "schemas.py")).load_module()
    main = SourceFileLoader("main", os.path.join(repo_root, "backend", "main.py")).load_module()
    mermas = SourceFileLoader("mermas", os.path.join(repo_root, "backend", "mermas.py")).load_module()
    return database, models, schemas, main, mermas


def test_funciones_matematicas_vanos_y_factores():
    _, _, _, _, mermas = _load_modules()

    class Vano:
        def __init__(self, ancho, alto):
            self.ancho = ancho
            self.alto = alto

    vanos = [Vano(1.0, 2.0), Vano(0.8, 1.0)]
    area_vanos = mermas.calcular_area_vanos(vanos)
    assert abs(area_vanos - 2.8) < 1e-6

    area_neta = mermas.calcular_area_neta(20.0, area_vanos)
    assert abs(area_neta - 17.2) < 1e-6

    assert abs(mermas.inferir_factor_perdida("Mortero_Pega", "Obra Gruesa", 0, 0) - 1.10) < 1e-6
    assert abs(mermas.inferir_factor_perdida("Ladrillo Fiscal", "Albañilería", 0, 0) - 1.05) < 1e-6

    acero_bajo = mermas.inferir_factor_perdida("Acero A63", "Obra Gruesa", 0, 0)
    acero_alto = mermas.inferir_factor_perdida("Acero A63", "Obra Gruesa", 20, 10)
    assert 1.03 <= acero_bajo <= 1.10
    assert 1.03 <= acero_alto <= 1.10
    assert acero_alto > acero_bajo


def test_calculo_insumos_aplica_deduccion_vanos_y_mermas():
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

    material = models.MaterialEstructural(id=1, nombre="Albañilería", descripcion="", activo=True)
    insumo = models.Insumo(
        id=1,
        nombre="Ladrillo Fiscal",
        categoria="Obra Gruesa",
        unidad_medida="unidad",
        descripcion="",
        activo=True,
    )
    session.add_all([material, insumo])
    session.commit()

    rendimiento = models.MatrizRendimiento(
        id=1,
        material_estructural_id=1,
        insumo_id=1,
        factor_multiplicador=1.0,
        activo=True,
    )
    precio = models.PrecioMercado(
        id=1,
        insumo_id=1,
        tienda="T1",
        nombre_producto="Ladrillo Fiscal",
        precio=1000.0,
        precio_descuento=None,
        fecha_scraping=datetime.now(),
        exitoso=True,
        url="http://a",
        categoria="Obra Gruesa",
        stock="OK",
    )
    simulacion = models.ConfiguracionSimulacion(
        id=1,
        m2_totales=100,
        material_estructural_id=1,
        perimetro_ml=40,
        altura_muro_m=2.44,
        incluir_techumbre=False,
    )
    session.add_all([rendimiento, precio, simulacion])
    session.commit()

    payload = schemas.DeduccionMermasPayload(
        area_bruta_m2=100.0,
        vanos=[schemas.VanoInput(ancho=2.0, alto=2.0)],
    )
    result = main.calcular_insumos(1, payload=payload, db=session)

    assert abs(result.area_bruta_m2 - 100.0) < 1e-6
    assert abs(result.area_vanos_m2 - 4.0) < 1e-6
    assert abs(result.area_neta_m2 - 96.0) < 1e-6
    assert abs(result.volumen_neto_previo - 96.0) < 1e-6
    assert abs(result.volumen_compensado_pre_cotizacion - 101.0) < 1e-6

    item = result.desglose[0].items[0]
    assert abs(item.cantidad - 101.0) < 1e-6
    assert abs(item.subtotal - 101000.0) < 1e-6

    session.close()
