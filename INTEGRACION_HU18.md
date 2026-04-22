# 🔗 Guía de Integración HU18 en el Dashboard

## Cómo Integrar el Validador Regulatorio en el Dashboard

---

## Opción 1: Integración Simple (Recomendado)

Agrega el componente `RegulatoryValidator.vue` al `App.vue` existente:

### Paso 1: Importar el Componente

En `frontend/src/App.vue`, añade al `<script setup>`:

```javascript
import RegulatoryValidator from "./components/RegulatoryValidator.vue";
```

### Paso 2: Usar el Componente

En el template de `App.vue`, añade después de `ConfigurationPanel`:

```vue
<!-- Validación Regulatoria MINVU (HU18) -->
<RegulatoryValidator 
  :projectData="formData"
  @validation-complete="handleValidationComplete"
  @proceed-with-layout="handleProceedWithLayout"
/>
```

### Paso 3: Agregar Métodos Manejadores

En el `<script setup>`:

```javascript
// Manejador para cuando la validación se completa
function handleValidationComplete(validationResult) {
  console.log('Validación completada:', validationResult);
  // Aquí puedes guardar el resultado en el estado global si es necesario
  if (validationResult.status === 'blocked') {
    console.warn('Proyecto bloqueado por restricciones regulatorias');
  }
}

// Manejador para cuando el usuario hace click en "Proceder con Layout"
function handleProceedWithLayout() {
  console.log('Procediendo a generar layout');
  // Aquí puedes disparar la lógica de generación de layout
  // Por ejemplo: generateLayout()
}
```

---

## Opción 2: Integración Avanzada (Panel Lateral)

Si quieres un panel lateral separado con validación:

### Crear Nuevo Componente Contenedor

Archivo: `frontend/src/components/RegulatoryValidationPanel.vue`

```vue
<template>
  <div class="validation-panel-container">
    <div class="panel-header">
      <h2>Validación Regulatoria</h2>
      <button @click="isCollapsed = !isCollapsed" class="btn-collapse">
        {{ isCollapsed ? '▶' : '▼' }}
      </button>
    </div>

    <div v-if="!isCollapsed" class="panel-content">
      <RegulatoryValidator 
        :projectData="projectData"
        @validation-complete="handleValidation"
        @proceed-with-layout="$emit('proceed')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import RegulatoryValidator from './RegulatoryValidator.vue';

defineProps({
  projectData: {
    type: Object,
    required: true,
  },
});

defineEmits(['proceed', 'validation-complete']);

const isCollapsed = ref(false);

function handleValidation(result) {
  console.log('Validation result:', result);
}
</script>

<style scoped>
.validation-panel-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 20px 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.btn-collapse {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

.panel-content {
  padding: 20px;
}
</style>
```

---

## Opción 3: Integración Condicional

Solo mostrar el validador cuando se cumplan ciertos criterios:

```vue
<RegulatoryValidator 
  v-if="isReadyForValidation"
  :projectData="formData"
  @validation-complete="handleValidationComplete"
  @proceed-with-layout="handleProceedWithLayout"
/>

<script setup>
import { computed } from 'vue';

// Mostrar el validador solo cuando el usuario ha ingresado datos básicos
const isReadyForValidation = computed(() => {
  return formData.value.m2Totales > 0 && 
         formData.value.materialEstructuralId > 0;
});
</script>
```

---

## Datos Esperados (projectData)

El componente espera un objeto con esta estructura:

```javascript
const projectData = {
  m2_totales: 85,                    // Metros cuadrados totales
  material_estructural: "Madera",    // Tipo de material
  num_stories: 1,                    // Número de pisos (opcional, default 1)
  zona_climatica: "Central",         // Zona climática (opcional, default "Central")
  is_complex: false,                 // Es conjunto? (opcional, default false)
  has_engineer: false,               // Tiene ingeniero? (opcional, default false)
}
```

### Mapeo desde formData Existente

Si tu `formData` usa otros nombres, mapéalos así:

```javascript
const validationData = computed(() => ({
  m2_totales: formData.value.m2Totales,
  material_estructural: getMaterialName(formData.value.materialEstructuralId),
  num_stories: formData.value.numStories || 1,
  zona_climatica: formData.value.zonaClimatica || "Central",
  is_complex: formData.value.isComplex || false,
  has_engineer: formData.value.hasEngineer || false,
}));
```

---

## Eventos Emitidos

### 1. `validation-complete`
Se dispara cuando la validación finaliza.

**Parámetro:**
```javascript
{
  status: "compliant" | "warning" | "blocked",
  violations: [...],
  warnings: [...],
  is_constructible: boolean,
  is_self_constructible: boolean,
  requires_loscat: boolean,
  max_stories_without_engineer: number | null,
}
```

**Uso:**
```javascript
function handleValidationComplete(result) {
  if (result.status === 'blocked') {
    // Mostrar error
    showError('Proyecto no cumple restricciones regulatorias');
  } else if (result.status === 'warning') {
    // Mostrar advertencia
    showWarning('Proyecto tiene advertencias regulatorias');
  } else {
    // Proyecto compliant
    enableLayoutGeneration();
  }
}
```

### 2. `proceed-with-layout`
Se dispara cuando el usuario hace click en "Proceder con Layout".

**Uso:**
```javascript
function handleProceedWithLayout() {
  // Generar layout
  generateLayout();
  // O navegar a siguiente paso
  nextStep();
}
```

---

## CSS Personalización

Si necesitas adaptar los colores al tema de tu dashboard:

### Variables CSS a Sobrescribir

Crea un archivo `_regulatory-theme.css`:

```css
:root {
  /* Colores para estado COMPLIANT */
  --regulatory-compliant-bg: rgba(52, 211, 153, 0.1);
  --regulatory-compliant-border: #34d399;
  --regulatory-compliant-text: #34d399;
  
  /* Colores para estado WARNING */
  --regulatory-warning-bg: rgba(251, 191, 36, 0.1);
  --regulatory-warning-border: #fbbf24;
  --regulatory-warning-text: #fbbf24;
  
  /* Colores para estado BLOCKED */
  --regulatory-error-bg: rgba(239, 68, 68, 0.1);
  --regulatory-error-border: #ef4444;
  --regulatory-error-text: #ef4444;
  
  /* Fondos */
  --regulatory-bg-primary: linear-gradient(135deg, #1a1f2e 0%, #16213e 100%);
  --regulatory-bg-secondary: rgba(255, 255, 255, 0.05);
  
  /* Texto */
  --regulatory-text-primary: #e5e7eb;
  --regulatory-text-secondary: #9ca3af;
}
```

Luego importa en tu `App.vue`:
```javascript
import './_regulatory-theme.css';
```

---

## Ejemplo Completo de Integración

### App.vue Modificado

```vue
<script setup>
import { ref, computed, watchEffect, watch, nextTick } from "vue";
import Sidebar from "./components/Sidebar.vue";
import TopNavBar from "./components/TopNavBar.vue";
import ConfigurationPanel from "./components/ConfigurationPanel.vue";
import MetricsPanel from "./components/MetricsPanel.vue";
import RegulatoryValidator from "./components/RegulatoryValidator.vue"; // ← NUEVO
// ... otros imports

const formData = ref({
  m2Totales: 150,
  materialEstructuralId: 4,
  // ... otros campos
});

// Datos para validación regulatoria
const regulatoryData = computed(() => ({
  m2_totales: formData.value.m2Totales,
  material_estructural: getMaterialName(formData.value.materialEstructuralId),
  num_stories: 1,
  zona_climatica: "Central",
  is_complex: false,
  has_engineer: false,
}));

function handleValidationComplete(result) {
  console.log('Validación completada:', result);
  // Guardar resultado en estado
  validationResult.value = result;
}

function handleProceedWithLayout() {
  console.log('Generando layout...');
  generateLayout();
}
</script>

<template>
  <div id="app" :key="appKey">
    <TopNavBar />
    
    <div class="main-container">
      <Sidebar />
      
      <div class="content">
        <ConfigurationPanel 
          :formData="formData"
          @update:formData="updateFormData"
        />
        
        <!-- ✨ NUEVO: Validador Regulatorio -->
        <RegulatoryValidator 
          :projectData="regulatoryData"
          @validation-complete="handleValidationComplete"
          @proceed-with-layout="handleProceedWithLayout"
        />
        
        <MetricsPanel 
          :formData="formData"
          :tokensUsados="tokensUsados"
          :tokensTotales="tokensTotales"
          :tokensDisponibles="tokensDisponibles"
          :descripcionEstado="descripcionEstado"
        />
      </div>
    </div>
  </div>
</template>
```

---

## Testing de la Integración

### Prueba 1: Componente se Renderiza
```javascript
import { render } from '@testing-library/vue';
import RegulatoryValidator from '@/components/RegulatoryValidator.vue';

test('Componente se renderiza correctamente', () => {
  const { getByText } = render(RegulatoryValidator, {
    props: {
      projectData: {
        m2_totales: 85,
        material_estructural: 'Madera',
      },
    },
  });

  expect(getByText(/Validación Regulatoria MINVU/i)).toBeInTheDocument();
});
```

### Prueba 2: Evento Se Emite
```javascript
test('Emite evento cuando se completa validación', async () => {
  const { getByRole, emitted } = render(RegulatoryValidator, {
    props: {
      projectData: {
        m2_totales: 85,
        material_estructural: 'Madera',
      },
    },
  });

  const button = getByRole('button', { name: /validar/i });
  await button.click();

  expect(emitted('validation-complete')).toBeTruthy();
});
```

---

## Troubleshooting

### Problema: "Cannot find module 'RegulatoryValidator'"
**Solución:** Verifica la ruta del import
```javascript
// ✅ Correcto
import RegulatoryValidator from "./components/RegulatoryValidator.vue";

// ❌ Incorrecto
import RegulatoryValidator from "./RegulatoryValidator.vue";
```

### Problema: Datos no se actualizan
**Solución:** Asegúrate de usar `computed` o `ref` para los datos:
```javascript
// ✅ Correcto
const regulatoryData = computed(() => ({...}));

// ❌ Incorrecto
const regulatoryData = {...};
```

### Problema: API retorna 404
**Solución:** Verifica que el backend esté corriendo
```bash
docker ps | grep siec_backend
# Debe mostrar el contenedor corriendo
```

### Problema: Estilos no se aplican
**Solución:** El componente usa `scoped` styles. Si necesitas cambiar, crea tu propia versión o usa CSS variables.

---

## Próximos Pasos

1. **Pruebas manuales** - Seguir guía en `MANUAL_TESTING_HU18.md`
2. **Integración con BD** - Guardar validaciones en tabla audit
3. **Reportes** - Generar reportes de cumplimiento
4. **Alertas visuales** - Mostrar restricciones en el plano 3D

---

**Fecha:** 22 de Abril de 2026  
**Status:** ✅ LISTO PARA INTEGRAR
