<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { useRecintosStore } from "../stores/recintos";
import { useInteractiveEditor } from "../composables/useInteractiveEditor";
import { useTopologyComputed } from "../composables/useTopologyComputed";

const PIXELS_PER_METER = 40;
const PADDING = 30;

const svgRef = ref(null);
const store = useRecintosStore();
const editor = useInteractiveEditor();
const topology = useTopologyComputed();

const bounds = computed(() => {
  if (store.recintos.length === 0) {
    return { minX: 0, minZ: 0, maxX: 10, maxZ: 10 };
  }

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  store.recintos.forEach((r) => {
    minX = Math.min(minX, r.coords.x);
    minZ = Math.min(minZ, r.coords.z);
    maxX = Math.max(maxX, r.coords.x + r.dimensions.w);
    maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l);
  });

  return { minX, minZ, maxX, maxZ };
});

const editorSize = computed(() => {
  const width =
    (bounds.value.maxX - bounds.value.minX) * PIXELS_PER_METER + PADDING * 2;
  const height =
    (bounds.value.maxZ - bounds.value.minZ) * PIXELS_PER_METER + PADDING * 2;
  return {
    width: Math.max(width, 520),
    height: Math.max(height, 340),
  };
});

const toScreenX = (x) => {
  return PADDING + (x - bounds.value.minX) * PIXELS_PER_METER;
};

const toScreenZ = (z) => {
  return PADDING + (z - bounds.value.minZ) * PIXELS_PER_METER;
};

const toWorld = (clientX, clientY) => {
  const rect = svgRef.value.getBoundingClientRect();
  const x =
    bounds.value.minX + (clientX - rect.left - PADDING) / PIXELS_PER_METER;
  const z =
    bounds.value.minZ + (clientY - rect.top - PADDING) / PIXELS_PER_METER;
  return { x, z };
};

const onPointerMove = (event) => {
  if (!editor.activeMode.value) return;
  const world = toWorld(event.clientX, event.clientY);

  if (editor.activeMode.value === "drag") {
    editor.dragTo(world);
  } else if (editor.activeMode.value === "resize") {
    editor.resizeTo(world);
  }
};

const onPointerUp = () => {
  editor.endInteraction();
};

const startDrag = (event, id) => {
  event.preventDefault();
  const world = toWorld(event.clientX, event.clientY);
  editor.beginDrag(id, world);
};

const startResize = (event, id) => {
  event.preventDefault();
  const world = toWorld(event.clientX, event.clientY);
  editor.beginResize(id);
  editor.resizeTo(world);
};

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
});

const roomColor = (tipo) => {
  if (tipo === "habitacion") return "#1d4ed8";
  if (tipo === "banio") return "#0f766e";
  return "#b45309";
};
</script>

<template>
  <div class="w-full">
    <div class="bg-slate-900 rounded-xl border border-primary/30 p-4">
      <h3 class="text-white font-semibold mb-1">Editor Espacial 2D</h3>
      <p class="text-slate-400 text-sm mb-4">Arrastra cada recinto o usa la esquina inferior derecha para redimensionar.</p>
      
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${editorSize.width} ${editorSize.height}`"
        class="w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900"
        style="touch-action: none; min-height: 400px;"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(100,116,139,0.3)"
              stroke-width="1"
            />
          </pattern>
        </defs>

        <rect
          x="0"
          y="0"
          :width="editorSize.width"
          :height="editorSize.height"
          fill="url(#grid)"
        />

        <g v-for="recinto in store.recintos" :key="recinto.id">
          <rect
            :x="toScreenX(recinto.coords.x)"
            :y="toScreenZ(recinto.coords.z)"
            :width="recinto.dimensions.w * PIXELS_PER_METER"
            :height="recinto.dimensions.l * PIXELS_PER_METER"
            :fill="roomColor(recinto.tipo)"
            :stroke="
              editor.selectedRecintoId === recinto.id ? '#60a5fa' : '#1e293b'
            "
            stroke-width="2"
            class="cursor-grab hover:opacity-90 transition-opacity"
            rx="4"
            @pointerdown="(e) => startDrag(e, recinto.id)"
          />

          <text
            :x="toScreenX(recinto.coords.x) + 8"
            :y="toScreenZ(recinto.coords.z) + 18"
            fill="#ffffff"
            font-size="11"
            font-weight="600"
          >
            {{
              recinto.tipo === "habitacion"
                ? "Hab."
                : recinto.tipo === "banio"
                  ? "Baño"
                  : "Común"
            }}
            ({{ (recinto.dimensions.w * recinto.dimensions.l).toFixed(1) }}m²)
          </text>

          <circle
            :cx="toScreenX(recinto.coords.x + recinto.dimensions.w)"
            :cy="toScreenZ(recinto.coords.z + recinto.dimensions.l)"
            r="6"
            fill="#f59e0b"
            stroke="#ffffff"
            stroke-width="2"
            class="cursor-nwse-resize"
            @pointerdown="(e) => startResize(e, recinto.id)"
          />
        </g>
      </svg>

      <div class="mt-4 grid grid-cols-4 gap-3 text-xs">
        <div class="bg-slate-800 rounded-lg p-3 text-center">
          <span class="block text-slate-400 font-medium">Recintos</span>
          <span class="block text-lg font-bold text-blue-400">{{
            store.recintos.length
          }}</span>
        </div>
        <div class="bg-slate-800 rounded-lg p-3 text-center">
          <span class="block text-slate-400 font-medium">Área Total</span>
          <span class="block text-lg font-bold text-blue-400"
            >{{ store.totalArea.toFixed(1) }}m²</span
          >
        </div>
        <div class="bg-slate-800 rounded-lg p-3 text-center">
          <span class="block text-slate-400 font-medium">Muros</span>
          <span class="block text-lg font-bold text-blue-400">{{
            topology.topologyStats.totalWalls
          }}</span>
        </div>
        <div class="bg-slate-800 rounded-lg p-3 text-center">
          <span class="block text-slate-400 font-medium">Long. Total</span>
          <span class="block text-lg font-bold text-blue-400"
            >{{ topology.topologyStats.totalLength }}m</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* RoomEditor2D - using Tailwind classes */
</style>
