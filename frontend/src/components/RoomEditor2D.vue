<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { useRecintosStore } from "../stores/recintos";
import { useInteractiveEditor } from "../composables/useInteractiveEditor";

const PIXELS_PER_METER = 50;
const VIEW_PADDING = 2; // metres of margin around all rooms

const svgRef = ref(null);
const store = useRecintosStore();
const editor = useInteractiveEditor();

// ── Frozen bounds: captured at interaction start so the coordinate system
//    doesn't shift while dragging (prevents the "warp" bug). ──
const frozenBounds = ref(null);

const liveBounds = computed(() => {
  if (store.recintos.length === 0) {
    return { minX: -1, minZ: -1, maxX: 15, maxZ: 10 };
  }
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  store.recintos.forEach((r) => {
    minX = Math.min(minX, r.coords.x);
    minZ = Math.min(minZ, r.coords.z);
    maxX = Math.max(maxX, r.coords.x + r.dimensions.w);
    maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l);
  });
  return {
    minX: minX - VIEW_PADDING,
    minZ: minZ - VIEW_PADDING,
    maxX: maxX + VIEW_PADDING,
    maxZ: maxZ + VIEW_PADDING,
  };
});

// Use frozen bounds during interaction, live bounds otherwise
const activeBounds = computed(() => frozenBounds.value || liveBounds.value);

const viewBox = computed(() => {
  const b = activeBounds.value;
  const w = (b.maxX - b.minX) * PIXELS_PER_METER;
  const h = (b.maxZ - b.minZ) * PIXELS_PER_METER;
  return `0 0 ${Math.max(w, 400)} ${Math.max(h, 280)}`;
});

const editorSize = computed(() => {
  const b = activeBounds.value;
  return {
    width: Math.max((b.maxX - b.minX) * PIXELS_PER_METER, 400),
    height: Math.max((b.maxZ - b.minZ) * PIXELS_PER_METER, 280),
  };
});

// ── Coordinate transforms (use activeBounds so they're stable during drag) ──
const toScreenX = (x) => (x - activeBounds.value.minX) * PIXELS_PER_METER;
const toScreenZ = (z) => (z - activeBounds.value.minZ) * PIXELS_PER_METER;

const toWorld = (clientX, clientY) => {
  const svg = svgRef.value;
  if (!svg) return { x: 0, z: 0 };

  // Use SVG's own coordinate mapping — handles scaling, aspect ratio, etc.
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const b = activeBounds.value;
  return {
    x: b.minX + svgPt.x / PIXELS_PER_METER,
    z: b.minZ + svgPt.y / PIXELS_PER_METER,
  };
};

// ── Interaction handlers ──
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
  frozenBounds.value = null; // unfreeze
};

const startDrag = (event, id) => {
  event.preventDefault();
  event.stopPropagation();
  frozenBounds.value = { ...liveBounds.value }; // freeze
  const world = toWorld(event.clientX, event.clientY);
  editor.beginDrag(id, world);
};

const startResize = (event, id) => {
  event.preventDefault();
  event.stopPropagation();
  frozenBounds.value = { ...liveBounds.value }; // freeze
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
  if (tipo === "habitacion") return "#3b82f6";
  if (tipo === "banio") return "#14b8a6";
  return "#f59e0b";
};

const roomColorHover = (tipo) => {
  if (tipo === "habitacion") return "#60a5fa";
  if (tipo === "banio") return "#2dd4bf";
  return "#fbbf24";
};

const isActive = (id) => editor.activeMode.value && editor.selectedRecintoId === id;
</script>

<template>
  <div class="w-full">
    <div class="bg-slate-900 rounded-xl border border-primary/30 p-4">
      <h3 class="text-white font-semibold mb-1">Editor Espacial 2D</h3>
      <p class="text-slate-400 text-sm mb-4">Arrastra para mover · Esquina inferior derecha para redimensionar</p>
      
      <svg
        ref="svgRef"
        :viewBox="viewBox"
        class="w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900"
        style="touch-action: none; min-height: 400px;"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <!-- Grid pattern: 1 metre = PIXELS_PER_METER px -->
          <pattern id="grid-minor" :width="PIXELS_PER_METER / 2" :height="PIXELS_PER_METER / 2" patternUnits="userSpaceOnUse">
            <path
              :d="`M ${PIXELS_PER_METER / 2} 0 L 0 0 0 ${PIXELS_PER_METER / 2}`"
              fill="none"
              stroke="rgba(100,116,139,0.15)"
              stroke-width="0.5"
            />
          </pattern>
          <pattern id="grid-major" :width="PIXELS_PER_METER" :height="PIXELS_PER_METER" patternUnits="userSpaceOnUse">
            <rect :width="PIXELS_PER_METER" :height="PIXELS_PER_METER" fill="url(#grid-minor)" />
            <path
              :d="`M ${PIXELS_PER_METER} 0 L 0 0 0 ${PIXELS_PER_METER}`"
              fill="none"
              stroke="rgba(100,116,139,0.35)"
              stroke-width="1"
            />
          </pattern>
        </defs>

        <!-- Grid background -->
        <rect x="0" y="0" :width="editorSize.width" :height="editorSize.height" fill="url(#grid-major)" />

        <!-- Rooms -->
        <g v-for="recinto in store.recintos" :key="recinto.id">
          <!-- Room body -->
          <rect
            :x="toScreenX(recinto.coords.x)"
            :y="toScreenZ(recinto.coords.z)"
            :width="recinto.dimensions.w * PIXELS_PER_METER"
            :height="recinto.dimensions.l * PIXELS_PER_METER"
            :fill="roomColor(recinto.tipo)"
            :fill-opacity="isActive(recinto.id) ? 0.95 : 0.75"
            :stroke="isActive(recinto.id) ? '#ffffff' : roomColorHover(recinto.tipo)"
            :stroke-width="isActive(recinto.id) ? 2.5 : 1.5"
            rx="3"
            class="cursor-grab"
            :class="{ 'cursor-grabbing': isActive(recinto.id) && editor.activeMode.value === 'drag' }"
            @pointerdown="(e) => startDrag(e, recinto.id)"
          />

          <!-- Room label: type + area -->
          <text
            :x="toScreenX(recinto.coords.x) + (recinto.dimensions.w * PIXELS_PER_METER) / 2"
            :y="toScreenZ(recinto.coords.z) + (recinto.dimensions.l * PIXELS_PER_METER) / 2 - 6"
            fill="#ffffff"
            font-size="11"
            font-weight="700"
            text-anchor="middle"
            dominant-baseline="middle"
            style="pointer-events: none"
          >
            {{ recinto.tipo === "habitacion" ? "Hab." : recinto.tipo === "banio" ? "Baño" : "Común" }}
          </text>
          <text
            :x="toScreenX(recinto.coords.x) + (recinto.dimensions.w * PIXELS_PER_METER) / 2"
            :y="toScreenZ(recinto.coords.z) + (recinto.dimensions.l * PIXELS_PER_METER) / 2 + 8"
            fill="rgba(255,255,255,0.7)"
            font-size="10"
            font-weight="500"
            text-anchor="middle"
            dominant-baseline="middle"
            style="pointer-events: none"
          >
            {{ (recinto.dimensions.w * recinto.dimensions.l).toFixed(1) }}m²
          </text>

          <!-- Resize handle: visible corner triangle + larger invisible hit area -->
          <rect
            :x="toScreenX(recinto.coords.x + recinto.dimensions.w) - 18"
            :y="toScreenZ(recinto.coords.z + recinto.dimensions.l) - 18"
            width="24"
            height="24"
            fill="transparent"
            class="cursor-nwse-resize"
            @pointerdown="(e) => startResize(e, recinto.id)"
          />
          <path
            :d="`M ${toScreenX(recinto.coords.x + recinto.dimensions.w)} ${toScreenZ(recinto.coords.z + recinto.dimensions.l) - 12} L ${toScreenX(recinto.coords.x + recinto.dimensions.w)} ${toScreenZ(recinto.coords.z + recinto.dimensions.l)} L ${toScreenX(recinto.coords.x + recinto.dimensions.w) - 12} ${toScreenZ(recinto.coords.z + recinto.dimensions.l)} Z`"
            fill="rgba(255,255,255,0.8)"
            style="pointer-events: none"
          />

          <!-- Live dimension labels (shown while interacting) -->
          <g v-if="isActive(recinto.id)">
            <!-- Width label (top edge) -->
            <rect
              :x="toScreenX(recinto.coords.x) + (recinto.dimensions.w * PIXELS_PER_METER) / 2 - 24"
              :y="toScreenZ(recinto.coords.z) - 20"
              width="48"
              height="16"
              rx="3"
              fill="rgba(0,0,0,0.75)"
            />
            <text
              :x="toScreenX(recinto.coords.x) + (recinto.dimensions.w * PIXELS_PER_METER) / 2"
              :y="toScreenZ(recinto.coords.z) - 9"
              fill="#fbbf24"
              font-size="11"
              font-weight="bold"
              text-anchor="middle"
              style="pointer-events: none"
            >
              {{ recinto.dimensions.w.toFixed(1) }}m
            </text>
            
            <!-- Height label (right edge) -->
            <rect
              :x="toScreenX(recinto.coords.x + recinto.dimensions.w) + 4"
              :y="toScreenZ(recinto.coords.z) + (recinto.dimensions.l * PIXELS_PER_METER) / 2 - 8"
              width="44"
              height="16"
              rx="3"
              fill="rgba(0,0,0,0.75)"
            />
            <text
              :x="toScreenX(recinto.coords.x + recinto.dimensions.w) + 26"
              :y="toScreenZ(recinto.coords.z) + (recinto.dimensions.l * PIXELS_PER_METER) / 2 + 3"
              fill="#fbbf24"
              font-size="11"
              font-weight="bold"
              text-anchor="middle"
              style="pointer-events: none"
            >
              {{ recinto.dimensions.l.toFixed(1) }}m
            </text>
          </g>
        </g>
      </svg>

      <div class="mt-4 grid grid-cols-2 gap-3 text-xs">
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
      </div>
    </div>
  </div>
</template>

<style scoped>
svg rect.cursor-grab:hover {
  filter: brightness(1.15);
}
svg rect.cursor-grabbing {
  cursor: grabbing;
}
</style>
