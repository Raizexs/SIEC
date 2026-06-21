"""Tests del validador normativo agregado."""

import os
import sys

import pytest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from normativa.validator import validar_normativa, MIN_ROOM_HEIGHT_M
except ModuleNotFoundError:
    from backend.normativa.validator import validar_normativa, MIN_ROOM_HEIGHT_M  # type: ignore


class TestAlturaMinima:
    def test_recinto_bajo_21_no_cumple(self):
        result = validar_normativa(
            {
                "recintos": [
                    {"id": "r1", "tipo": "habitacion", "altura_m": 2.0},
                ],
            }
        )
        assert result["compliant"] is False
        assert any(a["codigo"] == "OGUC-ALTURA-MINIMA" for a in result["alerts"])

    def test_recinto_24_cumple_altura(self):
        result = validar_normativa(
            {
                "recintos": [
                    {"id": "r1", "dimensions": {"h": 2.4}},
                ],
            }
        )
        altura_alerts = [a for a in result["alerts"] if a["codigo"] == "OGUC-ALTURA-MINIMA"]
        assert altura_alerts == []


class TestLey21725Integrada:
    def test_area_150_bloquea(self):
        result = validar_normativa({"area_m2": 150.0, "valor_uf_actual": 38500.0})
        assert result["compliant"] is False
        assert any(a.get("bloqueante") for a in result["alerts"])


class TestLoscatLoscaa:
    def test_loscat_mamposteria_exterior(self):
        result = validar_normativa(
            {
                "material_id": 3,
                "muros": [{"es_exterior": True, "material_id": 3}],
            }
        )
        assert any(i["codigo"] == "LOSCAT-AISLACION-TERMICA" for i in result["injections"])

    def test_loscaa_hab_bano(self):
        result = validar_normativa(
            {
                "muros": [
                    {
                        "es_interior": True,
                        "tipos_adyacentes": ["habitacion", "banio"],
                    }
                ],
            }
        )
        assert any(i["codigo"] == "LOSCAA-DIVISION-HAB-BANO" for i in result["injections"])

    def test_madera_exterior_sin_loscat(self):
        result = validar_normativa(
            {
                "material_id": 1,
                "muros": [{"es_exterior": True, "material_id": 1}],
            }
        )
        assert not any(i["codigo"] == "LOSCAT-AISLACION-TERMICA" for i in result["injections"])
