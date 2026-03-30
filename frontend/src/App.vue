<script setup>
import { ref, computed } from 'vue'
import MaterialSelector from './components/MaterialSelector.vue'

// Estado del formulario basado en el trabajo previo de los compañeros (HU01, SCRUM-21, 24, 34)
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
    3: 'Albañilería',
    4: 'Hormigón Armado'
  }
  return materials[formData.value.materialEstructuralId] || 'No seleccionado'
})

const submitForm = async () => {
  isSubmitting.ref = true
  statusMessage.value = 'Guardando parámetros...'
  statusType.value = 'loading'
  
  try {
    // Simulación de envío al backend (FastAPI)
    console.log('Enviando datos:', JSON.stringify(formData.value))
    
    // Mock de retraso
    await new Promise(resolve => setTimeout(resolve, 800))
    
    statusMessage.value = 'Parámetros guardados exitosamente'
    statusType.value = 'success'
  } catch (error) {
    statusMessage.value = 'Error al conectar con el servidor'
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
      <p class="app-description">Sistema Integral de Estimación de Costos</p>
    </header>

    <div class="card">
      <h2 class="card-title">Simulación: Parámetros Base</h2>
      
      <form @submit.prevent="submitForm" class="siec-form">
        <div class="form-grid">
          <!-- Campo m2 (SCRUM-21) -->
          <div class="form-group">
            <label for="m2Totales" class="field-label">m² Totales</label>
            <input 
              id="m2Totales" 
              v-model.number="formData.m2Totales" 
              type="number" 
              min="15" 
              max="1000" 
              class="form-input" 
              required
            />
          </div>

          <!-- Selector Material (SCRUM-23) -->
          <div class="form-group">
            <MaterialSelector v-model="formData.materialEstructuralId" />
          </div>

          <!-- Habitaciones (SCRUM-34) -->
          <div class="form-group">
            <label for="habitaciones" class="field-label">Habitaciones</label>
            <input 
              id="habitaciones" 
              v-model.number="formData.habitaciones" 
              type="number" 
              min="0" 
              class="form-input" 
              required
            />
          </div>

          <!-- Baños (SCRUM-34) -->
          <div class="form-group">
            <label for="banios" class="field-label">Baños</label>
            <input 
              id="banios" 
              v-model.number="formData.banios" 
              type="number" 
              min="0" 
              class="form-input" 
              required
            />
          </div>

          <!-- Áreas Comunes (SCRUM-34) -->
          <div class="form-group full-width">
            <label for="areasComunes" class="field-label">Áreas Comunes</label>
            <input 
              id="areasComunes" 
              v-model.number="formData.areasComunes" 
              type="number" 
              min="0" 
              class="form-input" 
              required
            />
          </div>
        </div>
        
        <div v-if="statusMessage" :class="['status-box', statusType]">
          {{ statusMessage }}
        </div>

        <div class="summary-badge">
          <span class="summary-label">Configuración actual:</span>
          <span class="summary-value">{{ formData.m2Totales }}m² - {{ materialName }}</span>
        </div>

        <button :disabled="isSubmitting" type="submit" class="btn-primary">
          {{ isSubmitting ? 'Guardando...' : 'Guardar Parámetros' }}
        </button>
      </form>
    </div>

    <footer class="app-footer">
      SIEC v1.0.0 &copy; 2026 | Sprint 1
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
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: -2px;
  background: linear-gradient(to right, #60a5fa, #a855f7);
  -webkit-background-clip: text;
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
  max-width: 600px;
  background-color: #1e293b;
  padding: 3rem;
  border-radius: 28px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid #334155;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 2.5rem;
  color: #f1f5f9;
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  transition: all 0.2s;
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
  margin-bottom: 2rem;
  text-align: center;
  font-weight: 600;
}

.status-box.loading { background: #1e3a8a; color: #93c5fd; }
.status-box.success { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
.status-box.error { background: #7f1d1d; color: #fca5a5; }

.summary-badge {
  background-color: #334155;
  padding: 1rem;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
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
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-footer {
  margin-top: 3rem;
  font-size: 0.85rem;
  color: #475569;
}
</style>
