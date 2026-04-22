<template>
  <div class="regulatory-validator-panel">
    <!-- Header -->
    <div class="panel-header">
      <h3 class="panel-title">
        <span class="icon">⚖️</span>
        Validación Regulatoria MINVU
      </h3>
      <button 
        v-if="showValidation" 
        @click="toggleValidation"
        class="btn-toggle"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>
    </div>

    <!-- Project Parameters Preview (Always visible) -->
    <div class="project-preview">
      <h4 class="preview-title">📋 Parámetros del Proyecto</h4>
      <div class="parameters-grid">
        <div class="parameter-item">
          <span class="param-label">M² Totales</span>
          <span class="param-value">{{ projectData?.m2_totales || '—' }} m²</span>
        </div>
        <div class="parameter-item">
          <span class="param-label">Material</span>
          <span class="param-value">{{ projectData?.material_estructural || '—' }}</span>
        </div>
        <div class="parameter-item">
          <span class="param-label">Pisos</span>
          <span class="param-value">{{ projectData?.num_stories || '—' }}</span>
        </div>
        <div class="parameter-item">
          <span class="param-label">Zona Climática</span>
          <span class="param-value">{{ projectData?.zona_climatica || '—' }}</span>
        </div>
        <div class="parameter-item">
          <span class="param-label">¿Complejo?</span>
          <span class="param-value">{{ projectData?.is_complex ? 'Sí' : 'No' }}</span>
        </div>
        <div class="parameter-item">
          <span class="param-label">¿Ingeniero?</span>
          <span class="param-value">{{ projectData?.has_engineer ? 'Sí' : 'No' }}</span>
        </div>
      </div>
      <p class="preview-info">
        Se validarán: Autoconstrucción · LOSCAT · Restricciones de Material · Límites
      </p>
    </div>

    <!-- Validation Trigger Button -->
    <div v-if="!showValidation" class="validation-trigger">
      <button @click="handleValidate" :disabled="isLoading" class="btn-validate">
        {{ isLoading ? 'Validando...' : '🔍 Validar Proyecto' }}
      </button>
    </div>

    <!-- Validation Results -->
    <div v-if="showValidation && expanded" class="validation-results">
      <!-- Status Badge -->
      <div :class="['status-badge', statusClass]">
        <span class="status-icon">{{ statusIcon }}</span>
        <span class="status-text">{{ statusMessage }}</span>
      </div>

      <!-- Project Info Summary -->
      <div class="project-summary">
        <div class="summary-row">
          <span class="label">Metros Cuadrados:</span>
          <span class="value">{{ projectData?.m2_totales }} m²</span>
        </div>
        <div class="summary-row">
          <span class="label">Material Estructural:</span>
          <span class="value">{{ projectData?.material_estructural }}</span>
        </div>
        <div v-if="projectData?.num_stories" class="summary-row">
          <span class="label">Número de Pisos:</span>
          <span class="value">{{ projectData.num_stories }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Autoconstrucción:</span>
          <span :class="['value', isSelfConstructible ? 'allowed' : 'not-allowed']">
            {{ isSelfConstructible ? '✅ Permitida' : '❌ No permitida' }}
          </span>
        </div>
      </div>

      <!-- Violations (Bloqueadores) -->
      <div v-if="violations.length > 0" class="violations-section">
        <h4 class="section-title error">
          🚫 Violaciones Detectadas ({{ violations.length }})
        </h4>
        <div class="violations-list">
          <div v-for="(violation, idx) in violations" :key="`violation-${idx}`" class="violation-item error">
            <div class="violation-header">
              <span class="violation-code">{{ violation.code }}</span>
              <span class="violation-name">{{ violation.name }}</span>
            </div>
            <div class="violation-description">{{ violation.description }}</div>
            <div class="violation-details">
              <div class="detail-row">
                <span class="detail-label">Requerimiento:</span>
                <span class="detail-value">{{ violation.requirement }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Valor Actual:</span>
                <span class="detail-value">{{ violation.current_value }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Detalle:</span>
                <span class="detail-value">{{ violation.detail }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Warnings (Alertas) -->
      <div v-if="warnings.length > 0" class="warnings-section">
        <h4 class="section-title warning">
          ⚠️ Advertencias ({{ warnings.length }})
        </h4>
        <div class="warnings-list">
          <div v-for="(warning, idx) in warnings" :key="`warning-${idx}`" class="warning-item">
            <div class="warning-header">
              <span class="warning-code">{{ warning.code }}</span>
              <span class="warning-name">{{ warning.name }}</span>
            </div>
            <div class="warning-description">{{ warning.description }}</div>
            <div class="warning-details">
              <div class="detail-row">
                <span class="detail-label">Requerimiento:</span>
                <span class="detail-value">{{ warning.requirement }}</span>
              </div>
              <div v-if="warning.detail" class="detail-row">
                <span class="detail-label">Detalle:</span>
                <span class="detail-value">{{ warning.detail }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Material Constraints Info -->
      <div v-if="validationResult?.max_stories_without_engineer" class="constraints-info">
        <h4 class="section-title info">
          📋 Restricciones de Material
        </h4>
        <div class="constraint-item">
          <span class="constraint-label">Máximo de pisos (sin ingeniero):</span>
          <span class="constraint-value">{{ validationResult.max_stories_without_engineer }}</span>
        </div>
      </div>

      <!-- LOSCAT Requirement -->
      <div v-if="validationResult?.requires_loscat" class="loscat-info">
        <h4 class="section-title info">
          ❄️ Requisito LOSCAT
        </h4>
        <p class="loscat-message">
          Este proyecto está ubicado en una zona fría que requiere cumplimiento con 
          la <strong>Ley de Estabilidad del Piso (LOSCAT)</strong> para garantizar 
          la regularización de la construcción.
        </p>
      </div>

      <!-- Compliance Summary -->
      <div class="compliance-summary">
        <h4 class="section-title">📊 Resumen de Cumplimiento</h4>
        <div class="compliance-row">
          <span class="compliance-label">¿Constructible?</span>
          <span :class="['compliance-badge', isConstructible ? 'success' : 'error']">
            {{ isConstructible ? '✅ Sí' : '❌ No' }}
          </span>
        </div>
        <div class="compliance-row">
          <span class="compliance-label">¿Autoconstruible?</span>
          <span :class="['compliance-badge', isSelfConstructible ? 'success' : 'error']">
            {{ isSelfConstructible ? '✅ Sí' : '❌ No' }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button @click="handleRetryValidation" class="btn-secondary">
          🔄 Re-validar
        </button>
        <button 
          v-if="isConstructible" 
          @click="$emit('proceed-with-layout')"
          class="btn-primary"
        >
          ✅ Proceder con Layout
        </button>
        <button 
          v-else
          disabled
          class="btn-disabled"
        >
          ❌ No se puede proceder (Violaciones)
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{{ error }}</span>
      <button @click="error = null" class="btn-close">✕</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRegulatoryValidator } from '../composables/useRegulatoryValidator';
import { useI18n } from '../composables/useI18n';

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['proceed-with-layout', 'validation-complete']);

const { t } = useI18n();
const {
  isLoading,
  error,
  validationResult,
  validateProject,
  violations,
  warnings,
  isBlocked,
  isSelfConstructible,
  isConstructible,
  statusMessage,
} = useRegulatoryValidator();

const showValidation = ref(false);
const expanded = ref(true);

const statusClass = computed(() => {
  switch (validationResult.value?.status) {
    case 'compliant':
      return 'success';
    case 'warning':
      return 'warning';
    case 'blocked':
      return 'error';
    default:
      return 'neutral';
  }
});

const statusIcon = computed(() => {
  switch (validationResult.value?.status) {
    case 'compliant':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'blocked':
      return '❌';
    default:
      return '❓';
  }
});

async function handleValidate() {
  try {
    await validateProject(props.projectData);
    showValidation.value = true;
    emit('validation-complete', validationResult.value);
  } catch (err) {
    console.error('Validation error:', err);
  }
}

function handleRetryValidation() {
  handleValidate();
}

function toggleValidation() {
  expanded.value = !expanded.value;
}

// Watch for project data changes
watch(
  () => props.projectData,
  () => {
    if (showValidation.value) {
      handleValidate();
    }
  },
  { deep: true }
);
</script>

<style scoped>
.regulatory-validator-panel {
  background: linear-gradient(135deg, #1a1f2e 0%, #16213e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.icon {
  font-size: 24px;
}

.btn-toggle {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
}

.validation-trigger {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.project-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #93c5fd;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.parameters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.parameter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.param-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.param-value {
  font-size: 13px;
  font-weight: 600;
  color: #60a5fa;
  font-family: 'Courier New', monospace;
}

.preview-info {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-validate {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-validate:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.btn-validate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.validation-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
}

.status-badge.success {
  background-color: rgba(52, 211, 153, 0.1);
  border: 2px solid #34d399;
  color: #34d399;
}

.status-badge.warning {
  background-color: rgba(251, 191, 36, 0.1);
  border: 2px solid #fbbf24;
  color: #fbbf24;
}

.status-badge.error {
  background-color: rgba(239, 68, 68, 0.1);
  border: 2px solid #ef4444;
  color: #ef4444;
}

.status-icon {
  font-size: 24px;
}

.status-text {
  flex: 1;
}

.project-summary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #d1d5db;
  font-size: 14px;
}

.summary-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.label {
  font-weight: 600;
  color: #9ca3af;
}

.value {
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
}

.value.allowed {
  color: #34d399;
}

.value.not-allowed {
  color: #ef4444;
}

.violations-section,
.warnings-section,
.constraints-info,
.loscat-info {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-title.error {
  color: #ef4444;
}

.section-title.warning {
  color: #fbbf24;
}

.section-title.info {
  color: #60a5fa;
}

.violations-list,
.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.violation-item,
.warning-item {
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid;
  border-radius: 4px;
  padding: 12px;
}

.violation-item {
  border-left-color: #ef4444;
}

.violation-item.error {
  border-left-color: #dc2626;
}

.warning-item {
  border-left-color: #fbbf24;
}

.violation-header,
.warning-header {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.violation-code,
.warning-code {
  background: rgba(255, 255, 255, 0.1);
  color: #d1d5db;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.violation-name,
.warning-name {
  font-weight: 600;
  color: #e5e7eb;
}

.violation-description,
.warning-description {
  color: #d1d5db;
  font-size: 13px;
  margin-bottom: 10px;
}

.violation-details,
.warning-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
}

.detail-value {
  color: #d1d5db;
  font-size: 13px;
  padding-left: 8px;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
}

.loscat-message {
  color: #d1d5db;
  font-size: 13px;
  margin: 0;
  line-height: 1.6;
}

.constraint-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #d1d5db;
  font-size: 13px;
}

.constraint-label {
  font-weight: 600;
  color: #9ca3af;
}

.constraint-value {
  color: #60a5fa;
  font-family: 'Courier New', monospace;
  font-weight: 700;
}

.compliance-summary {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.compliance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  color: #d1d5db;
  font-size: 14px;
}

.compliance-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.compliance-label {
  font-weight: 600;
  color: #9ca3af;
}

.compliance-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
}

.compliance-badge.success {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.compliance-badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-primary,
.btn-secondary,
.btn-disabled {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(52, 211, 153, 0.4);
}

.btn-secondary {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #d1d5db;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-disabled {
  background: rgba(255, 255, 255, 0.05);
  color: #6b7280;
  cursor: not-allowed;
  opacity: 0.6;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid #ef4444;
  border-radius: 8px;
  padding: 12px 16px;
  color: #fecaca;
  font-size: 14px;
  margin-top: 12px;
}

.error-icon {
  font-size: 18px;
}

.error-message {
  flex: 1;
}

.btn-close {
  background: transparent;
  border: none;
  color: #fecaca;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.btn-close:hover {
  color: #fca5a5;
}

@media (max-width: 768px) {
  .regulatory-validator-panel {
    padding: 16px;
  }

  .status-badge {
    flex-direction: column;
    text-align: center;
  }

  .summary-row,
  .compliance-row {
    flex-direction: column;
    gap: 8px;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
