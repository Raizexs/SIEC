import { ref, computed } from "vue";
import { useRecintosStore } from "../stores/recintos";

// Material costs in Chilean Pesos (CLP) per m² - Updated November 2024
export const MATERIAL_COSTS = {
  1: 850, // Wood Frame
  2: 1100, // Steel Frame
  3: 950, // Masonry
  4: 1200, // Concrete
};

const STORAGE_KEY = "siec_saved_layouts";

const safeParseLayouts = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// Singleton state for layouts
// Use sessionStorage so layouts reset on tab close (no account system yet)
const savedLayouts = ref(safeParseLayouts());

const DEFAULT_TERRAIN = {
  terrenoAncho: 7,
  terrenoLargo: 15,
  m2Totales: 105,
};

const TERRAIN_PADDING = 0.75;

const BASE_DIMS = {
  habitacion: { w: 3.5, l: 3.0, h: 2.4 },
  banio: { w: 2.0, l: 2.0, h: 2.4 },
  areaComun: { w: 4.5, l: 3.5, h: 2.4 },
  pasillo: { w: 1.5, l: 3.0, h: 2.4 },
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Number(toNumber(value).toFixed(2));

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const normalizeTipo = (tipo) => {
  if (tipo === "comun") return "areaComun";
  if (tipo === "area_comun") return "areaComun";
  if (tipo === "baño") return "banio";
  if (tipo === "bano") return "banio";

  return tipo || "habitacion";
};

const normalizeRecinto = (recinto, index = 0) => {
  const tipo = normalizeTipo(recinto.tipo);
  const fallbackDims = BASE_DIMS[tipo] || BASE_DIMS.habitacion;

  const width = toNumber(
    recinto.dimensions?.w ?? recinto.w ?? recinto.width,
    fallbackDims.w,
  );

  const length = toNumber(
    recinto.dimensions?.l ?? recinto.l ?? recinto.length,
    fallbackDims.l,
  );

  const height = toNumber(
    recinto.dimensions?.h ?? recinto.h ?? recinto.height,
    fallbackDims.h,
  );

  const x = toNumber(recinto.coords?.x ?? recinto.x, 0);
  const z = toNumber(recinto.coords?.z ?? recinto.z, 0);

  const id =
    recinto.id ||
    `recinto-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    ...recinto,
    id,
    stackId: recinto.stackId || id,
    tipo,
    nombre:
      recinto.nombre ||
      recinto.name ||
      (tipo === "banio"
        ? "Baño"
        : tipo === "areaComun"
          ? "Área común"
          : tipo === "pasillo"
            ? "Pasillo"
            : `Habitación ${index + 1}`),
    piso: toNumber(recinto.piso ?? recinto.floor, 1),
    coords: {
      x: round2(x),
      z: round2(z),
    },
    dimensions: {
      w: round2(Math.max(width, 0.5)),
      l: round2(Math.max(length, 0.5)),
      h: round2(Math.max(height, 2.1)),
    },
  };
};

const getLayoutBounds = (recintos = []) => {
  if (!recintos.length) {
    return {
      minX: 0,
      minZ: 0,
      maxX: 0,
      maxZ: 0,
      width: 0,
      length: 0,
      area: 0,
    };
  }

  const minX = Math.min(...recintos.map((r) => toNumber(r.coords?.x, 0)));
  const minZ = Math.min(...recintos.map((r) => toNumber(r.coords?.z, 0)));

  const maxX = Math.max(
    ...recintos.map(
      (r) => toNumber(r.coords?.x, 0) + toNumber(r.dimensions?.w, 0),
    ),
  );

  const maxZ = Math.max(
    ...recintos.map(
      (r) => toNumber(r.coords?.z, 0) + toNumber(r.dimensions?.l, 0),
    ),
  );

  const width = Math.max(maxX - minX, 0);
  const length = Math.max(maxZ - minZ, 0);

  return {
    minX,
    minZ,
    maxX,
    maxZ,
    width: round2(width),
    length: round2(length),
    area: round2(width * length),
  };
};

const normalizeLayoutGeometry = (layout = {}) => {
  const rawRecintos = Array.isArray(layout.recintos) ? layout.recintos : [];
  const normalizedBase = rawRecintos.map(normalizeRecinto);

  if (!normalizedBase.length) {
    const terrenoAncho = toNumber(
      layout.terrenoAncho ?? layout.width,
      DEFAULT_TERRAIN.terrenoAncho,
    );

    const terrenoLargo = toNumber(
      layout.terrenoLargo ?? layout.length,
      DEFAULT_TERRAIN.terrenoLargo,
    );

    return {
      ...layout,
      recintos: [],
      terrenoAncho: round2(terrenoAncho),
      terrenoLargo: round2(terrenoLargo),
      m2Totales: round2(layout.m2Totales ?? terrenoAncho * terrenoLargo),
      layoutBounds: getLayoutBounds([]),
    };
  }

  const originalBounds = getLayoutBounds(normalizedBase);

  /**
   * Paso 1:
   * Quitamos offsets raros del layout/preset y llevamos los recintos al origen.
   * Esto evita que 2D/3D hereden coordenadas negativas o separadas.
   */
  const originRecintos = normalizedBase.map((recinto) => ({
    ...recinto,
    coords: {
      x: round2(recinto.coords.x - originalBounds.minX),
      z: round2(recinto.coords.z - originalBounds.minZ),
    },
  }));

  const bounds = getLayoutBounds(originRecintos);

  const requestedWidth = toNumber(layout.terrenoAncho ?? layout.width, 0);
  const requestedLength = toNumber(layout.terrenoLargo ?? layout.length, 0);
  const requestedArea = toNumber(layout.m2Totales, 0);

  /**
   * Terreno mínimo: límites reales del layout + padding.
   * Así ningún recinto queda fuera del rectángulo del terreno.
   */
  const minTerrainWidth = Math.ceil(bounds.width + TERRAIN_PADDING * 2);
  const minTerrainLength = Math.ceil(bounds.length + TERRAIN_PADDING * 2);

  /**
   * Si el preset trae solo m2Totales, derivamos una proporción razonable.
   * No usamos el área directamente como largo/ancho para evitar terrenos deformes.
   */
  const areaBasedWidth =
    requestedArea > 0 ? Math.ceil(Math.sqrt(requestedArea * 1.15)) : 0;

  const areaBasedLength =
    requestedArea > 0 && areaBasedWidth > 0
      ? Math.ceil(requestedArea / areaBasedWidth)
      : 0;

  const terrenoAncho = round2(
    Math.max(
      requestedWidth,
      areaBasedWidth,
      minTerrainWidth,
      DEFAULT_TERRAIN.terrenoAncho,
    ),
  );

  const terrenoLargo = round2(
    Math.max(
      requestedLength,
      areaBasedLength,
      minTerrainLength,
      DEFAULT_TERRAIN.terrenoLargo,
    ),
  );

  /**
   * Paso 2 crítico:
   * Centramos los recintos dentro del terreno final.
   * Antes solo quedaban en el origen, por eso visualmente aparecían pegados arriba
   * y el terreno sobrante se veía hacia abajo.
   */
  const offsetX = round2(
    Math.max(TERRAIN_PADDING, (terrenoAncho - bounds.width) / 2),
  );

  const offsetZ = round2(
    Math.max(TERRAIN_PADDING, (terrenoLargo - bounds.length) / 2),
  );

  const positionedRecintos = originRecintos.map((recinto) => ({
    ...recinto,
    coords: {
      x: round2(recinto.coords.x + offsetX),
      z: round2(recinto.coords.z + offsetZ),
    },
  }));

  const finalBounds = getLayoutBounds(positionedRecintos);

  return {
    ...layout,
    recintos: positionedRecintos,
    terrenoAncho,
    terrenoLargo,
    m2Totales: round2(terrenoAncho * terrenoLargo),
    layoutBounds: finalBounds,
  };
};

// Preset configurations
const presets = ref([
  {
    id: 1,
    name: "Casa Pequeña",
    nameEn: "Small House",
    m2Totales: 80,
    materialEstructuralId: 1,
    habitacionesSimples: 2,
    habitacionesDobles: 0,
    habitacionesTriples: 0,
    banios: 1,
    areasComunes: 1,
  },
  {
    id: 2,
    name: "Casa Familiar",
    nameEn: "Family House",
    m2Totales: 120,
    materialEstructuralId: 4,
    habitacionesSimples: 2,
    habitacionesDobles: 1,
    habitacionesTriples: 0,
    banios: 2,
    areasComunes: 1,
  },
  {
    id: 3,
    name: "Casa Grande",
    nameEn: "Large House",
    m2Totales: 200,
    materialEstructuralId: 2,
    habitacionesSimples: 1,
    habitacionesDobles: 2,
    habitacionesTriples: 1,
    banios: 3,
    areasComunes: 2,
  },
  {
    id: 4,
    name: "Casa de Lujo",
    nameEn: "Luxury House",
    m2Totales: 350,
    materialEstructuralId: 4,
    habitacionesSimples: 0,
    habitacionesDobles: 3,
    habitacionesTriples: 2,
    banios: 4,
    areasComunes: 3,
  },
]);

const buildPresetRooms = (preset) => {
  const roomTypes = [
    ...Array(toNumber(preset.habitacionesSimples, 0)).fill({
      tipo: "habitacion",
      nombre: "Habitación simple",
      dimensions: { w: 3.0, l: 3.0, h: 2.4 },
    }),
    ...Array(toNumber(preset.habitacionesDobles, 0)).fill({
      tipo: "habitacion",
      nombre: "Habitación doble",
      dimensions: { w: 3.5, l: 3.2, h: 2.4 },
    }),
    ...Array(toNumber(preset.habitacionesTriples, 0)).fill({
      tipo: "habitacion",
      nombre: "Habitación triple",
      dimensions: { w: 4.2, l: 3.6, h: 2.4 },
    }),
    ...Array(toNumber(preset.banios, 0)).fill({
      tipo: "banio",
      nombre: "Baño",
      dimensions: { ...BASE_DIMS.banio },
    }),
    ...Array(toNumber(preset.areasComunes, 0)).fill({
      tipo: "areaComun",
      nombre: "Área común",
      dimensions: { ...BASE_DIMS.areaComun },
    }),
  ];

  const rooms = roomTypes.map((room, index) => ({
    ...deepClone(room),
    id: `preset-${preset.id}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
    piso: 1,
  }));

  // Strip packing simple y estable.
  const totalArea = rooms.reduce(
    (sum, room) => sum + room.dimensions.w * room.dimensions.l,
    0,
  );

  const targetWidth = Math.max(6, Math.sqrt(totalArea * 1.35));

  let x = 0;
  let z = 0;
  let rowHeight = 0;
  const gap = 0.25;

  return rooms.map((room) => {
    if (x > 0 && x + room.dimensions.w > targetWidth) {
      x = 0;
      z += rowHeight + gap;
      rowHeight = 0;
    }

    const placed = {
      ...room,
      coords: {
        x: round2(x),
        z: round2(z),
      },
    };

    x += room.dimensions.w + gap;
    rowHeight = Math.max(rowHeight, room.dimensions.l);

    return placed;
  });
};

export function useLayoutManager() {
  const persistLayouts = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayouts.value));
  };

  const createPresetLayout = (preset) => {
    const recintos = buildPresetRooms(preset);

    return normalizeLayoutGeometry({
      id: preset.id,
      name: preset.name,
      nameEn: preset.nameEn,
      createdAt: new Date().toISOString(),
      recintos,
      currentFloor: 1,
      m2Totales: preset.m2Totales,
      materialEstructuralId: preset.materialEstructuralId,
      source: "preset",
    });
  };

  const applyLayoutToStore = (layout) => {
    const recintosStore = useRecintosStore();
    const normalized = normalizeLayoutGeometry(layout);

    if (typeof recintosStore.replaceRecintos === "function") {
      recintosStore.replaceRecintos(normalized.recintos, {
        currentFloor: normalized.currentFloor || 1,
        resetHistory: true,
        metadata: {
          m2Totales: normalized.m2Totales,
          materialEstructuralId: normalized.materialEstructuralId,
        },
      });
    } else {
      // Fallback por si aún no agregas replaceRecintos al store.
      recintosStore.recintos = normalized.recintos;
      recintosStore.selectedForBudget = new Set();
      recintosStore.activeRecintoId = null;
      recintosStore.currentFloor = normalized.currentFloor || 1;

      if (typeof recintosStore.saveHistoryState === "function") {
        recintosStore.saveHistoryState();
      }
    }

    return normalized;
  };

  // Save a new layout
  const saveLayout = (name, layoutData = {}) => {
    const recintosStore = useRecintosStore();

    const normalized = normalizeLayoutGeometry({
      id: Date.now(),
      name,
      createdAt: new Date().toISOString(),
      recintos: deepClone(recintosStore.recintos),
      currentFloor: recintosStore.currentFloor,
      ...layoutData,
    });

    savedLayouts.value.push(normalized);

    // Limit to 5 saved simulations to avoid scrollbar
    if (savedLayouts.value.length > 5) {
      savedLayouts.value.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
      savedLayouts.value.splice(0, savedLayouts.value.length - 5);
    }

    persistLayouts();

    return normalized;
  };

  // Delete a layout
  const deleteLayout = (layoutId) => {
    const index = savedLayouts.value.findIndex(
      (layout) => layout.id === layoutId,
    );

    if (index > -1) {
      savedLayouts.value.splice(index, 1);
      persistLayouts();
    }
  };

  const loadLayout = (layout) => {
    return normalizeLayoutGeometry(layout);
  };

  // Calculate cost based on m² and material
  const calculateCost = (m2, materialId) => {
    const materialCost = MATERIAL_COSTS[materialId] || MATERIAL_COSTS[4];
    return toNumber(m2, 0) * materialCost;
  };

  // Get material name by ID
  const getMaterialName = (materialId) => {
    const materials = {
      1: "Wood Frame",
      2: "Galvanized Steel",
      3: "Masonry",
      4: "Ferrocement",
    };

    return materials[materialId] || "Unknown";
  };

  // Computed properties
  const recentLayouts = computed(() => {
    return savedLayouts.value
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  });

  return {
    // State
    savedLayouts,
    presets,

    // Methods
    saveLayout,
    deleteLayout,
    loadLayout,
    createPresetLayout,
    applyLayoutToStore,
    normalizeLayoutGeometry,
    getLayoutBounds,
    calculateCost,
    getMaterialName,

    // Computed
    recentLayouts,

    // Constants
    MATERIAL_COSTS,
  };
}
