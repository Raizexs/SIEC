<template>
  <div class="hu10-container">
    <!-- Header -->
    <div class="header">
      <h1>🏗️ Matriz de Rendimientos Constructivos (HU10)</h1>
      <p class="subtitle">Estimador dinámico de insumos por material</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <!-- Left: Configuration Panel -->
      <div class="config-panel">
        <h2>📋 Configurar Simulación</h2>

        <!-- Material Selection -->
        <div class="form-group">
          <label for="material">Material Estructural</label>
          <select v-model="formData.materialEstructuralId" id="material" class="input">
            <option value="">-- Seleccionar material --</option>
            <option value="1">🪵 Madera</option>
            <option value="2">🔧 Metalcom</option>
            <option value="3">🧱 Albañilería</option>
            <option value="4">🏢 Hormigón Armado</option>
          </select>
        </div>

        <!-- Area Input -->
        <div class="form-group">
          <label for="area">Área Total (m²)</label>
          <input
            v-model.number="formData.m2Totales"
            id="area"
            type="number"
            min="15"
            max="200"
            class="input"
            placeholder="Ej: 100"
            @input="updateEstimacion"
          />
          <small class="help-text">Rango: 15 - 200 m²</small>
        </div>

        <!-- Room Configuration -->
        <div class="rooms-section">
          <h3>🚪 Recintos</h3>

          <div class="form-group">
            <label for="hab">Habitaciones</label>
            <input
              v-model.number="formData.habitaciones"
              id="hab"
              type="number"
              min="0"
              class="input"
              placeholder="0"
            />
          </div>

          <div class="form-group">
            <label for="ban">Baños</label>
            <input
              v-model.number="formData.banios"
              id="ban"
              type="number"
              min="0"
              class="input"
              placeholder="0"
            />
          </div>

          <div class="form-group">
            <label for="area-com">Áreas Comunes</label>
            <input
              v-model.number="formData.areasComunes"
              id="area-com"
              type="number"
              min="0"
              class="input"
              placeholder="0"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button @click="crearSimulacion" class="btn-primary" :disabled="loading">
          {{ loading ? '⏳ Guardando...' : '💾 Guardar Simulación' }}
        </button>

        <!-- Error Message -->
        <div v-if="error" class="alert alert-error">
          ❌ {{ error }}
        </div>
      </div>

      <!-- Right: Rendimientos + Resultado -->
      <div class="results-panel">
        <!-- Matriz de Rendimientos -->
        <div class="rendimientos-section">
          <h2>📊 Matriz de Rendimientos</h2>

          <div v-if="renderimientosLoading" class="loading">
            Cargando factores dinámicos...
          </div>

          <div v-else-if="rendimientos.length > 0" class="rendimientos-grid">
            <div
              v-for="r in rendimientos"
              :key="r.id"
              class="rendimiento-card"
              :class="{ active: r.material_estructural_id == formData.materialEstructuralId }"
            >
              <div class="material-icon">{{ getMaterialIcon(r.material_estructural_id) }}</div>
              <div class="card-content">
                <h4>{{ getMaterialName(r.material_estructural_id) }}</h4>
                <div class="factor">
                  <span class="label">Factor:</span>
                  <span class="value">{{ r.factor_rendimiento }}</span>
                  <span class="unit">{{ r.unidad }}/m²</span>
                </div>
                <div class="insumo">
                  <span class="label">Insumo:</span>
                  <span class="value">{{ r.insumo_base }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Estimación de Insumos -->
        <div v-if="estimacion" class="estimacion-section">
          <h2>💰 Estimación de Insumos</h2>

          <div class="estimacion-card">
            <div class="estimacion-header">
              <h3>{{ getMaterialName(estimacion.material_estructural_id) }}</h3>
              <span class="area-badge">{{ estimacion.m2_ingresados }} m²</span>
            </div>

            <div class="estimacion-body">
              <div class="estimacion-row">
                <span class="label">Área:</span>
                <span class="value">{{ estimacion.m2_ingresados }} m²</span>
              </div>

              <div class="estimacion-row">
                <span class="label">Factor:</span>
                <span class="value">{{ estimacion.factor_rendimiento }} {{ estimacion.unidad }}/m²</span>
              </div>

              <div class="estimacion-row divider">
                <span class="label">Fórmula:</span>
                <span class="formula">
                  {{ estimacion.m2_ingresados }} × {{ estimacion.factor_rendimiento }} = ?
                </span>
              </div>

              <div class="estimacion-row result">
                <span class="label">📦 Cantidad Estimada:</span>
                <span class="value-large">{{ estimacion.cantidad_insumos }}</span>
                <span class="unit-large">{{ estimacion.unidad }} de {{ estimacion.insumo_base }}</span>
              </div>
            </div>

            <div class="estimacion-footer">
              <p>{{ estimacion.descripcion }}</p>
            </div>
          </div>

          <!-- Success Message -->
          <div v-if="simulacionGuardada" class="alert alert-success">
            ✅ Simulación #{{ simulacionGuardada.idSimulacion }} guardada correctamente
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p>👈 Configura una simulación para ver la estimación</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>HU10 - Matriz de Rendimientos Constructivos | Datos dinámicos consultados de BD</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// State
const formData = ref({
  m2Totales: 100,
  materialEstructuralId: '1',
  habitaciones: 3,
  banios: 2,
  areasComunes: 1
})

const rendimientos = ref([])
const estimacion = ref(null)
const simulacionGuardada = ref(null)
const loading = ref(false)
const renderimientosLoading = ref(false)
const error = ref(null)

// Material mappings
const materiales = {
  1: { nombre: 'Madera', icon: '🪵' },
  2: { nombre: 'Metalcom', icon: '🔧' },
  3: { nombre: 'Albañilería', icon: '🧱' },
  4: { nombre: 'Hormigón Armado', icon: '🏢' }
}

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Funciones helper
const getMaterialName = (id) => materiales[id]?.nombre || 'Desconocido'
const getMaterialIcon = (id) => materiales[id]?.icon || '❓'

// Cargar rendimientos
const cargarRendimientos = async () => {
  renderimientosLoading.value = true
  try {
    const response = await fetch(`${API_URL}/api/rendimientos`)
    if (!response.ok) throw new Error('Error al cargar rendimientos')

    rendimientos.value = await response.json()
  } catch (err) {
    console.error('Error:', err)
    error.value = 'No se pudieron cargar los rendimientos'
  } finally {
    renderimientosLoading.value = false
  }
}

// Actualizar estimación (local)
const updateEstimacion = () => {
  if (!formData.value.materialEstructuralId || !formData.value.m2Totales) return

  const rendimiento = rendimientos.value.find(
    r => r.material_estructural_id == formData.value.materialEstructuralId
  )

  if (rendimiento) {
    const cantidad = formData.value.m2Totales * rendimiento.factor_rendimiento
    estimacion.value = {
      m2_ingresados: formData.value.m2Totales,
      material_estructural_id: rendimiento.material_estructural_id,
      factor_rendimiento: rendimiento.factor_rendimiento,
      insumo_base: rendimiento.insumo_base,
      cantidad_insumos: Math.round(cantidad * 10000) / 10000, // Redondear a 4 decimales
      unidad: rendimiento.unidad,
      descripcion: rendimiento.descripcion
    }
  }
}

// Crear simulación
const crearSimulacion = async () => {
  if (!formData.value.materialEstructuralId || !formData.value.m2Totales) {
    error.value = 'Por favor completa los campos requeridos'
    return
  }

  // Validaciones
  if (formData.value.m2Totales < 15 || formData.value.m2Totales > 200) {
    error.value = 'El área debe estar entre 15 y 200 m²'
    return
  }

  if (![1, 2, 3, 4].includes(parseInt(formData.value.materialEstructuralId))) {
    error.value = 'Material inválido'
    return
  }

  loading.value = true
  error.value = null

  try {
    const payload = {
      m2Totales: formData.value.m2Totales,
      materialEstructuralId: parseInt(formData.value.materialEstructuralId),
      habitaciones: formData.value.habitaciones,
      banios: formData.value.banios,
      areasComunes: formData.value.areasComunes
    }

    const response = await fetch(`${API_URL}/api/simulacion/parametros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Error al crear simulación')
    }

    const resultado = await response.json()
    simulacionGuardada.value = resultado
    estimacion.value = resultado.estimacion_insumos
  } catch (err) {
    console.error('Error:', err)
    error.value = err.message || 'Error al guardar simulación'
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  cargarRendimientos()
  updateEstimacion()
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.hu10-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  color: #333;
}

.subtitle {
  margin: 0.5rem 0 0 0;
  color: #666;
  font-size: 1.1rem;
}

.content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}

/* Panel de Configuración */
.config-panel {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.config-panel h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #444;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.help-text {
  display: block;
  margin-top: 0.25rem;
  color: #999;
  font-size: 0.875rem;
}

.rooms-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.rooms-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.btn-primary {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Panel de Resultados */
.results-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.rendimientos-section,
.estimacion-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.rendimientos-section h2,
.estimacion-section h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.5rem;
}

.rendimientos-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .rendimientos-grid {
    grid-template-columns: 1fr;
  }
}

.rendimiento-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s;
  cursor: pointer;
}

.rendimiento-card:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.rendimiento-card.active {
  border-color: #667eea;
  background: #f0f4ff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.material-icon {
  font-size: 2rem;
  display: flex;
  align-items: center;
}

.card-content {
  flex: 1;
}

.card-content h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.factor,
.insumo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.label {
  font-weight: 600;
  color: #666;
}

.value {
  color: #667eea;
  font-weight: 600;
}

.unit {
  color: #999;
  font-size: 0.75rem;
}

/* Estimación */
.estimacion-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.estimacion-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.estimacion-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.area-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
}

.estimacion-body {
  padding: 1.5rem;
  background: white;
}

.estimacion-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.estimacion-row.divider {
  border-bottom: 2px solid #667eea;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
}

.estimacion-row.result {
  border: none;
  background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fa 100%);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.formula {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #667eea;
}

.value-large {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
}

.unit-large {
  color: #666;
  font-size: 0.9rem;
}

.estimacion-footer {
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  font-size: 0.875rem;
  color: #666;
  margin: 0;
}

.estimacion-footer p {
  margin: 0;
}

/* Alerts */
.alert {
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.alert-error {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.alert-success {
  background: #efe;
  color: #3c3;
  border: 1px solid #cfc;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
  font-size: 1.1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #667eea;
}

/* Footer */
.footer {
  background: rgba(0, 0, 0, 0.2);
  color: white;
  text-align: center;
  padding: 1.5rem;
  font-size: 0.875rem;
}

.footer p {
  margin: 0;
}
</style>
