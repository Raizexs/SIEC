# 🎯 GUÍA RÁPIDA: USAR EL VALIDADOR REGULATORIO EN EL DASHBOARD

## Acceso Rápido

**URL:** http://localhost:5173/

---

## 📍 Ubicación en Dashboard

El validador regulatorio está integrado como una **nueva pestaña** en el navegador principal:

```
┌─────────────────────────────────────────────────────────┐
│ SIEC - Configurador de Estimación                      │
├─────────────────────────────────────────────────────────┤
│ Especificaciones │ Materiales │ [✨ VALIDACIÓN REGULATORIA] │ Logística │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   🏛️ VALIDADOR REGULATORIO MINVU                      │
│                                                          │
│   (Contenido del validador aquí)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Usar

### **Paso 1: Navegar a la Pestaña**
Haz clic en la pestaña **"Validación Regulatoria"** en la barra superior

### **Paso 2: Definir el Proyecto**

Los parámetros se configuran en la pestaña **"Especificaciones Generales"**:

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| **M² Totales** | Área total construida | 85-2500 m² |
| **Material** | Material estructural | Madera, Metalcom, Albañilería, Hormigón |
| **Pisos** | Número de plantas | 1-20 pisos |
| **Zona Climática** | Ubicación geográfica | Central, Los Lagos, Magallanes, etc |
| **¿Vivienda Compleja?** | Conjunto habitacional | Sí/No |
| **¿Tiene Ingeniero?** | Asesoría profesional | Sí/No |

### **Paso 3: Ver Resultados**

Una vez configurados los parámetros, el validador mostrará:

#### **Caso 1: ✅ COMPLIANT**
```
┌─────────────────────────────────────┐
│ ✅ PROYECTO CUMPLIDOR               │
├─────────────────────────────────────┤
│ Status: COMPLIANT                   │
│ Constructible: SÍ                   │
│ Autoconstruible: SÍ                 │
│ Requiere LOSCAT: NO                 │
│                                     │
│ 📋 Resumen de Cumplimiento:        │
│  ✅ Autoconstrucción OK            │
│  ✅ Material permitido              │
│  ✅ Pisos dentro límite             │
│  ✅ Zona sin restricciones          │
│                                     │
│ [Proceder con Layout] [Re-validar] │
└─────────────────────────────────────┘
```

#### **Caso 2: ⚠️ WARNING**
```
┌─────────────────────────────────────┐
│ ⚠️ ADVERTENCIA REGULATORIA          │
├─────────────────────────────────────┤
│ Status: WARNING                     │
│ Constructible: SÍ (con condiciones) │
│                                     │
│ ⚡ Advertencias:                    │
│  ⚠️ LOSCAT Requerido               │
│     Zona: Los Lagos                 │
│     Acción: Cumplir normas LOSCAT  │
│                                     │
│ [Proceder Igualmente] [Modificar]  │
└─────────────────────────────────────┘
```

#### **Caso 3: ❌ BLOCKED**
```
┌─────────────────────────────────────┐
│ ❌ PROYECTO BLOQUEADO               │
├─────────────────────────────────────┤
│ Status: BLOCKED                     │
│ Constructible: NO                   │
│ Causa: Violaciones regulatorias     │
│                                     │
│ 🚫 Violaciones:                     │
│  ❌ Excede autoconstrucción         │
│     Límite: 90 m² (aislado)        │
│     Intenta: 100 m²                 │
│     Exceso: 10 m²                   │
│                                     │
│  ❌ Material max 3 pisos sin ing.   │
│     Límite: Metalcom 3 pisos       │
│     Intenta: 5 pisos                │
│     Exceso: 2 pisos                 │
│                                     │
│ 💡 Soluciones:                      │
│    • Reducir m² a ≤90               │
│    • Contratar ingeniero            │
│    • Cambiar material               │
│                                     │
│ [Modificar Parámetros] [Ayuda]     │
└─────────────────────────────────────┘
```

---

## 🧪 Escenarios de Prueba Recomendados

Prueba estos escenarios en el dashboard para ver el validador en acción:

### **Escenario 1: Proyecto Simple Compliant** ✅
```
M²: 85           Material: Madera         Pisos: 2
Zona: Central    ¿Complejo?: No          ¿Ingeniero?: No

Resultado esperado: ✅ COMPLIANT
```

### **Escenario 2: Zona Fría (LOSCAT)** ⚠️
```
M²: 85           Material: Madera         Pisos: 2
Zona: Los Lagos  ¿Complejo?: No          ¿Ingeniero?: No

Resultado esperado: ⚠️ WARNING (LOSCAT Requerido)
```

### **Escenario 3: Metalcom sin Ingeniero** ❌
```
M²: 120          Material: Metalcom       Pisos: 5
Zona: Central    ¿Complejo?: Sí          ¿Ingeniero?: No

Resultado esperado: ❌ BLOCKED
- SELF_BUILD_EXCEEDS (120 > 140 m² está OK pero...)
- MATERIAL_MAX_STORIES_EXCEEDED (5 pisos > 3 permitidos)
```

### **Escenario 4: Proyecto Grande Compliant** ✅
```
M²: 180          Material: Metalcom       Pisos: 8
Zona: Central    ¿Complejo?: Sí          ¿Ingeniero?: Sí

Resultado esperado: ❌ BLOCKED
- Nota: Se bloquea por autoconstrucción (180 > 140 m²)
  pero el material permitiría hasta 10 pisos con ingeniero
```

### **Escenario 5: Límite Máximo** ❌
```
M²: 2600         Material: Hormigón       Pisos: 3
Zona: Central    ¿Complejo?: Sí          ¿Ingeniero?: Sí

Resultado esperado: ❌ BLOCKED
- SELF_BUILD_EXCEEDS (2600 > 140 m²)
- ABSOLUTE_MAX_EXCEEDED (2600 > 2500 m² límite)
```

---

## 📊 Validaciones Ejecutadas

El validador verifica automáticamente:

### 1️⃣ **Autoconstrucción (OGUC Art. 5.1.1)**
- ✅ Vivienda aislada: ≤90 m²
- ✅ Vivienda compleja: ≤140 m²

### 2️⃣ **LOSCAT en Zonas Frías**
- ✅ Los Ríos
- ✅ Los Lagos
- ✅ Aysén
- ✅ Magallanes
- ✅ Araucanía Sur

### 3️⃣ **Restricciones por Material**
| Material | Sin Ingeniero | Con Ingeniero |
|----------|---------------|---------------|
| Metalcom | 3 pisos | 10 pisos |
| Madera | 2 pisos | 5 pisos |
| Albañilería | 5 pisos | 12 pisos |
| Hormigón Armado | 10 pisos | 20 pisos |

### 4️⃣ **Límite Absoluto**
- ✅ Máximo 2500 m² (independiente del material)

---

## 💡 Tips & Tricks

### Tip 1: Entender los Estados
- **✅ COMPLIANT:** Proyecto cumple todas las regulaciones ➜ Puedes proceder al layout
- **⚠️ WARNING:** Proyecto cumple pero con restricciones (ej: LOSCAT) ➜ Requiere atención adicional
- **❌ BLOCKED:** Proyecto viola regulaciones ➜ Necesita ajustes

### Tip 2: Modificar Parámetros Rápido
Ajusta los valores en "Especificaciones Generales" y el validador se actualiza automáticamente

### Tip 3: Entender Violaciones
Cada violación muestra:
- **Código:** Identificador único (ej: `SELF_BUILD_EXCEEDS`)
- **Nombre:** Descripción legible
- **Detalle:** Valores específicos del proyecto
- **Requirement:** Qué se necesita para cumplir

### Tip 4: Soluciones Comunes

| Problema | Soluciones |
|----------|-----------|
| Autoconstrucción excedida | Reducir m² o cambiar zona a complejo |
| Material max pisos | Contratar ingeniero o cambiar material |
| LOSCAT requerido | Cumplir normas LOSCAT (asesoría legal) |
| Límite máximo | Reducir m² a ≤2500 |

---

## 🔗 APIs Disponibles

Si necesitas consumir directamente desde otra aplicación:

### **POST /api/validate-regulatory**
```bash
curl -X POST http://localhost:8000/api/validate-regulatory \
  -H "Content-Type: application/json" \
  -d '{
    "m2_totales": 85,
    "material_estructural": "Madera",
    "num_stories": 2,
    "zona_climatica": "Central",
    "is_complex": false,
    "has_engineer": false
  }'
```

**Respuesta:**
```json
{
  "status": "compliant",
  "violations": [],
  "warnings": [],
  "is_constructible": true,
  "is_self_constructible": true,
  "requires_loscat": false,
  "max_stories_without_engineer": 2
}
```

### **GET /api/regulatory/material-info/{material}**
```bash
curl http://localhost:8000/api/regulatory/material-info/Metalcom
```

### **GET /api/regulatory/zones**
```bash
curl http://localhost:8000/api/regulatory/zones
```

### **GET /api/regulatory/limits**
```bash
curl http://localhost:8000/api/regulatory/limits
```

---

## 🐛 Troubleshooting

### Problema: El validador no muestra datos
**Solución:** Asegúrate que el backend está corriendo
```bash
docker ps  # Debe mostrar siec_backend
```

### Problema: Los datos no se actualizan
**Solución:** Haz clic en "Re-validar" o modifica cualquier parámetro

### Problema: No veo el botón "Proceder con Layout"
**Solución:** El botón solo aparece cuando el proyecto es COMPLIANT

---

## 📞 Soporte

- **Documentación técnica:** Ver `HU18_IMPLEMENTACION.md`
- **Casos de prueba:** Ver `MANUAL_TESTING_HU18.md`
- **Integración:** Ver `INTEGRACION_HU18.md`
- **Resumen ejecutivo:** Ver `HU18_RESUMEN_EJECUTIVO.md`

---

**Última actualización:** 22 de Abril, 2026  
**Version:** 1.0.0  
**Status:** ✅ Producción
