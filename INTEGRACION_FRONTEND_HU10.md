"""
GUÍA DE INTEGRACIÓN FRONTEND - HU10 Matriz de Rendimientos Constructivos

Ejemplos de cómo integrar los nuevos endpoints en el frontend Vue.js
"""

# ════════════════════════════════════════════════════════════════════════════════
# EJEMPLO 1: Composable Vue para obtener y cachear rendimientos
# ════════════════════════════════════════════════════════════════════════════════

// src/composables/useRendimientos.js

import { ref, computed } from 'vue'

export function useRendimientos() {
  const rendimientos = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // Función para obtener todos los rendimientos
  const fetchRendimientos = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('http://localhost:8000/api/rendimientos')
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      rendimientos.value = await response.json()
    } catch (err) {
      error.value = err.message
      console.error('Error fetching rendimientos:', err)
    } finally {
      loading.value = false
    }
  }
  
  // Función para obtener rendimiento de un material específico
  const getRendimientoByMaterial = async (materialId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/rendimientos/${materialId}`
      )
      
      if (!response.ok) {
        throw new Error(`Material no encontrado: ${materialId}`)
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error fetching rendimiento:', err)
      throw err
    }
  }
  
  // Obtener nombre de material y su factor
  const getRendimientoInfo = (materialId) => {
    const rendimiento = rendimientos.value.find(
      r => r.material_estructural_id === materialId
    )
    return rendimiento || null
  }
  
  // Calcular insumos localmente
  const calcularInsumos = (m2, materialId) => {
    const rendimiento = getRendimientoInfo(materialId)
    if (!rendimiento) return null
    
    return {
      m2: m2,
      factor: rendimiento.factor_rendimiento,
      cantidad: m2 * rendimiento.factor_rendimiento,
      insumo: rendimiento.insumo_base,
      unidad: rendimiento.unidad
    }
  }
  
  return {
    rendimientos,
    loading,
    error,
    fetchRendimientos,
    getRendimientoByMaterial,
    getRendimientoInfo,
    calcularInsumos
  }
}

# ════════════════════════════════════════════════════════════════════════════════
# EJEMPLO 2: Componente Vue que muestra rendimientos
# ════════════════════════════════════════════════════════════════════════════════

// src/components/RendimientosPanel.vue

<template>
  <div class="rendimientos-panel">
    <h2>Matriz de Rendimientos Constructivos</h2>
    
    <!-- Tabla de rendimientos -->
    <div v-if="!loading" class="rendimientos-tabla">
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Factor (por m²)</th>
            <th>Insumo</th>
            <th>Unidad</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rendimientos" :key="r.id">
            <td>{{ getMaterialNombre(r.material_estructural_id) }}</td>
            <td>{{ r.factor_rendimiento }}</td>
            <td>{{ r.insumo_base }}</td>
            <td>{{ r.unidad }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-if="loading">
      <p>Cargando rendimientos...</p>
    </div>
    
    <div v-if="error">
      <p class="error">Error: {{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRendimientos } from '@/composables/useRendimientos'

const { rendimientos, loading, error, fetchRendimientos } = useRendimientos()

const MATERIALES = {
  1: 'Madera',
  2: 'Metalcom',
  3: 'Albañilería',
  4: 'Hormigón Armado'
}

const getMaterialNombre = (id) => MATERIALES[id] || 'Desconocido'

onMounted(() => {
  fetchRendimientos()
})
</script>

<style scoped>
.rendimientos-panel {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.rendimientos-tabla {
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

tr:hover {
  background-color: #f9f9f9;
}

.error {
  color: red;
  padding: 10px;
  background-color: #fee;
  border-radius: 4px;
}
</style>

# ════════════════════════════════════════════════════════════════════════════════
# EJEMPLO 3: Actualizar ConfigurationPanel con estimación de insumos
# ════════════════════════════════════════════════════════════════════════════════

// Dentro de ConfigurationPanel.vue - Methods

methods: {
  
  async guardarSimulacion() {
    try {
      const payload = {
        m2Totales: this.m2Totales,
        materialEstructuralId: this.materialSeleccionado,
        habitaciones: this.habitaciones,
        banios: this.banios,
        areasComunes: this.areasComunes
      }
      
      // 1. Enviar solicitud al backend
      const response = await fetch(
        'http://localhost:8000/api/simulacion/parametros',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const resultado = await response.json()
      
      // 2. Backend retorna estimación dinámica
      // {
      //   "idSimulacion": 5,
      //   "message": "Simulación guardada correctamente",
      //   "estimacion_insumos": {
      //     "m2_ingresados": 100,
      //     "material_estructural_id": 1,
      //     "factor_rendimiento": 0.5,
      //     "insumo_base": "Sacos de Cemento",
      //     "cantidad_insumos": 50.0,
      //     "unidad": "sacos"
      //   }
      // }
      
      // 3. Almacenar en store
      this.$store.commit('setSimulacionActual', resultado)
      
      // 4. Mostrar notificación con estimación
      this.mostrarNotificacionExito(
        `Simulación guardada. Estimación: ${resultado.estimacion_insumos.cantidad_insumos} ${resultado.estimacion_insumos.unidad} de ${resultado.estimacion_insumos.insumo_base}`
      )
      
      // 5. Actualizar UI con información de insumos
      this.actualizarEstimacion(resultado.estimacion_insumos)
      
    } catch (error) {
      console.error('Error al guardar simulación:', error)
      this.mostrarErrorNotificacion('Error al guardar la simulación')
    }
  },
  
  actualizarEstimacion(estimacion) {
    // Mostrar estimación en la UI
    this.estimacionActual = {
      m2: estimacion.m2_ingresados,
      material: this.getMaterialNombre(estimacion.material_estructural_id),
      factor: estimacion.factor_rendimiento,
      cantidad: estimacion.cantidad_insumos,
      insumo: estimacion.insumo_base,
      unidad: estimacion.unidad,
      descripcion: estimacion.descripcion
    }
  }
}

# ════════════════════════════════════════════════════════════════════════════════
# EJEMPLO 4: Template Vue mostrando estimación
# ════════════════════════════════════════════════════════════════════════════════

<template>
  <div class="simulacion-resultado">
    <!-- Información básica -->
    <h3>Simulación Creada: #{{ idSimulacion }}</h3>
    
    <!-- NUEVO: Mostrar estimación de insumos -->
    <div v-if="estimacion" class="estimacion-insumos">
      <h4>📊 Estimación de Insumos</h4>
      
      <div class="estimacion-grid">
        <div class="estimacion-item">
          <label>Área Total:</label>
          <strong>{{ estimacion.m2 }} m²</strong>
        </div>
        
        <div class="estimacion-item">
          <label>Material:</label>
          <strong>{{ estimacion.material }}</strong>
        </div>
        
        <div class="estimacion-item">
          <label>Factor de Rendimiento:</label>
          <strong>{{ estimacion.factor }} {{ estimacion.unidad }}/m²</strong>
        </div>
        
        <div class="estimacion-item destacado">
          <label>💰 Cantidad Estimada:</label>
          <strong class="cantidad-grande">
            {{ estimacion.cantidad }} {{ estimacion.unidad }}
          </strong>
          <small>de {{ estimacion.insumo }}</small>
        </div>
      </div>
      
      <p class="descripcion">
        {{ estimacion.descripcion }}
      </p>
      
      <!-- Fórmula usada -->
      <div class="formula">
        <p>
          <strong>Fórmula aplicada:</strong>
          {{ estimacion.m2 }} m² × {{ estimacion.factor }} = 
          <span class="resultado">{{ estimacion.cantidad }} {{ estimacion.unidad }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.simulacion-resultado {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  margin: 20px 0;
}

.estimacion-insumos {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #4CAF50;
  margin-top: 15px;
}

.estimacion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.estimacion-item {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.estimacion-item.destacado {
  background: #e8f5e9;
  border: 2px solid #4CAF50;
}

.cantidad-grande {
  font-size: 24px;
  color: #2e7d32;
  display: block;
  margin: 5px 0;
}

.formula {
  background: #fff8e1;
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
}

.resultado {
  background: #4CAF50;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
}
</style>

# ════════════════════════════════════════════════════════════════════════════════
# EJEMPLO 5: Flujo completo de usuario
# ════════════════════════════════════════════════════════════════════════════════

/*
FLUJO DE USUARIO CON HU10:

1. Usuario abre la aplicación
   ├─ Frontend carga matriz de rendimientos
   │  └─ GET /api/rendimientos
   │     → Muestra tabla con materiales y factores
   │
2. Usuario configura vivienda
   ├─ Selecciona: 100 m² | Madera
   ├─ Ingresa: 3 habitaciones, 2 baños, 1 área común
   │
3. Usuario presiona "Guardar Simulación"
   ├─ Frontend envía POST /api/simulacion/parametros
   ├─ Backend:
   │  ├─ Valida parámetros
   │  ├─ Consulta Rendimiento_Constructivo por material_id
   │  ├─ Calcula: 100 m² × 0.5 = 50 sacos
   │  └─ Retorna estimación dinámica
   │
4. Frontend recibe respuesta
   ├─ Muestra estimación: "50 sacos de cemento"
   ├─ Calcula presupuesto aproximado
   │  └─ 50 sacos × precio_unitario
   │
5. Usuario ve:
   ├─ Simulación guardada ✓
   ├─ Material: Madera
   ├─ Factor aplicado: 0.5 sacos/m²
   ├─ Estimación: 50 sacos de cemento
   └─ Opción para editar/descargar presupuesto

VENTAJA: Si el factor cambia en BD (0.5 → 0.6),
         las próximas simulaciones usan 0.6 automáticamente
         sin cambios en frontend ni backend.
*/

# ════════════════════════════════════════════════════════════════════════════════
# EJEMPLO 6: Servicio centralizado para API
# ════════════════════════════════════════════════════════════════════════════════

// src/services/siecApi.js

class SIECApi {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }
  
  // Rendimientos
  async getRendimientos() {
    const response = await fetch(`${this.baseUrl}/api/rendimientos`)
    return response.json()
  }
  
  async getRendimiento(materialId) {
    const response = await fetch(`${this.baseUrl}/api/rendimientos/${materialId}`)
    if (!response.ok) throw new Error('Rendimiento no encontrado')
    return response.json()
  }
  
  // Simulaciones
  async crearSimulacion(parametros) {
    const response = await fetch(
      `${this.baseUrl}/api/simulacion/parametros`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parametros)
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Error al crear simulación')
    }
    
    return response.json()
  }
  
  // Helper: Calcular insumos localmente para preview
  calcularInsumosMientrasEdita(m2, factor) {
    return m2 * factor
  }
}

export default new SIECApi()

# ════════════════════════════════════════════════════════════════════════════════
# RECOMENDACIONES DE IMPLEMENTACIÓN
# ════════════════════════════════════════════════════════════════════════════════

1. CACHÉ DE RENDIMIENTOS
   - Cargar matriz al iniciar la app
   - Actualizar cada 24 horas o manualmente
   - Permite cálculos locales instantáneos

2. VALIDACIÓN EN TIEMPO REAL
   - Mostrar estimación mientras user escribe m²
   - Actualizar cuando cambia de material
   - Usar debounce para no sobrecargar

3. PRESENTACIÓN DE RESULTADOS
   - Mostrar estimación claramente
   - Incluir fórmula: m² × factor = resultado
   - Ofrecer opciones de exportación

4. MANEJO DE ERRORES
   - Si no hay rendimiento → Mostrar mensaje
   - Si API cae → Usar valores cached
   - Validar que material existe

5. ACCESIBILIDAD
   - Labels en inputs
   - Descriptions en tablas
   - Información clara en tooltips
   - Contraste adecuado en números

"""
