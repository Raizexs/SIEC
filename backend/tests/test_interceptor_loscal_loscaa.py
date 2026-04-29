"""
test_interceptor_loscal_loscaa.py
Tests unitarios para el Interceptor Normativo LOSCAL/LOSCAA
SCRUM-96
"""

import pytest
import sys
from pathlib import Path

# Añadir el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from interceptor_loscal_loscaa import (
    validar_interceptor_loscal_loscaa,
    PROFUNDIDAD_MINIMA_CIMENTACION_CM,
)


# ──────────────────────────────────────────────────────────────────────────────
# Criterio de Aceptación 1: Material SIP → Exención de LOSCAT/LOSCAA
# ──────────────────────────────────────────────────────────────────────────────

class TestExencionSIP:
    """Si la ampliación es SIP, no se aplican restricciones LOSCAT/LOSCAA."""

    def test_material_sip_no_requiere_insumos(self):
        """SIP tiene aislamiento intrínseco; no se inyectan insumos obligatorios."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="SIP",
            es_sip=True,
            area_muros_perimetrales_m2=100.0,
        )
        assert resultado.cumple_normativa is True
        assert resultado.bloqueante is False
        assert len(resultado.insumos_loscat_inyectados) == 0
        assert len(resultado.insumos_loscaa_inyectados) == 0
        assert "Exención normativa" in resultado.mensaje

    def test_sip_con_area_grande_sigue_exento(self):
        """Incluso con grandes áreas, SIP está exento."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="SIP",
            es_sip=True,
            area_muros_perimetrales_m2=500.0,
        )
        assert resultado.cumple_normativa is True
        assert len(resultado.insumos_loscat_inyectados) == 0
        assert len(resultado.insumos_loscaa_inyectados) == 0


# ──────────────────────────────────────────────────────────────────────────────
# Criterio de Aceptación 2: Material NO SIP → Inyectar LOSCAT y LOSCAA
# ──────────────────────────────────────────────────────────────────────────────

class TestInyeccionLOSCATLOSCAA:
    """Materiales que no son SIP requieren inyección de insumos LOSCAT y LOSCAA."""

    def test_metalcon_inyecta_loscat_y_loscaa(self):
        """Metalcon debe recibir insumos LOSCAT (térmica) y LOSCAA (acústica)."""
        area_muros = 120.0
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Metalcon",
            es_sip=False,
            area_muros_perimetrales_m2=area_muros,
        )
        
        # Verificar que se inyectó LOSCAT
        assert resultado.cumple_normativa is True
        assert len(resultado.insumos_loscat_inyectados) >= 2
        assert any(
            "aislante" in ins.nombre.lower()
            for ins in resultado.insumos_loscat_inyectados
        )
        assert any(
            "vapor" in ins.nombre.lower()
            for ins in resultado.insumos_loscat_inyectados
        )
        
        # Verificar que se inyectó LOSCAA
        assert len(resultado.insumos_loscaa_inyectados) >= 3
        assert any(
            "placa" in ins.nombre.lower() or "yeso" in ins.nombre.lower()
            for ins in resultado.insumos_loscaa_inyectados
        )
        assert any(
            "cortafuegos" in ins.nombre.lower() or "f-60" in ins.nombre.lower()
            for ins in resultado.insumos_loscaa_inyectados
        )

    def test_cantidad_insumos_proporcional_area_muros(self):
        """La cantidad de insumos debe ser proporcional al área de muros."""
        area_muros_pequeña = 50.0
        resultado_pequeña = validar_interceptor_loscal_loscaa(
            material_estructural="Hormigón Armado",
            es_sip=False,
            area_muros_perimetrales_m2=area_muros_pequeña,
        )
        
        area_muros_grande = 200.0
        resultado_grande = validar_interceptor_loscal_loscaa(
            material_estructural="Hormigón Armado",
            es_sip=False,
            area_muros_perimetrales_m2=area_muros_grande,
        )
        
        # Las cantidades deben estar relacionadas con el área
        aislante_pequeña = next(
            (ins.cantidad for ins in resultado_pequeña.insumos_loscat_inyectados
             if "aislante" in ins.nombre.lower()),
            None
        )
        aislante_grande = next(
            (ins.cantidad for ins in resultado_grande.insumos_loscat_inyectados
             if "aislante" in ins.nombre.lower()),
            None
        )
        
        assert aislante_pequeña is not None
        assert aislante_grande is not None
        assert aislante_grande > aislante_pequeña  # Área mayor = más insumos

    def test_hormigon_armado_inyecta_insumos(self):
        """Hormigón Armado (no SIP) requiere insumos LOSCAT/LOSCAA."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Hormigón Armado",
            es_sip=False,
            area_muros_perimetrales_m2=80.0,
        )
        assert resultado.cumple_normativa is True
        assert len(resultado.insumos_loscat_inyectados) > 0
        assert len(resultado.insumos_loscaa_inyectados) > 0

    def test_albañileria_inyecta_insumos(self):
        """Albañilería (no SIP) requiere insumos LOSCAT/LOSCAA."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Albañilería",
            es_sip=False,
            area_muros_perimetrales_m2=90.0,
        )
        assert resultado.cumple_normativa is True
        assert len(resultado.insumos_loscat_inyectados) > 0
        assert len(resultado.insumos_loscaa_inyectados) > 0


# ──────────────────────────────────────────────────────────────────────────────
# Criterio de Aceptación 3: Validación de fundación (Hormigón H20)
# ──────────────────────────────────────────────────────────────────────────────

class TestValidacionFundacion:
    """Validación que el hormigón de fundación cumpla mínimos (H20)."""

    def test_profundidad_cimentacion_suficiente(self):
        """Profundidad >= 80 cm es conforme."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Metalcon",
            es_sip=False,
            area_muros_perimetrales_m2=100.0,
            profundidad_cimentacion_cm=100.0,  # >= 80 cm
        )
        
        assert resultado.fundacion_conforme is True
        assert resultado.profundidad_especificada_cm == 100.0

    def test_profundidad_cimentacion_insuficiente(self):
        """Profundidad < 80 cm es no conforme."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Metalcon",
            es_sip=False,
            area_muros_perimetrales_m2=100.0,
            profundidad_cimentacion_cm=50.0,  # < 80 cm
        )
        
        assert resultado.fundacion_conforme is False

    def test_profundidad_no_especificada(self):
        """Si no se especifica profundidad, no se valida."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Metalcon",
            es_sip=False,
            area_muros_perimetrales_m2=100.0,
            profundidad_cimentacion_cm=None,
        )
        
        assert resultado.fundacion_conforme is None

    def test_hormigon_fundacion_siempre_h20(self):
        """El hormigón de fundación requerido debe ser siempre H20."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Hormigón Armado",
            es_sip=False,
            area_muros_perimetrales_m2=100.0,
        )
        
        assert resultado.hormigon_fundacion_requerido == "H20"


# ──────────────────────────────────────────────────────────────────────────────
# Criterio de Aceptación 4: Resistencia al fuego F-60
# ──────────────────────────────────────────────────────────────────────────────

class TestResistenciaFuegoF60:
    """Los aislamientos acústicos deben ser resistentes al fuego F-60."""

    def test_insumos_loscaa_tienen_f60(self):
        """Insumos LOSCAA deben marcar resistencia F-60."""
        resultado = validar_interceptor_loscal_loscaa(
            material_estructural="Metalcon",
            es_sip=False,
            area_muros_perimetrales_m2=100.0,
        )
        
        # Al menos la placa de yeso cartón debe tener F-60
        placas_f60 = [
            ins for ins in resultado.insumos_loscaa_inyectados
            if ins.resistencia_fuego == "F-60"
        ]
        assert len(placas_f60) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
