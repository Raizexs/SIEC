"""
test_ley21725.py
Tests unitarios para el Validador de Regularización — Ley 21.725 (Ley del Mono)
SCRUM-97
"""

import pytest

try:
    from ley21725 import (
        validar_ley_21725,
        AREA_UMBRAL_MIN_M2,
        AREA_UMBRAL_MAX_M2,
        TASACION_LIMITE_UF,
    )
except ModuleNotFoundError:
    from backend.ley21725 import (
        validar_ley_21725,
        AREA_UMBRAL_MIN_M2,
        AREA_UMBRAL_MAX_M2,
        TASACION_LIMITE_UF,
    )

VALOR_UF_TEST = 38500.0  # CLP de referencia para tests


# ──────────────────────────────────────────────────────────────────────────────
# Criterio de Aceptación principal: área > 140 m² → BLOQUEANTE
# ──────────────────────────────────────────────────────────────────────────────

class TestAreaExcedeLimite:
    """El diseño supera los 140 m² → infracción bloqueante Ley 21.725."""

    def test_area_141_es_bloqueante(self):
        resultado = validar_ley_21725(141.0, None, VALOR_UF_TEST)
        assert resultado.bloqueante is True
        assert resultado.cumple_ley is False
        assert resultado.codigo_infraccion == "LEY21725-AREA-EXCEDE"
        assert "Infracción Ley 21.725" in resultado.mensaje

    def test_area_200_es_bloqueante(self):
        resultado = validar_ley_21725(200.0, None, VALOR_UF_TEST)
        assert resultado.bloqueante is True
        assert resultado.codigo_infraccion == "LEY21725-AREA-EXCEDE"

    def test_area_exactamente_140_no_es_bloqueante_por_area(self):
        """El límite es estricto: 140.0 m² debe ser válido."""
        resultado = validar_ley_21725(140.0, None, VALOR_UF_TEST)
        assert resultado.codigo_infraccion != "LEY21725-AREA-EXCEDE"

    def test_detalle_incluye_area_actual(self):
        resultado = validar_ley_21725(155.5, None, VALOR_UF_TEST)
        assert "155.5" in resultado.detalle or "155,5" in resultado.detalle


# ──────────────────────────────────────────────────────────────────────────────
# Tasación >= 520 UF dentro del umbral social → BLOQUEANTE
# ──────────────────────────────────────────────────────────────────────────────

class TestTasacionExcedeLimite:
    """Área en rango 90–140 m² pero tasación >= 520 UF → infracción bloqueante."""

    def test_tasacion_exacta_520_uf_es_bloqueante(self):
        costo_clp = TASACION_LIMITE_UF * VALOR_UF_TEST  # = 520 UF exactas
        resultado = validar_ley_21725(100.0, costo_clp, VALOR_UF_TEST)
        assert resultado.bloqueante is True
        assert resultado.codigo_infraccion == "LEY21725-TASACION-EXCEDE"

    def test_tasacion_521_uf_es_bloqueante(self):
        costo_clp = 521 * VALOR_UF_TEST
        resultado = validar_ley_21725(120.0, costo_clp, VALOR_UF_TEST)
        assert resultado.bloqueante is True
        assert resultado.codigo_infraccion == "LEY21725-TASACION-EXCEDE"

    def test_tasacion_519_uf_no_es_bloqueante(self):
        costo_clp = 519 * VALOR_UF_TEST
        resultado = validar_ley_21725(110.0, costo_clp, VALOR_UF_TEST)
        assert resultado.bloqueante is False
        assert resultado.cumple_ley is True

    def test_sin_costo_no_evalua_tasacion(self):
        """Sin costo_total_clp, la tasación no se calcula y no puede fallar."""
        resultado = validar_ley_21725(100.0, None, VALOR_UF_TEST)
        assert resultado.tasacion_uf is None
        assert resultado.codigo_infraccion != "LEY21725-TASACION-EXCEDE"


# ──────────────────────────────────────────────────────────────────────────────
# Área por debajo del umbral mínimo → advertencia (NO bloqueante)
# ──────────────────────────────────────────────────────────────────────────────

class TestAreaBajoUmbralMinimo:
    def test_area_50_no_es_bloqueante(self):
        resultado = validar_ley_21725(50.0, None, VALOR_UF_TEST)
        assert resultado.bloqueante is False
        assert resultado.codigo_infraccion == "LEY21725-AREA-BAJO-UMBRAL"
        assert resultado.cumple_ley is True

    def test_area_exactamente_90_no_es_bajo_umbral(self):
        resultado = validar_ley_21725(90.0, None, VALOR_UF_TEST)
        assert resultado.codigo_infraccion != "LEY21725-AREA-BAJO-UMBRAL"


# ──────────────────────────────────────────────────────────────────────────────
# Caso feliz: cumple todos los requisitos
# ──────────────────────────────────────────────────────────────────────────────

class TestCumpleLey:
    def test_area_100_sin_costo_cumple(self):
        resultado = validar_ley_21725(100.0, None, VALOR_UF_TEST)
        assert resultado.cumple_ley is True
        assert resultado.bloqueante is False
        assert resultado.codigo_infraccion is None

    def test_area_120_con_tasacion_valida_cumple(self):
        costo_clp = 400 * VALOR_UF_TEST  # 400 UF < 520 UF
        resultado = validar_ley_21725(120.0, costo_clp, VALOR_UF_TEST)
        assert resultado.cumple_ley is True
        assert resultado.tasacion_uf == pytest.approx(400.0, rel=1e-3)

    def test_umbrales_retornados_correctos(self):
        resultado = validar_ley_21725(100.0, None, VALOR_UF_TEST)
        assert resultado.umbral_min_m2 == AREA_UMBRAL_MIN_M2
        assert resultado.umbral_max_m2 == AREA_UMBRAL_MAX_M2
        assert resultado.limite_tasacion_uf == TASACION_LIMITE_UF