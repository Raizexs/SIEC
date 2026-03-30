<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRecintosStore } from '../stores/recintos'
import { useInteractiveEditor } from '../composables/useInteractiveEditor'
import { useTopologyComputed } from '../composables/useTopologyComputed'

const PIXELS_PER_METER = 40
const PADDING = 30

const svgRef = ref(null)
const store = useRecintosStore()
const editor = useInteractiveEditor()
const topology = useTopologyComputed()

const bounds = computed(() => {
  if (store.recintos.length === 0) {
    return { minX: 0, minZ: 0, maxX: 10, maxZ: 10 }
  }

  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity

  store.recintos.forEach((r) => {
    minX = Math.min(minX, r.coords.x)
    minZ = Math.min(minZ, r.coords.z)
    maxX = Math.max(maxX, r.coords.x + r.dimensions.w)
    maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l)
  })

  return { minX, minZ, maxX, maxZ }
})

const editorSize = computed(() => {
  const width = (bounds.value.maxX - bounds.value.minX) * PIXELS_PER_METER + (PADDING * 2)
  const height = (bounds.value.maxZ - bounds.value.minZ) * PIXELS_PER_METER + (PADDING * 2)
  return {
    width: Math.max(width, 520),
    height: Math.max(height, 340)
  }
})

const toScreenX = (x) => {
  return PADDING + (x - bounds.value.minX) * PIXELS_PER_METER
}

const toScreenZ = (z) => {
  return PADDING + (z - bounds.value.minZ) * PIXELS_PER_METER
}

const toWorld = (clientX, clientY) => {
  const rect = svgRef.value.getBoundingClientRect()
  const x = bounds.value.minX + (clientX - rect.left - PADDING) / PIXELS_PER_METER
  const z = bounds.value.minZ + (clientY - rect.top - PADDING) / PIXELS_PER_METER
  return { x, z }
}

const onPointerMove = (event) => {
  if (!editor.activeMode.value) return
  const world = toWorld(event.clientX, event.clientY)

  if (editor.activeMode.value === 'drag') {
    editor.dragTo(world)
  } else if (editor.activeMode.value === 'resize') {
    editor.resizeTo(world)
  }
}

const onPointerUp = () => {
  editor.endInteraction()
}

const startDrag = (event, id) => {
  event.preventDefault()
  const world = toWorld(event.clientX, event.clientY)
  editor.beginDrag(id, world)
}

const startResize = (event, id) => {
  event.preventDefault()
  const world = toWorld(event.clientX, event.clientY)
  editor.beginResize(id)
  editor.resizeTo(world)
}

window.addEventListener('pointermove', onPointerMove)
window.addEventListener('pointerup', onPointerUp)

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

const roomColor = (tipo) => {
  if (tipo === 'habitacion') return '#1d4ed8'
  if (tipo === 'banio') return '#0f766e'
  return '#b45309'
}
</script>

<template>
  <section class="panel">
    <header class="panel-header">
      <h3>Editor Espacial 2D (SCRUM-47)</h3>
      <p>Arrastra cada recinto o usa la esquina inferior derecha para redimensionar con snapping.</p>
    </header>

    <svg
      ref="svgRef"
      :viewBox="`0 0 ${editorSize.width} ${editorSize.height}`"
      class="editor-svg"
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.2)" stroke-width="1" />
        </pattern>
      </defs>

      <rect x="0" y="0" :width="editorSize.width" :height="editorSize.height" fill="url(#grid)" />

      <g v-for="recinto in store.recintos" :key="recinto.id">
        <rect
          :x="toScreenX(recinto.coords.x)"
          :y="toScreenZ(recinto.coords.z)"
          :width="recinto.dimensions.w * PIXELS_PER_METER"
          :height="recinto.dimensions.l * PIXELS_PER_METER"
          :fill="roomColor(recinto.tipo)"
          :stroke="editor.selectedRecintoId === recinto.id ? '#f8fafc' : '#0f172a'"
          stroke-width="2"
          class="room"
          @pointerdown="(e) => startDrag(e, recinto.id)"
        />

        <text
          :x="toScreenX(recinto.coords.x) + 8"
          :y="toScreenZ(recinto.coords.z) + 18"
          fill="#f8fafc"
          font-size="12"
          font-weight="700"
        >
          {{ recinto.tipo }} ({{ (recinto.dimensions.w * recinto.dimensions.l).toFixed(1) }}m2)
        </text>

        <circle
          :cx="toScreenX(recinto.coords.x + recinto.dimensions.w)"
          :cy="toScreenZ(recinto.coords.z + recinto.dimensions.l)"
          r="7"
          fill="#f59e0b"
          stroke="#f8fafc"
          stroke-width="2"
          class="handle"
          @pointerdown="(e) => startResize(e, recinto.id)"
        />
      </g>
    </svg>

    <div class="stats">
      <div><strong>Recintos:</strong> {{ store.recintos.length }}</div>
      <div><strong>Area total:</strong> {{ store.totalArea.toFixed(2) }}m2 / {{ store.configMetadata.m2Totales }}m2</div>
      <div><strong>Muros:</strong> {{ topology.topologyStats.totalWalls }} (Int {{ topology.topologyStats.interiorCount }} / Ext {{ topology.topologyStats.exteriorCount }})</div>
      <div><strong>Longitud total muros:</strong> {{ topology.topologyStats.totalLength }}m</div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: #111827;
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 1rem;
}

.panel-header h3 {
  margin: 0;
  color: #f8fafc;
}

.panel-header p {
  margin-top: 0.35rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.editor-svg {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #1f2937;
  background: linear-gradient(160deg, #0b1220, #111827);
  touch-action: none;
  margin-top: 0.75rem;
}

.room {
  cursor: grab;
}

.handle {
  cursor: nwse-resize;
}

.stats {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  color: #e2e8f0;
  font-size: 0.9rem;
}

@media (max-width: 760px) {
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
