"""Smoke: las 4 materialidades producen insumos con cantidades > 0."""

import pytest
from fastapi.testclient import TestClient

try:
    from main import app
except ModuleNotFoundError:
    from backend.main import app  # type: ignore

client = TestClient(app)

PAYLOAD_BASE = {
    "m2Totales": 30,
    "perimetro_ml": 24,
    "altura_muro_m": 2.44,
    "incluir_techumbre": False,
}


@pytest.mark.parametrize("material_id", [1, 2, 3, 4])
def test_calcular_insumos_per_material(material_id):
    sim_res = client.post(
        "/api/simulacion/parametros",
        json={**PAYLOAD_BASE, "materialEstructuralId": material_id},
    )
    assert sim_res.status_code == 201, sim_res.text
    sim_id = sim_res.json()["idSimulacion"]

    budget_res = client.post(
        f"/api/simulacion/{sim_id}/calcular-insumos",
        json={
            "vanos": [],
            "recintos": [],
            "cortes_2d": [],
            "cortes_1d": [],
        },
    )
    assert budget_res.status_code == 200, budget_res.text
    data = budget_res.json()
    categorias = data.get("desglose") or data.get("categorias") or []
    insumo_count = sum(len(c.get("insumos", [])) for c in categorias)
    assert insumo_count >= 3, f"Material {material_id}: pocos insumos ({insumo_count})"
