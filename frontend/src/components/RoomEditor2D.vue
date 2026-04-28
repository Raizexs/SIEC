<script setup>
import { computed, onBeforeUnmount, ref, reactive, watch, onMounted, onUnmounted } from "vue";
import { useRecintosStore } from "../stores/recintos";
import { useInteractiveEditor } from "../composables/useInteractiveEditor";

const props = defineProps({
  m2Totales:         { type: Number, default: 100 },
  terrenoAncho:      { type: Number, default: 7 },
  terrenoLargo:      { type: Number, default: 15 },
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

// ── Resize Lock ───────────────────────────────────────────────────────────────
const resizeLocked = ref(false);

// ── Add Recinto Modal ─────────────────────────────────────────────────────────
const showAddModal = ref(false);
const addForm = reactive({
  nombre: 'Recinto',
  w: 3.5,
  l: 3.0,
  h: 2.4,
});

const openAddModal = () => {
  addForm.nombre = 'Recinto';
  addForm.w = 3.5;
  addForm.l = 3.0;
  addForm.h = 2.4;
  showAddModal.value = true;
};

const confirmAdd = () => {
  store.addRecinto(
    'habitacion',
    addForm.nombre || 'Recinto',
    Math.max(0.5, Number(addForm.w)),
    Math.max(0.5, Number(addForm.l)),
    Math.max(1.0, Number(addForm.h)),
  );
  showAddModal.value = false;
};

const quickAdd = () => {
  store.addRecinto('habitacion', 'Recinto', 3.5, 3.0, 2.4);
};
const editor = useInteractiveEditor();

// ── Corridor Mode ─────────────────────────────────────────────────────────────
const corridorMode = ref(false);
const MIN_CORRIDOR_DIM = 0.8; // metros mínimos en cualquier dirección

/**
 * Agrupa celdas vacías en REGIONES CONECTADAS usando flood-fill (4-vecinos).
 * Cada región se representa como una lista de rectángulos (strips por fila),
 * y cada strip tiene un groupId que identifica la región.
 * Al hacer clic en cualquier zona de un grupo, se crean todos sus rectángulos.
 */
const corridorZones = computed(() => {
  if (!corridorMode.value) return [];

  const bd    = budgetRect.value;
  const bW    = bd.w;
  const bH    = bd.h;
  const floor = store.currentFloor;
  const rooms = store.recintos.filter(r => (r.piso || 1) === floor);

  // 1. Recopilar coordenadas únicas X y Z
  const xs = new Set([0, bW]);
  const zs = new Set([0, bH]);
  rooms.forEach(r => {
    xs.add(r.coords.x);       xs.add(r.coords.x + r.dimensions.w);
    zs.add(r.coords.z);       zs.add(r.coords.z + r.dimensions.l);
  });
  const sortedX = [...xs].sort((a, b) => a - b);
  const sortedZ = [...zs].sort((a, b) => a - b);
  const cols = sortedX.length - 1;
  const rows = sortedZ.length - 1;

  // 2. Marcar celdas ocupadas
  const occupied = Array.from({ length: rows }, () => new Array(cols).fill(false));
  rooms.forEach(r => {
    const rx0 = r.coords.x, rx1 = r.coords.x + r.dimensions.w;
    const rz0 = r.coords.z, rz1 = r.coords.z + r.dimensions.l;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx0 = sortedX[col], cx1 = sortedX[col + 1];
        const cz0 = sortedZ[row], cz1 = sortedZ[row + 1];
        if (rx0 < cx1 && rx1 > cx0 && rz0 < cz1 && rz1 > cz0) {
          occupied[row][col] = true;
        }
      }
    }
  });

  // 3. Filtrar celdas válidas (dentro del terreno y ambas dims >= MIN)
  const validCell = (row, col) => {
    if (occupied[row][col]) return false;
    const cx0 = sortedX[col], cx1 = sortedX[col + 1];
    const cz0 = sortedZ[row], cz1 = sortedZ[row + 1];
    const cw = cx1 - cx0, cl = cz1 - cz0;
    return cx0 >= 0 && cx1 <= bW && cz0 >= 0 && cz1 <= bH && cw >= 0.01 && cl >= 0.01;
  };

  // 4. Flood-fill para etiquetar regiones conectadas
  const groupId = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  let numGroups = 0;

  const floodFill = (startRow, startCol, gid) => {
    const queue = [[startRow, startCol]];
    groupId[startRow][startCol] = gid;
    while (queue.length > 0) {
      const [r, c] = queue.pop();
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
            groupId[nr][nc] === -1 && validCell(nr, nc)) {
          groupId[nr][nc] = gid;
          queue.push([nr, nc]);
        }
      }
    }
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (validCell(row, col) && groupId[row][col] === -1) {
        floodFill(row, col, numGroups++);
      }
    }
  }

  // 5. Por cada región, construir rectángulos por strips horizontales
  //    (cada franja continua de celdas del mismo grupo en la misma fila)
  const groupRects = Array.from({ length: numGroups }, () => []);

  for (let row = 0; row < rows; row++) {
    let colStart = -1;
    let curGroup = -1;
    for (let col = 0; col <= cols; col++) {
      const gid = col < cols ? groupId[row][col] : -1;
      if (gid !== -1 && gid === curGroup) {
        // extend current strip
      } else {
        if (curGroup !== -1 && colStart !== -1) {
          const x0 = sortedX[colStart];
          const x1 = sortedX[col];
          const z0 = sortedZ[row];
          const z1 = sortedZ[row + 1];
          const w  = x1 - x0;
          const l  = z1 - z0;
          if (w >= MIN_CORRIDOR_DIM && l >= MIN_CORRIDOR_DIM) {
            groupRects[curGroup].push({ x0, z0, w, l, groupId: curGroup });
          }
        }
        colStart = gid !== -1 ? col : -1;
        curGroup = gid;
      }
    }
  }

  // 6. Filtrar grupos que no tienen ningún rectángulo válido y aplanar
  const zones = [];
  for (let gid = 0; gid < numGroups; gid++) {
    const rects = groupRects[gid];
    if (rects.length === 0) continue;
    // Calcular el bounding box del grupo (para el label)
    const allX0 = Math.min(...rects.map(r => r.x0));
    const allZ0 = Math.min(...rects.map(r => r.z0));
    const allX1 = Math.max(...rects.map(r => r.x0 + r.w));
    const allZ1 = Math.max(...rects.map(r => r.z0 + r.l));
    const totalArea = rects.reduce((s, r) => s + r.w * r.l, 0);
    rects.forEach(rect => {
      zones.push({
        ...rect,
        // info del grupo para el label y la acción de crear todos juntos
        groupRects: rects,
        groupArea: totalArea,
        labelX: (allX0 + allX1) / 2,
        labelZ: (allZ0 + allZ1) / 2,
        isFirstInGroup: rect === rects[0],
      });
    });
  }

  return zones;
});

/**
 * Al hacer clic en cualquier zona, crea TODOS los rectángulos de su grupo
 * como recintos tipo 'pasillo' separados, con nombre correlativo.
 */
const buildCorridor = (zone) => {
  const rects = zone.groupRects;
  rects.forEach((rect, idx) => {
    const nombre = rects.length > 1 ? `Pasillo ${String.fromCharCode(65 + idx)}` : 'Pasillo';
    const id = store.addRecinto('pasillo', nombre, rect.w, rect.l, 2.4);
    store.updateRecinto(id, { coords: { x: rect.x0, z: rect.z0 } });
  });
};


// ── Area usage (live) ─────────────────────────────────────────────────────────
const usedArea = computed(() => store.totalArea);
const freeArea = computed(() => Math.max((props.m2Totales || 0) - usedArea.value, 0));
const freePct  = computed(() =>
  props.m2Totales > 0 ? Math.min(100, (usedArea.value / props.m2Totales) * 100) : 0
);

// ── Budget rectangle (shows the "size" of the project) ───────────────────────
// Area = terrenoAncho * terrenoLargo
const budgetRect = computed(() => {
  return {
    w: props.terrenoAncho || 7,
    h: props.terrenoLargo || 15,
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

const emit = defineEmits(['update:terrenoAncho', 'update:terrenoLargo']);

const visualRotation = ref(0);
const isMathUpdating = ref(false);
const isVisualAnimating = ref(false);

const rotateLeft = () => {
  if (isVisualAnimating.value) return;
  isVisualAnimating.value = true;
  isMathUpdating.value = true;
  visualRotation.value = -90;
  
  setTimeout(() => {
    isVisualAnimating.value = false;
    visualRotation.value = 0;
    
    store.rotateMatrix('left', props.terrenoAncho, props.terrenoLargo);
    const temp = props.terrenoAncho;
    emit('update:terrenoAncho', props.terrenoLargo);
    emit('update:terrenoLargo', temp);
    
    setTimeout(() => {
      isMathUpdating.value = false;
    }, 50);
  }, 300);
};

const rotateRight = () => {
  if (isVisualAnimating.value) return;
  isVisualAnimating.value = true;
  isMathUpdating.value = true;
  visualRotation.value = 90;
  
  setTimeout(() => {
    isVisualAnimating.value = false;
    visualRotation.value = 0;
    
    store.rotateMatrix('right', props.terrenoAncho, props.terrenoLargo);
    const temp = props.terrenoAncho;
    emit('update:terrenoAncho', props.terrenoLargo);
    emit('update:terrenoLargo', temp);
    
    setTimeout(() => {
      isMathUpdating.value = false;
    }, 50);
  }, 300);
};

// ViewBox
const viewBox = computed(() => `0 0 ${svgW.value} ${svgH.value}`);

// ViewBox dimensions for grid background rect
const vbW = computed(() => svgW.value);
const vbH = computed(() => svgH.value);

// Grid offset: shift pattern so that world integer-metre lines land on grid lines
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
const ghostRoom = ref(null);
const isGhostFading = ref(false);

const onPointerMove = (e) => {
  if (!editor.activeMode.value) return;
  const w = toWorld(e.clientX, e.clientY);
  if (editor.activeMode.value === "drag")   editor.dragTo(w, budgetRect.value);
  if (editor.activeMode.value === "resize") editor.resizeTo(w, budgetRect.value);
};

const onPointerUp = () => {
  const mode = editor.activeMode.value;
  editor.endInteraction();
  if (mode === "drag" || mode === "resize") {
    store.saveHistoryState();
  }
  frozenBounds.value = null;
  
  if (ghostRoom.value) {
    isGhostFading.value = true;
    setTimeout(() => {
      ghostRoom.value = null;
      isGhostFading.value = false;
    }, 1500); // Desvanecimiento rápido de 1.5s
  }
};

const startDrag = (e, id) => {
  e.preventDefault(); e.stopPropagation();
  frozenBounds.value = { ...liveBounds.value };
  
  // Guardar snapshot para Ghost Mode
  const r = store.recintos.find(r => r.id === id);
  if (r) ghostRoom.value = JSON.parse(JSON.stringify(r)); // deep copy
  isGhostFading.value = false;

  editor.beginDrag(id, toWorld(e.clientX, e.clientY));
};

const startResize = (e, id) => {
  e.preventDefault(); e.stopPropagation();
  frozenBounds.value = { ...liveBounds.value };
  
  // Guardar snapshot para Ghost Mode
  const r = store.recintos.find(r => r.id === id);
  if (r) ghostRoom.value = JSON.parse(JSON.stringify(r));
  isGhostFading.value = false;

  const w = toWorld(e.clientX, e.clientY);
  editor.beginResize(id);
  editor.resizeTo(w, budgetRect.value);
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
const roomFill   = (t) => t === "habitacion" ? "#3b82f6" : t === "banio" ? "#14b8a6" : "#f59e0b";
const roomEdge   = (t) => t === "habitacion" ? "#60a5fa" : t === "banio" ? "#2dd4bf" : "#fbbf24";
const isActive   = (id) => !!editor.activeMode.value && editor.selectedRecintoId.value === id;
const isSelected = (id) => editor.selectedRecintoId.value === id; // persistent, even after drag ends
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

// ── Manual Dimension Inputs ──────────────────────────────────────────────────
const selectedRoomWidth = computed({
  get: () => {
    if (!editor.selectedRecintoId.value) return 0;
    const r = store.recintos.find(r => r.id === editor.selectedRecintoId.value);
    return r ? Number(r.dimensions.w.toFixed(2)) : 0;
  },
  set: (val) => {
    if (!editor.selectedRecintoId.value || val < 0.5) return;
    store.updateRecinto(editor.selectedRecintoId.value, { w: val });
    store.saveHistoryState();
  }
});

const selectedRoomLength = computed({
  get: () => {
    if (!editor.selectedRecintoId.value) return 0;
    const r = store.recintos.find(r => r.id === editor.selectedRecintoId.value);
    return r ? Number(r.dimensions.l.toFixed(2)) : 0;
  },
  set: (val) => {
    if (!editor.selectedRecintoId.value || val < 0.5) return;
    store.updateRecinto(editor.selectedRecintoId.value, { l: val });
    store.saveHistoryState();
  }
});

const selectedRoomHeight = computed({
  get: () => {
    if (!editor.selectedRecintoId.value) return 0;
    const r = store.recintos.find(r => r.id === editor.selectedRecintoId.value);
    return r ? Number((r.dimensions.h || 2.4).toFixed(2)) : 0;
  },
  set: (val) => {
    if (!editor.selectedRecintoId.value || val < 1.0) return;
    const targetIndex = store.recintos.findIndex(r => r.id === editor.selectedRecintoId.value);
    if (targetIndex !== -1) {
      const r = store.recintos[targetIndex];
      r.dimensions.h = val;
      store.saveHistoryState();
    }
  }
});

const selectedRoomName = computed({
  get: () => {
    if (!editor.selectedRecintoId.value) return "";
    const r = store.recintos.find(r => r.id === editor.selectedRecintoId.value);
    return r ? r.nombre : "";
  },
  set: (val) => {
    if (!editor.selectedRecintoId.value || !val.trim()) return;
    const targetIndex = store.recintos.findIndex(r => r.id === editor.selectedRecintoId.value);
    if (targetIndex !== -1) {
      store.recintos[targetIndex].nombre = val;
      store.saveHistoryState();
    }
  }
});

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────
const handleKeyDown = (e) => {
  // Ignorar si el usuario está escribiendo en un input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const id = editor.selectedRecintoId.value;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (id) {
      store.deleteRecinto(id);
      editor.selectedRecintoId.value = null;
    }
  } else if (e.ctrlKey || e.metaKey) {
    if (e.key === 'c' || e.key === 'C') {
      if (id) store.copyToClipboard(id);
    } else if (e.key === 'x' || e.key === 'X') {
      if (id) {
        store.cutToClipboard(id);
        editor.selectedRecintoId.value = null;
      }
    } else if (e.key === 'v' || e.key === 'V') {
      const newId = store.pasteFromClipboard();
      if (newId) editor.selectedRecintoId.value = newId;
    } else if (e.key === 'z' || e.key === 'Z') {
      if (e.shiftKey) {
        store.redo();
      } else {
        store.undo();
      }
    } else if (e.key === 'y' || e.key === 'Y') {
      store.redo();
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div ref="rootRef" class="w-full relative bg-slate-900 rounded-xl border border-primary/30 overflow-hidden flex flex-col shadow-2xl transition-all duration-300" :class="isFullScreen ? 'h-screen border-none rounded-none' : ''">

      <!-- ── Header ─────────────────────────────────────────────────────────── -->
      <div class="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-3">
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
            <!-- Floor Selector -->
            <div class="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-md p-0.5 border border-slate-700/80 shadow-inner ml-2">
              <button @click="store.setFloor(store.currentFloor - 1)" :disabled="store.currentFloor <= 1" class="text-slate-300 hover:text-white hover:bg-slate-700 px-1.5 rounded disabled:opacity-30 transition-colors font-bold text-[10px]">-</button>
              <span class="text-[9px] font-black uppercase tracking-widest px-1 text-indigo-300">
                Piso {{ store.currentFloor }}
              </span>
              <button @click="store.setFloor(store.currentFloor + 1)" :disabled="store.currentFloor >= 3" class="text-slate-300 hover:text-white hover:bg-slate-700 px-1.5 rounded disabled:opacity-30 transition-colors font-bold text-[10px]">+</button>
            </div>
          </div>
          <!-- Add Recinto row -->
          <div class="flex items-center gap-2 mt-1">
            <!-- Quick-add button (single click) -->
            <button
              @click="openAddModal"
              class="add-recinto-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              title="Añadir recinto con medidas"
            >
              <span class="material-symbols-outlined text-[14px]">add_home</span>
              Añadir Recinto
            </button>
            <!-- Lock toggle -->
            <button
              @click="resizeLocked = !resizeLocked"
              :title="resizeLocked ? 'Desbloquear redimensionado' : 'Bloquear redimensionado'"
              class="lock-toggle-btn flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              :class="resizeLocked ? 'locked' : 'unlocked'"
            >
              <span class="material-symbols-outlined text-[14px]">
                {{ resizeLocked ? 'lock' : 'lock_open' }}
              </span>
              Redimensionar
            </button>
            <!-- Corridor mode toggle -->
            <button
              @click="corridorMode = !corridorMode"
              :title="corridorMode ? 'Desactivar modo pasillos' : 'Detectar pasillos automáticamente'"
              class="corridor-btn flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              :class="corridorMode ? 'active' : 'inactive'"
            >
              <span class="material-symbols-outlined text-[14px]">add_road</span>
              Pasillos
            </button>
          </div>
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

      <!-- ── SVG and Side Panel Wrapper ─────────────── -->
      <div class="flex flex-row flex-1 overflow-hidden relative" style="perspective: 1000px;">
        <div class="flex-1 relative flex items-center justify-center">
          <svg
            ref="svgRef"
            :viewBox="viewBox"
            width="100%"
            :height="isFullScreen ? '100%' : '380'"
            class="bg-gradient-to-br from-slate-800 to-slate-900 w-full"
            :class="{ 'disable-rect-transitions': isMathUpdating }"
            style="touch-action: none; transform-origin: center;"
            :style="{
              transition: isVisualAnimating ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              transform: `rotate(${visualRotation}deg)`
            }"
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

        <!-- Grid background (clicable to clear selection) -->
        <rect x="0" y="0" :width="vbW" :height="vbH" fill="url(#grid-major)" @pointerdown="editor.selectedRecintoId.value = null" />

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
        <text
          :x="toSX(0) + 10" :y="toSZ(0) + 20"
          fill="rgba(99,102,241,0.5)"
          font-size="12"
          font-weight="bold"
          class="uppercase tracking-widest pointer-events-none select-none"
        >
          Límites del Terreno ({{ budgetRect.w.toFixed(1) }}m x {{ budgetRect.h.toFixed(1) }}m)
        </text>

        <!-- ── Ghost Trace (Auto-Fade) ────────────────────────────────────── -->
        <g v-if="ghostRoom" class="transition-opacity duration-1000 ease-out" :class="isGhostFading ? 'opacity-0' : 'opacity-80'">
          <rect
            :x="toSX(ghostRoom.coords.x)"
            :y="toSZ(ghostRoom.coords.z)"
            :width="ghostRoom.dimensions.w * PPM"
            :height="ghostRoom.dimensions.l * PPM"
            fill="rgba(255,255,255,0.05)"
            stroke="#94a3b8"
            stroke-width="2"
            stroke-dasharray="4 4"
            rx="4"
            class="pointer-events-none"
          />
        </g>
        <!-- Label del presupuesto -->
        <text
          :x="toSX(budgetRect.w) - 6" :y="toSZ(0) + 14"
          fill="rgba(129,140,248,0.7)"
          font-size="10" font-weight="600"
          text-anchor="end"
          style="pointer-events: none"
        >{{ m2Totales }} m² disponibles</text>

        <!-- ── Corridor Zones (when corridorMode is active) ──────────────── -->
        <g v-if="corridorMode">
          <g
            v-for="(zone, idx) in corridorZones"
            :key="'cz-' + idx"
            class="corridor-zone-group"
            @click="buildCorridor(zone)"
          >
            <rect
              :x="toSX(zone.x0)"
              :y="toSZ(zone.z0)"
              :width="zone.w * PPM"
              :height="zone.l * PPM"
              fill="rgba(34,211,238,0.12)"
              stroke="rgba(34,211,238,0.55)"
              stroke-width="1.5"
              stroke-dasharray="5 3"
              rx="3"
              class="corridor-zone-rect"
            />
            <!-- Label solo en el primer segmento del grupo, centrado en el bounding box del grupo -->
            <template v-if="zone.isFirstInGroup">
              <text
                :x="toSX(zone.labelX)"
                :y="toSZ(zone.labelZ) - 8"
                fill="rgba(34,211,238,0.9)"
                font-size="11"
                font-weight="700"
                text-anchor="middle"
                dominant-baseline="middle"
                style="pointer-events: none; user-select: none;"
              >{{ zone.groupArea.toFixed(1) }}m²{{ zone.groupRects.length > 1 ? ` (${zone.groupRects.length} segmentos)` : '' }}</text>
              <text
                :x="toSX(zone.labelX)"
                :y="toSZ(zone.labelZ) + 8"
                fill="rgba(34,211,238,0.65)"
                font-size="10"
                font-weight="600"
                text-anchor="middle"
                dominant-baseline="middle"
                style="pointer-events: none; user-select: none;"
              >↑ Clic para crear pasillo</text>
            </template>
          </g>
          <!-- Hint si no hay zonas -->
          <text
            v-if="corridorZones.length === 0"
            :x="toSX(budgetRect.w / 2)"
            :y="toSZ(budgetRect.h / 2)"
            fill="rgba(34,211,238,0.5)"
            font-size="12"
            font-weight="600"
            text-anchor="middle"
            dominant-baseline="middle"
            style="pointer-events: none;"
          >Sin espacios ≥ 0.8m disponibles para pasillo</text>
        </g>

        <!-- ── Rooms ──────────────────────────────────────────────────────── -->
        <g v-for="recinto in store.recintos" :key="recinto.id"
           :class="(recinto.piso || 1) !== store.currentFloor ? 'opacity-20 pointer-events-none' : ''">

          <!-- Selection highlight ring (renders behind room body) -->
          <rect
            v-if="isSelected(recinto.id) && (recinto.piso || 1) === store.currentFloor"
            :x="toSX(recinto.coords.x) - 3"
            :y="toSZ(recinto.coords.z) - 3"
            :width="recinto.dimensions.w * PPM + 6"
            :height="recinto.dimensions.l * PPM + 6"
            fill="none"
            stroke="#a5b4fc"
            stroke-width="2.5"
            stroke-dasharray="6 3"
            rx="5"
            style="pointer-events:none"
          />
          <!-- Animated glow when selected but not active -->
          <rect
            v-if="isSelected(recinto.id) && !isActive(recinto.id)"
            :x="toSX(recinto.coords.x) - 5"
            :y="toSZ(recinto.coords.z) - 5"
            :width="recinto.dimensions.w * PPM + 10"
            :height="recinto.dimensions.l * PPM + 10"
            fill="rgba(99,102,241,0.12)"
            stroke="rgba(165,180,252,0.35)"
            stroke-width="1"
            rx="7"
            style="pointer-events:none"
          />

          <!-- Room body -->
          <rect
            :x="toSX(recinto.coords.x)"
            :y="toSZ(recinto.coords.z)"
            :width="recinto.dimensions.w * PPM"
            :height="recinto.dimensions.l * PPM"
            :fill="roomFill(recinto.tipo)"
            :fill-opacity="isActive(recinto.id) ? 0.95 : isSelected(recinto.id) ? 0.85 : 0.72"
            :stroke="isActive(recinto.id) ? '#ffffff' : isSelected(recinto.id) ? '#a5b4fc' : roomEdge(recinto.tipo)"
            :stroke-width="isActive(recinto.id) ? 2.5 : isSelected(recinto.id) ? 2 : 1.5"
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
          >{{ recinto.nombre || (recinto.tipo === "habitacion" ? "Hab." : recinto.tipo === "banio" ? "Baño" : "Común") }}</text>
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
            v-if="(recinto.piso || 1) === store.currentFloor"
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

          <!-- Resize hit area (invisible) — hidden when locked -->
          <rect
            v-if="!resizeLocked && (recinto.piso || 1) === store.currentFloor"
            :x="toSX(recinto.coords.x + recinto.dimensions.w) - 18"
            :y="toSZ(recinto.coords.z + recinto.dimensions.l) - 18"
            width="28" height="28" fill="transparent"
            class="cursor-nwse-resize"
            @pointerdown="(e) => startResize(e, recinto.id)"
          />
          <!-- Resize handle triangle — dim when locked -->
          <path
            v-if="(recinto.piso || 1) === store.currentFloor"
            :d="`
              M ${toSX(recinto.coords.x + recinto.dimensions.w)}
                ${toSZ(recinto.coords.z + recinto.dimensions.l) - 14}
              L ${toSX(recinto.coords.x + recinto.dimensions.w)}
                ${toSZ(recinto.coords.z + recinto.dimensions.l)}
              L ${toSX(recinto.coords.x + recinto.dimensions.w) - 14}
                ${toSZ(recinto.coords.z + recinto.dimensions.l)} Z`"
            :fill="resizeLocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.75)'"
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
      
      <!-- ── Manual Dimensions Side Panel ───────────────────────────────── -->
      <transition name="slide-right">
        <div v-if="editor.selectedRecintoId.value" class="w-64 shrink-0 bg-slate-800 border-l border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
          <div class="flex justify-between items-center mb-1">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">edit</span> Propiedades
            </h4>
            <button @click="editor.selectedRecintoId.value = null" class="text-slate-500 hover:text-white">
              <span class="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
          
          <div class="flex flex-col gap-1">
            <label class="text-[10px] text-slate-400 font-bold uppercase">Nombre</label>
            <input type="text" v-model="selectedRoomName" class="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-medium focus:border-primary outline-none transition-colors" placeholder="Ej. Baño 1" />
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-slate-400 font-bold uppercase">Ancho (m)</label>
              <input type="number" v-model.number="selectedRoomWidth" class="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono text-center focus:border-primary outline-none transition-colors" step="0.5" :disabled="resizeLocked" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-slate-400 font-bold uppercase">Largo (m)</label>
              <input type="number" v-model.number="selectedRoomLength" class="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono text-center focus:border-primary outline-none transition-colors" step="0.5" :disabled="resizeLocked" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-slate-400 font-bold uppercase">Alto (m)</label>
              <input type="number" v-model.number="selectedRoomHeight" class="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono text-center focus:border-primary outline-none transition-colors" step="0.1" />
            </div>
          </div>
        </div>
      </transition>
    </div>

      <!-- ── Add Recinto Modal ───────────────────────────────────────────────── -->
      <transition name="modal-fade">
        <div v-if="showAddModal" class="add-modal-overlay" @click.self="showAddModal = false">
          <div class="add-modal-box">
            <!-- Header -->
            <div class="add-modal-header">
              <span class="material-symbols-outlined text-primary text-[20px]">add_home</span>
              <h4>Añadir Recinto</h4>
              <button @click="showAddModal = false" class="add-modal-close">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>



            <!-- Nombre -->
            <div class="add-modal-section">
              <label class="add-modal-label">Nombre</label>
              <input
                v-model="addForm.nombre"
                type="text"
                placeholder="Ej. Dormitorio Principal"
                class="add-modal-input"
                @keyup.enter="confirmAdd"
              />
            </div>

            <!-- Medidas -->
            <div class="add-modal-section">
              <label class="add-modal-label">Medidas</label>
              <div class="dim-row">
                <div class="dim-field">
                  <span class="dim-icon material-symbols-outlined text-[14px]">width</span>
                  <label class="dim-label">Ancho</label>
                  <input v-model.number="addForm.w" type="number" step="0.5" min="0.5" class="dim-input" />
                  <span class="dim-unit">m</span>
                </div>
                <div class="dim-field">
                  <span class="dim-icon material-symbols-outlined text-[14px]">height</span>
                  <label class="dim-label">Largo</label>
                  <input v-model.number="addForm.l" type="number" step="0.5" min="0.5" class="dim-input" />
                  <span class="dim-unit">m</span>
                </div>
                <div class="dim-field">
                  <span class="dim-icon material-symbols-outlined text-[14px]">vertical_align_top</span>
                  <label class="dim-label">Alto</label>
                  <input v-model.number="addForm.h" type="number" step="0.1" min="1" class="dim-input" />
                  <span class="dim-unit">m</span>
                </div>
              </div>
              <p class="add-modal-hint">Área: {{ (addForm.w * addForm.l).toFixed(2) }} m²</p>
            </div>

            <!-- Actions -->
            <div class="add-modal-actions">
              <button @click="showAddModal = false" class="add-modal-cancel">Cancelar</button>
              <button @click="confirmAdd" class="add-modal-confirm">
                <span class="material-symbols-outlined text-[16px]">add</span>
                Crear Recinto
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
</template>

<style scoped>
svg rect.cursor-grab:hover {
  filter: brightness(1.18);
}
svg rect.cursor-grabbing {
  cursor: grabbing;
}

/* ── Corridor Button ─────────────────────────────────────────────────────── */
.corridor-btn { border: 1px solid transparent; }
.corridor-btn.inactive {
  background: linear-gradient(135deg, rgba(20,184,166,0.18), rgba(20,184,166,0.06));
  border-color: rgba(20,184,166,0.35);
  color: #5eead4;
}
.corridor-btn.inactive:hover {
  background: linear-gradient(135deg, rgba(20,184,166,0.32), rgba(20,184,166,0.15));
  border-color: rgba(20,184,166,0.65);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(20,184,166,0.2);
}
.corridor-btn.active {
  background: rgba(20,184,166,0.25);
  border-color: rgba(20,184,166,0.7);
  color: #2dd4bf;
  box-shadow: 0 0 10px rgba(20,184,166,0.3);
}

/* ── Corridor Zone hover ─────────────────────────────────────────────────── */
.corridor-zone-group { cursor: pointer; }
.corridor-zone-rect { transition: fill 0.15s; }
.corridor-zone-group:hover .corridor-zone-rect { fill: rgba(34,211,238,0.28); }

/* ── Add Recinto Button ───────────────────────────────────────────────────── */
.add-recinto-btn {
  background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1));
  border: 1px solid rgba(99,102,241,0.45);
  color: #a5b4fc;
}
.add-recinto-btn:hover {
  background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(99,102,241,0.2));
  border-color: rgba(99,102,241,0.7);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99,102,241,0.25);
}
.add-recinto-btn:active { transform: scale(0.97); }

/* ── Lock Toggle ──────────────────────────────────────────────────────────── */
.lock-toggle-btn { border: 1px solid transparent; }
.lock-toggle-btn.unlocked {
  background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1));
  border-color: rgba(99,102,241,0.45);
  color: #a5b4fc;
}
.lock-toggle-btn.unlocked:hover {
  background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(99,102,241,0.2));
  border-color: rgba(99,102,241,0.7);
  color: #fff;
}
.lock-toggle-btn.locked {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}
.lock-toggle-btn.locked:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

/* ── Add Recinto Modal ────────────────────────────────────────────────────── */
.add-modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(11,18,32,0.82);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.add-modal-box {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid rgba(99,102,241,0.35);
  border-radius: 1rem;
  padding: 1.5rem;
  width: min(420px, 90%);
  box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-modal-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.add-modal-header h4 {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 800;
  color: #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.add-modal-close {
  color: #64748b;
  transition: color 0.15s;
  line-height: 1;
}
.add-modal-close:hover { color: #fff; }

.add-modal-section { display: flex; flex-direction: column; gap: 0.5rem; }
.add-modal-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

/* Tipo grid */
.tipo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}
.tipo-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(100,116,139,0.3);
  background: rgba(30,41,59,0.6);
  color: #94a3b8;
  transition: all 0.15s;
}
.tipo-btn:hover {
  border-color: rgba(99,102,241,0.5);
  color: #a5b4fc;
  background: rgba(99,102,241,0.1);
}
.tipo-btn--active {
  border-color: rgba(99,102,241,0.7) !important;
  background: rgba(99,102,241,0.2) !important;
  color: #a5b4fc !important;
}

/* Name input */
.add-modal-input {
  background: rgba(15,23,42,0.8);
  border: 1px solid rgba(100,116,139,0.3);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: #e2e8f0;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.add-modal-input:focus { border-color: rgba(99,102,241,0.6); }

/* Dimension row */
.dim-row { display: flex; gap: 0.5rem; }
.dim-field {
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 0.15rem 0.3rem;
  background: rgba(15,23,42,0.7);
  border: 1px solid rgba(100,116,139,0.25);
  border-radius: 0.5rem;
  padding: 0.4rem 0.5rem;
  align-items: center;
}
.dim-icon { grid-row: 1; grid-column: 1; color: #6366f1; }
.dim-label {
  grid-row: 1; grid-column: 2;
  font-size: 0.55rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.dim-input {
  grid-row: 2; grid-column: 1 / span 2;
  background: transparent;
  border: none;
  outline: none;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  width: 100%;
  text-align: center;
}
.dim-unit { display: none; } /* shown inline by dim-input */

.add-modal-hint {
  font-size: 0.625rem;
  color: #6366f1;
  font-weight: 600;
  text-align: right;
}

/* Actions */
.add-modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.add-modal-cancel {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  border: 1px solid rgba(100,116,139,0.3);
  background: transparent;
  transition: all 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.add-modal-cancel:hover { color: #e2e8f0; border-color: rgba(100,116,139,0.6); }
.add-modal-confirm {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: 1px solid rgba(99,102,241,0.5);
  transition: all 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(99,102,241,0.3);
}
.add-modal-confirm:hover {
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99,102,241,0.4);
}
.add-modal-confirm:active { transform: scale(0.97); }

/* Modal transitions */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .add-modal-box,
.modal-fade-leave-to .add-modal-box {
  transform: scale(0.95) translateY(-8px);
}

/* Slide right transition for side panel */
.slide-right-enter-active, .slide-right-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease, width 0.2s ease;
}
.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
  width: 0;
}

/* Disable transitions during mathematical rotation to prevent sliding chaos */
.disable-rect-transitions rect,
.disable-rect-transitions circle,
.disable-rect-transitions text,
.disable-rect-transitions line,
.disable-rect-transitions path,
.disable-rect-transitions g {
  transition: none !important;
}
</style>
