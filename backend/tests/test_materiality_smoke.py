"""Smoke: las 4 materialidades producen insumos con cantidades > 0."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

try:
    from main import app
    import billing.service as billing_service
except ModuleNotFoundError:
    from backend.main import app  # type: ignore
    import backend.billing.service as billing_service  # type: ignore

client = TestClient(app)

PAYLOAD_BASE = {
    "m2Totales": 30,
    "perimetro_ml": 24,
    "altura_muro_m": 2.44,
    "incluir_techumbre": False,
}


def _count_insumos(data: dict) -> int:
    categorias = data.get("desglose") or data.get("categorias") or []
    total = 0
    for categoria in categorias:
        items = categoria.get("items") or categoria.get("insumos") or []
        total += len(items)
    return total


@pytest.mark.parametrize("material_id", [1, 2, 3, 4])
def test_calcular_insumos_per_material(material_id):
    with patch.object(billing_service, "enforce_simulation_material", lambda *_a, **_k: None):
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
        insumo_count = _count_insumos(budget_res.json())
        assert insumo_count >= 3, f"Material {material_id}: pocos insumos ({insumo_count})"
