#!/usr/bin/env python3
"""
Script de pruebas manuales para HU18 - Validador Regulatorio MINVU
Ejecuta todos los 9 casos de prueba definidos en MANUAL_TESTING_HU18.md
"""

from regulatory_validator import regulatory_validator
import json

def test_scenario(num, name, params):
    """Ejecuta un escenario de prueba y muestra los resultados"""
    print(f"\n{'='*80}")
    print(f"PRUEBA {num}: {name}")
    print(f"{'='*80}")
    print(f"Parámetros de entrada:")
    for key, value in params.items():
        print(f"  • {key}: {value}")
    
    result = regulatory_validator.validate_project(**params)
    
    print(f"\nResultado:")
    print(f"  Status: {result.status}")
    print(f"  Es constructible: {result.is_constructible}")
    print(f"  Es autoconstruible: {result.is_self_constructible}")
    print(f"  Requiere LOSCAT: {result.requires_loscat}")
    print(f"  Max pisos sin ingeniero: {result.max_stories_without_engineer}")
    
    if result.violations:
        print(f"\n  ❌ Violaciones ({len(result.violations)}):")
        for v in result.violations:
            print(f"    - [{v.code}] {v.name}: {v.detail}")
    
    if result.warnings:
        print(f"\n  ⚠️  Advertencias ({len(result.warnings)}):")
        for w in result.warnings:
            print(f"    - {w}")
    
    if not result.violations and not result.warnings:
        print(f"\n  ✅ Sin violaciones ni advertencias")
    
    return result

def main():
    print("\n" + "="*80)
    print("PRUEBAS MANUALES - HU18: VALIDACIÓN REGULATORIA MINVU")
    print("="*80)
    
    results = {}
    
    # PRUEBA 1: Proyecto COMPLIANT - Autoconstrucción aislada pequeña
    results["1"] = test_scenario(
        1,
        "Proyecto COMPLIANT - Autoconstrucción",
        {
            "m2_totales": 85,
            "material_estructural": "Madera",
            "num_stories": 2,
            "zona_climatica": "Central",
            "is_complex": False,
            "has_engineer": False
        }
    )
    
    # PRUEBA 2: Proyecto con WARNING - LOSCAT en zona fría
    results["2"] = test_scenario(
        2,
        "Proyecto con WARNING - LOSCAT Requerido",
        {
            "m2_totales": 85,
            "material_estructural": "Madera",
            "num_stories": 2,
            "zona_climatica": "Los Lagos",
            "is_complex": False,
            "has_engineer": False
        }
    )
    
    # PRUEBA 3: Proyecto BLOQUEADO - Excede autoconstrucción aislada
    results["3"] = test_scenario(
        3,
        "Proyecto BLOQUEADO - Excede límite autoconstrucción",
        {
            "m2_totales": 100,
            "material_estructural": "Madera",
            "num_stories": 2,
            "zona_climatica": "Central",
            "is_complex": False,
            "has_engineer": False
        }
    )
    
    # PRUEBA 4: Metalcom sin ingeniero > 3 pisos
    results["4"] = test_scenario(
        4,
        "BLOQUEADO - Metalcom sin ingeniero > 3 pisos",
        {
            "m2_totales": 120,
            "material_estructural": "Metalcom",
            "num_stories": 5,
            "zona_climatica": "Central",
            "is_complex": True,
            "has_engineer": False
        }
    )
    
    # PRUEBA 5: Metalcom CON ingeniero - Permitido hasta 10 pisos
    results["5"] = test_scenario(
        5,
        "COMPLIANT - Metalcom con ingeniero (8 pisos)",
        {
            "m2_totales": 180,
            "material_estructural": "Metalcom",
            "num_stories": 8,
            "zona_climatica": "Central",
            "is_complex": True,
            "has_engineer": True
        }
    )
    
    # PRUEBA 6: Madera > 2 pisos sin ingeniero
    results["6"] = test_scenario(
        6,
        "BLOQUEADO - Madera sin ingeniero > 2 pisos",
        {
            "m2_totales": 120,
            "material_estructural": "Madera",
            "num_stories": 3,
            "zona_climatica": "Central",
            "is_complex": True,
            "has_engineer": False
        }
    )
    
    # PRUEBA 7: Hormigón Armado - Máximo compatible
    results["7"] = test_scenario(
        7,
        "COMPLIANT - Hormigón Armado con ingeniero (12 pisos)",
        {
            "m2_totales": 250,
            "material_estructural": "Hormigón Armado",
            "num_stories": 12,
            "zona_climatica": "Central",
            "is_complex": True,
            "has_engineer": True
        }
    )
    
    # PRUEBA 8: Excede límite absoluto de 2500 m²
    results["8"] = test_scenario(
        8,
        "BLOQUEADO - Excede límite máximo 2500 m²",
        {
            "m2_totales": 2600,
            "material_estructural": "Hormigón Armado",
            "num_stories": 3,
            "zona_climatica": "Central",
            "is_complex": True,
            "has_engineer": True
        }
    )
    
    # PRUEBA 9: Proyecto complejo con múltiples restricciones
    results["9"] = test_scenario(
        9,
        "BLOQUEADO - Múltiples violaciones",
        {
            "m2_totales": 160,
            "material_estructural": "Metalcom",
            "num_stories": 6,
            "zona_climatica": "Magallanes",
            "is_complex": True,
            "has_engineer": False
        }
    )
    
    # RESUMEN FINAL
    print(f"\n\n" + "="*80)
    print("RESUMEN DE RESULTADOS")
    print("="*80)
    
    compliant_count = sum(1 for r in results.values() if r.status == "compliant")
    warning_count = sum(1 for r in results.values() if r.status == "warning")
    blocked_count = sum(1 for r in results.values() if r.status == "blocked")
    
    print(f"\n📊 Distribución de resultados:")
    print(f"  ✅ COMPLIANT: {compliant_count}")
    print(f"  ⚠️  WARNING:   {warning_count}")
    print(f"  ❌ BLOCKED:    {blocked_count}")
    print(f"  {'─'*40}")
    print(f"  TOTAL:        {len(results)}/9 pruebas ejecutadas")
    
    print(f"\n✅ Todas las pruebas manuales completadas exitosamente\n")

if __name__ == "__main__":
    main()
