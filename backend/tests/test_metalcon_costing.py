import os
import sys
from datetime import datetime
from unittest.mock import MagicMock

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_siec.db")

from main import calcular_insumos
import models


def _build_price_record(insumo_id: int, precio: float) -> MagicMock:
    return MagicMock(
        insumo_id=insumo_id,
        tienda="referencia",
        precio=precio,
        precio_descuento=None,
        fecha_scraping=datetime(2026, 5, 26, 12, 0, 0),
    )


def test_calcular_insumos_metalcon_renombra_y_calcula_estructuras():
    mock_db = MagicMock()

    mock_sim = MagicMock()
    mock_sim.m2_totales = 40
    mock_sim.material_estructural_id = 2

    mock_material = MagicMock()
    mock_material.nombre = "Metalcon"

    mock_r_solera = MagicMock(); mock_r_solera.factor_multiplicador = 0.18; mock_r_solera.unidad_factor = "unidades por m2"
    mock_r_pie = MagicMock(); mock_r_pie.factor_multiplicador = 0.51; mock_r_pie.unidad_factor = "unidades por m2"
    mock_r_tornillo = MagicMock(); mock_r_tornillo.factor_multiplicador = 0.1; mock_r_tornillo.unidad_factor = "cajas por m2"

    mock_solera = MagicMock(id=25, nombre="Perfil U 62x25x0.85", categoria="Obra Gruesa", unidad_medida="unidad", descripcion="Perfil canal U Metalcon 3m")
    mock_pie = MagicMock(id=26, nombre="Perfil C 60x38x0.85", categoria="Obra Gruesa", unidad_medida="unidad", descripcion="Perfil estructural C Metalcon 3m")
    mock_tornillo = MagicMock(id=33, nombre="Tornillo Autoperforante", categoria="Obra Gruesa", unidad_medida="caja", descripcion="Caja de tornillos autoperforantes para metal")

    price_records = [
        _build_price_record(25, 12000.0),
        _build_price_record(26, 15000.0),
        _build_price_record(33, 6000.0),
    ]

    def side_effect(model_arg, *args):
        query_mock = MagicMock()

        if model_arg == models.ConfiguracionSimulacion:
            query_mock.filter.return_value.first.return_value = mock_sim
        elif model_arg == models.MaterialEstructural:
            query_mock.filter.return_value.first.return_value = mock_material
        elif model_arg == models.PrecioMercado:
            query_mock.distinct.return_value.filter.return_value.order_by.return_value.all.return_value = price_records
        else:
            query_mock.join.return_value.filter.return_value.all.return_value = [
                (mock_r_solera, mock_solera),
                (mock_r_pie, mock_pie),
                (mock_r_tornillo, mock_tornillo),
            ]

        return query_mock

    mock_db.query.side_effect = side_effect

    response = calcular_insumos(simulacion_id=1, payload=None, db=mock_db)

    items = response.desglose[0].items
    assert [item.insumo for item in items] == [
        "Perfil U 62x25mm 3m",
        "Perfil C 60x38mm 3m",
        "Tornillo autoperforante 8x1/2",
    ]
    assert items[0].cantidad >= 17.0
    assert items[1].cantidad >= 68.0
    assert items[2].cantidad >= 272.0
    assert response.costo_total is not None
    assert 2_000_000 <= response.costo_total <= 8_000_000


def test_calcular_insumos_metalcon_usa_geometria_de_layout():
    mock_db = MagicMock()

    mock_sim = MagicMock()
    mock_sim.m2_totales = 40
    mock_sim.material_estructural_id = 2

    mock_material = MagicMock()
    mock_material.nombre = "Metalcon"

    mock_r_solera = MagicMock(); mock_r_solera.factor_multiplicador = 0.18; mock_r_solera.unidad_factor = "unidades por m2"
    mock_r_pie = MagicMock(); mock_r_pie.factor_multiplicador = 0.51; mock_r_pie.unidad_factor = "unidades por m2"

    mock_solera = MagicMock(id=25, nombre="Perfil U 62x25x0.85", categoria="Obra Gruesa", unidad_medida="unidad", descripcion="Perfil canal U Metalcon 3m")
    mock_pie = MagicMock(id=26, nombre="Perfil C 60x38x0.85", categoria="Obra Gruesa", unidad_medida="unidad", descripcion="Perfil estructural C Metalcon 3m")

    price_records = [
        _build_price_record(25, 12000.0),
        _build_price_record(26, 15000.0),
    ]

    def side_effect(model_arg, *args):
        query_mock = MagicMock()

        if model_arg == models.ConfiguracionSimulacion:
            query_mock.filter.return_value.first.return_value = mock_sim
        elif model_arg == models.MaterialEstructural:
            query_mock.filter.return_value.first.return_value = mock_material
        elif model_arg == models.PrecioMercado:
            query_mock.distinct.return_value.filter.return_value.order_by.return_value.all.return_value = price_records
        else:
            query_mock.join.return_value.filter.return_value.all.return_value = [
                (mock_r_solera, mock_solera),
                (mock_r_pie, mock_pie),
            ]

        return query_mock

    mock_db.query.side_effect = side_effect

    payload = MagicMock()
    payload.area_bruta_m2 = 40
    payload.vanos = []
    payload.cortes_acero = 0
    payload.cruces_acero = 0
    payload.piezas_2d = []
    payload.cortes_1d = []
    payload.recintos = [
        MagicMock(piso=1, coords_x=0.0, coords_z=0.0, width=6.0, length=4.0),
        MagicMock(piso=1, coords_x=6.0, coords_z=0.0, width=4.0, length=4.0),
    ]

    response = calcular_insumos(simulacion_id=1, payload=payload, db=mock_db)

    items = response.desglose[0].items
    assert [item.insumo for item in items] == [
        "Perfil U 62x25mm 3m",
        "Perfil C 60x38mm 3m",
    ]
    assert items[0].cantidad_objetivo == 19.0
    assert items[1].cantidad_objetivo == 74.0
