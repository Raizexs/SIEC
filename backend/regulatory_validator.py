"""
regulatory_validator.py
Módulo de validación de restricciones regulatorias MINVU

Criterios de aceptación HU18:
1. Auditoría de autoconstrucción (<=90 o 140 m²)
2. Validación LOSCAT en zonas frías
3. Restricción Metalcon: máximo 3 pisos sin ingeniero
"""

from enum import Enum
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass


class RegulationStatus(str, Enum):
    """Estados de validación regulatoria"""
    COMPLIANT = "compliant"  # Cumple todas las restricciones
    WARNING = "warning"      # Advertencia (puede proceder con cuidado)
    BLOCKED = "blocked"      # Bloqueado (no puede proceder)


@dataclass
class RegulationViolation:
    """Representa una violación de restricción regulatoria"""
    code: str
    name: str
    description: str
    severity: str  # "warning" | "error"
    detail: str
    requirement: str
    current_value: any
    
    def to_dict(self) -> Dict:
        return {
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "severity": self.severity,
            "detail": self.detail,
            "requirement": self.requirement,
            "current_value": self.current_value,
        }


@dataclass
class RegulatoryValidationResult:
    """Resultado de la validación regulatoria"""
    status: RegulationStatus
    violations: List[RegulationViolation]
    warnings: List[RegulationViolation]
    is_constructible: bool
    is_self_constructible: bool
    requires_loscat: bool
    max_stories_without_engineer: Optional[int]
    
    def to_dict(self) -> Dict:
        return {
            "status": self.status.value,
            "violations": [v.to_dict() for v in self.violations],
            "warnings": [w.to_dict() for w in self.warnings],
            "is_constructible": self.is_constructible,
            "is_self_constructible": self.is_self_constructible,
            "requires_loscat": self.requires_loscat,
            "max_stories_without_engineer": self.max_stories_without_engineer,
        }


class RegulatoryValidator:
    """
    Validador de restricciones regulatorias MINVU
    
    Implementa restricciones duras (Hard Constraints) para:
    - Autoconstrucción (OGUC Artículo 5.1.1)
    - LOSCAT (Ley de Pisos)
    - Metalcon (limitaciones estructurales)
    """
    
    # Límites de autoconstrucción según OGUC
    SELF_BUILD_ISOLATED_MAX = 90      # m² para viviendas aisladas
    SELF_BUILD_COMPLEX_MAX = 140      # m² para conjuntos/condominios
    
    # Límite absoluto de construcción
    ABSOLUTE_MAX_M2 = 2500
    
    # Restricciones por material
    MATERIAL_CONSTRAINTS = {
        "Metalcom": {
            "max_stories_without_engineer": 3,
            "max_stories_with_engineer": 10,
            "requires_engineer_for_seismic": True,
        },
        "Madera": {
            "max_stories_without_engineer": 2,
            "max_stories_with_engineer": 5,
            "requires_engineer_for_seismic": True,
        },
        "Albañilería": {
            "max_stories_without_engineer": 5,
            "max_stories_with_engineer": 12,
            "requires_engineer_for_seismic": True,
        },
        "Hormigón Armado": {
            "max_stories_without_engineer": 10,
            "max_stories_with_engineer": 20,
            "requires_engineer_for_seismic": False,
        },
    }
    
    # Zonas frías que requieren LOSCAT
    COLD_ZONES = ["Los Ríos", "Los Lagos", "Aysén", "Magallanes", "Araucanía Sur"]
    
    def validate_project(
        self,
        m2_totales: int,
        material_estructural: str,
        num_stories: int = 1,
        zona_climatica: str = "Central",
        is_complex: bool = False,
        has_engineer: bool = False,
    ) -> RegulatoryValidationResult:
        """
        Valida un proyecto contra todas las restricciones regulatorias
        
        Args:
            m2_totales: Metros cuadrados totales
            material_estructural: Tipo de material ("Metalcom", "Madera", etc.)
            num_stories: Número de pisos
            zona_climatica: Zona climática del proyecto
            is_complex: Si es un conjunto/condominio (vs. vivienda aislada)
            has_engineer: Si el proyecto cuenta con ingeniero
            
        Returns:
            RegulatoryValidationResult con estado y violaciones
        """
        violations: List[RegulationViolation] = []
        warnings: List[RegulationViolation] = []
        
        # Validar autoconstrucción
        self_construct_check = self._validate_self_construction(
            m2_totales, is_complex
        )
        if self_construct_check:
            violations.extend(self_construct_check)
        
        # Validar LOSCAT en zonas frías
        loscat_check = self._validate_loscat_requirement(zona_climatica)
        if loscat_check:
            warnings.append(loscat_check)
        
        # Validar restricciones de material
        material_check = self._validate_material_constraints(
            material_estructural, num_stories, has_engineer
        )
        if material_check:
            violations.extend(material_check)
        
        # Validar límites absolutos
        absolute_check = self._validate_absolute_limits(m2_totales)
        if absolute_check:
            violations.append(absolute_check)
        
        # Determinar estado general
        is_blocked = len(violations) > 0
        status = RegulationStatus.BLOCKED if is_blocked else (
            RegulationStatus.WARNING if warnings else RegulationStatus.COMPLIANT
        )
        
        # Información adicional
        is_self_constructible = m2_totales <= (
            self.SELF_BUILD_COMPLEX_MAX if is_complex 
            else self.SELF_BUILD_ISOLATED_MAX
        )
        
        requires_loscat = zona_climatica in self.COLD_ZONES
        
        max_stories = self._get_max_stories(
            material_estructural, has_engineer
        )
        
        return RegulatoryValidationResult(
            status=status,
            violations=violations,
            warnings=warnings,
            is_constructible=not is_blocked,
            is_self_constructible=is_self_constructible,
            requires_loscat=requires_loscat,
            max_stories_without_engineer=max_stories,
        )
    
    def _validate_self_construction(
        self, m2_totales: int, is_complex: bool
    ) -> List[RegulationViolation]:
        """Valida límites de autoconstrucción según OGUC Art. 5.1.1"""
        violations = []
        max_allowed = (
            self.SELF_BUILD_COMPLEX_MAX if is_complex 
            else self.SELF_BUILD_ISOLATED_MAX
        )
        
        if m2_totales > max_allowed:
            project_type = "conjunto/condominio" if is_complex else "vivienda aislada"
            violations.append(RegulationViolation(
                code="SELF_BUILD_EXCEEDS",
                name="Autoconstrucción Excedida",
                description=f"El proyecto excede el límite de autoconstrucción para {project_type}",
                severity="error",
                detail=f"Se excede por {m2_totales - max_allowed} m²",
                requirement=f"Máximo {max_allowed} m² para {project_type} (OGUC Art. 5.1.1)",
                current_value=m2_totales,
            ))
        
        return violations
    
    def _validate_loscat_requirement(
        self, zona_climatica: str
    ) -> Optional[RegulationViolation]:
        """Valida requerimiento de LOSCAT en zonas frías"""
        if zona_climatica in self.COLD_ZONES:
            return RegulationViolation(
                code="LOSCAT_REQUIRED",
                name="LOSCAT Requerido",
                description="Este proyecto está en zona fría y requiere Ley de Pisos (LOSCAT)",
                severity="warning",
                detail=f"Zona: {zona_climatica}",
                requirement="Cumplir con normas LOSCAT para garantizar estabilidad",
                current_value=zona_climatica,
            )
        return None
    
    def _validate_material_constraints(
        self, material: str, num_stories: int, has_engineer: bool
    ) -> List[RegulationViolation]:
        """Valida restricciones específicas por material estructural"""
        violations = []
        
        if material not in self.MATERIAL_CONSTRAINTS:
            return violations
        
        constraints = self.MATERIAL_CONSTRAINTS[material]
        max_stories = (
            constraints["max_stories_with_engineer"] if has_engineer
            else constraints["max_stories_without_engineer"]
        )
        
        if num_stories > max_stories:
            engineer_status = "con ingeniero" if has_engineer else "sin ingeniero"
            violations.append(RegulationViolation(
                code="MATERIAL_MAX_STORIES_EXCEEDED",
                name="Límite de Pisos Excedido",
                description=f"{material} permite máximo {max_stories} pisos {engineer_status}",
                severity="error",
                detail=f"Se intenta {num_stories} pisos, máximo permitido: {max_stories}",
                requirement=f"Máximo {max_stories} pisos para {material} {engineer_status}",
                current_value=num_stories,
            ))
        
        return violations
    
    def _validate_absolute_limits(self, m2_totales: int) -> Optional[RegulationViolation]:
        """Valida límites absolutos de superficie"""
        if m2_totales > self.ABSOLUTE_MAX_M2:
            return RegulationViolation(
                code="ABSOLUTE_MAX_EXCEEDED",
                name="Límite Absoluto Excedido",
                description="El proyecto excede el límite máximo permitido",
                severity="error",
                detail=f"Se excede por {m2_totales - self.ABSOLUTE_MAX_M2} m²",
                requirement=f"Máximo {self.ABSOLUTE_MAX_M2} m²",
                current_value=m2_totales,
            )
        return None
    
    def _get_max_stories(
        self, material: str, has_engineer: bool
    ) -> Optional[int]:
        """Obtiene el máximo de pisos permitido para un material"""
        if material not in self.MATERIAL_CONSTRAINTS:
            return None
        
        constraints = self.MATERIAL_CONSTRAINTS[material]
        return (
            constraints["max_stories_with_engineer"] if has_engineer
            else constraints["max_stories_without_engineer"]
        )
    
    def get_material_info(self, material: str) -> Optional[Dict]:
        """Retorna información de restricciones para un material"""
        if material not in self.MATERIAL_CONSTRAINTS:
            return None
        return self.MATERIAL_CONSTRAINTS[material]


# Instancia global del validador
regulatory_validator = RegulatoryValidator()
