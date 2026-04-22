# HU18 - Guía de Pruebas Manuales

## 🎯 Objetivo
Validar que el sistema de restricciones regulatorias MINVU funciona correctamente en el dashboard.

---

## 📋 Casos de Prueba Manuales

### CASO 1: Proyecto COMPLIANT (Sin restricciones)

**Descripción:** Validar que un proyecto pequeño dentro de todos los límites pasa la validación

**Pasos:**
1. Abre http://localhost:5173/
2. Ingresa datos:
   - m² totales: **85**
   - Material: **Madera**
   - Zona climática: **Central**
   - Número de pisos: **1**
   - Es conjunto: **No**
   - Tiene ingeniero: **No**

3. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
✅ Status Badge: GREEN (COMPLIANT)
✅ Mensaje: "Proyecto cumple con todas las restricciones regulatorias"
✅ Violations: 0
✅ Warnings: 0
✅ Botón "Proceder con Layout": Habilitado
```

---

### CASO 2: Proyecto con ADVERTENCIA (LOSCAT)

**Descripción:** Proyecto en zona fría que requiere LOSCAT

**Pasos:**
1. Ingresa datos:
   - m² totales: **80**
   - Material: **Metalcom**
   - Zona climática: **Los Ríos** ❄️
   - Número de pisos: **2**
   - Es conjunto: **No**
   - Tiene ingeniero: **No**

2. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
⚠️ Status Badge: ORANGE (WARNING)
⚠️ Mensaje: "Proyecto tiene advertencias regulatorias"
✅ Violations: 0
⚠️ Warnings: 1
  └─ Code: LOSCAT_REQUIRED
     Name: LOSCAT Requerido
     Description: Este proyecto está en zona fría y requiere Ley de Pisos
     Detail: Zona: Los Ríos
✅ Botón "Proceder con Layout": Habilitado (se puede proceder con advertencias)
```

---

### CASO 3: Proyecto BLOQUEADO - Excede Autoconstrucción

**Descripción:** Vivienda aislada que excede el límite de 90 m²

**Pasos:**
1. Ingresa datos:
   - m² totales: **120** (excede 90 m²)
   - Material: **Hormigón Armado**
   - Zona climática: **Central**
   - Número de pisos: **1**
   - Es conjunto: **No**
   - Tiene ingeniero: **No**

2. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
❌ Status Badge: RED (BLOCKED)
❌ Mensaje: "Proyecto no cumple restricciones regulatorias"
❌ Violations: 1
  └─ Code: SELF_BUILD_EXCEEDS
     Name: Autoconstrucción Excedida
     Severity: error
     Description: El proyecto excede el límite de autoconstrucción para vivienda aislada
     Requirement: Máximo 90 m² para vivienda aislada (OGUC Art. 5.1.1)
     Detail: Se excede por 30 m²
     Current Value: 120
❌ Botón "Proceder con Layout": DESHABILITADO
```

---

### CASO 4: Proyecto BLOQUEADO - Metalcon > 3 Pisos sin Ingeniero

**Descripción:** Metalcom con 4 pisos sin ingeniero (máximo permitido es 3)

**Pasos:**
1. Ingresa datos:
   - m² totales: **80**
   - Material: **Metalcom**
   - Zona climática: **Central**
   - Número de pisos: **4** ⚠️
   - Es conjunto: **No**
   - Tiene ingeniero: **No**

2. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
❌ Status Badge: RED (BLOCKED)
❌ Violations: 1
  └─ Code: MATERIAL_MAX_STORIES_EXCEEDED
     Name: Límite de Pisos Excedido
     Severity: error
     Description: Metalcom permite máximo 3 pisos sin ingeniero
     Requirement: Máximo 3 pisos para Metalcom sin ingeniero
     Detail: Se intenta 4 pisos, máximo permitido: 3
     Current Value: 4
❌ Botón "Proceder con Layout": DESHABILITADO
```

---

### CASO 5: Proyecto BLOQUEADO - Múltiples Violaciones

**Descripción:** Proyecto con varias violaciones simultáneas

**Pasos:**
1. Ingresa datos:
   - m² totales: **200** (excede 90 m²)
   - Material: **Madera**
   - Zona climática: **Central**
   - Número de pisos: **4** (Madera max 2 sin ingeniero)
   - Es conjunto: **No**
   - Tiene ingeniero: **No**

2. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
❌ Status Badge: RED (BLOCKED)
❌ Violations: 2
  ├─ SELF_BUILD_EXCEEDS (Autoconstrucción)
  └─ MATERIAL_MAX_STORIES_EXCEEDED (Madera máximo 2 pisos)
❌ Botón "Proceder con Layout": DESHABILITADO
```

---

### CASO 6: Proyecto PERMITIDO - Metalcom con Ingeniero

**Descripción:** Metalcom 4 pisos WITH ingeniero (permitido: máximo 10 pisos)

**Pasos:**
1. Ingresa datos:
   - m² totales: **80**
   - Material: **Metalcom**
   - Zona climática: **Central**
   - Número de pisos: **4**
   - Es conjunto: **No**
   - Tiene ingeniero: **Sí** ✓

2. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
✅ Status Badge: GREEN (COMPLIANT)
✅ Violations: 0
✅ Warnings: 0
✅ "Max stories without engineer: 3"
✅ Botón "Proceder con Layout": Habilitado
```

---

### CASO 7: Proyecto en Zona Fría + Metalcom Válido

**Descripción:** Metalcom 2 pisos en zona fría (advertencia LOSCAT, pero compliant)

**Pasos:**
1. Ingresa datos:
   - m² totales: **75**
   - Material: **Metalcom**
   - Zona climática: **Los Lagos**
   - Número de pisos: **2**
   - Es conjunto: **Sí**
   - Tiene ingeniero: **No**

2. Click en "🔍 Validar Proyecto"

**Resultado Esperado:**
```
⚠️ Status Badge: ORANGE (WARNING)
✅ Violations: 0
⚠️ Warnings: 1 (LOSCAT_REQUIRED)
✅ Is Self Constructible: Sí (80 m² < 140 m² para conjunto)
✅ Botón "Proceder con Layout": Habilitado
```

---

### CASO 8: Prueba de Re-validación

**Descripción:** Cambiar valores y re-validar automáticamente

**Pasos:**
1. Que el componente de validación esté visible
2. Cambia m² de 85 a 150
3. El componente debe re-validar automáticamente
4. Should show BLOCKED status

**Resultado Esperado:**
```
❌ Status cambia automáticamente a BLOCKED
❌ Se muestra violación SELF_BUILD_EXCEEDS
```

---

### CASO 9: Botón Re-validar

**Descripción:** Probar botón de re-validación

**Pasos:**
1. Realiza una validación
2. Click en botón "🔄 Re-validar"
3. El resultado debe actualizarse

**Resultado Esperado:**
```
La validación se ejecuta nuevamente y muestra resultados frescos
```

---

## 🔍 Pruebas con API Directa (curl)

Si deseas probar los endpoints directamente:

### Test 1: Proyecto Compliant
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

**Respuesta esperada:** `status: "compliant"`

### Test 2: Proyecto Bloqueado
```bash
curl -X POST http://localhost:8000/api/validate-regulatory \
  -H "Content-Type: application/json" \
  -d '{
    "m2_totales": 120,
    "material_estructural": "Madera",
    "num_stories": 4,
    "zona_climatica": "Central",
    "is_complex": false,
    "has_engineer": false
  }'
```

**Respuesta esperada:** `status: "blocked"` con violations

### Test 3: Obtener Info de Material
```bash
curl http://localhost:8000/api/regulatory/material-info/Metalcom
```

**Respuesta esperada:**
```json
{
  "material": "Metalcom",
  "constraints": {
    "max_stories_without_engineer": 3,
    "max_stories_with_engineer": 10,
    "requires_engineer_for_seismic": true
  }
}
```

### Test 4: Obtener Zonas Frías
```bash
curl http://localhost:8000/api/regulatory/zones
```

### Test 5: Obtener Todos los Límites
```bash
curl http://localhost:8000/api/regulatory/limits
```

---

## ✅ Checklist de Validación

- [ ] Caso 1: Proyecto COMPLIANT funciona
- [ ] Caso 2: Advertencia LOSCAT funciona
- [ ] Caso 3: Bloqueo por autoconstrucción funciona
- [ ] Caso 4: Bloqueo por pisos de Metalcom funciona
- [ ] Caso 5: Múltiples violaciones se muestran
- [ ] Caso 6: Ingeniero permite más pisos
- [ ] Caso 7: Zona fría con restricción válida
- [ ] Caso 8: Re-validación automática funciona
- [ ] Caso 9: Botón re-validar funciona
- [ ] API Test 1: Endpoint compliant funciona
- [ ] API Test 2: Endpoint blocked funciona
- [ ] API Test 3: Material info funciona
- [ ] API Test 4: Zonas funciona
- [ ] API Test 5: Límites funciona

---

## 🐛 Si encuentras un problema

1. Revisa que el backend esté corriendo: `docker ps`
2. Revisa logs del backend: `docker logs siec_backend`
3. Verifica que el frontend está conectado al backend correcto
4. Revisa la consola del navegador (F12) para errores de red

---

## 📊 Métricas Esperadas

- **Pruebas unitarias:** 22/22 PASSED ✅
- **Casos manuales:** 9 casos de prueba
- **Endpoints API:** 4 endpoints funcionales
- **Estados posibles:** COMPLIANT, WARNING, BLOCKED

---

**Fecha:** 22 de Abril de 2026  
**HU:** HU18 - Hard Constraints Regulatorios MINVU
