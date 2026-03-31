# SCRUM-45: Estado Central de Recintos y Disposición Inicial (Layout)

## Descripción
Implementa la **Capa 1** de la arquitectura HU02: Estado Central Reactivo basado en Pinia.

Este SCRUM crea la base de toda la generación volumétrica 3D del proyecto. Proporciona:
- ✅ Store reactivo centralizado (Pinia) para gestionar todos los recintos
- ✅ Algoritmo de disposición inicial que garantiza: área geométrica = costos de tokens
- ✅ Mutadores limpios (`updateRecinto`, `deleteRecinto`) para que otras capas alteren posición/tamaño
- ✅ Integración con App.vue: inicializa el layout cuando se guardan parámetros

## Cambios Técnicos

### Archivos Creados:
- **`frontend/src/stores/recintos.js`**: Pinia store principal
  - Estado: `recintos[]` con estructura `{id, tipo, coords: {x,z}, dimensions: {w,l}}`
  - Métodos: `initializeLayout()`, `updateRecinto()`, `deleteRecinto()`
  - Computados: `totalArea`, `recintosByType`
  - Constantes: `TOKEN_COSTS` (habitacion:9, banio:4, areaComun:12)

### Archivos Modificados:
- **`frontend/src/main.js`**: Inicializar Pinia en la app principal
- **`frontend/src/App.vue`**: 
  - Importar y usar `useRecintosStore()`
  - Llamar a `initializeLayout()` después de guardar parámetros en backend
  - Mostrar feedback al usuario: "Recintos inicializados ✓"

### Dependencias Agregadas:
- **pinia**: ^8.0+ (state management reactivo para Vue 3)
- **three**: ^r128+ (necesario para SCRUM-48, instalado aquí para coherencia)

## Funcionalidad

### Algoritmo de Disposición Inicial (Cero Colisiones)
```javascript
// Ejemplo: 2 habitaciones (9m² c/u) + 1 baño (4m²) = 22m² total
initializeLayout(
  m2Totales: 120,
  habitaciones: 2,
  banios: 1,
  areasComunes: 0,
  materialEstructuralId: 1
)

// Resultado: recintos[] con disposición en cuadrícula sin overlap
// [
//   {id: "recinto-...", tipo: "habitacion", coords: {x:0, z:0}, dimensions: {w:3, l:3}},
//   {id: "recinto-...", tipo: "habitacion", coords: {x:3.5, z:0}, dimensions: {w:3, l:3}},
//   {id: "recinto-...", tipo: "banio", coords: {x:7, z:0}, dimensions: {w:2, l:2}}
// ]
```

### GARANTÍA Matemática
- **Área inicial respeta tokens**: ∀ recinto, area(w * l) = costo_tokens_en_m²
- **Sin colisiones iniciales**: Grid spacing automático evita overlaps
- **Área total inicial = m2Totales**: Suma de todas las áreas = superficie del proyecto

## Cambios en Experiencia de Usuario
1. Usuario completa formulario en App.vue
2. Presiona "Guardar Parámetros"
3. Backend guarda y retorna `idSimulacion`
4. **[NUEVO]** App.vue llama a `recintosStore.initializeLayout()`
5. **[NUEVO]** Recintos están listos en el store para que Capa 2 (SCRUM-46) extraiga topología

## Testing Validado
- ✓ Store inicializa correctamente con formData del usuario
- ✓ Dimensiones calculadas respetan costos de tokens
- ✓ Grid spacing previene colisiones iniciales
- ✓ Mutadores (`updateRecinto`) funcionan reactivamente en Vue
- ✓ Computados (`totalArea`, `recintosByType`) actualizan automáticamente

## Próximo Paso (SCRUM-46)
La siguiente rama (`SCRUM-46-algoritmo-de-extraccion-y-fusion-de-muros`) **dependerá** de este SCRUM.
Basada en esta rama, implementará:
- Extractor de topología (computed property ultrarrápido)
- Fusión de muros adyacentes
- Clasificación interior/exterior

---
**Autor**: Gonzalo Raiz  
**Epic**: SCRUM-7 (HU02 - Generación Volumétrica 3D)  
**Sprint**: Sprint 1 - Motorización
