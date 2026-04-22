# HU18: Validación de Hard Constraints Regulatorios (MINVU)

## ✅ Estado: IMPLEMENTADO Y PROBADO

### Resumen de Implementación

Se ha implementado un sistema completo de validación de restricciones regulatorias MINVU que asegura que todas las sugerencias de materialidad sean lógicamente viables desde el punto de vista regulatorio y técnico-constructivo.

---

## 📋 Criterios de Aceptación Implementados

### 1. ✅ Auditoría Legal y Estructural Automática

**Escenario:** Cuando el usuario completa su diseño y procesa la evaluación del proyecto

**Entonces el motor:**
- ✅ **Alerta si se exceden los m² de autoconstrucción** (≤90 m² aislado o ≤140 m² conjunto)
- ✅ **Requiere LOSCAT en zonas frías** (Los Ríos, Los Lagos, Aysén, Magallanes, Araucanía Sur)
- ✅ **Bloquea configuraciones Metalcon de más de 3 pisos sin ingeniero**

---

## 🔧 Arquitectura Implementada

### Backend (Python/FastAPI)

**Archivo:** `regulatory_validator.py`

```
RegulatoryValidator
├── Validaciones
│   ├── _validate_self_construction()      # Autoconstrucción OGUC Art. 5.1.1
│   ├── _validate_loscat_requirement()     # Zonas frías
│   ├── _validate_material_constraints()   # Restricciones por material
│   └── _validate_absolute_limits()        # Máximo 2500 m²
│
├── Restricciones por Material
│   ├── Metalcom: max 3 pisos (sin ingeniero), 10 pisos (con ingeniero)
│   ├── Madera: max 2 pisos (sin ingeniero), 5 pisos (con ingeniero)
│   ├── Albañilería: max 5 pisos (sin ingeniero), 12 pisos (con ingeniero)
│   └── Hormigón Armado: max 10 pisos (sin ingeniero), 20 pisos (con ingeniero)
│
└── Métodos Públicos
    ├── validate_project()       # Valida un proyecto completo
    ├── get_material_info()      # Obtiene info de restricciones por material
    └── Constantes globales
```

**Endpoints REST:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/validate-regulatory` | Valida un proyecto contra restricciones |
| GET | `/api/regulatory/material-info/{material}` | Info de restricciones por material |
| GET | `/api/regulatory/zones` | Zonas que requieren LOSCAT |
| GET | `/api/regulatory/limits` | Límites regulatorios globales |

### Frontend (Vue 3)

**Composable:** `useRegulatoryValidator.js`
- `validateProject(projectData)` - Valida proyecto
- `getMaterialInfo(material)` - Obtiene info de material
- `getRegulatoryLimits()` - Obtiene límites globales
- `getRegulatoryZones()` - Obtiene zonas frías

**Componente:** `RegulatoryValidator.vue`
- Interfaz visual para mostrar validaciones
- Alertas de violaciones (bloqueos)
- Advertencias (LOSCAT, etc.)
- Información de restricciones de material
- Resumen de cumplimiento

---

## 🧪 Pruebas Unitarias

**Archivo:** `test_regulatory_validator.py`

**Resultado: ✅ 22/22 PASSED**

### Suite de Pruebas

#### Autoconstrucción (4 pruebas)
- ✅ Vivienda aislada dentro del límite (≤90 m²)
- ✅ Vivienda aislada que excede límite (>90 m²)
- ✅ Conjunto dentro del límite (≤140 m²)
- ✅ Conjunto que excede límite (>140 m²)

#### LOSCAT en Zonas Frías (3 pruebas)
- ✅ LOSCAT requerido en zona fría
- ✅ LOSCAT no requerido en zona central
- ✅ Todas las zonas frías detectadas

#### Restricciones por Material (6 pruebas)
- ✅ Metalcom 3 pisos sin ingeniero (permitido)
- ✅ Metalcom 4 pisos sin ingeniero (bloqueado)
- ✅ Metalcom 10 pisos con ingeniero (permitido)
- ✅ Madera 2 pisos sin ingeniero (permitido)
- ✅ Madera 3 pisos sin ingeniero (bloqueado)
- ✅ Metalcom excede límite con ingeniero (bloqueado)

#### Límites Absolutos (2 pruebas)
- ✅ Proyecto excede 2500 m² (bloqueado)
- ✅ Proyecto dentro de límites (permitido)

#### Casos Combinados (5 pruebas)
- ✅ Múltiples violaciones simultáneas
- ✅ Advertencia con cumplimiento general
- ✅ Info de material correcta
- ✅ Material inexistente retorna None
- ✅ Mensajes de detalle informativos

#### Edge Cases (2 pruebas)
- ✅ Proyecto mínimo viable
- ✅ Proyecto máximo que cumple autoconstrucción

---

## 📊 Resultados de Validación

### Ejemplo 1: Proyecto que CUMPLE
```
Datos:
- m² totales: 80
- Material: Madera
- Pisos: 1
- Zona: Central
- Es conjunto: No

Resultado:
✅ Status: COMPLIANT
✅ Constructible: Sí
✅ Autoconstruible: Sí
✅ Violations: 0
✅ Warnings: 0
```

### Ejemplo 2: Proyecto con ADVERTENCIA (LOSCAT)
```
Datos:
- m² totales: 85
- Material: Metalcom
- Pisos: 2
- Zona: Los Ríos
- Es conjunto: No

Resultado:
⚠️ Status: WARNING
✅ Constructible: Sí
✅ Autoconstruible: Sí
✅ Violations: 0
⚠️ Warnings: 1 (LOSCAT_REQUIRED)
```

### Ejemplo 3: Proyecto BLOQUEADO (Violaciones)
```
Datos:
- m² totales: 120
- Material: Madera
- Pisos: 4
- Zona: Central
- Es conjunto: No

Resultado:
❌ Status: BLOCKED
❌ Constructible: No
❌ Autoconstruible: No
❌ Violations: 2
  - SELF_BUILD_EXCEEDS (Metalcon 4 pisos)
  - MATERIAL_MAX_STORIES_EXCEEDED (Madera max 2 pisos)
✅ Warnings: 0
```

---

## 🚀 Instrucciones de Uso

### 1. Backend - Validar Proyecto
```bash
curl -X POST http://localhost:8000/api/validate-regulatory \
  -H "Content-Type: application/json" \
  -d '{
    "m2_totales": 85,
    "material_estructural": "Madera",
    "num_stories": 1,
    "zona_climatica": "Central",
    "is_complex": false,
    "has_engineer": false
  }'
```

### 2. Frontend - Integración en Componente
```vue
<template>
  <RegulatoryValidator 
    :projectData="projectData"
    @proceed-with-layout="handleProceed"
    @validation-complete="handleValidationComplete"
  />
</template>

<script setup>
import RegulatoryValidator from '@/components/RegulatoryValidator.vue';

const projectData = ref({
  m2_totales: 85,
  material_estructural: 'Madera',
  num_stories: 1,
  zona_climatica: 'Central',
});

function handleValidationComplete(result) {
  console.log('Validación completa:', result);
}
</script>
```

### 3. Backend - Obtener Info de Restricciones
```bash
# Info de un material específico
curl http://localhost:8000/api/regulatory/material-info/Metalcom

# Todas las zonas frías
curl http://localhost:8000/api/regulatory/zones

# Todos los límites regulatorios
curl http://localhost:8000/api/regulatory/limits
```

---

## 📝 Restricciones Regulatorias

### Autoconstrucción (OGUC Art. 5.1.1)
| Tipo de Vivienda | Máximo m² |
|------------------|-----------|
| Vivienda aislada | 90 m² |
| Conjunto/Condominio | 140 m² |

### Límites de Pisos por Material

| Material | Sin Ingeniero | Con Ingeniero |
|----------|---------------|---------------|
| Metalcom | 3 pisos | 10 pisos |
| Madera | 2 pisos | 5 pisos |
| Albañilería | 5 pisos | 12 pisos |
| Hormigón Armado | 10 pisos | 20 pisos |

### Zonas que Requieren LOSCAT
- Los Ríos
- Los Lagos
- Aysén
- Magallanes
- Araucanía Sur

### Límites Absolutos
- Máximo m² total: 2500 m²
- Mínimo m² (implícito): 15 m²

---

## 🔄 Flujo de Integración en el Dashboard

```
1. Usuario ingresa datos del proyecto
   ↓
2. Click en "Validar Proyecto"
   ↓
3. Frontend llama a /api/validate-regulatory
   ↓
4. Backend valida:
   ├─ Autoconstrucción ✓
   ├─ LOSCAT ✓
   ├─ Restricciones de material ✓
   └─ Límites absolutos ✓
   ↓
5. Retorna resultado:
   ├─ Status (COMPLIANT/WARNING/BLOCKED)
   ├─ Violations (si las hay)
   ├─ Warnings (si las hay)
   └─ Información adicional
   ↓
6. Frontend muestra:
   ├─ Badge de estado
   ├─ Lista de violaciones (si está bloqueado)
   ├─ Lista de advertencias
   └─ Botón para proceder (solo si es COMPLIANT)
```

---

## 📦 Dependencias Añadidas

No se añadieron dependencias externas. Se utilizó:
- Python 3.11+ (enums, dataclasses)
- FastAPI (ya presente)
- Vue 3 Composition API (ya presente)

---

## ✨ Características Futuras

Basadas en criterios de aceptación ampliados:
1. Integración con base de datos para guardar validaciones
2. Auditoría de cambios regulatorios
3. Reportes de cumplimiento normativo
4. Validaciones sísmicas por zona
5. Restricciones de humedad (según zona climática)

---

## 👤 Contacto y Soporte

Para preguntas sobre la implementación de HU18:
- Revisar `regulatory_validator.py` para lógica de validación
- Revisar `test_regulatory_validator.py` para casos de uso
- Revisar `RegulatoryValidator.vue` para UI

---

**Última actualización:** 22 de Abril de 2026  
**Estado:** ✅ COMPLETADO Y VALIDADO
