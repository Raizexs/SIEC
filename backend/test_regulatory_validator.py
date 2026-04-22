"""
test_regulatory_validator.py
Pruebas unitarias para el módulo de validación regulatoria (HU18)

Ejecutar con: pytest test_regulatory_validator.py -v
"""

import pytest
from regulatory_validator import (
    RegulatoryValidator,
    RegulationStatus,
    RegulationViolation,
)


class TestRegulatoryValidator:
    """Suite de pruebas para validación regulatoria MINVU"""

    @pytest.fixture
    def validator(self):
        """Instancia del validador para las pruebas"""
        return RegulatoryValidator()

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Autoconstrucción (OGUC Art. 5.1.1)
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_self_construction_within_limit_isolated(self, validator):
        """
        Escenario: Vivienda aislada dentro del límite (<=90 m²)
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=85,
            material_estructural="Madera",
            is_complex=False,
        )

        assert result.status == RegulationStatus.COMPLIANT
        assert result.is_self_constructible is True
        assert len(result.violations) == 0

    def test_self_construction_exceeds_limit_isolated(self, validator):
        """
        Escenario: Vivienda aislada que excede límite (>90 m²)
        Esperado: Status BLOCKED con violación SELF_BUILD_EXCEEDS
        """
        result = validator.validate_project(
            m2_totales=120,
            material_estructural="Madera",
            is_complex=False,
        )

        assert result.status == RegulationStatus.BLOCKED
        assert result.is_self_constructible is False
        assert len(result.violations) > 0
        assert result.violations[0].code == "SELF_BUILD_EXCEEDS"

    def test_self_construction_within_limit_complex(self, validator):
        """
        Escenario: Conjunto dentro del límite (<=140 m²)
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=130,
            material_estructural="Hormigón Armado",
            is_complex=True,
        )

        assert result.status == RegulationStatus.COMPLIANT
        assert result.is_self_constructible is True
        assert len(result.violations) == 0

    def test_self_construction_exceeds_limit_complex(self, validator):
        """
        Escenario: Conjunto que excede límite (>140 m²)
        Esperado: Status BLOCKED
        """
        result = validator.validate_project(
            m2_totales=180,
            material_estructural="Hormigón Armado",
            is_complex=True,
        )

        assert result.status == RegulationStatus.BLOCKED
        assert result.is_self_constructible is False

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: LOSCAT en Zonas Frías
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_loscat_required_in_cold_zone(self, validator):
        """
        Escenario: Proyecto en Los Ríos (zona fría)
        Esperado: Advertencia LOSCAT_REQUIRED
        """
        result = validator.validate_project(
            m2_totales=80,
            material_estructural="Madera",
            zona_climatica="Los Ríos",
        )

        assert result.requires_loscat is True
        assert len(result.warnings) > 0
        assert result.warnings[0].code == "LOSCAT_REQUIRED"

    def test_loscat_not_required_in_central_zone(self, validator):
        """
        Escenario: Proyecto en zona Central (no fría)
        Esperado: No hay requisito LOSCAT
        """
        result = validator.validate_project(
            m2_totales=100,
            material_estructural="Hormigón Armado",
            zona_climatica="Central",
        )

        assert result.requires_loscat is False
        assert not any(w.code == "LOSCAT_REQUIRED" for w in result.warnings)

    def test_all_cold_zones_detected(self, validator):
        """
        Escenario: Validar todas las zonas frías
        Esperado: Todas requieren LOSCAT
        """
        cold_zones = ["Los Ríos", "Los Lagos", "Aysén", "Magallanes", "Araucanía Sur"]

        for zone in cold_zones:
            result = validator.validate_project(
                m2_totales=80,
                material_estructural="Madera",
                zona_climatica=zone,
            )
            assert result.requires_loscat is True

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Restricciones de Material - Metalcom
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_metalcom_3_stories_without_engineer_allowed(self, validator):
        """
        Escenario: Metalcom 3 pisos sin ingeniero
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=80,
            material_estructural="Metalcom",
            num_stories=3,
            has_engineer=False,
        )

        assert result.status == RegulationStatus.COMPLIANT
        assert len(result.violations) == 0

    def test_metalcom_exceeds_3_stories_without_engineer(self, validator):
        """
        Escenario: Metalcom 4 pisos sin ingeniero (usando conjunto para evitar autoconstrucción)
        Esperado: Status BLOCKED, violación MATERIAL_MAX_STORIES_EXCEEDED
        """
        result = validator.validate_project(
            m2_totales=120,
            material_estructural="Metalcom",
            num_stories=4,
            is_complex=True,
            has_engineer=False,
        )

        assert result.status == RegulationStatus.BLOCKED
        assert len(result.violations) > 0
        # Buscar la violación de material en lugar de asumir que es la primera
        material_violations = [v for v in result.violations if v.code == "MATERIAL_MAX_STORIES_EXCEEDED"]
        assert len(material_violations) > 0

    def test_metalcom_10_stories_with_engineer_allowed(self, validator):
        """
        Escenario: Metalcom 10 pisos con ingeniero
        Nota: Usa 80 m² (dentro de autoconstrucción) pero con ingeniero permite 10 pisos
        Esperado: Status WARNING (LOSCAT en zona fría) o COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=80,
            material_estructural="Metalcom",
            num_stories=10,
            zona_climatica="Central",
            is_complex=False,
            has_engineer=True,
        )

        # Debe permitir 10 pisos con ingeniero en metalcom
        assert result.status in [RegulationStatus.COMPLIANT, RegulationStatus.WARNING]
        
        # No debe haber violación de material
        material_violations = [v for v in result.violations if v.code == "MATERIAL_MAX_STORIES_EXCEEDED"]
        assert len(material_violations) == 0

    def test_metalcom_exceeds_limit_with_engineer(self, validator):
        """
        Escenario: Metalcom 11 pisos con ingeniero
        Esperado: Status BLOCKED
        """
        result = validator.validate_project(
            m2_totales=2000,
            material_estructural="Metalcom",
            num_stories=11,
            has_engineer=True,
        )

        assert result.status == RegulationStatus.BLOCKED

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Restricciones de Material - Madera
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_wood_2_stories_without_engineer_allowed(self, validator):
        """
        Escenario: Madera 2 pisos sin ingeniero
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=80,
            material_estructural="Madera",
            num_stories=2,
            has_engineer=False,
        )

        assert result.status == RegulationStatus.COMPLIANT

    def test_wood_exceeds_2_stories_without_engineer(self, validator):
        """
        Escenario: Madera 3 pisos sin ingeniero
        Esperado: Status BLOCKED
        """
        result = validator.validate_project(
            m2_totales=200,
            material_estructural="Madera",
            num_stories=3,
            has_engineer=False,
        )

        assert result.status == RegulationStatus.BLOCKED

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Límites Absolutos
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_absolute_max_m2_exceeded(self, validator):
        """
        Escenario: Proyecto excede 2500 m² (conjunto para evitar autoconstrucción)
        Esperado: Status BLOCKED, violación ABSOLUTE_MAX_EXCEEDED
        """
        result = validator.validate_project(
            m2_totales=3000,
            material_estructural="Hormigón Armado",
            is_complex=True,
        )

        assert result.status == RegulationStatus.BLOCKED
        assert len(result.violations) > 0
        # Buscar la violación de límite absoluto
        absolute_violations = [v for v in result.violations if v.code == "ABSOLUTE_MAX_EXCEEDED"]
        assert len(absolute_violations) > 0

    def test_absolute_max_m2_within_limit(self, validator):
        """
        Escenario: Proyecto dentro de todos los límites
        - 80 m² (dentro de autoconstrucción)
        - Metalcom 2 pisos (dentro de límites)
        - Zona Central (sin LOSCAT)
        
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=80,
            material_estructural="Metalcom",
            num_stories=2,
            zona_climatica="Central",
        )

        assert result.status == RegulationStatus.COMPLIANT

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Casos Combinados (Múltiples Restricciones)
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_multiple_violations_combined(self, validator):
        """
        Escenario: Proyecto con múltiples violaciones
        - Madera 4 pisos (sin ingeniero)
        - 120 m² (excede autoconstrucción aislada)
        
        Esperado: Status BLOCKED con 2 violaciones
        """
        result = validator.validate_project(
            m2_totales=120,
            material_estructural="Madera",
            num_stories=4,
            is_complex=False,
            has_engineer=False,
        )

        assert result.status == RegulationStatus.BLOCKED
        assert len(result.violations) >= 2

    def test_warning_with_compliance(self, validator):
        """
        Escenario: Proyecto cumple restricciones pero tiene advertencia
        - 80 m² en Madera (OK)
        - Los Ríos (requiere LOSCAT - advertencia)
        
        Esperado: Status WARNING
        """
        result = validator.validate_project(
            m2_totales=80,
            material_estructural="Madera",
            zona_climatica="Los Ríos",
            num_stories=1,
        )

        assert result.status == RegulationStatus.WARNING
        assert len(result.violations) == 0
        assert len(result.warnings) > 0

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Material Info Methods
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_get_material_info_metalcom(self, validator):
        """
        Escenario: Obtener información de Metalcom
        Esperado: Retorna restricciones correctas
        """
        info = validator.get_material_info("Metalcom")

        assert info is not None
        assert info["max_stories_without_engineer"] == 3
        assert info["max_stories_with_engineer"] == 10

    def test_get_material_info_nonexistent(self, validator):
        """
        Escenario: Obtener información de material inexistente
        Esperado: Retorna None
        """
        info = validator.get_material_info("MaterialFantasma")
        assert info is None

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRUEBAS: Edge Cases
    # ═══════════════════════════════════════════════════════════════════════════════

    def test_minimum_viable_project(self, validator):
        """
        Escenario: Proyecto mínimo viable (muy pequeño)
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=20,
            material_estructural="Madera",
            num_stories=1,
        )

        assert result.status == RegulationStatus.COMPLIANT
        assert result.is_constructible is True

    def test_maximum_compliant_project(self, validator):
        """
        Escenario: Proyecto máximo que cumple autoconstrucción
        Esperado: Status COMPLIANT
        """
        result = validator.validate_project(
            m2_totales=90,
            material_estructural="Hormigón Armado",
            num_stories=5,
            zona_climatica="Central",
        )

        assert result.status == RegulationStatus.COMPLIANT
        assert result.is_self_constructible is True

    def test_violation_detail_message(self, validator):
        """
        Escenario: Verificar que los mensajes de detalle son informativos
        Esperado: Violación contiene mensaje descriptivo
        """
        result = validator.validate_project(
            m2_totales=120,
            material_estructural="Madera",
            is_complex=False,
        )

        violation = result.violations[0]
        assert len(violation.detail) > 0
        assert len(violation.requirement) > 0
        assert violation.current_value is not None


# ═══════════════════════════════════════════════════════════════════════════════
# EJECUCIÓN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
