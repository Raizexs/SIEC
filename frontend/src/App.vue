<script setup>
import { ref, computed, watch } from 'vue'
import MaterialSelector from './components/MaterialSelector.vue'
import { useRecintosStore } from './stores/recintos'
import RoomEditor2D from './components/RoomEditor2D.vue'
import Scene3D from './components/Scene3D.vue'

const recintosStore = useRecintosStore()

const formData = ref({
  m2Totales: 120,
  materialEstructuralId: 1,
  habitaciones: 2,
  banios: 1,
  areasComunes: 1
})

const isSubmitting = ref(false)
const statusMessage = ref('')
const statusType = ref('')

const materialName = computed(() => {
  const materials = {
    1: 'Madera',
    2: 'Metalcom',
    3: 'Albanileria',
    4: 'Hormigon Armado'
  }
  return materials[formData.value.materialEstructuralId] || 'No seleccionado'
})

const ROOM_COSTS = ref({
  habitacion: 9,
  banio: 4,
  areaComun: 12
})

const usedTokens = computed(() => {
  return (formData.value.habitaciones * ROOM_COSTS.value.habitacion) +
    (formData.value.banios * ROOM_COSTS.value.banio) +
    (formData.value.areasComunes * ROOM_COSTS.value.areaComun)
})

const availableTokens = computed(() => Math.max(0, formData.value.m2Totales - usedTokens.value))
const maxHabitaciones = computed(() => formData.value.habitaciones + Math.floor(availableTokens.value / ROOM_COSTS.value.habitacion))
const maxBanios = computed(() => formData.value.banios + Math.floor(availableTokens.value / ROOM_COSTS.value.banio))
const maxAreasComunes = computed(() => formData.value.areasComunes + Math.floor(availableTokens.value / ROOM_COSTS.value.areaComun))

const hasRecintos = computed(() => recintosStore.recintos.length > 0)

watch(formData, (newVal) => {
  const required = (newVal.habitaciones * ROOM_COSTS.value.habitacion) +
    (newVal.banios * ROOM_COSTS.value.banio) +
    (newVal.areasComunes * ROOM_COSTS.value.areaComun)

  if (required > newVal.m2Totales) {
    statusMessage.value = `Saldo insuficiente: se requieren ${required} tokens y solo hay ${newVal.m2Totales} m2.`
    statusType.value = 'error'
  }
}, { deep: true })

const submitForm = async () => {
  isSubmitting.value = true
  statusMessage.value = 'Guardando parametros...'
  statusType.value = 'loading'

  try {
    const response = await fetch('http://localhost:8000/api/simulacion/parametros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    })

    if (!response.ok) {
      throw new Error('No se pudo guardar la simulacion en el backend.')
    }

    const data = await response.json()
    localStorage.setItem('siec_last_simulation_id', String(data.idSimulacion || ''))

    recintosStore.initializeLayout(
      formData.value.m2Totales,
      formData.value.habitaciones,
      formData.value.banios,
      formData.value.areasComunes,
      formData.value.materialEstructuralId
    )

    statusMessage.value = 'Parametros guardados y layout inicial generado.'
    statusType.value = 'success'
  } catch (error) {
    statusMessage.value = `Error: ${error.message || 'Fallo de conexion'}`
    statusType.value = 'error'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="app-container">
    <header class="app-header">
      <h1 class="app-title">SIEC</h1>
      <p class="app-description">Sistema Integral de Estimacion de Costos</p>
    </header>

    <div class="card">
      <h2 class="card-title">Simulacion: Parametros Base</h2>

      <form @submit.prevent="submitForm" class="siec-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="m2Totales" class="field-label">m2 Totales</label>
            <input id="m2Totales" v-model.number="formData.m2Totales" type="number" min="15" max="200" class="form-input" required />
          </div>

          <div class="form-group">
            <MaterialSelector v-model="formData.materialEstructuralId" />
          </div>

          <div class="form-group">
            <label for="habitaciones" class="field-label">Habitaciones ({{ ROOM_COSTS.habitacion }} tkns)</label>
            <input id="habitaciones" v-model.number="formData.habitaciones" type="number" min="0" :max="maxHabitaciones" class="form-input" required />
          </div>

          <div class="form-group">
            <label for="banios" class="field-label">Banios ({{ ROOM_COSTS.banio }} tkns)</label>
            <input id="banios" v-model.number="formData.banios" type="number" min="0" :max="maxBanios" class="form-input" required />
          </div>

          <div class="form-group full-width">
            <label for="areasComunes" class="field-label">Areas Comunes ({{ ROOM_COSTS.areaComun }} tkns)</label>
            <input id="areasComunes" v-model.number="formData.areasComunes" type="number" min="0" :max="maxAreasComunes" class="form-input" required />
          </div>
        </div>

        <div v-if="statusMessage" :class="['status-box', statusType]">
          {{ statusMessage }}
        </div>

        <div class="summary-badge">
          <div>
            <span class="summary-label">Configuracion actual:</span><br />
            <span class="summary-value">{{ formData.m2Totales }}m2 - {{ materialName }}</span>
          </div>
          <div style="text-align: right;">
            <span class="summary-label">Tokens disp.:</span><br />
            <span class="summary-value" :style="availableTokens === 0 ? 'color: #fca5a5;' : ''">
              {{ availableTokens }} / {{ formData.m2Totales }}
            </span>
          </div>
        </div>

        <button :disabled="isSubmitting" type="submit" class="btn-primary">
          {{ isSubmitting ? 'Guardando...' : 'Guardar Parametros' }}
        </button>
      </form>
    </div>

    <RoomEditor2D v-if="hasRecintos" class="editor-block" />
    <Scene3D v-if="hasRecintos" class="scene-block" />

    <footer class="app-footer">
      SIEC v1.0.0 | Sprint 1
    </footer>
  </main>
</template>

<style>
:root {
  background-color: #0f172a;
  color: #f8fafc;
  font-family: 'Inter', system-ui, sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.app-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.app-title {
  font-size: 3.2rem;
  font-weight: 900;
  letter-spacing: -2px;
  background: linear-gradient(to right, #60a5fa, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.app-description {
  color: #94a3b8;
  font-size: 1.1rem;
  margin-top: 0.5rem;
}

.card {
  width: 100%;
  max-width: 680px;
  background-color: #1e293b;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid #334155;
}

.card-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #f1f5f9;
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.full-width {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #94a3b8;
}

.form-input {
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: #f1f5f9;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.status-box {
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
}

.status-box.loading { background: #1e3a8a; color: #93c5fd; }
.status-box.success { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
.status-box.error { background: #7f1d1d; color: #fca5a5; }

.summary-badge {
  background-color: #334155;
  padding: 0.9rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  border: 1px dashed #475569;
}

.summary-label { color: #94a3b8; font-size: 0.85rem; }
.summary-value { font-weight: 700; color: #3b82f6; }

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-block {
  margin-top: 1.5rem;
  width: 100%;
  max-width: 860px;
}

.scene-block {
  margin-top: 1.25rem;
  width: 100%;
  max-width: 860px;
}

.app-footer {
  margin-top: 2rem;
  font-size: 0.85rem;
  color: #475569;
}

@media (max-width: 760px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
