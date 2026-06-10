<script setup>
import logger from '../utils/logger.js';
import { computed, ref, reactive, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRecintosStore } from "../stores/recintos";
import { useInteractiveEditor } from "../composables/useInteractiveEditor";
import { useTheme } from "../composables/useTheme";
import { useI18n } from "../composables/useI18n";
import {
  clampRectToTerrain,
  normalizeRoomRect,
  snapRectFlushToNeighbors,
  terrainFromEditor,
  getSupportRoomsBelow,
  findSupportedPosition,
} from "../composables/useSpatialConstraints.js";
import { isRoomStructurallyValid } from "../utils/cantileverSupport.js";
import { prefersReducedMotion } from "../design/motionTokens.js";
import { MAX_FLOORS, MIN_ROOM_HEIGHT, MAX_WALL_HEIGHT, WALL_HEIGHT_STEP, clampWallHeight, DEFAULT_WALL_HEIGHT } from "../constants/spatial.js";
import { useProductPreferences } from "../composables/useProductPreferences.js";
import { MATERIAL_EDGE_COLORS } from "../utils/roomTypeColors.js";
import {
  RECINTO_2D_COLOR_PRESETS,
  resolveRecintoFill2d,
  resolveRecintoStroke2d,
} from "../utils/recinto2dColors.js";
import { MATERIAL_OPTIONS, materialLabel, resolveRecintoMaterial } from "../utils/materialHelpers.js";
import { useBilling } from "../composables/useBilling";
import { useWorkspaceStore } from "../stores/workspace";
import { downloadBlueprint } from "../utils/blueprintGenerator";
import { getMaterialLabel } from "../utils/budgetExporter";
import { toast } from "vue-sonner";

const props = defineProps({
  m2Totales:         { type: Number, default: 100 },
  terrenoAncho:      { type: Number, default: 15 },
  terrenoLargo:      { type: Number, default: 7 },
  descripcionEstado: { type: Object, default: () => ({ color: '#22c55e', message: 'OK' }) },
  showGrid:          { type: Boolean, default: true },
  showLabels:        { type: Boolean, default: true },
  defaultRoomHeight: { type: Number, default: 2.4 },
  materialEstructuralId: { type: Number, default: 1 },
  /** true cuando el paso Diseñar está visible (v-show); evita medir aspecto con ancho 0 */
  editorVisible:     { type: Boolean, default: true },
});

// ── Constants ─────────────────────────────────────────────────────────────────
const PPM         = 50;   // pixels per metre in SVG coordinate space
const VIEW_PAD    = 1;    // 1 m padding around everything (integer keeps grid snapped)
const DIM_OFFSET  = 22;   // pixels from the wall to the dimension line
const TICK_LEN    = 6;    // half-length of dimension ticks

const MIN_ROOM_DIM = 0.5;
const ROOM_DIM_STEP = 0.1;
const DEFAULT_FINE_STEP = 0.1;
const MOVE_OVERFLOW_MARGIN = 0; // misma regla que 3D: el recinto no sale del terreno
const OVERLAP_EPS = 0.001; // evita falsos positivos cuando dos recintos quedan exactamente pegados

const clampNumber = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
};

// ── Store & editor ───────────────────────────────────────────────────────────
const svgRef = ref(null);
const rootRef = ref(null);
const svgViewportRef = ref(null);
/** 0 = aún no medido; no usar aspecto por defecto para no generar franjas */
const viewportAspect = ref(0);
const isFullScreen = ref(false);
const store  = useRecintosStore();
const workspaceStore = useWorkspaceStore();
const { canUseMaterial } = useBilling();
const { t } = useI18n();
const { productPreferences, saveProductPreferences } = useProductPreferences();

const exportBlueprintPlan = () => {
  const recintos = store.recintos || [];
  if (!recintos.length) {
    toast.error(t("blueprintExportEmpty"));
    return;
  }

  const floors = [...new Set(recintos.map((r) => r.piso || 1))].sort((a, b) => a - b);
  const suffix = floors.length > 1 ? "multi-piso" : `p${store.currentFloor}`;

  try {
    downloadBlueprint(
      {
        recintos,
        projectName: workspaceStore.activePresetName || "Proyecto SIEC",
        material: getMaterialLabel(props.materialEstructuralId),
        m2: props.m2Totales,
      },
      `siec-plano-${suffix}.pdf`,
    );
    toast.success(t("blueprintExportSuccess"));
  } catch (err) {
    console.error(err);
    toast.error(t("blueprintExportFailed"));
  }
};

// ── Layout lock (2D + 3D) ─────────────────────────────────────────────────────
const layoutLocked = computed(() => store.layoutLocked);
const upperFloorNeedsSupport = computed(
  () => store.currentFloor > 1 && !store.floorBelowHasSupport,
);

const notifyUpperFloorSupportRequired = () => {
  toast.error(t('upperFloorSupportRequired'));
};

const notifyUpperFloorPlacementFailed = () => {
  toast.error(t('upperFloorPlacementFailed'));
};

// ── Add Recinto Modal ─────────────────────────────────────────────────────────
const showAddModal = ref(false);
const addForm = reactive({
  nombre: 'Recinto',
  w: 3.5,
  l: 3.0,
  color2d: null,
});

const defaultAddWidth = () =>
  Math.min(3.5, Math.max(MIN_ROOM_DIM, budgetRect.value.w * 0.85));

const defaultAddLength = () =>
  Math.min(3.0, Math.max(MIN_ROOM_DIM, budgetRect.value.h * 0.85));

const openAddModal = () => {
  if (upperFloorNeedsSupport.value) {
    notifyUpperFloorSupportRequired();
    return;
  }
  editor.selectedRecintoId.value = null;
  addForm.nombre = 'Recinto';
  addForm.w = defaultAddWidth();
  addForm.l = defaultAddLength();
  addForm.color2d = null;
  showAddModal.value = true;
};

const confirmAdd = () => {
  const w = clampNumber(addForm.w, MIN_ROOM_DIM, budgetRect.value.w);
  const l = clampNumber(addForm.l, MIN_ROOM_DIM, budgetRect.value.h);
  const h = clampWallHeight(props.defaultRoomHeight, DEFAULT_WALL_HEIGHT);

  if (w > budgetRect.value.w || l > budgetRect.value.h) {
    return;
  }

  addForm.w = w;
  addForm.l = l;
  showAddModal.value = false;

  const id = store.addRecinto(
    'habitacion',
    addForm.nombre || 'Recinto',
    w,
    l,
    h,
    addForm.color2d,
  );

  if (!id) {
    notifyUpperFloorSupportRequired();
    return;
  }

  const room = store.recintos.find((r) => r.id === id);
  if (room) {
    placeRoomWithoutGap(room);
    if (!roomHasSupport(room)) {
      store.deleteRecinto(id);
      notifyUpperFloorPlacementFailed();
      return;
    }
    editor.selectedRecintoId.value = id;
  }
};

const quickAdd = () => {
  if (upperFloorNeedsSupport.value) {
    notifyUpperFloorSupportRequired();
    return;
  }

  const w = defaultAddWidth();
  const l = defaultAddLength();
  const id = store.addRecinto(
    'habitacion',
    'Recinto',
    w,
    l,
    clampWallHeight(props.defaultRoomHeight, DEFAULT_WALL_HEIGHT),
  );

  if (!id) {
    notifyUpperFloorSupportRequired();
    return;
  }

  const room = store.recintos.find((r) => r.id === id);
  if (room) {
    placeRoomWithoutGap(room);
    if (!roomHasSupport(room)) {
      store.deleteRecinto(id);
      notifyUpperFloorPlacementFailed();
      return;
    }
    editor.selectedRecintoId.value = id;
  }
};

const { isDark } = useTheme();

const gridMajorM = computed(() => 0.5);

const showEditorGrid = computed(() => Boolean(props.showGrid));

const editorSnapStep = computed(() => 0);

const editor = useInteractiveEditor({ snapStep: editorSnapStep });

// ── Corridor Draw Mode ────────────────────────────────────────────────────────
const corridorMode = ref(false);
const MIN_CORRIDOR_DIM = 0.5; // mínimo igual que un recinto normal

/**
 * Estado del draw-drag de pasillo.
 * origin: punto mundo donde se hizo pointerdown.
 * preview: rect normalizado { x0, z0, w, l } que se dibuja en tiempo real.
 */
const corridorDraw = ref(null);

/**
 * Aplica snap de bordes (igual que drag/resize) sobre una coordenada raw.
 * Usa las líneas de snap de todos los recintos del piso actual.
 */
const snapCorridorCoord = (rawX, rawZ, snapThreshold = 0.25) => {
  const bd    = budgetRect.value;
  const floor = store.currentFloor;

  const xLines = [0, bd.w];
  const zLines = [0, bd.h];
  store.recintos.forEach((r) => {
    if ((r.piso || 1) !== floor) return;
    xLines.push(r.coords.x, r.coords.x + r.dimensions.w);
    zLines.push(r.coords.z, r.coords.z + r.dimensions.l);
  });

  const snapLine = (raw, lines) => {
    let best = raw;
    let minDiff = snapThreshold;
    for (const line of lines) {
      const d = Math.abs(raw - line);
      if (d < minDiff) { minDiff = d; best = line; }
    }
    return best;
  };

  return {
    x: snapLine(rawX, xLines),
    z: snapLine(rawZ, zLines),
  };
};

/** Normaliza un rect dado dos puntos (cualquier orden de arrastre). */
const corridorRectFromPoints = (ax, az, bx, bz) => {
  const bd = budgetRect.value;
  const x0 = Math.max(0, Math.min(ax, bx));
  const z0 = Math.max(0, Math.min(az, bz));
  const x1 = Math.min(bd.w, Math.max(ax, bx));
  const z1 = Math.min(bd.h, Math.max(az, bz));
  return { x0, z0, w: x1 - x0, l: z1 - z0 };
};

/** Inicia el draw de pasillo al hacer pointerdown en el canvas. */
const startCorridorDraw = (e) => {
  if (!corridorMode.value) return;
  e.preventDefault();
  e.stopPropagation();
  pointerSessionId.value = e.pointerId;
  capturePointer(e);
  editor.selectedRecintoId.value = null;
  const w = toWorld(e.clientX, e.clientY);
  const snapped = snapCorridorCoord(w.x, w.z);
  corridorDraw.value = {
    ox: snapped.x,
    oz: snapped.z,
    preview: { x0: snapped.x, z0: snapped.z, w: 0, l: 0 },
  };
};

/** Actualiza el preview durante el drag de pasillo. */
const updateCorridorDraw = (clientX, clientY) => {
  if (!corridorDraw.value) return;
  const w   = toWorld(clientX, clientY);
  const end = snapCorridorCoord(w.x, w.z);
  corridorDraw.value.preview = corridorRectFromPoints(
    corridorDraw.value.ox, corridorDraw.value.oz,
    end.x, end.z,
  );
};

/** Confirma el pasillo y lo crea en el store. */
const commitCorridorDraw = () => {
  if (!corridorDraw.value) return;
  const pr = corridorDraw.value.preview;
  corridorDraw.value = null;
  if (pr.w < MIN_CORRIDOR_DIM || pr.l < MIN_CORRIDOR_DIM) return;

  const floor = store.currentFloor;
  const pasillosEnPiso = store.recintos.filter(
    (r) => r.tipo === 'pasillo' && (r.piso || 1) === floor,
  ).length;
  const nombre = pasillosEnPiso > 0 ? `Pasillo ${pasillosEnPiso + 1}` : 'Pasillo';

  const id = store.addRecinto(
    'pasillo',
    nombre,
    Number(pr.w.toFixed(3)),
    Number(pr.l.toFixed(3)),
    clampWallHeight(props.defaultRoomHeight, DEFAULT_WALL_HEIGHT),
  );

  if (!id) {
    notifyUpperFloorSupportRequired();
    return;
  }

  const placedCoords = { x: Number(pr.x0.toFixed(3)), z: Number(pr.z0.toFixed(3)) };
  const updated = store.updateRecinto(id, { coords: placedCoords });
  if (!updated) {
    store.deleteRecinto(id);
    notifyUpperFloorPlacementFailed();
    return;
  }

  editor.selectedRecintoId.value = id;

  nextTick(() => {
    const placed = store.recintos.find((r) => r.id === id);
    if (placed) {
      const flushed = applyFlushSnapToRoom(placed);
      if (flushed) {
        store.updateRecinto(id, {
          coords: { x: flushed.x, z: flushed.z },
        });
      }
    }
    scheduleViewportAspectSync();
  });

  store.saveHistoryState();
};


// ── Area usage (live) ─────────────────────────────────────────────────────────
const usedArea = computed(() => store.totalArea);
const freeArea = computed(() => Math.max((props.m2Totales || 0) - usedArea.value, 0));
const freePct  = computed(() =>
  props.m2Totales > 0 ? Math.min(100, (usedArea.value / props.m2Totales) * 100) : 0
);

// ── Budget rectangle (shows the "size" of the project) ───────────────────────
// Area = terrenoAncho * terrenoLargo
const budgetRect = computed(() => ({
  w: props.terrenoAncho || 15,
  h: props.terrenoLargo || 7,
}));

const terrainLabelStyle = computed(() => {
  const minDim = Math.min(budgetRect.value.w, budgetRect.value.h);

  if (minDim <= 5) {
    return { fontSize: 7, y: 9, freeFontSize: 7, freeY: 9, compact: true };
  }
  if (minDim <= 8) {
    return { fontSize: 9, y: 14, freeFontSize: 8, freeY: 12, compact: false };
  }

  return { fontSize: 12, y: 22, freeFontSize: 11, freeY: 18, compact: false };
});

const terrainBoundsLabel = computed(() => {
  const w = budgetRect.value.w.toFixed(1);
  const h = budgetRect.value.h.toFixed(1);

  if (terrainLabelStyle.value.compact) {
    return t('terrainBoundsCompact', { w, h });
  }

  return t('terrainBounds', { w, h });
});

const terrainFreeAreaLabel = computed(() =>
  t('terrainFreeArea', { area: freeArea.value.toFixed(1) }),
);

// ── Movement bounds ───────────────────────────────────────────────────────────
// El usuario puede sacar un recinto apenas del terreno para ajustar, pero no
// arrastrarlo indefinidamente fuera del área útil.
const movementBoundsForRoom = (room) => {
  const bd = budgetRect.value;
  const roomW = Math.max(MIN_ROOM_DIM, Number(room?.dimensions?.w) || MIN_ROOM_DIM);
  const roomL = Math.max(MIN_ROOM_DIM, Number(room?.dimensions?.l) || MIN_ROOM_DIM);
  const margin = MOVE_OVERFLOW_MARGIN;

  return {
    minX: -margin,
    minZ: -margin,
    maxX: Math.max(-margin, bd.w - roomW + margin),
    maxZ: Math.max(-margin, bd.h - roomL + margin),
  };
};

const clampRoomToMovementBounds = (room) => {
  if (!room) return null;

  const bounds = movementBoundsForRoom(room);
  const currentX = Number(room.coords?.x) || 0;
  const currentZ = Number(room.coords?.z) || 0;
  const safeX = clampNumber(currentX, bounds.minX, bounds.maxX);
  const safeZ = clampNumber(currentZ, bounds.minZ, bounds.maxZ);

  if (safeX !== currentX || safeZ !== currentZ) {
    store.updateRecinto(room.id, { coords: { x: safeX, z: safeZ } });
  }

  return { x: safeX, z: safeZ };
};

const clampSelectedRoomToMovementBounds = () => {
  const id = editor.selectedRecintoId.value;
  if (!id) return;

  const room = store.recintos.find((r) => r.id === id);
  clampRoomToMovementBounds(room);
};

/** Visual-only coords/dims during drag — avoids Pinia + 3D sync every pointermove. */
const dragPreview = ref(null);

const roomsForView = computed(() => {
  const preview = dragPreview.value;
  if (!preview) return store.recintos;

  return store.recintos.map((r) => {
    if (r.id !== preview.id) return r;
    return {
      ...r,
      coords: { x: preview.x, z: preview.z },
      dimensions:
        preview.w != null && preview.l != null
          ? { ...r.dimensions, w: preview.w, l: preview.l }
          : r.dimensions,
    };
  });
});

const dragCoordsFit = (room, tx, tz, w, l) => !roomOverlapsAny(room, tx, tz, w, l);

/** Durante el arrastre: solo clamp + anti-solape; el snap magnético va al soltar. */
const applyDragPreviewCoords = (x, z) => {
  const room = selectedDraggedRoom();
  if (!room) return null;

  const w = Math.max(MIN_ROOM_DIM, Number(room.dimensions?.w) || MIN_ROOM_DIM);
  const l = Math.max(MIN_ROOM_DIM, Number(room.dimensions?.l) || MIN_ROOM_DIM);
  const bounds = movementBoundsForRoom({
    ...room,
    coords: { x, z },
    dimensions: { w, l },
  });

  let safeX = clampNumber(x, bounds.minX, bounds.maxX);
  let safeZ = clampNumber(z, bounds.minZ, bounds.maxZ);

  if (!dragCoordsFit(room, safeX, safeZ, w, l)) {
    const previous = lastValidDragCoords.value;
    if (previous?.id === room.id && dragCoordsFit(room, previous.x, previous.z, w, l)) {
      safeX = previous.x;
      safeZ = previous.z;
    } else {
      return null;
    }
  }

  cacheValidDragCoords({ ...room, coords: { x: safeX, z: safeZ } });
  return { x: safeX, z: safeZ };
};

const applyLiveDragCoords = (roomId, x, z) => {
  const safe = applyDragPreviewCoords(x, z);
  if (!safe || !roomId) return null;

  dragPreview.value = { id: roomId, x: safe.x, z: safe.z };
  return safe;
};

const commitDragPreviewToStore = () => {
  const preview = dragPreview.value;
  if (!preview) return;

  const room = store.recintos.find((r) => r.id === preview.id);
  if (!room) return;

  if (preview.w != null && preview.l != null) {
    store.updateRecinto(preview.id, {
      coords: { x: preview.x, z: preview.z },
      dimensions: { w: preview.w, l: preview.l },
    });
  } else {
    store.updateRecinto(preview.id, {
      coords: { x: preview.x, z: preview.z },
    });
  }
};

const lastValidDragCoords = ref(null);

const selectedDraggedRoom = () => {
  const id = editor.selectedRecintoId.value;
  if (!id) return null;
  return store.recintos.find((r) => r.id === id) || null;
};

const cacheValidDragCoords = (room) => {
  if (!room) return;
  lastValidDragCoords.value = {
    id: room.id,
    x: Number(room.coords?.x) || 0,
    z: Number(room.coords?.z) || 0,
  };
};


const maxRoomWidthFromPosition = (room) => {
  if (!room) return budgetRect.value.w;
  return Math.max(
    MIN_ROOM_DIM,
    budgetRect.value.w - Math.max(0, Number(room.coords?.x) || 0),
  );
};

const maxRoomLengthFromPosition = (room) => {
  if (!room) return budgetRect.value.h;
  return Math.max(
    MIN_ROOM_DIM,
    budgetRect.value.h - Math.max(0, Number(room.coords?.z) || 0),
  );
};

const applyFlushSnapToRoom = (room) => {
  if (!room) return null;

  const terrain = terrainFromEditor(budgetRect.value.w, budgetRect.value.h);
  const others = store.recintos.filter((r) => r.id !== room.id);

  let rect = snapRectFlushToNeighbors(normalizeRoomRect(room), others);
  rect = clampRectToTerrain(rect, terrain, MOVE_OVERFLOW_MARGIN);

  if (roomOverlapsAny(room, rect.x, rect.z, rect.w, rect.l)) {
    return null;
  }

  return rect;
};

const normalizeRoomInsideTerrain = (room) => {
  if (!room) return;

  const terrain = terrainFromEditor(budgetRect.value.w, budgetRect.value.h);
  const flushed = applyFlushSnapToRoom(room);
  const clamped = flushed || clampRectToTerrain(
    normalizeRoomRect(room),
    terrain,
    MOVE_OVERFLOW_MARGIN,
  );
  const safeH = clampWallHeight(
    room.dimensions?.h ?? props.defaultRoomHeight,
    DEFAULT_WALL_HEIGHT,
  );

  store.updateRecinto(room.id, {
    dimensions: {
      ...room.dimensions,
      w: Number(clamped.w.toFixed(3)),
      l: Number(clamped.l.toFixed(3)),
      h: Number(safeH.toFixed(3)),
    },
    coords: {
      x: Number(clamped.x.toFixed(3)),
      z: Number(clamped.z.toFixed(3)),
    },
  });
};

const roomHasSupport = (room) => {
  if (!room) return false;
  const piso = room.piso || store.currentFloor || 1;
  if (piso <= 1) return true;
  const lowerRooms = getSupportRoomsBelow(store.recintos, piso);
  const materialId = resolveRecintoMaterial(room, props.materialEstructuralId);
  return isRoomStructurallyValid(
    {
      id: room.id,
      piso,
      coords: room.coords,
      dimensions: room.dimensions,
    },
    lowerRooms,
    materialId,
  );
};

const roomOverlapsAny = (room, x, z, w, l) => {
  const piso = room.piso || store.currentFloor || 1;
  const ax0 = x;
  const ax1 = x + w;
  const az0 = z;
  const az1 = z + l;

  return store.recintos.some((other) => {
    if (!other || other.id === room.id) return false;
    if ((other.piso || 1) !== piso) return false;

    const bx0 = other.coords.x;
    const bx1 = other.coords.x + other.dimensions.w;
    const bz0 = other.coords.z;
    const bz1 = other.coords.z + other.dimensions.l;

    const overlapX = Math.min(ax1, bx1) - Math.max(ax0, bx0);
    const overlapZ = Math.min(az1, bz1) - Math.max(az0, bz0);
    return overlapX > OVERLAP_EPS && overlapZ > OVERLAP_EPS;
  });
};

const canPlaceRoomAt = (room, x, z, w, l) => {
  const piso = room.piso || store.currentFloor || 1;
  const baseOk =
    x >= 0 &&
    z >= 0 &&
    x + w <= budgetRect.value.w &&
    z + l <= budgetRect.value.h &&
    !roomOverlapsAny(room, x, z, w, l);

  if (!baseOk) return false;
  if (piso <= 1) return true;

  const lowerRooms = getSupportRoomsBelow(store.recintos, piso);
  const materialId = resolveRecintoMaterial(room, props.materialEstructuralId);
  return isRoomStructurallyValid(
    {
      id: room.id,
      piso,
      x,
      z,
      w,
      l,
    },
    lowerRooms,
    materialId,
  );
};

const placeRoomWithoutGap = (room) => {
  if (!room) return;

  const w = clampNumber(room.dimensions?.w, MIN_ROOM_DIM, budgetRect.value.w);
  const l = clampNumber(room.dimensions?.l, MIN_ROOM_DIM, budgetRect.value.h);
  const sameFloorRooms = store.recintos.filter((other) =>
    other.id !== room.id && (other.piso || 1) === (room.piso || store.currentFloor || 1),
  );

  const floor = room.piso || store.currentFloor || 1;
  if (floor > 1) {
    const supported = findSupportedPosition(
      room,
      w,
      l,
      store.recintos,
      sameFloorRooms,
      resolveRecintoMaterial(room, props.materialEstructuralId),
    );
    if (supported) {
      store.updateRecinto(room.id, {
        dimensions: {
          ...room.dimensions,
          w: Number(w.toFixed(3)),
          l: Number(l.toFixed(3)),
        },
        coords: {
          x: Number(supported.x.toFixed(3)),
          z: Number(supported.z.toFixed(3)),
        },
      });
      normalizeRoomInsideTerrain(room);
      return;
    }
  }

  const candidates = [];
  const last = sameFloorRooms[sameFloorRooms.length - 1];

  if (last) {
    candidates.push(
      { x: last.coords.x + last.dimensions.w, z: last.coords.z },
      { x: last.coords.x - w, z: last.coords.z },
      { x: last.coords.x, z: last.coords.z + last.dimensions.l },
      { x: last.coords.x, z: last.coords.z - l },
    );
  }

  candidates.push({ x: 0, z: 0 });

  const scanStep = DEFAULT_FINE_STEP;
  for (let z = 0; z <= budgetRect.value.h - l + 0.0001; z += scanStep) {
    for (let x = 0; x <= budgetRect.value.w - w + 0.0001; x += scanStep) {
      candidates.push({ x: Number(x.toFixed(3)), z: Number(z.toFixed(3)) });
    }
  }

  const target = candidates.find(({ x, z }) => canPlaceRoomAt(room, x, z, w, l));

  if (target) {
    store.updateRecinto(room.id, {
      dimensions: {
        ...room.dimensions,
        w: Number(w.toFixed(3)),
        l: Number(l.toFixed(3)),
      },
      coords: {
        x: Number(target.x.toFixed(3)),
        z: Number(target.z.toFixed(3)),
      },
    });
  }

  const placed = store.recintos.find((r) => r.id === room.id);
  const flushed = placed ? applyFlushSnapToRoom(placed) : null;
  if (flushed) {
    store.updateRecinto(room.id, {
      coords: { x: flushed.x, z: flushed.z },
    });
  }

  normalizeRoomInsideTerrain(room);
};

const selectedRoom = computed(() => {
  if (!editor.selectedRecintoId.value) return null;
  return store.recintos.find((r) => r.id === editor.selectedRecintoId.value) || null;
});

// ── Canvas bounds: terreno + margen controlado ──────────────────────────────
// Antes el canvas crecía siguiendo cualquier recinto que se arrastrara lejos.
// Eso hacía que el usuario pudiera “perder” piezas fuera del área útil. Ahora el
// plano tiene un rango fijo: terreno + padding visual + margen técnico de drag.
const frozenBounds = ref(null);

const liveBounds = computed(() => {
  const bd = budgetRect.value;
  const margin =
    Math.min(VIEW_PAD, Math.max(0.25, Math.min(bd.w, bd.h) * 0.12)) +
    MOVE_OVERFLOW_MARGIN;

  return {
    minX: -margin,
    minZ: -margin,
    maxX: bd.w + margin,
    maxZ: bd.h + margin,
  };
});

const activeBounds = computed(() => frozenBounds.value || liveBounds.value);

const padBoundsToViewportAspect = (b, target) => {
  const w = b.maxX - b.minX;
  const h = b.maxZ - b.minZ;
  if (w <= 0 || h <= 0 || !Number.isFinite(target) || target <= 0) return b;

  const aspect = w / h;
  if (Math.abs(aspect - target) < 0.004) return b;

  if (aspect < target) {
    const newW = h * target;
    const pad = (newW - w) / 2;
    return { minX: b.minX - pad, minZ: b.minZ, maxX: b.maxX + pad, maxZ: b.maxZ };
  }

  const newH = w / target;
  const pad = (newH - h) / 2;
  return { minX: b.minX, minZ: b.minZ - pad, maxX: b.maxX, maxZ: b.maxZ + pad };
};

const effectiveViewportAspect = computed(() => {
  if (viewportAspect.value > 0) return viewportAspect.value;
  const b = activeBounds.value;
  const w = b.maxX - b.minX;
  const h = b.maxZ - b.minZ;
  return h > 0 ? w / h : 1;
});

/** Ajusta el viewBox al aspecto del viewport: meet sin franjas y sin recortar el terreno */
const viewBounds = computed(() =>
  padBoundsToViewportAspect(activeBounds.value, effectiveViewportAspect.value),
);

const syncAllRoomsToTerrain = () => {
  if (store.layoutInteractionActive) return;
  const rooms = [...store.recintos];
  rooms.forEach((room) => normalizeRoomInsideTerrain(room));
};

watch(
  () => `${props.terrenoAncho}:${props.terrenoLargo}`,
  () => {
    frozenBounds.value = null;
    nextTick(syncAllRoomsToTerrain);
  },
  { immediate: true },
);

watch(
  () => store.recintos.map((r) => r.id).join("|"),
  (ids) => {
    if (!ids) return;
    nextTick(syncAllRoomsToTerrain);
  },
);

// ── SVG coordinate helpers ────────────────────────────────────────────────────
const svgW = computed(() => (viewBounds.value.maxX - viewBounds.value.minX) * PPM);
const svgH = computed(() => (viewBounds.value.maxZ - viewBounds.value.minZ) * PPM);

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

const worldGroupTransform = computed(() => {
  if (!visualRotation.value) return undefined;
  const cx = vbW.value / 2;
  const cy = vbH.value / 2;
  return `rotate(${visualRotation.value}, ${cx}, ${cy})`;
});

const worldGroupStyle = computed(() => ({
  transition:
    !prefersReducedMotion() && isVisualAnimating.value
      ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none',
}));

const disableRectTransitions = computed(
  () =>
    isMathUpdating.value
    || !!editor.activeMode.value
    || store.layoutInteractionActive,
);

// Grid offset: shift pattern so that world integer-metre lines land on grid lines
const gridOffsetX = computed(() => {
  const m = gridMajorM.value;
  const minX = viewBounds.value.minX;
  const mod = ((-minX % m) + m) % m;
  return mod * PPM;
});
const gridOffsetZ = computed(() => {
  const m = gridMajorM.value;
  const minZ = viewBounds.value.minZ;
  const mod = ((-minZ % m) + m) % m;
  return mod * PPM;
});

const patternMajorPx = computed(() => gridMajorM.value * PPM);
const patternMinorPx = computed(() => patternMajorPx.value / 2);

const canvasBaseFill = computed(() => {
  if (showEditorGrid.value) return "url(#grid-major)";
  return "rgb(2 6 23 / 0.98)";
});

const gridMinorStroke = "rgba(100,116,139,0.28)";
const gridMajorStroke = "rgba(148,163,184,0.42)";

const toSX = (x) => (x - viewBounds.value.minX) * PPM;
const toSZ = (z) => (z - viewBounds.value.minZ) * PPM;

/** Hint de pasillo: en el margen superior del plano, fuera del recuadro naranja del terreno */
const corridorDrawHintLayout = computed(() => {
  const cx = toSX(budgetRect.value.w / 2);
  const worldZAbove = -0.78;
  const textY = toSZ(worldZAbove);
  const rectH = 30;
  const rectW = 340;
  return {
    cx,
    textY,
    rectX: cx - rectW / 2,
    rectY: textY - rectH / 2,
    rectW,
    rectH,
    fontSize: 12,
  };
});

// ── Pointer → world ───────────────────────────────────────────────────────────
/** Mapeo manual respetando preserveAspectRatio="meet" (letterboxing). */
const toWorldFromMeet = (clientX, clientY) => {
  const svg = svgRef.value;
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;

  const contentW = svgW.value;
  const contentH = svgH.value;
  if (contentW < 1 || contentH < 1) return null;

  const vb = viewBounds.value;
  const contentAspect = contentW / contentH;
  const viewAspect = rect.width / rect.height;

  let drawW;
  let drawH;
  let offsetX;
  let offsetY;

  if (contentAspect > viewAspect) {
    drawW = rect.width;
    drawH = rect.width / contentAspect;
    offsetX = 0;
    offsetY = (rect.height - drawH) / 2;
  } else {
    drawH = rect.height;
    drawW = rect.height * contentAspect;
    offsetX = (rect.width - drawW) / 2;
    offsetY = 0;
  }

  const spX = ((clientX - rect.left - offsetX) / drawW) * contentW;
  const spY = ((clientY - rect.top - offsetY) / drawH) * contentH;

  return {
    x: vb.minX + spX / PPM,
    z: vb.minZ + spY / PPM,
  };
};

const toWorld = (clientX, clientY) => {
  const svg = svgRef.value;
  if (!svg) return { x: 0, z: 0 };

  if (typeof svg.createSVGPoint === 'function') {
    const ctm = svg.getScreenCTM();
    if (ctm) {
      try {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const sp = pt.matrixTransform(ctm.inverse());
        return {
          x: viewBounds.value.minX + sp.x / PPM,
          z: viewBounds.value.minZ + sp.y / PPM,
        };
      } catch {
        /* usar fallback meet */
      }
    }
  }

  return toWorldFromMeet(clientX, clientY) ?? { x: 0, z: 0 };
};

/** Respaldo si resolveRoomDragPosition no encuentra posición (evita arrastre bloqueado). */
const computeDragFallbackPosition = (pointerWorld) => {
  const room = selectedDraggedRoom();
  if (!room || editor.activeMode.value !== 'drag') return null;

  const w = Math.max(MIN_ROOM_DIM, Number(room.dimensions?.w) || MIN_ROOM_DIM);
  const l = Math.max(MIN_ROOM_DIM, Number(room.dimensions?.l) || MIN_ROOM_DIM);
  const bounds = movementBoundsForRoom({
    ...room,
    dimensions: { w, l },
  });
  const rawX = pointerWorld.x - editor.dragOffset.value.x;
  const rawZ = pointerWorld.z - editor.dragOffset.value.z;

  return {
    x: clampNumber(rawX, bounds.minX, bounds.maxX),
    z: clampNumber(rawZ, bounds.minZ, bounds.maxZ),
  };
};

const capturePointer = (e) => {
  const el = e.currentTarget;
  if (el?.setPointerCapture && e.pointerId != null) {
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
};

// ── Interaction handlers ──────────────────────────────────────────────────────
const ghostRoom = ref(null);
const isGhostFading = ref(false);
/** pointerId activo del drag/resize actual (evita pointerup ajenos). */
const pointerSessionId = ref(null);


const handlePointerMove = (e) => {
  if (
    pointerSessionId.value != null
    && e.pointerId !== pointerSessionId.value
  ) {
    return;
  }

  // ── Corridor draw preview ─────────────────────────────────────────────
  if (corridorDraw.value) {
    updateCorridorDraw(e.clientX, e.clientY);
    return;
  }

  if (!editor.activeMode.value) return;
  const w = toWorld(e.clientX, e.clientY);

  if (editor.activeMode.value === "drag") {
    const roomId = editor.selectedRecintoId.value;
    if (!roomId) return;

    let pos = editor.computeDragPosition(w, budgetRect.value);
    if (!pos) pos = computeDragFallbackPosition(w);
    if (!pos) return;

    applyLiveDragCoords(roomId, pos.x, pos.z);
    return;
  }

  if (editor.activeMode.value === "resize") {
    const dims = editor.computeResizeDimensions(w, budgetRect.value);
    const room = selectedDraggedRoom();
    if (!dims || !room) return;
    dragPreview.value = {
      id: room.id,
      x: Number(room.coords?.x) || 0,
      z: Number(room.coords?.z) || 0,
      w: dims.w,
      l: dims.l,
    };
  }
};

const onPointerMove = (e) => {
  handlePointerMove(e);
};

const onPointerUp = (e) => {
  if (
    pointerSessionId.value != null
    && e?.pointerId != null
    && e.pointerId !== pointerSessionId.value
  ) {
    return;
  }

  const mode = editor.activeMode.value;

  if (!mode && !corridorDraw.value) {
    pointerSessionId.value = null;
    return;
  }

  try {
    if (corridorDraw.value) {
      commitCorridorDraw();
      return;
    }

    if (mode === "drag") {
      if (dragPreview.value) {
        commitDragPreviewToStore();
      }
      const dragged = store.recintos.find(
        (r) => r.id === editor.selectedRecintoId.value,
      );
      const flushed = dragged ? applyFlushSnapToRoom(dragged) : null;
      if (flushed) {
        store.updateRecinto(dragged.id, {
          coords: { x: flushed.x, z: flushed.z },
        });
      }
      lastValidDragCoords.value = null;
    }

    if (mode === "resize") {
      if (dragPreview.value) {
        commitDragPreviewToStore();
      }
      const resized = selectedDraggedRoom();
      if (resized) {
        normalizeRoomInsideTerrain(resized);
        const placed = store.recintos.find((r) => r.id === resized.id);
        const flushed = placed ? applyFlushSnapToRoom(placed) : null;
        if (flushed) {
          store.updateRecinto(resized.id, {
            coords: { x: flushed.x, z: flushed.z },
            dimensions: {
              ...placed.dimensions,
              w: flushed.w,
              l: flushed.l,
            },
          });
        }
      }
    }

    editor.endInteraction();
    dragPreview.value = null;
    if (mode === "drag" || mode === "resize") {
      store.saveHistoryState();
    }
    frozenBounds.value = null;

    if (ghostRoom.value) {
      const fadeMs = prefersReducedMotion() ? 0 : 1500;
      if (fadeMs <= 0) {
        ghostRoom.value = null;
        isGhostFading.value = false;
      } else {
        isGhostFading.value = true;
        setTimeout(() => {
          ghostRoom.value = null;
          isGhostFading.value = false;
        }, fadeMs);
      }
    }
  } finally {
    pointerSessionId.value = null;
    store.layoutInteractionActive = false;
    scheduleViewportAspectSync();
  }
};

const startDrag = (e, id) => {
  if (store.layoutLocked) return;
  e.preventDefault();
  e.stopPropagation();
  pointerSessionId.value = e.pointerId;
  capturePointer(e);
  frozenBounds.value = { ...liveBounds.value };
  store.layoutInteractionActive = true;
  dragPreview.value = null;

  const r = store.recintos.find((room) => room.id === id);
  if (!r) {
    pointerSessionId.value = null;
    store.layoutInteractionActive = false;
    return;
  }

  editor.selectedRecintoId.value = id;
  ghostRoom.value = JSON.parse(JSON.stringify(r));
  cacheValidDragCoords(r);
  isGhostFading.value = false;

  dragPreview.value = {
    id,
    x: Number(r.coords?.x) || 0,
    z: Number(r.coords?.z) || 0,
  };

  const world = toWorld(e.clientX, e.clientY);
  editor.beginDrag(id, world);
  applyLiveDragCoords(id, Number(r.coords?.x) || 0, Number(r.coords?.z) || 0);
};

const startResize = (e, id) => {
  if (store.layoutLocked) return;
  e.preventDefault();
  e.stopPropagation();
  pointerSessionId.value = e.pointerId;
  capturePointer(e);
  frozenBounds.value = { ...liveBounds.value };
  store.layoutInteractionActive = true;
  dragPreview.value = null;

  const r = store.recintos.find((room) => room.id === id);
  if (r) {
    ghostRoom.value = JSON.parse(JSON.stringify(r));
    dragPreview.value = {
      id: r.id,
      x: Number(r.coords?.x) || 0,
      z: Number(r.coords?.z) || 0,
      w: Number(r.dimensions?.w) || MIN_ROOM_DIM,
      l: Number(r.dimensions?.l) || MIN_ROOM_DIM,
    };
  }
  isGhostFading.value = false;

  const w = toWorld(e.clientX, e.clientY);
  editor.beginResize(id);
  const dims = editor.computeResizeDimensions(w, budgetRect.value);
  if (dims && r) {
    dragPreview.value = {
      id: r.id,
      x: Number(r.coords?.x) || 0,
      z: Number(r.coords?.z) || 0,
      w: dims.w,
      l: dims.l,
    };
  }
};

let savedScrollY = 0;

const toggleFullScreen = async () => {
  if (!document.fullscreenElement) {
    savedScrollY = window.scrollY;
    if (rootRef.value?.requestFullscreen) {
      await rootRef.value.requestFullscreen().catch(err => logger.error(err));
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

  scheduleViewportAspectSync();
  [0, 50, 150, 320].forEach((ms) => {
    setTimeout(scheduleViewportAspectSync, ms);
  });

  if (!isEntering) {
    setTimeout(() => {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      scheduleViewportAspectSync();
    }, 10);
  }
};

const interactionCapture = { capture: true };

watch(isFullScreen, () => scheduleViewportAspectSync());

// ── Room helpers ───────────────────────────────────────────────────────────────
const roomFill = (recinto) => resolveRecintoFill2d(recinto);
const roomEdge = (recinto) => resolveRecintoStroke2d(recinto);
const isRecintoColorActive = (recinto, color) => {
  if (!recinto) return false;
  const current = recinto.color2d
    ? String(recinto.color2d).toLowerCase()
    : resolveRecintoFill2d({ ...recinto, color2d: null }).toLowerCase();
  return current === String(color).toLowerCase();
};
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
  get: () => (selectedRoom.value ? Number(selectedRoom.value.dimensions.w.toFixed(2)) : 0),
  set: (val) => commitSelectedRoomWidth(val),
});

const selectedRoomLength = computed({
  get: () => (selectedRoom.value ? Number(selectedRoom.value.dimensions.l.toFixed(2)) : 0),
  set: (val) => commitSelectedRoomLength(val),
});

const selectedRoomMaxWidth = computed(() =>
  selectedRoom.value
    ? maxRoomWidthFromPosition(selectedRoom.value)
    : budgetRect.value.w,
);

const selectedRoomMaxLength = computed(() =>
  selectedRoom.value
    ? maxRoomLengthFromPosition(selectedRoom.value)
    : budgetRect.value.h,
);

const widthSliderProgress = computed(() => {
  const max = selectedRoomMaxWidth.value;
  const span = max - MIN_ROOM_DIM;
  if (span <= 0) return 0;
  return ((selectedRoomWidth.value - MIN_ROOM_DIM) / span) * 100;
});

const lengthSliderProgress = computed(() => {
  const max = selectedRoomMaxLength.value;
  const span = max - MIN_ROOM_DIM;
  if (span <= 0) return 0;
  return ((selectedRoomLength.value - MIN_ROOM_DIM) / span) * 100;
});

/** Vista previa local al arrastrar altura; evita tocar store/3D en cada tick. */
const inspectorWallHeightPreview = ref(null);

const projectWallHeight = computed(() =>
  clampWallHeight(
    inspectorWallHeightPreview.value ?? props.defaultRoomHeight,
    DEFAULT_WALL_HEIGHT,
  ),
);

const wallHeightSliderProgress = computed(() => {
  const span = MAX_WALL_HEIGHT - MIN_ROOM_HEIGHT;
  if (span <= 0) return 0;
  return ((projectWallHeight.value - MIN_ROOM_HEIGHT) / span) * 100;
});

let inspectorSliderFrame = null;
let inspectorSliderSession = false;
let inspectorHeightChanged = false;
const inspectorSliderDirty = { width: null, length: null };

const beginInspectorSliderSession = () => {
  if (inspectorSliderSession) return;
  inspectorSliderSession = true;
  store.layoutInteractionActive = true;
};

const flushInspectorSliderFrame = () => {
  inspectorSliderFrame = null;

  if (inspectorSliderDirty.width != null) {
    commitSelectedRoomWidth(inspectorSliderDirty.width, {
      saveHistory: false,
      normalize: false,
    });
    inspectorSliderDirty.width = null;
  }

  if (inspectorSliderDirty.length != null) {
    commitSelectedRoomLength(inspectorSliderDirty.length, {
      saveHistory: false,
      normalize: false,
    });
    inspectorSliderDirty.length = null;
  }
};

const queueInspectorSliderUpdate = (field, value) => {
  inspectorSliderDirty[field] = value;
  if (inspectorSliderFrame) return;
  inspectorSliderFrame = requestAnimationFrame(flushInspectorSliderFrame);
};

const endInspectorSliderSession = () => {
  if (!inspectorSliderSession) return;

  if (inspectorSliderFrame) {
    cancelAnimationFrame(inspectorSliderFrame);
    inspectorSliderFrame = null;
    flushInspectorSliderFrame();
  }

  const room = selectedRoom.value;
  if (room) normalizeRoomInsideTerrain(room);

  if (inspectorHeightChanged) {
    const h = inspectorWallHeightPreview.value
      ?? clampWallHeight(props.defaultRoomHeight, DEFAULT_WALL_HEIGHT);
    applyProjectWallHeight(h, { saveHistory: false, persistPrefs: false });
    saveProductPreferences();
    inspectorWallHeightPreview.value = null;
    inspectorHeightChanged = false;
  }

  store.saveHistoryState();
  inspectorSliderSession = false;
  store.layoutInteractionActive = false;
};

const applyProjectWallHeight = (
  rawValue,
  { saveHistory = true, persistPrefs = true } = {},
) => {
  const h = clampWallHeight(rawValue, DEFAULT_WALL_HEIGHT);

  productPreferences.value.defaultRoomHeight = h;
  productPreferences.value.useCustomRoomHeight = true;
  if (persistPrefs) saveProductPreferences();
  store.syncProjectWallHeight(h, { saveHistory });
  return h;
};

const handleProjectWallHeightSlider = (event) => {
  if (layoutLocked.value) return;
  inspectorHeightChanged = true;
  beginInspectorSliderSession();
  inspectorWallHeightPreview.value = clampWallHeight(
    event?.target?.value,
    DEFAULT_WALL_HEIGHT,
  );
};

const commitSelectedRoomWidth = (
  val,
  { saveHistory = true, normalize = true } = {},
) => {
  const room = selectedRoom.value;
  if (!room || layoutLocked.value) return selectedRoomWidth.value;

  const safeWidth = clampNumber(val, MIN_ROOM_DIM, maxRoomWidthFromPosition(room));
  store.updateRecinto(room.id, { w: Number(safeWidth.toFixed(3)) });
  if (normalize) {
    const updated = store.recintos.find((r) => r.id === room.id);
    if (updated) normalizeRoomInsideTerrain(updated);
  }
  if (saveHistory) store.saveHistoryState();
  return Number(safeWidth.toFixed(3));
};

const commitSelectedRoomLength = (
  val,
  { saveHistory = true, normalize = true } = {},
) => {
  const room = selectedRoom.value;
  if (!room || layoutLocked.value) return selectedRoomLength.value;

  const safeLength = clampNumber(val, MIN_ROOM_DIM, maxRoomLengthFromPosition(room));
  store.updateRecinto(room.id, { l: Number(safeLength.toFixed(3)) });
  if (normalize) {
    const updated = store.recintos.find((r) => r.id === room.id);
    if (updated) normalizeRoomInsideTerrain(updated);
  }
  if (saveHistory) store.saveHistoryState();
  return Number(safeLength.toFixed(3));
};

const handleSelectedRoomWidthSlider = (event) => {
  if (layoutLocked.value) return;
  beginInspectorSliderSession();
  queueInspectorSliderUpdate('width', event?.target?.value);
};

const handleSelectedRoomLengthSlider = (event) => {
  if (layoutLocked.value) return;
  beginInspectorSliderSession();
  queueInspectorSliderUpdate('length', event?.target?.value);
};

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

const handleSiecCancel = () => {
  if (showAddModal.value) showAddModal.value = false;
  if (corridorDraw.value) {
    corridorDraw.value = null;
    scheduleViewportAspectSync();
  }
};

let viewportResizeObserver = null;

const syncViewportAspect = () => {
  if (corridorDraw.value) return;
  const el = svgViewportRef.value;
  if (!el || !props.editorVisible) return;
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (width > 0 && height > 0) viewportAspect.value = width / height;
};

const scheduleViewportAspectSync = () => {
  nextTick(() => {
    syncViewportAspect();
    requestAnimationFrame(syncViewportAspect);
  });
};

watch(
  () => props.editorVisible,
  (visible) => {
    if (visible) scheduleViewportAspectSync();
  },
  { immediate: true },
);

watch(
  () => editor.selectedRecintoId.value,
  () => {
    scheduleViewportAspectSync();
    setTimeout(scheduleViewportAspectSync, 320);
  },
);

watch(
  () => `${props.terrenoAncho}:${props.terrenoLargo}`,
  () => scheduleViewportAspectSync(),
);

if (typeof ResizeObserver !== 'undefined') {
  viewportResizeObserver = new ResizeObserver(() => scheduleViewportAspectSync());
}

watch(
  svgViewportRef,
  (el) => {
    viewportResizeObserver?.disconnect();
    if (el) {
      viewportResizeObserver.observe(el);
      scheduleViewportAspectSync();
    }
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('siec:cancel', handleSiecCancel);
  window.addEventListener('resize', syncViewportAspect);
  scheduleViewportAspectSync();
  document.addEventListener('pointermove', onPointerMove, interactionCapture);
  document.addEventListener('pointerup', onPointerUp, interactionCapture);
  document.addEventListener('pointercancel', onPointerUp, interactionCapture);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  if (inspectorSliderFrame) cancelAnimationFrame(inspectorSliderFrame);
  inspectorSliderSession = false;
  inspectorSliderDirty.width = null;
  inspectorSliderDirty.length = null;
  inspectorWallHeightPreview.value = null;
  store.layoutInteractionActive = false;
  dragPreview.value = null;
  pointerSessionId.value = null;
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('siec:cancel', handleSiecCancel);
  window.removeEventListener('resize', syncViewportAspect);
  document.removeEventListener('pointermove', onPointerMove, interactionCapture);
  document.removeEventListener('pointerup', onPointerUp, interactionCapture);
  document.removeEventListener('pointercancel', onPointerUp, interactionCapture);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  viewportResizeObserver?.disconnect();
  viewportResizeObserver = null;
});

defineExpose({ openAddModal });
</script>

<template>
  <div
    ref="rootRef"
    class="editor2d-root relative flex w-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/35"
    :class="isFullScreen ? 'editor2d-root--fs h-screen min-h-0 rounded-none border-none p-0' : 'normal-mode'"
  >
    <!-- Header -->
    <header
      class="relative z-20 mb-4 flex shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-50/80 shadow-sm backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/60"
    >
      <div
        class="h-1 w-full shrink-0 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"
        aria-hidden="true"
      />

      <div class="flex flex-col gap-3 p-4">
        <!-- Fila superior: identidad + métricas | acciones rápidas -->
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-wrap items-center gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[22px]">
                  architecture
                </span>
              </div>

              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('spatialEditor') }}
                </p>

                <h3 class="mt-0.5 text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                  {{ t('editor2D') }}
                </h3>
              </div>
            </div>

            <div
              class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black tabular-nums shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <span
                class="h-2 w-2 rounded-full"
                :style="{ backgroundColor: descripcionEstado.color }"
              ></span>

              <span :style="{ color: descripcionEstado.color }">
                {{ t('freeM2', { area: freeArea.toFixed(1) }) }}
              </span>

              <span class="text-slate-300 dark:text-slate-700">·</span>

              <span class="text-slate-500 dark:text-slate-400">
                {{ t('areaUsage', { used: usedArea.toFixed(1), total: m2Totales }) }}
              </span>
            </div>
          </div>

          <div
            class="editor2d-icon-rail tour-editor-2d-actions inline-flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              class="editor2d-icon-action"
              :title="isFullScreen ? t('exitFullscreen') : t('fullscreen')"
              :aria-label="isFullScreen ? t('exitFullscreen') : t('fullscreen')"
              @click="toggleFullScreen"
            >
              <span class="material-symbols-outlined text-[20px]">
                {{ isFullScreen ? 'fullscreen_exit' : 'fullscreen' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Fila inferior: piso + herramientas -->
        <div class="tour-editor-2d-toolbar flex flex-wrap items-center gap-2">
          <div
            class="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              :disabled="store.currentFloor <= 1"
              @click="store.setFloor(store.currentFloor - 1)"
            >
              -
            </button>

            <span
              class="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              {{ t('floor') }} {{ store.currentFloor }}
            </span>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              :disabled="store.currentFloor >= MAX_FLOORS"
              @click="store.setFloor(store.currentFloor + 1)"
            >
              +
            </button>
          </div>

          <button
            type="button"
            class="tool-btn tool-btn-primary add-room-glow"
            :title="t('addRoomBtn')"
            @click="openAddModal"
          >
            <span class="material-symbols-outlined text-[20px]">add_home</span>
            {{ t('addRoomBtn') }}
          </button>

          <button
            type="button"
            class="tool-btn tool-btn-sm"
            :class="corridorMode ? 'tool-btn-teal-active' : 'tool-btn-neutral'"
            :title="corridorMode ? t('corridorsOn') : t('corridorsOff')"
            @click="corridorMode = !corridorMode; corridorDraw = null; scheduleViewportAspectSync()"
          >
            <span class="material-symbols-outlined text-[15px]">route</span>
            {{ t('corridors') }}
          </button>

          <button
            type="button"
            class="tool-btn tool-btn-sm tool-btn-neutral"
            :title="t('blueprintExportBtn')"
            @click="exportBlueprintPlan"
          >
            <span class="material-symbols-outlined text-[15px]">architecture</span>
            {{ t('blueprintExportBtn') }}
          </button>

          <button
            type="button"
            class="tool-btn tool-btn-sm"
            :class="layoutLocked ? 'tool-btn-danger' : 'tool-btn-neutral'"
            :title="layoutLocked ? t('unlockResize') : t('lockResize')"
            @click="store.toggleLayoutLock()"
          >
            <span class="material-symbols-outlined text-[15px]">
              {{ layoutLocked ? 'lock' : 'lock_open' }}
            </span>
            {{ layoutLocked ? t('resizeLocked') : t('resizeLock') }}
          </button>
        </div>

        <p
          v-if="store.currentFloor > 1"
          class="rounded-xl border px-3 py-2 text-[11px] leading-relaxed"
          :class="
            upperFloorNeedsSupport
              ? 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400'
          "
        >
          {{
            upperFloorNeedsSupport
              ? t('upperFloorSupportHintEmpty')
              : t('upperFloorSupportHint')
          }}
        </p>
      </div>
    </header>

    <!-- Canvas shell (aligned with Scene3D viewport) -->
    <div
      class="editor2d-canvas relative flex min-h-0 flex-row overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-inner dark:border-slate-800"
      :class="isFullScreen ? 'flex-1' : ''"
      style="perspective: 1000px;"
    >
      <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-slate-800/80">
        <div
          class="h-full rounded-r-full transition-all duration-300 ease-out"
          :style="{ width: `${freePct}%`, backgroundColor: descripcionEstado.color }"
        />
      </div>

      <div
        ref="svgViewportRef"
        class="editor2d-viewport relative min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-950"
      >
        <svg
          ref="svgRef"
          :viewBox="viewBox"
          width="100%"
          height="100%"
          class="block h-full w-full editor-svg editor-svg--viewport"
          :class="{ 'disable-rect-transitions': disableRectTransitions }"
          style="touch-action: none;"
          preserveAspectRatio="xMidYMid meet"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <defs>
            <!-- Grid menor: 0,25 m (mitad de 0,5 m) -->
            <pattern
              id="grid-minor"
              :width="patternMinorPx"
              :height="patternMinorPx"
              patternUnits="userSpaceOnUse"
              :patternTransform="`translate(${gridOffsetX} ${gridOffsetZ})`"
            >
              <path
                :d="`M ${patternMinorPx} 0 L 0 0 0 ${patternMinorPx}`"
                fill="none"
                :stroke="gridMinorStroke"
                stroke-width="0.5"
              />
            </pattern>

            <!-- Grid mayor: según preferencia (p. ej. 0.5m / 1m) -->
            <pattern
              id="grid-major"
              :width="patternMajorPx"
              :height="patternMajorPx"
              patternUnits="userSpaceOnUse"
              :patternTransform="`translate(${gridOffsetX} ${gridOffsetZ})`"
            >
              <rect :width="patternMajorPx" :height="patternMajorPx" fill="url(#grid-minor)" />
              <path
                :d="`M ${patternMajorPx} 0 L 0 0 0 ${patternMajorPx}`"
                fill="none"
                :stroke="gridMajorStroke"
                stroke-width="1"
              />
            </pattern>

            <filter id="room-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#020617" flood-opacity="0.22" />
            </filter>
          </defs>

          <g :transform="worldGroupTransform" :style="worldGroupStyle">
          <!-- Canvas base -->
          <rect
            x="0"
            y="0"
            :width="vbW"
            :height="vbH"
            :fill="canvasBaseFill"
            :class="corridorMode ? 'editor-hit-crosshair' : 'editor-hit-surface'"
            @pointerdown="corridorMode ? startCorridorDraw($event) : (editor.selectedRecintoId.value = null)"
          />

          <!-- Corridor draw hint (fuera del recuadro del terreno) -->
          <g v-if="corridorMode && !corridorDraw" style="pointer-events: none;">
            <rect
              :x="corridorDrawHintLayout.rectX"
              :y="corridorDrawHintLayout.rectY"
              :width="corridorDrawHintLayout.rectW"
              :height="corridorDrawHintLayout.rectH"
              rx="8"
              fill="rgba(13,148,136,0.88)"
            />
            <text
              :x="corridorDrawHintLayout.cx"
              :y="corridorDrawHintLayout.textY"
              fill="white"
              :font-size="corridorDrawHintLayout.fontSize"
              font-weight="800"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              ✦ Arrastra para dibujar un pasillo
            </text>
          </g>

          <!-- Budget boundary rectangle -->
          <rect
            :x="toSX(0)"
            :y="toSZ(0)"
            :width="budgetRect.w * PPM"
            :height="budgetRect.h * PPM"
            fill="rgba(249,115,22,0.045)"
            stroke="rgba(249,115,22,0.55)"
            stroke-width="1.8"
            stroke-dasharray="7 5"
            rx="5"
            style="pointer-events: none"
          />

          <text
            :x="toSX(0) + (terrainLabelStyle.compact ? 6 : 12)"
            :y="toSZ(0) + terrainLabelStyle.y"
            fill="rgba(249,115,22,0.78)"
            :font-size="terrainLabelStyle.fontSize"
            font-weight="800"
            class="uppercase pointer-events-none select-none"
            :style="{ letterSpacing: terrainLabelStyle.compact ? '0.06em' : '0.12em' }"
          >
            {{ terrainBoundsLabel }}
          </text>

          <text
            :x="toSX(budgetRect.w) - (terrainLabelStyle.compact ? 4 : 8)"
            :y="toSZ(0) + terrainLabelStyle.freeY"
            fill="rgba(249,115,22,0.68)"
            :font-size="terrainLabelStyle.freeFontSize"
            font-weight="700"
            text-anchor="end"
            style="pointer-events: none"
          >
            {{ terrainFreeAreaLabel }}
          </text>

          <!-- Ghost Trace -->
          <g
            v-if="ghostRoom"
            :class="[
              isGhostFading ? 'opacity-0' : 'opacity-80',
              prefersReducedMotion() ? '' : 'transition-opacity duration-1000 ease-out',
            ]"
          >
            <rect
              :x="toSX(ghostRoom.coords.x)"
              :y="toSZ(ghostRoom.coords.z)"
              :width="ghostRoom.dimensions.w * PPM"
              :height="ghostRoom.dimensions.l * PPM"
              fill="rgba(148,163,184,0.10)"
              stroke="rgba(148,163,184,0.88)"
              stroke-width="2"
              stroke-dasharray="5 4"
              rx="5"
              class="pointer-events-none"
            />
          </g>

          <!-- Corridor draw mode: preview en tiempo real -->
          <g v-if="corridorMode" style="pointer-events: none;">
            <g v-if="corridorDraw && corridorDraw.preview.w > 0 && corridorDraw.preview.l > 0">
              <!-- Sombra fill igual que un recinto de tipo pasillo -->
              <rect
                :x="toSX(corridorDraw.preview.x0)"
                :y="toSZ(corridorDraw.preview.z0)"
                :width="corridorDraw.preview.w * PPM"
                :height="corridorDraw.preview.l * PPM"
                fill="rgba(20,184,166,0.28)"
                stroke="rgba(20,184,166,0.95)"
                stroke-width="2"
                stroke-dasharray="8 4"
                rx="5"
              />
              <!-- Dimensiones en tiempo real -->
              <text
                :x="toSX(corridorDraw.preview.x0 + corridorDraw.preview.w / 2)"
                :y="toSZ(corridorDraw.preview.z0 + corridorDraw.preview.l / 2) - 8"
                fill="rgba(20,184,166,1)"
                font-size="11"
                font-weight="900"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ corridorDraw.preview.w.toFixed(2) }} × {{ corridorDraw.preview.l.toFixed(2) }} m
              </text>
              <text
                :x="toSX(corridorDraw.preview.x0 + corridorDraw.preview.w / 2)"
                :y="toSZ(corridorDraw.preview.z0 + corridorDraw.preview.l / 2) + 10"
                fill="rgba(20,184,166,0.72)"
                font-size="10"
                font-weight="700"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ (corridorDraw.preview.w * corridorDraw.preview.l).toFixed(1) }} m²
              </text>
            </g>
          </g>

          <!-- Rooms -->
          <g
            v-for="recinto in roomsForView"
            :key="recinto.id"
            :class="(recinto.piso || 1) !== store.currentFloor ? 'opacity-20 pointer-events-none' : ''"
          >
            <!-- Selection highlight ring -->
            <rect
              v-if="isSelected(recinto.id) && (recinto.piso || 1) === store.currentFloor"
              :x="toSX(recinto.coords.x) - 4"
              :y="toSZ(recinto.coords.z) - 4"
              :width="recinto.dimensions.w * PPM + 8"
              :height="recinto.dimensions.l * PPM + 8"
              fill="none"
              stroke="rgba(249,115,22,0.88)"
              stroke-width="2.5"
              stroke-dasharray="7 4"
              rx="7"
              style="pointer-events:none"
            />

            <!-- Animated glow -->
            <rect
              v-if="isSelected(recinto.id) && !isActive(recinto.id)"
              :x="toSX(recinto.coords.x) - 6"
              :y="toSZ(recinto.coords.z) - 6"
              :width="recinto.dimensions.w * PPM + 12"
              :height="recinto.dimensions.l * PPM + 12"
              fill="rgba(249,115,22,0.10)"
              stroke="rgba(249,115,22,0.28)"
              stroke-width="1"
              rx="9"
              style="pointer-events:none"
            />

            <!-- Room body -->
            <rect
              :x="toSX(recinto.coords.x)"
              :y="toSZ(recinto.coords.z)"
              :width="recinto.dimensions.w * PPM"
              :height="recinto.dimensions.l * PPM"
              :fill="roomFill(recinto)"
              :fill-opacity="isActive(recinto.id) ? 0.96 : isSelected(recinto.id) ? 0.88 : 0.76"
              :stroke="isActive(recinto.id) ? '#ffffff' : isSelected(recinto.id) ? '#fb923c' : roomEdge(recinto)"
              :stroke-width="isActive(recinto.id) ? 2.6 : isSelected(recinto.id) ? 2.2 : 1.5"
              rx="5"
              :filter="isActive(recinto.id) ? 'none' : 'url(#room-shadow)'"
              class="editor-hit-pointer"
              :class="{ 'editor-hit-grabbing': isActive(recinto.id) && editor.activeMode.value === 'drag' }"
              @pointerdown="(e) => startDrag(e, recinto.id)"
            />

            <g v-if="showLabels">
            <!-- Room label -->
            <text
              :x="toSX(recinto.coords.x) + (recinto.dimensions.w * PPM) / 2"
              :y="toSZ(recinto.coords.z) + (recinto.dimensions.l * PPM) / 2 - labelFontSize(recinto) * 0.65"
              fill="#fff"
              :font-size="labelFontSize(recinto)"
              font-weight="850"
              text-anchor="middle"
              dominant-baseline="middle"
              style="pointer-events: none"
            >
              {{ recinto.nombre || (recinto.tipo === 'habitacion' ? 'Hab.' : recinto.tipo === 'banio' ? 'Baño' : 'Común') }}
            </text>

            <text
              :x="toSX(recinto.coords.x) + (recinto.dimensions.w * PPM) / 2"
              :y="toSZ(recinto.coords.z) + (recinto.dimensions.l * PPM) / 2 + areaFontSize(recinto) * 0.85"
              fill="rgba(255,255,255,0.72)"
              :font-size="areaFontSize(recinto)"
              font-weight="650"
              text-anchor="middle"
              dominant-baseline="middle"
              style="pointer-events: none"
            >
              {{ (recinto.dimensions.w * recinto.dimensions.l).toFixed(1) }}m²
            </text>
            </g>

            <!-- Budget toggle -->
            <g
              v-if="(recinto.piso || 1) === store.currentFloor"
              class="editor-hit-pointer"
              @pointerdown.stop.prevent="(e) => onToggleBudget(e, recinto.id)"
            >
              <!-- Invisible hit area 40×40 for easy tapping -->
              <rect
                :x="toSX(recinto.coords.x + recinto.dimensions.w) - 36"
                :y="toSZ(recinto.coords.z) - 4"
                width="40"
                height="40"
                fill="transparent"
              />
              <circle
                :cx="toSX(recinto.coords.x + recinto.dimensions.w) - 16"
                :cy="toSZ(recinto.coords.z) + 16"
                r="16"
                :fill="isBudgeted(recinto.id) ? '#22c55e' : 'rgba(15,23,42,0.80)'"
                :stroke="isBudgeted(recinto.id) ? '#86efac' : 'rgba(255,255,255,0.50)'"
                stroke-width="2"
              />
              <text
                :x="toSX(recinto.coords.x + recinto.dimensions.w) - 16"
                :y="toSZ(recinto.coords.z) + 16"
                fill="white"
                font-size="13"
                font-weight="900"
                text-anchor="middle"
                dominant-baseline="central"
                style="pointer-events: none"
              >
                $
              </text>
            </g>

            <!-- Resize hit area -->
            <rect
              v-if="!layoutLocked && (recinto.piso || 1) === store.currentFloor"
              :x="toSX(recinto.coords.x + recinto.dimensions.w) - 18"
              :y="toSZ(recinto.coords.z + recinto.dimensions.l) - 18"
              width="30"
              height="30"
              fill="transparent"
              class="editor-hit-resize"
              @pointerdown="(e) => startResize(e, recinto.id)"
            />

            <!-- Resize handle -->
            <path
              v-if="(recinto.piso || 1) === store.currentFloor"
              :d="`
                M ${toSX(recinto.coords.x + recinto.dimensions.w)}
                  ${toSZ(recinto.coords.z + recinto.dimensions.l) - 15}
                L ${toSX(recinto.coords.x + recinto.dimensions.w)}
                  ${toSZ(recinto.coords.z + recinto.dimensions.l)}
                L ${toSX(recinto.coords.x + recinto.dimensions.w) - 15}
                  ${toSZ(recinto.coords.z + recinto.dimensions.l)} Z`"
              :fill="layoutLocked ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.86)'"
              style="pointer-events: none"
            />

            <!-- Dimension lines -->
            <g v-if="isResizing(recinto.id)" style="pointer-events: none">
              <line
                :x1="dimLines(recinto).width.x0"
                :y1="dimLines(recinto).width.lineY"
                :x2="dimLines(recinto).width.x1"
                :y2="dimLines(recinto).width.lineY"
                stroke="#fb923c"
                stroke-width="1.7"
              />
              <line
                :x1="dimLines(recinto).width.x0"
                :y1="dimLines(recinto).width.lineY - TICK_LEN"
                :x2="dimLines(recinto).width.x0"
                :y2="dimLines(recinto).width.lineY + TICK_LEN"
                stroke="#fb923c"
                stroke-width="1.7"
              />
              <line
                :x1="dimLines(recinto).width.x1"
                :y1="dimLines(recinto).width.lineY - TICK_LEN"
                :x2="dimLines(recinto).width.x1"
                :y2="dimLines(recinto).width.lineY + TICK_LEN"
                stroke="#fb923c"
                stroke-width="1.7"
              />
              <line
                :x1="dimLines(recinto).width.x0"
                :y1="toSZ(recinto.coords.z + recinto.dimensions.l)"
                :x2="dimLines(recinto).width.x0"
                :y2="dimLines(recinto).width.lineY"
                stroke="#fb923c"
                stroke-width="0.8"
                stroke-dasharray="3 3"
              />
              <line
                :x1="dimLines(recinto).width.x1"
                :y1="toSZ(recinto.coords.z + recinto.dimensions.l)"
                :x2="dimLines(recinto).width.x1"
                :y2="dimLines(recinto).width.lineY"
                stroke="#fb923c"
                stroke-width="0.8"
                stroke-dasharray="3 3"
              />
              <rect
                :x="dimLines(recinto).width.textX - 25"
                :y="dimLines(recinto).width.textY - 10"
                width="50"
                height="17"
                rx="5"
                fill="rgba(15,23,42,0.92)"
              />
              <text
                :x="dimLines(recinto).width.textX"
                :y="dimLines(recinto).width.textY + 1"
                fill="#fdba74"
                font-size="11"
                font-weight="850"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ dimLines(recinto).width.label }}
              </text>

              <line
                :x1="dimLines(recinto).height.lineX"
                :y1="dimLines(recinto).height.z0"
                :x2="dimLines(recinto).height.lineX"
                :y2="dimLines(recinto).height.z1"
                stroke="#fb923c"
                stroke-width="1.7"
              />
              <line
                :x1="dimLines(recinto).height.lineX - TICK_LEN"
                :y1="dimLines(recinto).height.z0"
                :x2="dimLines(recinto).height.lineX + TICK_LEN"
                :y2="dimLines(recinto).height.z0"
                stroke="#fb923c"
                stroke-width="1.7"
              />
              <line
                :x1="dimLines(recinto).height.lineX - TICK_LEN"
                :y1="dimLines(recinto).height.z1"
                :x2="dimLines(recinto).height.lineX + TICK_LEN"
                :y2="dimLines(recinto).height.z1"
                stroke="#fb923c"
                stroke-width="1.7"
              />
              <line
                :x1="toSX(recinto.coords.x + recinto.dimensions.w)"
                :y1="dimLines(recinto).height.z0"
                :x2="dimLines(recinto).height.lineX"
                :y2="dimLines(recinto).height.z0"
                stroke="#fb923c"
                stroke-width="0.8"
                stroke-dasharray="3 3"
              />
              <line
                :x1="toSX(recinto.coords.x + recinto.dimensions.w)"
                :y1="dimLines(recinto).height.z1"
                :x2="dimLines(recinto).height.lineX"
                :y2="dimLines(recinto).height.z1"
                stroke="#fb923c"
                stroke-width="0.8"
                stroke-dasharray="3 3"
              />
              <g :transform="`translate(${dimLines(recinto).height.textX + 10}, ${dimLines(recinto).height.textZ})`">
                <rect
                  x="-25"
                  y="-8"
                  width="50"
                  height="17"
                  rx="5"
                  fill="rgba(15,23,42,0.92)"
                  transform="rotate(-90)"
                />
                <text
                  fill="#fdba74"
                  font-size="11"
                  font-weight="850"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  transform="rotate(-90)"
                >
                  {{ dimLines(recinto).height.label }}
                </text>
              </g>
            </g>
          </g>
          </g>
        </svg>
      </div>

      <!-- Manual Dimensions Side Panel -->
      <transition name="slide-right">
        <aside
          v-if="editor.selectedRecintoId.value"
          class="w-72 shrink-0 overflow-y-auto border-l border-slate-200/80 bg-white/90 p-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90"
        >
          <div class="mb-4 flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[19px]">edit</span>
              </div>

              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {{ t('inspectorEyebrow') }}
                </p>
                <h4 class="mt-0.5 text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                  {{ t('inspectorRecintoTitle') }}
                </h4>
              </div>
            </div>

            <button
              type="button"
              class="group flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              @click="editor.selectedRecintoId.value = null"
            >
              <span class="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:rotate-90">
                close
              </span>
            </button>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <label class="editor-label">{{ t('nameLabel') }}</label>
              <input
                v-model="selectedRoomName"
                type="text"
                class="editor-input text-left"
                :placeholder="t('roomNamePlaceholder')"
              />
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <label class="editor-label mb-0">{{ t('widthM') }}</label>
                  <span class="editor-slider-value">{{ selectedRoomWidth.toFixed(1) }} m</span>
                </div>
                <input
                  type="range"
                  class="editor-range w-full"
                  :min="MIN_ROOM_DIM"
                  :max="selectedRoomMaxWidth"
                  :step="ROOM_DIM_STEP"
                  :value="selectedRoomWidth"
                  :disabled="layoutLocked"
                  :style="{ '--range-progress': `${widthSliderProgress}%` }"
                  @input="handleSelectedRoomWidthSlider"
                  @change="endInspectorSliderSession"
                  @pointerup="endInspectorSliderSession"
                />
                <div class="editor-range-ticks">
                  <span>{{ MIN_ROOM_DIM }} m</span>
                  <span>{{ selectedRoomMaxWidth.toFixed(1) }} m</span>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <label class="editor-label mb-0">{{ t('lengthM') }}</label>
                  <span class="editor-slider-value">{{ selectedRoomLength.toFixed(1) }} m</span>
                </div>
                <input
                  type="range"
                  class="editor-range w-full"
                  :min="MIN_ROOM_DIM"
                  :max="selectedRoomMaxLength"
                  :step="ROOM_DIM_STEP"
                  :value="selectedRoomLength"
                  :disabled="layoutLocked"
                  :style="{ '--range-progress': `${lengthSliderProgress}%` }"
                  @input="handleSelectedRoomLengthSlider"
                  @change="endInspectorSliderSession"
                  @pointerup="endInspectorSliderSession"
                />
                <div class="editor-range-ticks">
                  <span>{{ MIN_ROOM_DIM }} m</span>
                  <span>{{ selectedRoomMaxLength.toFixed(1) }} m</span>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <label class="editor-label mb-0">{{ t('projectWallHeightLabel') }}</label>
                  <span class="editor-slider-value">{{ projectWallHeight.toFixed(1) }} m</span>
                </div>
                <input
                  type="range"
                  class="editor-range w-full"
                  :min="MIN_ROOM_HEIGHT"
                  :max="MAX_WALL_HEIGHT"
                  :step="WALL_HEIGHT_STEP"
                  :value="projectWallHeight"
                  :style="{ '--range-progress': `${wallHeightSliderProgress}%` }"
                  @input="handleProjectWallHeightSlider"
                  @change="endInspectorSliderSession"
                  @pointerup="endInspectorSliderSession"
                />
                <div class="editor-range-ticks">
                  <span>{{ MIN_ROOM_HEIGHT }} m</span>
                  <span>{{ MAX_WALL_HEIGHT }} m</span>
                </div>
                <p class="text-[10px] leading-relaxed text-slate-500">
                  {{ t('projectWallHeightHint', { min: MIN_ROOM_HEIGHT, max: MAX_WALL_HEIGHT }) }}
                </p>
              </div>
            </div>

            <div v-if="selectedRoom" class="space-y-2">
              <label class="editor-label">{{ t('recintoColor2dLabel') }}</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="color in RECINTO_2D_COLOR_PRESETS"
                  :key="color"
                  type="button"
                  class="h-7 w-7 rounded-lg border-2 transition-transform hover:scale-105"
                  :class="
                    isRecintoColorActive(selectedRoom, color)
                      ? 'border-orange-400 ring-2 ring-orange-300/50'
                      : 'border-slate-200 dark:border-slate-700'
                  "
                  :style="{ backgroundColor: color }"
                  :title="color"
                  @click.stop="store.setRecintoColor2d(selectedRoom.id, color)"
                />
                <button
                  type="button"
                  class="rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:border-slate-700"
                  @click.stop="store.setRecintoColor2d(selectedRoom.id, null)"
                >
                  {{ t('recintoColor2dDefault') }}
                </button>
              </div>
              <p class="text-[10px] leading-relaxed text-slate-500">
                {{ t('recintoColor2dHint') }}
              </p>
            </div>

            <div v-if="selectedRoom" class="space-y-2">
              <label class="editor-label">{{ t('recintoMaterialLabel') }}</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="mat in MATERIAL_OPTIONS.filter((m) => canUseMaterial(m.id))"
                  :key="mat.id"
                  type="button"
                  class="rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-tight transition-all"
                  :class="
                    resolveRecintoMaterial(selectedRoom, props.materialEstructuralId) === mat.id
                      ? 'border-orange-400 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  "
                  @click="store.setRecintoMaterial(selectedRoom.id, mat.id)"
                >
                  {{ mat.label }}
                </button>
              </div>
              <p class="text-[10px] text-slate-500">
                {{ materialLabel(resolveRecintoMaterial(selectedRoom, props.materialEstructuralId)) }}
              </p>
            </div>

            <div
              v-if="layoutLocked"
              class="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-100"
            >
              {{ t('resizeLockedHint') }}
            </div>
            <p
              v-else
              class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400"
            >
              {{ t('resizeUnlockedHint') }}
            </p>
          </div>
        </aside>
      </transition>
    </div>

    <!-- Add Recinto Modal (Teleport evita recorte y solapamiento con el canvas) -->
    <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md dark:bg-black/60"
        @click.self="showAddModal = false"
      >
        <section
          class="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
        >
          <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

          <header
            class="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[23px]">add_home</span>
              </div>

              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {{ t('addRoomModalEyebrow') }}
                </p>
                <h4 class="mt-0.5 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                  {{ t('addRoomTitle') }}
                </h4>
                <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {{ t('addRoomModalDesc') }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="group flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              @click="showAddModal = false"
            >
              <span class="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:rotate-90">
                close
              </span>
            </button>
          </header>

          <div class="space-y-5 px-5 py-5">
            <div class="space-y-2">
              <label class="editor-label">{{ t('nameLabel') }}</label>
              <input
                v-model="addForm.nombre"
                type="text"
                :placeholder="t('roomNamePlaceholder')"
                class="add-room-input"
                @keyup.enter="confirmAdd"
              />
            </div>

            <div class="space-y-3">
              <label class="editor-label">{{ t('dimensionsLabel') }}</label>

              <div class="grid grid-cols-3 gap-2">
                <div class="add-room-dim-card">
                  <span class="material-symbols-outlined text-[16px] text-orange-500 dark:text-orange-300">
                    width
                  </span>
                  <label>{{ t('widthShort') }}</label>
                  <input v-model.number="addForm.w" type="number" step="0.1" min="0.5" :max="budgetRect.w" />
                  <span>m</span>
                </div>

                <div class="add-room-dim-card">
                  <span class="material-symbols-outlined text-[16px] text-orange-500 dark:text-orange-300">
                    height
                  </span>
                  <label>{{ t('lengthShort') }}</label>
                  <input v-model.number="addForm.l" type="number" step="0.1" min="0.5" :max="budgetRect.h" />
                  <span>m</span>
                </div>

                <div class="add-room-dim-card">
                  <span class="material-symbols-outlined text-[16px] text-orange-500 dark:text-orange-300">
                    vertical_align_top
                  </span>
                  <label>{{ t('heightShort') }}</label>
                  <span class="font-mono text-sm font-bold text-orange-600 dark:text-orange-300">
                    {{ projectWallHeight.toFixed(2) }}
                  </span>
                  <span>m</span>
                </div>
              </div>

              <p class="add-room-area-pill">
                {{ t('roomAreaLabel', { area: (addForm.w * addForm.l).toFixed(2) }) }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="editor-label">{{ t('recintoColor2dLabel') }}</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="color in RECINTO_2D_COLOR_PRESETS"
                  :key="'add-' + color"
                  type="button"
                  class="h-7 w-7 rounded-lg border-2 transition-transform hover:scale-105"
                  :class="
                    (addForm.color2d || '').toLowerCase() === color.toLowerCase()
                      ? 'border-orange-400 ring-2 ring-orange-300/50'
                      : 'border-slate-200 dark:border-slate-700'
                  "
                  :style="{ backgroundColor: color }"
                  @click.stop="addForm.color2d = color"
                />
              </div>
              <p class="text-[10px] leading-relaxed text-slate-500">
                {{ t('recintoColor2dHint') }}
              </p>
            </div>
          </div>

          <footer
            class="flex flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:justify-end"
          >
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              @click="showAddModal = false"
            >
              {{ t('cancel') }}
            </button>

            <button
              type="button"
              class="add-room-primary-btn"
              @click="confirmAdd"
            >
              <span class="material-symbols-outlined text-[17px]">add</span>
              {{ t('createRoomBtn') }}
            </button>
          </footer>
        </section>
      </div>
    </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.editor2d-root.normal-mode {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.editor2d-root.normal-mode .editor2d-canvas {
  width: 100%;
  height: 420px;
  flex: 0 0 auto;
}

.editor2d-root.editor2d-root--fs,
.editor2d-root:fullscreen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
}

.editor2d-root.editor2d-root--fs .editor2d-canvas,
.editor2d-root:fullscreen .editor2d-canvas {
  flex: 1 1 auto;
  width: 100%;
  height: auto;
  min-height: 0;
}

.editor2d-root.editor2d-root--fs header,
.editor2d-root:fullscreen header {
  flex-shrink: 0;
}

.editor2d-viewport {
  height: 100%;
  min-height: 0;
}

.editor-svg--viewport {
  background:
    radial-gradient(circle at 18% 12%, rgba(249, 115, 22, 0.09), transparent 34%),
    transparent;
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
}

.editor2d-viewport {
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
}

.editor2d-canvas {
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
}

.editor2d-root header {
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
}

.editor2d-root header .tool-btn,
.editor2d-root header .icon-action,
.editor2d-root header button:not(:disabled) {
  cursor: pointer;
}

.editor-svg--viewport text,
.editor-svg--viewport tspan {
  cursor: default;
  pointer-events: none;
}

.editor-svg--viewport .editor-hit-surface {
  cursor: default;
}

.editor-svg--viewport .editor-hit-pointer {
  cursor: pointer;
}

.editor-svg--viewport .editor-hit-grabbing {
  cursor: grabbing;
}

.editor-svg--viewport .editor-hit-resize {
  cursor: nwse-resize;
}

.editor-svg--viewport .editor-hit-crosshair {
  cursor: crosshair;
}

svg rect.editor-hit-pointer:hover {
  filter: brightness(1.12);
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 1rem;
  border: 1px solid;
  padding: 0.55rem 0.8rem;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.tool-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.tool-btn:active {
  transform: scale(0.98);
}

.tool-btn-primary {
  border-color: rgb(254 215 170);
  background: rgb(255 247 237);
  color: rgb(194 65 12);
}

.editor2d-icon-action {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  color: rgb(71 85 105);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.editor2d-icon-action:hover {
  transform: translateY(-1px);
  border-color: rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.editor2d-icon-action:active {
  transform: scale(0.96);
}

.dark .editor2d-icon-action {
  color: rgb(148 163 184);
}

.dark .editor2d-icon-action:hover {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.add-room-glow {
  animation: addRoomPulse 2s ease-in-out infinite;
}

@keyframes addRoomPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.3);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
  }
}

.dark .tool-btn-primary {
  border-color: rgba(154, 52, 18, 0.7);
  background: rgba(67, 20, 7, 0.32);
  color: rgb(253 186 116);
}

.tool-btn-add-recinto {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 1.15rem;
  border: 1px solid rgb(251 146 60);
  padding: 0.7rem 1.15rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: linear-gradient(135deg, rgb(255 247 237), rgb(255 255 255));
  color: rgb(194 65 12);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 8px 24px rgba(249, 115, 22, 0.18);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.tool-btn-add-recinto:hover {
  transform: translateY(-2px);
  border-color: rgb(249 115 22);
  box-shadow:
    0 4px 12px rgba(15, 23, 42, 0.08),
    0 12px 28px rgba(249, 115, 22, 0.28);
}

.dark .tool-btn-add-recinto {
  border-color: rgba(251, 146, 60, 0.65);
  background: linear-gradient(135deg, rgba(67, 20, 7, 0.55), rgba(15, 23, 42, 0.9));
  color: rgb(253 186 116);
}

.tool-btn-sm {
  padding: 0.45rem 0.65rem;
  font-size: 0.62rem;
}

.tool-btn-neutral {
  border-color: rgb(226 232 240);
  background: white;
  color: rgb(71 85 105);
}

.dark .tool-btn-neutral {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.tool-btn-success {
  border-color: rgb(167 243 208);
  background: rgb(236 253 245);
  color: rgb(4 120 87);
}

.dark .tool-btn-success {
  border-color: rgba(6, 78, 59, 0.75);
  background: rgba(6, 78, 59, 0.25);
  color: rgb(110 231 183);
}

.tool-btn-danger {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(220 38 38);
}

.dark .tool-btn-danger {
  border-color: rgba(127, 29, 29, 0.75);
  background: rgba(127, 29, 29, 0.25);
  color: rgb(252 165 165);
}

/* Corridor draw-mode button active state */
.tool-btn-teal-active {
  border-color: rgb(153 246 228);
  background: rgb(240 253 250);
  color: rgb(15 118 110);
}

.dark .tool-btn-teal-active {
  border-color: rgba(20, 184, 166, 0.5);
  background: rgba(13, 148, 136, 0.2);
  color: rgb(94 234 212);
}

/* Inspector inputs */
.editor-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .editor-label {
  color: rgb(148 163 184);
}

.editor-input {
  height: 2.75rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding: 0 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(15 23 42);
  outline: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.editor-input:focus {
  border-color: rgb(251 146 60);
  background: white;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.editor-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dark .editor-input {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
  color: rgb(241 245 249);
}

.dark .editor-input:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

/* Add modal dimension cards */
.dim-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding: 0.75rem;
}

.dark .dim-card {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
}

.dim-card label {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .dim-card label {
  color: rgb(148 163 184);
}

.dim-card input {
  width: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
  outline: none;
}

.dark .dim-card input {
  color: rgb(241 245 249);
}

.dim-card span:last-child {
  text-align: center;
  font-size: 0.65rem;
  font-weight: 900;
  color: rgb(148 163 184);
}

/* Modal transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from section,
.modal-fade-leave-to section {
  transform: translateY(10px) scale(0.98);
}

/* Slide right transition */
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    width 0.2s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  width: 0;
  opacity: 0;
  transform: translateX(20px);
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

/* Add room modal — brighter premium controls */
.add-room-input {
  height: 2.75rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(248, 250, 252, 0.92);
  padding: 0 0.95rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(15 23 42);
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.add-room-input::placeholder {
  color: rgb(148 163 184);
}

.add-room-input:focus {
  border-color: rgb(251 146 60);
  background: #ffffff;
  box-shadow:
    0 0 0 4px rgba(249, 115, 22, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.dark .add-room-input {
  border-color: rgba(148, 163, 184, 0.26);
  background: rgba(30, 41, 59, 0.86);
  color: rgb(248 250 252);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.18);
}

.dark .add-room-input:focus {
  border-color: rgb(251 146 60);
  background: rgba(30, 41, 59, 0.96);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.16);
}

.add-room-dim-card {
  display: flex;
  min-height: 7.25rem;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.35rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
  padding: 0.75rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 8px 20px rgba(15, 23, 42, 0.06);
}

.dark .add-room-dim-card {
  border-color: rgba(148, 163, 184, 0.22);
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 10px 24px rgba(0, 0, 0, 0.2);
}

.add-room-dim-card label {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .add-room-dim-card label {
  color: rgb(203 213 225);
}

.add-room-dim-card input {
  width: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.05rem;
  font-weight: 900;
  color: rgb(15 23 42);
  outline: none;
}

.dark .add-room-dim-card input {
  color: rgb(248 250 252);
}

.add-room-dim-card span:last-child {
  text-align: center;
  font-size: 0.65rem;
  font-weight: 900;
  color: rgb(100 116 139);
}

.dark .add-room-dim-card span:last-child {
  color: rgb(203 213 225);
}

.add-room-area-pill {
  border-radius: 1rem;
  border: 1px solid rgba(251, 146, 60, 0.65);
  background: rgba(249, 115, 22, 0.12);
  padding: 0.55rem 0.85rem;
  text-align: right;
  color: rgb(194 65 12);
  font-size: 0.75rem;
  font-weight: 900;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.dark .add-room-area-pill {
  border-color: rgba(251, 146, 60, 0.58);
  background: rgba(249, 115, 22, 0.2);
  color: rgb(253 186 116);
}

.add-room-primary-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(251, 146, 60, 0.7);
  background: linear-gradient(135deg, #fb923c, #f97316);
  padding: 0.625rem 1rem;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  box-shadow:
    0 14px 32px rgba(249, 115, 22, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  transition:
    transform 0.18s ease,
    filter 0.18s ease,
    box-shadow 0.18s ease;
}

.add-room-primary-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow:
    0 18px 40px rgba(249, 115, 22, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.add-room-primary-btn:active {
  transform: scale(0.98);
}

.editor-slider-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgb(234 88 12);
}

.dark .editor-slider-value {
  color: rgb(251 146 60);
}

.editor-range-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgb(148 163 184);
}

.dark .editor-range-ticks {
  color: rgb(100 116 139);
}

.editor-range:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.editor-range:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.editor-range {
  -webkit-appearance: none;
  appearance: none;
  height: 0.45rem;
  border-radius: 9999px;
  background: linear-gradient(
    to right,
    rgb(249 115 22) 0%,
    rgb(249 115 22) var(--range-progress, 0%),
    rgb(226 232 240) var(--range-progress, 0%),
    rgb(226 232 240) 100%
  );
}

.dark .editor-range {
  background: linear-gradient(
    to right,
    rgb(249 115 22) 0%,
    rgb(249 115 22) var(--range-progress, 0%),
    rgb(51 65 85) var(--range-progress, 0%),
    rgb(51 65 85) 100%
  );
}

.editor-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 1.1rem;
  width: 1.1rem;
  border-radius: 9999px;
  border: 2px solid rgb(255 255 255);
  background: rgb(249 115 22);
  box-shadow: 0 2px 8px rgb(249 115 22 / 0.35);
  cursor: pointer;
}

.editor-range::-moz-range-thumb {
  height: 1.1rem;
  width: 1.1rem;
  border-radius: 9999px;
  border: 2px solid rgb(255 255 255);
  background: rgb(249 115 22);
  box-shadow: 0 2px 8px rgb(249 115 22 / 0.35);
  cursor: pointer;
}
</style>