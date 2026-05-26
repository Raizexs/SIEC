import os
import sys
from datetime import datetime
from unittest.mock import MagicMock

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_siec.db")

import models
import schemas
from main import calcular_insumos


def _price(insumo_id: int, precio: float) -> MagicMock:
    return MagicMock(
        insumo_id=insumo_id,
        tienda="referencia",
        precio=precio,
        precio_descuento=None,
        fecha_scraping=datetime(2026, 5, 26, 12, 0, 0),
        url="fallback://metalcon",
    )


def test_calcular_insumos_metalcon_usa_layout_para_perfiles():
    db = MagicMock()

    sim = MagicMock()
    sim.m2_totales = 40
    sim.material_estructural_id = 2
    sim.perimetro_ml = 28
    sim.altura_muro_m = 2.44
    sim.incluir_techumbre = False

    material = MagicMock()
    material.nombre = "Metalcon"

    r_u = MagicMock(factor_multiplicador=0.18, unidad_factor="unidad por m2")
    r_c = MagicMock(factor_multiplicador=0.51, unidad_factor="unidad por m2")
    perfil_u = MagicMock(
        id=8,
        nombre="Perfil U 62x25x0.85",
        categoria="Obra Gruesa",
        unidad_medida="unidad",
        descripcion="Perfil canal U Metalcon 3m",
    )
    perfil_c = MagicMock(
        id=7,
        nombre="Perfil C 60x38x0.85",
        categoria="Obra Gruesa",
        unidad_medida="unidad",
        descripcion="Perfil estructural C Metalcon 3m",
    )

    def query_side_effect(model_arg, *args):
        query = MagicMock()
        if model_arg == models.ConfiguracionSimulacion:
            query.filter.return_value.first.return_value = sim
        elif model_arg == models.MaterialEstructural:
            query.filter.return_value.first.return_value = material
        elif model_arg == models.PrecioMercado:
            query.distinct.return_value.filter.return_value.order_by.return_value.all.return_value = [
                _price(8, 12000.0),
                _price(7, 15000.0),
            ]
        else:
            query.join.return_value.filter.return_value.all.return_value = [
                (r_u, perfil_u),
                (r_c, perfil_c),
            ]
        return query

    db.query.side_effect = query_side_effect

    payload = schemas.DeduccionMermasPayload(
        area_bruta_m2=40,
        recintos=[
            schemas.LayoutRecintoInput(piso=1, coords_x=0, coords_z=0, width=6, length=4),
            schemas.LayoutRecintoInput(piso=1, coords_x=6, coords_z=0, width=4, length=4),
        ],
    )

    response = calcular_insumos(simulacion_id=1, payload=payload, db=db)

    items = response.desglose[0].items
    assert [item.insumo for item in items] == ["Perfil U 62x25mm 3m", "Perfil C 60x38mm 3m"]
    assert items[0].cantidad_objetivo == 19.0
    assert items[1].cantidad_objetivo == 74.0
    assert response.costo_total is not None
    assert response.costo_total >= (19 * 12000.0) + (74 * 15000.0)
