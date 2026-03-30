# SCRUM-47: Editor Espacial Interactivo (Drag & Resize)

## Objetivo
Implementar una capa interactiva 2D que permita mover y redimensionar recintos en tiempo real, actualizando el estado global y disparando la topologia de muros de forma reactiva.

## Entregables
- Editor 2D sobre SVG con pointer events (mouse/touch)
- Drag de recintos (x, z)
- Resize desde handle visual (w, l)
- Snapping a rejilla
- Bloqueo por colision (no permite overlap)
- Tope minimo por costo de tokens del tipo de recinto
- Tope maximo por m2Totales del proyecto

## Cambios
- `frontend/src/composables/useInteractiveEditor.js`
  - Logica de arrastre y redimensionamiento
  - Snapping de coordenadas (`GRID_STEP = 0.5`)
  - Control de colisiones AABB
  - Validaciones de area minima y maxima

- `frontend/src/components/RoomEditor2D.vue`
  - Render de recintos en SVG
  - Handles de resize por recinto
  - Integracion con store Pinia y extractor topologico
  - Panel de metricas (area, muros, longitud)

- `frontend/src/App.vue`
  - Integracion del editor 2D tras generar layout

## Correcciones incluidas de base
- `frontend/src/composables/useTopologyExtractor.js`
  - IDs estables para muros (evita recreacion completa de mallas en capa 3D)
  - Fusión robusta de segmentos colineales por tipo
- `frontend/__tests__/topology.test.js`
  - Ajuste de import y cobertura de casos realistas
- `frontend/src/stores/recintos.js`
  - Dimensiones iniciales exactas por tipo (area = costo token)

## Resultado
La capa 3 (interaccion) queda desacoplada del renderer y muta solo el estado central. Esto habilita SCRUM-48 para renderizado volumetrico reactivo sin logica de colision dentro de Three.js.
