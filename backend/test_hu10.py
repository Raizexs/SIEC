"""
Script de prueba para la HU10 - Matriz de Rendimientos Constructivos

Ejemplos de cómo usar los nuevos endpoints de la API.
Ejecutar con: python test_hu10.py
"""

import requests
import json

# Configuración
BASE_URL = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}

def print_response(title, response):
    """Imprime la respuesta de forma legible"""
    print(f"\n{'='*60}")
    print(f"📌 {title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except:
        print(response.text)

# ════════════════════════════════════════════════════════════════════════════════
# 1. Obtener todos los rendimientos constructivos
# ════════════════════════════════════════════════════════════════════════════════

def test_get_all_rendimientos():
    """GET /api/rendimientos - Obtiene todos los rendimientos"""
    response = requests.get(f"{BASE_URL}/api/rendimientos", headers=HEADERS)
    print_response("GET /api/rendimientos - Todos los Rendimientos", response)
    return response.json()

# ════════════════════════════════════════════════════════════════════════════════
# 2. Obtener rendimiento específico por material
# ════════════════════════════════════════════════════════════════════════════════

def test_get_rendimiento_by_material(material_id):
    """GET /api/rendimientos/{material_id} - Obtiene rendimiento de un material"""
    response = requests.get(f"{BASE_URL}/api/rendimientos/{material_id}", headers=HEADERS)
    print_response(f"GET /api/rendimientos/{material_id} - Rendimiento por Material", response)
    return response.json()

# ════════════════════════════════════════════════════════════════════════════════
# 3. Crear una simulación con cálculo dinámico de insumos
# ════════════════════════════════════════════════════════════════════════════════

def test_crear_simulacion(m2, material_id, habitaciones, banios, areas_comunes):
    """POST /api/simulacion/parametros - Crea simulación con estimación"""
    payload = {
        "m2Totales": m2,
        "materialEstructuralId": material_id,
        "habitaciones": habitaciones,
        "banios": banios,
        "areasComunes": areas_comunes
    }
    response = requests.post(
        f"{BASE_URL}/api/simulacion/parametros",
        headers=HEADERS,
        json=payload
    )
    print_response(
        f"POST /api/simulacion/parametros - Crear Simulación ({m2}m² en Material {material_id})",
        response
    )
    return response.json()

# ════════════════════════════════════════════════════════════════════════════════
# CASOS DE PRUEBA
# ════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n🚀 INICIANDO PRUEBAS HU10 - Matriz de Rendimientos Constructivos")
    print("="*60)
    
    # Test 1: Obtener todos los rendimientos
    print("\n✅ Test 1: Obtener matriz completa de rendimientos")
    try:
        rendimientos = test_get_all_rendimientos()
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Obtener rendimiento específico para Madera (ID=1)
    print("\n✅ Test 2: Obtener rendimiento para Madera")
    try:
        rendimiento_madera = test_get_rendimiento_by_material(1)
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Obtener rendimiento para Metalcom (ID=2)
    print("\n✅ Test 3: Obtener rendimiento para Metalcom")
    try:
        rendimiento_metalcom = test_get_rendimiento_by_material(2)
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Crear simulación en MADERA (100 m²)
    # Cálculo esperado: 100 m² × 0.5 = 50 sacos de cemento
    print("\n✅ Test 4: Crear simulación en MADERA (100 m²)")
    print("   Cálculo esperado: 100 m² × 0.5 = 50 sacos de cemento")
    try:
        sim_madera = test_crear_simulacion(
            m2=100,
            material_id=1,  # Madera
            habitaciones=3,
            banios=2,
            areas_comunes=1
        )
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 5: Crear simulación en ALBAÑILERÍA (80 m²)
    # Cálculo esperado: 80 m² × 1.2 = 96 sacos de cemento
    print("\n✅ Test 5: Crear simulación en ALBAÑILERÍA (80 m²)")
    print("   Cálculo esperado: 80 m² × 1.2 = 96 sacos de cemento")
    try:
        sim_albanileria = test_crear_simulacion(
            m2=80,
            material_id=3,  # Albañilería
            habitaciones=2,
            banios=1,
            areas_comunes=1
        )
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 6: Crear simulación en HORMIGÓN ARMADO (120 m²)
    # Cálculo esperado: 120 m² × 1.5 = 180 sacos de cemento
    print("\n✅ Test 6: Crear simulación en HORMIGÓN ARMADO (120 m²)")
    print("   Cálculo esperado: 120 m² × 1.5 = 180 sacos de cemento")
    try:
        sim_hormigon = test_crear_simulacion(
            m2=120,
            material_id=4,  # Hormigón Armado
            habitaciones=4,
            banios=2,
            areas_comunes=2
        )
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 7: Crear simulación en METALCOM (50 m²)
    # Cálculo esperado: 50 m² × 0.7 = 35 sacos de cemento
    print("\n✅ Test 7: Crear simulación en METALCOM (50 m²)")
    print("   Cálculo esperado: 50 m² × 0.7 = 35 sacos de cemento")
    try:
        sim_metalcom = test_crear_simulacion(
            m2=50,
            material_id=2,  # Metalcom
            habitaciones=1,
            banios=1,
            areas_comunes=1
        )
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "="*60)
    print("✅ Pruebas completadas")
    print("="*60)

"""
NOTAS:
------

1. Asegúrate de que el backend esté corriendo en http://localhost:8000

2. Estructura de respuesta exitosa para crear simulación:
   {
     "idSimulacion": 1,
     "message": "Simulación guardada correctamente",
     "estimacion_insumos": {
       "m2_ingresados": 100,
       "material_estructural_id": 1,
       "factor_rendimiento": 0.5,
       "insumo_base": "Sacos de Cemento",
       "cantidad_insumos": 50.0,
       "unidad": "sacos",
       "descripcion": "..."
     }
   }

3. Factores de rendimiento por material:
   - Madera: 0.5 sacos/m²
   - Metalcom: 0.7 sacos/m²
   - Albañilería: 1.2 sacos/m²
   - Hormigón Armado: 1.5 sacos/m²
"""
