# SCRUM-48: Renderizador Volumetrico Reactivo (Three.js)

## Objetivo
Construir el contenedor 3D (`Scene3D.vue`) que renderiza exclusivamente desde la topologia de muros calculada en la capa matematica (SCRUM-46), sin incluir logica de colisiones ni arrastre.

## Implementacion
- `frontend/src/components/Scene3D.vue`
  - Inicializa escena Three.js, camara y renderer
  - Configura `OrbitControls` para navegacion
  - Agrega luz ambiente + direccional + piso + grilla
  - Mantiene un mapa `wallMeshes` (`id muro -> mesh`) para actualizar mallas sin destruir toda la escena
  - `watch(topology.walls)` para sincronizacion reactiva a 60 FPS
  - Auto-fit de camara en primer render segun bounding de muros
  - Cleanup completo (`dispose`) al desmontar

- `frontend/src/App.vue`
  - Integracion de `Scene3D` bajo el editor 2D
  - Render condicional cuando existen recintos

## Criterios cubiertos
- Dibuja mallas 3D de muros con `BoxGeometry`
- Mantiene altura estandar (2.4m) y grosor base por muro
- Reacciona a cambios de topologia sin recrear el ecosistema WebGL completo
- Separacion de responsabilidades respetada: Scene3D es renderer "dumb"

## Resultado
La HU02 queda cerrada en su cadena de dependencias:
1. SCRUM-45: estado central + layout
2. SCRUM-46: topologia y fusion de muros
3. SCRUM-47: editor interactivo drag/resize
4. SCRUM-48: renderer 3D reactivo
