<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { useRecintosStore } from "../stores/recintos";
import { useInteractiveEditor } from "../composables/useInteractiveEditor";

const props = defineProps({
  m2Totales:         { type: Number, default: 100 },
  descripcionEstado: { type: Object, default: () => ({ color: '#22c55e', message: 'OK' }) },
});

// ── Constants ─────────────────────────────────────────────────────────────────
const PPM         = 50;   // pixels per metre in SVG coordinate space
const VIEW_PAD    = 1;    // 1 m padding around everything (integer keeps grid snapped)
const DIM_OFFSET  = 22;   // pixels from the wall to the dimension line
const TICK_LEN    = 6;    // half-length of dimension ticks

// ── Store & editor ───────────────────────────────────────────────────────────
const svgRef = ref(null);
const rootRef = ref(null);
const isFullScreen = ref(false);
const store  = useRecintosStore();
const editor = useInteractiveEditor();

// ── Area usage (live) ─────────────────────────────────────────────────────────
const usedArea = computed(() => store.totalArea);
const freeArea = computed(() => Math.max((props.m2Totales || 0) - usedArea.value, 0));
const freePct  = computed(() =>
  props.m2Totales > 0 ? Math.min(100, (usedArea.value / props.m2Totales) * 100) : 0
);

// ── Budget rectangle (shows the "size" of the project) ───────────────────────
// Area = m2Totales, aspect ratio ≈ 1.4 : 1
const budgetRect = computed(() => {
  const m2 = Math.max(props.m2Totales || 100, 10);
  return {
    w: Math.sqrt(m2 * 1.4),
    h: Math.sqrt(m2 / 1.4),
  };
});

// ── Canvas bounds: union of budget rect + all rooms + padding ────────────────
const frozenBounds = ref(null);

const liveBounds = computed(() => {
  const bd = budgetRect.value;
  let minX = 0, minZ = 0, maxX = bd.w, maxZ = bd.h;

  store.recintos.forEach((r) => {
    minX = Math.min(minX, r.coords.x);
    minZ = Math.min(minZ, r.coords.z);
    maxX = Math.max(maxX, r.coords.x + r.dimensions.w);
    maxZ = Math.max(maxZ, r.coords.z + r.dimensions.l);
  });

  return {
    minX: minX - VIEW_PAD,
    minZ: minZ - VIEW_PAD,
    maxX: maxX + VIEW_PAD,
    maxZ: maxZ + VIEW_PAD,
  };
});

const activeBounds = computed(() => frozenBounds.value || liveBounds.value);

// ── SVG coordinate helpers ────────────────────────────────────────────────────
const svgW = computed(() => (activeBounds.value.maxX - activeBounds.value.minX) * PPM);
const svgH = computed(() => (activeBounds.value.maxZ - activeBounds.value.minZ) * PPM);

// ViewBox
const viewBox = computed(() => `0 0 ${svgW.value} ${svgH.value}`);

// ViewBox dimensions for grid background rect
const vbW = computed(() => svgW.value);
const vbH = computed(() => svgH.value);

// Grid offset: shift pattern so that world integer-metre lines land on grid lines
// minX=-1 → offset = 1*PPM mod PPM = 0; works cleanly for integer VIEW_PAD
const gridOffsetX = computed(() => ((-activeBounds.value.minX) % 1) * PPM);
const gridOffsetZ = computed(() => ((-activeBounds.value.minZ) % 1) * PPM);

const toSX = (x) => (x - activeBounds.value.minX) * PPM;
const toSZ = (z) => (z - activeBounds.value.minZ) * PPM;

// ── Pointer → world ───────────────────────────────────────────────────────────
const toWorld = (clientX, clientY) => {
  const svg = svgRef.value;
  if (!svg) return { x: 0, z: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
  return {
    x: activeBounds.value.minX + sp.x / PPM,
    z: activeBounds.value.minZ + sp.y / PPM,
  };
};

// ── Interaction handlers ──────────────────────────────────────────────────────
const onPointerMove = (e) => {
  if (!editor.activeMode.value) return;
  const w = toWorld(e.clientX, e.clientY);
  if (editor.activeMode.value === "drag")   editor.dragTo(w);
  if (editor.activeMode.value === "resize") editor.resizeTo(w);
};

const onPointerUp = () => {
  editor.endInteraction();
  frozenBounds.value = null;
};

const startDrag = (e, id) => {
  e.preventDefault(); e.stopPropagation();
  frozenBounds.value = { ...liveBounds.value };
  editor.beginDrag(id, toWorld(e.clientX, e.clientY));
};

const startResize = (e, id) => {
  e.preventDefault(); e.stopPropagation();
  frozenBounds.value = { ...liveBounds.value };
  const w = toWorld(e.clientX, e.clientY);
  editor.beginResize(id);
  editor.resizeTo(w);
};

let savedScrollY = 0;

const toggleFullScreen = async () => {
  if (!document.fullscreenElement) {
    savedScrollY = window.scrollY;
    if (rootRef.value?.requestFullscreen) {
      await rootRef.value.requestFullscreen().catch(err => console.error(err));
    }
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }
};

const handleFullscreenChange = () => {
  const isEntering = !!document.fullscreenElement;
  isFullScreen.value = isEntering;
  
  if (!isEntering) {
    setTimeout(() => {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    }, 10);
  }
};

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup",   onPointerUp);
document.addEventListener('fullscreenchange', handleFullscreenChange);

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup",   onPointerUp);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

// ── Room helpers ───────────────────────────────────────────────────────────────
const roomFill  = (t) => t === "habitacion" ? "#3b82f6" : t === "banio" ? "#14b8a6" : "#f59e0b";
const roomEdge  = (t) => t === "habitacion" ? "#60a5fa" : t === "banio" ? "#2dd4bf" : "#fbbf24";
const isActive   = (id) => !!editor.activeMode.value && editor.selectedRecintoId.value === id;
const isResizing = (id) => editor.activeMode.value === "resize" && editor.selectedRecintoId.value === id;
const isBudgeted = (id) => store.selectedForBudget.has(id);
const onToggleBudget = (e, id) => { e.preventDefault(); e.stopPropagation(); store.toggleBudget(id); };

// ── Font sizes dynamically scaled to each room's rendered area ───────────────
// Base = geometric mean of room pixel dimensions; clamped to a readable range.
const labelFontSize = (r) => {
  const geo = Math.sqrt(r.dimensions.w * r.dimensions.l * PPM * PPM);
  return Math.max(12, Math.min(32, geo * 0.12));
};
const areaFontSize = (r) => {
  const geo = Math.sqrt(r.dimensions.w * r.dimensions.l * PPM * PPM);
  return Math.max(10, Math.min(26, geo * 0.1));
};

// ── Dimension line geometry (bottom-right corner, architectural style) ────────
// Called once per resizing room; returns screen coords for both dim lines.
const dimLines = (r) => {
  const x0  = toSX(r.coords.x);
  const z0  = toSZ(r.coords.z);
  const x1  = toSX(r.coords.x + r.dimensions.w);
  const z1  = toSZ(r.coords.z + r.dimensions.l);
  const midX = (x0 + x1) / 2;
  const midZ = (z0 + z1) / 2;

  return {
    // ─── Bottom edge (width) ─────────────────────────────────────────
    // Horizontal dim line below the bottom wall
    width: {
      label: `${r.dimensions.w.toFixed(2)} m`,
      lineY:   z1 + DIM_OFFSET,
      x0, x1,
      textX:   midX,
      textY:   z1 + DIM_OFFSET - 5,
    },
    // ─── Right edge (height/length) ──────────────────────────────────
    // Vertical dim line to the right of the right wall
    height: {
      label: `${r.dimensions.l.toFixed(2)} m`,
      lineX:   x1 + DIM_OFFSET,
      z0, z1,
      textX:   x1 + DIM_OFFSET + 5,
      textZ:   midZ,
    },
  };
};
</script>

<template>
  <div ref="rootRef" class="w-full bg-slate-900 rounded-xl border border-primary/30 overflow-hidden flex flex-col shadow-2xl transition-all duration-300" :class="isFullScreen ? 'h-screen border-none rounded-none' : ''">

      <!-- ── Header ─────────────────────────────────────────────────────────── -->
      <div class="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h3 class="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-sm">architecture</span>
              Editor Espacial 2D
            </h3>
            <div class="flex items-center gap-2 text-[11px] font-bold tabular-nums">
              <span :style="{ color: descripcionEstado.color }">
                {{ freeArea.toFixed(1) }} m² libres
              </span>
              <span class="text-slate-600">·</span>
              <span class="text-slate-400">{{ usedArea.toFixed(1) }} / {{ m2Totales }} m²</span>
            </div>
          </div>
          <p class="text-slate-400 text-[10px]">
            Arrastra para mover · Esquina inferior derecha para redimensionar
          </p>
        </div>
        
        <button @click="toggleFullScreen" class="text-slate-400 hover:text-white transition-colors flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm shrink-0">
          <span class="material-symbols-outlined text-[18px]">{{ isFullScreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
          <span class="text-xs font-bold uppercase tracking-wider">{{ isFullScreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa' }}</span>
        </button>
      </div>
      <!-- Barra de uso pegada al borde del canvas -->
      <div class="h-[2px] bg-slate-700/50 w-full overflow-hidden shrink-0">
        <div
          class="h-full transition-all duration-200"
          :style="{ width: freePct + '%', backgroundColor: descripcionEstado.color }"
        />
      </div>

      <!-- ── SVG canvas (sin scroll, se adapta al presupuesto) ─────────────── -->
      <svg
        ref="svgRef"
        :viewBox="viewBox"
        width="100%"
        :height="isFullScreen ? '100%' : '380'"
        class="block bg-gradient-to-br from-slate-800 to-slate-900"
        :class="isFullScreen ? 'flex-1' : ''"
        style="touch-action: none;"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <!-- Grid menor: 0.5 m -->
          <pattern
            id="grid-minor"
            :width="PPM / 2" :height="PPM / 2"
            patternUnits="userSpaceOnUse"
            :patternTransform="`translate(${gridOffsetX} ${gridOffsetZ})`"
          >
            <path
              :d="`M ${PPM/2} 0 L 0 0 0 ${PPM/2}`"
              fill="none" stroke="rgba(100,116,139,0.12)" stroke-width="0.5"
            />
          </pattern>
          <!-- Grid mayor: 1 m -->
          <pattern
            id="grid-major"
            :width="PPM" :height="PPM"
            patternUnits="userSpaceOnUse"
            :patternTransform="`translate(${gridOffsetX} ${gridOffsetZ})`"
          >
            <rect :width="PPM" :height="PPM" fill="url(#grid-minor)" />
            <path
              :d="`M ${PPM} 0 L 0 0 0 ${PPM}`"
              fill="none" stroke="rgba(100,116,139,0.38)" stroke-width="1"
            />
          </pattern>
        </defs>

        <!-- Grid background -->
        <rect x="0" y="0" :width="vbW" :height="vbH" fill="url(#grid-major)" />

        <!-- ── Budget boundary rectangle (área total disponible) ──────────── -->
        <rect
          :x="toSX(0)" :y="toSZ(0)"
          :width="budgetRect.w * PPM" :height="budgetRect.h * PPM"
          fill="rgba(99,102,241,0.04)"
          stroke="rgba(99,102,241,0.35)"
          stroke-width="1.5"
          stroke-dasharray="6 4"
          rx="2"
          style="pointer-events: none"
        />
        <!-- Label del presupuesto -->
        <text
          :x="toSX(budgetRect.w) - 6" :y="toSZ(0) + 14"
          fill="rgba(129,140,248,0.7)"
          font-size="10" font-weight="600"
          text-anchor="end"
          style="pointer-events: none"
        >{{ m2Totales }} m² disponibles</text>

        <!-- ── Rooms ──────────────────────────────────────────────────────── -->
        <g v-for="recinto in store.recintos" :key="recinto.id">

          <!-- Room body -->
          <rect
            :x="toSX(recinto.coords.x)"
            :y="toSZ(recinto.coords.z)"
            :width="recinto.dimensions.w * PPM"
            :height="recinto.dimensions.l * PPM"
            :fill="roomFill(recinto.tipo)"
            :fill-opacity="isActive(recinto.id) ? 0.92 : 0.72"
            :stroke="isActive(recinto.id) ? '#ffffff' : roomEdge(recinto.tipo)"
            :stroke-width="isActive(recinto.id) ? 2.5 : 1.5"
            rx="3"
            class="cursor-grab"
            :class="{ 'cursor-grabbing': isActive(recinto.id) && editor.activeMode.value === 'drag' }"
            @pointerdown="(e) => startDrag(e, recinto.id)"
          />

          <!-- Room label (tamaño adaptado al recinto) -->
          <text
            :x="toSX(recinto.coords.x) + (recinto.dimensions.w * PPM) / 2"
            :y="toSZ(recinto.coords.z) + (recinto.dimensions.l * PPM) / 2 - labelFontSize(recinto) * 0.65"
            fill="#fff"
            :font-size="labelFontSize(recinto)"
            font-weight="700"
            text-anchor="middle" dominant-baseline="middle"
            style="pointer-events: none"
          >{{ recinto.tipo === "habitacion" ? "Hab." : recinto.tipo === "banio" ? "Baño" : "Común" }}</text>
          <text
            :x="toSX(recinto.coords.x) + (recinto.dimensions.w * PPM) / 2"
            :y="toSZ(recinto.coords.z) + (recinto.dimensions.l * PPM) / 2 + areaFontSize(recinto) * 0.85"
            fill="rgba(255,255,255,0.65)"
            :font-size="areaFontSize(recinto)"
            font-weight="500"
            text-anchor="middle" dominant-baseline="middle"
            style="pointer-events: none"
          >{{ (recinto.dimensions.w * recinto.dimensions.l).toFixed(1) }}m²</text>

          <!-- Budget toggle icon (top-right corner) -->
          <g
            class="cursor-pointer"
            @pointerdown.stop.prevent="(e) => onToggleBudget(e, recinto.id)"
          >
            <circle
              :cx="toSX(recinto.coords.x + recinto.dimensions.w) - 12"
              :cy="toSZ(recinto.coords.z) + 12"
              r="10"
              :fill="isBudgeted(recinto.id) ? '#22c55e' : 'rgba(0,0,0,0.5)'"
              :stroke="isBudgeted(recinto.id) ? '#4ade80' : 'rgba(255,255,255,0.3)'"
              stroke-width="1.5"
            />
            <text
              :x="toSX(recinto.coords.x + recinto.dimensions.w) - 12"
              :y="toSZ(recinto.coords.z) + 12"
              fill="white" font-size="11" font-weight="800"
              text-anchor="middle" dominant-baseline="central"
              style="pointer-events: none"
            >$</text>
          </g>

          <!-- Resize hit area (invisible) -->
          <rect
            :x="toSX(recinto.coords.x + recinto.dimensions.w) - 18"
            :y="toSZ(recinto.coords.z + recinto.dimensions.l) - 18"
            width="28" height="28" fill="transparent"
            class="cursor-nwse-resize"
            @pointerdown="(e) => startResize(e, recinto.id)"
          />
          <!-- Resize handle triangle -->
          <path
            :d="`
              M ${toSX(recinto.coords.x + recinto.dimensions.w)}
                ${toSZ(recinto.coords.z + recinto.dimensions.l) - 14}
              L ${toSX(recinto.coords.x + recinto.dimensions.w)}
                ${toSZ(recinto.coords.z + recinto.dimensions.l)}
              L ${toSX(recinto.coords.x + recinto.dimensions.w) - 14}
                ${toSZ(recinto.coords.z + recinto.dimensions.l)} Z`"
            fill="rgba(255,255,255,0.75)"
            style="pointer-events: none"
          />

          <!-- ── Dimension lines (only while RESIZING) ────────────────────── -->
          <g v-if="isResizing(recinto.id)" style="pointer-events: none">

              <!-- ── ANCHO (bottom edge) ────────────────────────────────── -->
              <line
                :x1="dimLines(recinto).width.x0" :y1="dimLines(recinto).width.lineY"
                :x2="dimLines(recinto).width.x1" :y2="dimLines(recinto).width.lineY"
                stroke="#fbbf24" stroke-width="1.5"
              />
              <line
                :x1="dimLines(recinto).width.x0" :y1="dimLines(recinto).width.lineY - TICK_LEN"
                :x2="dimLines(recinto).width.x0" :y2="dimLines(recinto).width.lineY + TICK_LEN"
                stroke="#fbbf24" stroke-width="1.5"
              />
              <line
                :x1="dimLines(recinto).width.x1" :y1="dimLines(recinto).width.lineY - TICK_LEN"
                :x2="dimLines(recinto).width.x1" :y2="dimLines(recinto).width.lineY + TICK_LEN"
                stroke="#fbbf24" stroke-width="1.5"
              />
              <line
                :x1="dimLines(recinto).width.x0" :y1="toSZ(recinto.coords.z + recinto.dimensions.l)"
                :x2="dimLines(recinto).width.x0" :y2="dimLines(recinto).width.lineY"
                stroke="#fbbf24" stroke-width="0.75" stroke-dasharray="3 3"
              />
              <line
                :x1="dimLines(recinto).width.x1" :y1="toSZ(recinto.coords.z + recinto.dimensions.l)"
                :x2="dimLines(recinto).width.x1" :y2="dimLines(recinto).width.lineY"
                stroke="#fbbf24" stroke-width="0.75" stroke-dasharray="3 3"
              />
              <rect
                :x="dimLines(recinto).width.textX - 24" :y="dimLines(recinto).width.textY - 10"
                width="48" height="16" rx="3" fill="rgba(0,0,0,0.85)"
              />
              <text
                :x="dimLines(recinto).width.textX" :y="dimLines(recinto).width.textY + 1"
                fill="#fbbf24" font-size="11" font-weight="700"
                text-anchor="middle" dominant-baseline="middle"
              >{{ dimLines(recinto).width.label }}</text>

              <!-- ── ALTO (right edge) ──────────────────────────────────── -->
              <line
                :x1="dimLines(recinto).height.lineX" :y1="dimLines(recinto).height.z0"
                :x2="dimLines(recinto).height.lineX" :y2="dimLines(recinto).height.z1"
                stroke="#fbbf24" stroke-width="1.5"
              />
              <line
                :x1="dimLines(recinto).height.lineX - TICK_LEN" :y1="dimLines(recinto).height.z0"
                :x2="dimLines(recinto).height.lineX + TICK_LEN" :y2="dimLines(recinto).height.z0"
                stroke="#fbbf24" stroke-width="1.5"
              />
              <line
                :x1="dimLines(recinto).height.lineX - TICK_LEN" :y1="dimLines(recinto).height.z1"
                :x2="dimLines(recinto).height.lineX + TICK_LEN" :y2="dimLines(recinto).height.z1"
                stroke="#fbbf24" stroke-width="1.5"
              />
              <line
                :x1="toSX(recinto.coords.x + recinto.dimensions.w)" :y1="dimLines(recinto).height.z0"
                :x2="dimLines(recinto).height.lineX"                :y2="dimLines(recinto).height.z0"
                stroke="#fbbf24" stroke-width="0.75" stroke-dasharray="3 3"
              />
              <line
                :x1="toSX(recinto.coords.x + recinto.dimensions.w)" :y1="dimLines(recinto).height.z1"
                :x2="dimLines(recinto).height.lineX"                :y2="dimLines(recinto).height.z1"
                stroke="#fbbf24" stroke-width="0.75" stroke-dasharray="3 3"
              />
              <!-- Height label rotado 90° paralelo a la pared -->
              <g :transform="`translate(${dimLines(recinto).height.textX + 10}, ${dimLines(recinto).height.textZ})`">
                <rect x="-24" y="-8" width="48" height="16" rx="3" fill="rgba(0,0,0,0.85)"
                  transform="rotate(-90)"
                />
                <text
                  fill="#fbbf24" font-size="11" font-weight="700"
                  text-anchor="middle" dominant-baseline="middle"
                  transform="rotate(-90)"
                >{{ dimLines(recinto).height.label }}</text>
              </g>

          </g>

        </g><!-- /rooms -->
      </svg>
    </div>
</template>

<style scoped>
svg rect.cursor-grab:hover {
  filter: brightness(1.18);
}
svg rect.cursor-grabbing {
  cursor: grabbing;
}
</style>
