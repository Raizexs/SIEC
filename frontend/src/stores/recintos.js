import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useMetalconValidator } from "../composables/useMetalconValidator";

// Función simple para generar IDs únicos sin dependencias externas
const generateId = () =>
  `recinto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * SCRUM-45: Estado Central de Recintos y Disposición Inicial (Layout)
 *
 * Capa 1 de la arquitectura HU02:
 * - Gestiona el estado reactivo de todos los recintos generados
 * - Proporciona mutadores limpios para que otras capas alteren x, z, w, l
 * - Garantiza que el área geométrica inicial coincida exactamente con los costos de tokens
 */

export const useRecintosStore = defineStore("recintos", () => {
  const recintos = ref([]);
  const selectedForBudget = ref(new Set());
  const activeRecintoId = ref(null);
  const currentFloor = ref(1);

  // SCRUM-98: Validador de cruce Insumo vs Altura (Metalcon)
  const metalconValidator = useMetalconValidator();

  // History and Clipboard State
  const history = ref([]);
  const historyIndex = ref(-1);
  const clipboard = ref(null);

  const saveHistoryState = () => {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    history.value.push(JSON.parse(JSON.stringify(recintos.value)));
    if (history.value.length > 50) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }
  };

  const undo = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      recintos.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
    }
  };

  const redo = () => {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      recintos.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
    }
  };

  const copyToClipboard = (id) => {
    const room = recintos.value.find(r => r.id === id);
    if (room) {
      clipboard.value = JSON.parse(JSON.stringify(room));
    }
  };

  const cutToClipboard = (id) => {
    copyToClipboard(id);
    deleteRecinto(id);
    saveHistoryState();
  };

  const pasteFromClipboard = () => {
    if (!clipboard.value) return;
    const c = clipboard.value;
    const floorRecintos = recintos.value.filter(r => r.piso === currentFloor.value);
    let maxX = 0;
    if (floorRecintos.length > 0) {
      maxX = Math.max(...floorRecintos.map(r => r.coords.x + r.dimensions.w));
    }
    
    const newId = generateId();
    recintos.value.push({
      id: newId,
      stackId: newId,
      tipo: c.tipo,
      nombre: c.nombre + ' (Copia)',
      piso: currentFloor.value,
      coords: { x: maxX + 0.15, z: 0 },
      dimensions: { ...c.dimensions },
    });
    saveHistoryState();
    return newId;
  };

  // Metadata de configuración para el layout inicial
  const configMetadata = ref({
    m2Totales: 0,
    habitaciones: 0,
    banios: 0,
    areasComunes: 0,
    materialEstructuralId: 1,
  });

  // Constantes de costos de tokens → m² equivalentes
  const TOKEN_COSTS = {
    habitacion: 9,
    banio: 4,
    areaComun: 12,
  };

  /**
   * Base dimensions for each room type (prototypical size in metres).
   */
  const BASE_DIMS = {
    habitacion: { w: 3.5, l: 3.0, h: 2.4 },
    banio:      { w: 2.0, l: 2.0, h: 2.4 },
    areaComun:  { w: 4.5, l: 3.5, h: 2.4 },
    pasillo:    { w: 1.5, l: 3.0, h: 2.4 },
  };

  // Default values for the Add Recinto quick-create form
  const DEFAULT_RECINTO = {
    tipo: 'habitacion',
    nombre: 'Habitación',
    w: 3.5,
    l: 3.0,
    h: 2.4,
  };

  const normalizeTipo = (tipo) => {
    if (tipo === "comun") return "areaComun";
    if (tipo === "area_comun") return "areaComun";
    if (tipo === "baño") return "banio";
    if (tipo === "bano") return "banio";

    return tipo || "habitacion";
  };

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const round3 = (value) => Number(toNumber(value).toFixed(3));

  const normalizeIncomingRecinto = (recinto, index = 0) => {
    const tipo = normalizeTipo(recinto.tipo);
    const fallbackDims = BASE_DIMS[tipo] || BASE_DIMS.habitacion;

    const id = recinto.id || generateId();
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
              : `Recinto ${index + 1}`),
      piso: toNumber(recinto.piso ?? recinto.floor, 1),
      coords: {
        x: round3(recinto.coords?.x ?? recinto.x ?? 0),
        z: round3(recinto.coords?.z ?? recinto.z ?? 0),
      },
      dimensions: {
        w: round3(Math.max(width, 0.5)),
        l: round3(Math.max(length, 0.5)),
        h: round3(Math.max(height, 2.1)),
      },
    };
  };

  /**
   * initializeLayout — Rectangle-first strip packing
   *
   * Algorithm:
   *  1. Compute total base area → choose a target strip width so the result
   *     is roughly 1.4 : 1 (slightly wider than tall).
   *  2. Greedily pack rooms into rows until the next room would overflow
   *     1.1× the target width.
   *  3. Scale every row uniformly so all rows share the same total width
   *     → produces a tight, gapless rectangle.
   *  4. Room heights come directly from BASE_DIMS (no vertical scaling).
   */
  const initializeLayout = (
    m2Totales,
    habitaciones,
    banios,
    areasComunes,
    materialEstructuralId,
  ) => {
    recintos.value = [];
    selectedForBudget.value = new Set();
    configMetadata.value = {
      m2Totales,
      habitaciones,
      banios,
      areasComunes,
      materialEstructuralId,
    };

    // Build ordered list: habitaciones → baños → áreas comunes
    const roomTypes = [
      ...Array(habitaciones).fill("habitacion"),
      ...Array(banios).fill("banio"),
      ...Array(areasComunes).fill("areaComun"),
    ];

    if (roomTypes.length === 0) return;

    // Prototype rooms with base widths/heights
    const protoRooms = roomTypes.map((tipo) => ({
      tipo,
      w: BASE_DIMS[tipo]?.w ?? 3,
      l: BASE_DIMS[tipo]?.l ?? 3,
    }));

    // Target width based on total base area (aspect ratio ≈ 1.4)
    const totalBaseArea = protoRooms.reduce((s, r) => s + r.w * r.l, 0);
    const targetW = Math.sqrt(totalBaseArea * 1.4);

    // ── Strip packing ──────────────────────────────────────────────────────
    const strips = [];
    let currentStrip = [];
    let currentW = 0;

    for (const room of protoRooms) {
      if (currentStrip.length > 0 && currentW + room.w > targetW * 1.1) {
        strips.push(currentStrip);
        currentStrip = [];
        currentW = 0;
      }
      currentStrip.push(room);
      currentW += room.w;
    }
    if (currentStrip.length > 0) strips.push(currentStrip);

    // Global layout width = widest raw strip (we'll scale all others to match)
    const layoutW = strips.reduce(
      (max, strip) => Math.max(max, strip.reduce((s, r) => s + r.w, 0)),
      0,
    );

    // ── Place rooms ────────────────────────────────────────────────────────
    const GAP = 0; // recintos pegados: evita muro fantasma en 3D entre celdas
    let zCursor = 0;
    strips.forEach((strip) => {
      const rawStripW = strip.reduce((s, r) => s + r.w, 0);
      const scale    = layoutW / rawStripW;          // stretch to fill width
      const stripH   = strip.reduce((h, r) => Math.max(h, r.l), 0);

      let xCursor = 0;
      strip.forEach((room) => {
        const scaledW = parseFloat((room.w * scale).toFixed(3));
        const id = generateId();
        recintos.value.push({
          id,
          stackId: id,
          tipo: room.tipo,
          piso: 1,
          coords:     { x: parseFloat(xCursor.toFixed(3)), z: parseFloat(zCursor.toFixed(3)) },
          dimensions: { w: scaledW, l: room.l },
        });
        xCursor += scaledW + GAP;
      });
      zCursor += stripH + GAP;
    });

    saveHistoryState();
  };

  const replaceRecintos = (incomingRecintos = [], options = {}) => {
    const {
      currentFloor: nextFloor = 1,
      resetHistory = true,
      metadata = null,
    } = options;

    recintos.value = incomingRecintos.map((recinto, index) =>
      normalizeIncomingRecinto(recinto, index),
    );

    selectedForBudget.value = new Set();
    activeRecintoId.value = null;
    currentFloor.value = Math.min(3, Math.max(1, toNumber(nextFloor, 1)));

    if (metadata) {
      configMetadata.value = {
        ...configMetadata.value,
        ...metadata,
      };
    }

    if (resetHistory) {
      history.value = [];
      historyIndex.value = -1;
    }

    saveHistoryState();
  };

  const addPasillo = () => {
    const floorRecintos = recintos.value.filter(r => r.piso === currentFloor.value);
    let maxX = 0;
    if (floorRecintos.length > 0) {
      maxX = Math.max(...floorRecintos.map(r => r.coords.x + r.dimensions.w));
    }

    const id = generateId();
    recintos.value.push({
      id,
      stackId: id,
      tipo: "pasillo",
      nombre: "Pasillo",
      piso: currentFloor.value,
      coords: { x: maxX + 0.15, z: 0 },
      dimensions: { ...BASE_DIMS.pasillo },
    });
    saveHistoryState();
  };

  /**
   * addRecinto — Create a single room with explicit measurements.
   * @param {string} tipo     - 'habitacion' | 'banio' | 'areaComun' | 'pasillo'
   * @param {string} nombre   - Display name for the room
   * @param {number} w        - Width in metres
   * @param {number} l        - Length in metres
   * @param {number} h        - Height in metres (stored for future use)
   */
  const addRecinto = (tipo = 'habitacion', nombre = 'Habitación', w = 3.5, l = 3.0, h = 2.4) => {
    const floorRecintos = recintos.value.filter(r => r.piso === currentFloor.value);
    let maxX = 0;
    if (floorRecintos.length > 0) {
      maxX = Math.max(...floorRecintos.map(r => r.coords.x + r.dimensions.w));
    }
    const id = generateId();
    recintos.value.push({
      id,
      stackId: id,
      tipo,
      nombre,
      piso: currentFloor.value,
      coords: { x: parseFloat(maxX.toFixed(3)), z: 0 },
      dimensions: {
        w: parseFloat(w.toFixed(3)),
        l: parseFloat(l.toFixed(3)),
        h: parseFloat(h.toFixed(3)),
      },
    });
    saveHistoryState();
    return id;
  };

  const setFloor = (floor) => {
    currentFloor.value = Math.min(3, Math.max(1, floor));
  };

  const cloneToCurrentFloor = (id) => {
    const source = recintos.value.find(r => r.id === id);
    if (!source) return;
    
    // Evitar clonar sobre el mismo piso o saltarse pisos
    if (source.piso !== currentFloor.value - 1) return;

    // Verificar límite máximo de 3 pisos
    if (currentFloor.value > 3) return;

    recintos.value.push({
      id: generateId(),
      stackId: source.stackId || source.id,
      tipo: source.tipo,
      piso: currentFloor.value,
      coords: { x: source.coords.x, z: source.coords.z },
      dimensions: { ...source.dimensions },
    });

    // SCRUM-98: Validar cruce Insumo (Metalcon) vs Altura (pisos) tras clonar
    metalconValidator.validarDesdeStore(
      configMetadata.value.materialEstructuralId,
      recintos.value
    );
    saveHistoryState();
  };

  /**
   * Clona TODOS los recintos del piso actual al siguiente piso.
   * Retorna false si ya hay recintos en el piso destino (requiere confirm).
   */
  const cloneEntireFloor = () => {
    const targetFloor = currentFloor.value + 1;
    if (targetFloor > 3) return false;

    const sourceRooms = recintos.value.filter(r => (r.piso || 1) === currentFloor.value);
    if (sourceRooms.length === 0) return false;

    const destRooms = recintos.value.filter(r => (r.piso || 1) === targetFloor);
    if (destRooms.length > 0) return 'conflict'; // El llamador debe confirmar

    sourceRooms.forEach(r => {
      recintos.value.push({
        id: generateId(),
        stackId: r.stackId || r.id,
        tipo: r.tipo,
        nombre: r.nombre,
        piso: targetFloor,
        coords: { x: r.coords.x, z: r.coords.z },
        dimensions: { ...r.dimensions },
      });
    });

    currentFloor.value = targetFloor;
    saveHistoryState();
    return true;
  };

  /**
   * Mutadores limpios para que la Capa 3 (Editor) pueda alterar posición/tamaño
   * El editor debe llamar a estos para invalidar el cache de topología
   */
  const updateRecinto = (id, updates) => {
    const targetIndex = recintos.value.findIndex((r) => r.id === id);
    if (targetIndex !== -1) {
      const target = recintos.value[targetIndex];
      const stackId = target.stackId || target.id;
      
      const hasDims =
        updates.dimensions ||
        updates.w !== undefined ||
        updates.l !== undefined ||
        updates.h !== undefined;

      if (hasDims) {
        const newW = updates.dimensions?.w ?? updates.w ?? target.dimensions.w;
        const newL = updates.dimensions?.l ?? updates.l ?? target.dimensions.l;
        const newH =
          updates.dimensions?.h ??
          updates.h ??
          target.dimensions.h ??
          BASE_DIMS[target.tipo]?.h ??
          2.4;

        const proposedDims = {
          ...target.dimensions,
          w: round3(Math.max(newW, 0.5)),
          l: round3(Math.max(newL, 0.5)),
          h: round3(Math.max(newH, 2.1)),
        };

        const roomBelow = recintos.value.find(
          (r) => (r.stackId || r.id) === stackId && r.piso === target.piso - 1,
        );

        if (roomBelow) {
          proposedDims.w = Math.min(proposedDims.w, roomBelow.dimensions.w);
          proposedDims.l = Math.min(proposedDims.l, roomBelow.dimensions.l);
        }

        target.dimensions = { ...proposedDims };

        const stack = recintos.value
          .filter((r) => (r.stackId || r.id) === stackId)
          .sort((a, b) => a.piso - b.piso);

        for (let i = 1; i < stack.length; i++) {
          const lower = stack[i - 1];
          const upper = stack[i];

          if (
            upper.dimensions.w > lower.dimensions.w ||
            upper.dimensions.l > lower.dimensions.l
          ) {
            upper.dimensions = {
              ...upper.dimensions,
              w: Math.min(upper.dimensions.w, lower.dimensions.w),
              l: Math.min(upper.dimensions.l, lower.dimensions.l),
              h:
                upper.dimensions.h ??
                lower.dimensions.h ??
                BASE_DIMS[upper.tipo]?.h ??
                2.4,
            };
          }
        }
      }

      const hasCoords = updates.coords || updates.x !== undefined || updates.z !== undefined;
      if (hasCoords) {
        const newX = updates.coords?.x ?? updates.x ?? target.coords.x;
        const newZ = updates.coords?.z ?? updates.z ?? target.coords.z;

        target.coords = {
          x: round3(newX),
          z: round3(newZ),
        };
        
        const stack = recintos.value.filter(r => (r.stackId || r.id) === stackId);
        stack.forEach(r => {
          r.coords = {
            x: round3(newX),
            z: round3(newZ),
          };
        });
      }
    }
  };

  const deleteRecinto = (id) => {
    recintos.value = recintos.value.filter((r) => r.id !== id);
    selectedForBudget.value.delete(id);
    saveHistoryState();
  };

  const toggleBudget = (id) => {
    const s = new Set(selectedForBudget.value);
    if (s.has(id)) s.delete(id); else s.add(id);
    selectedForBudget.value = s;
  };

  const setActiveRecinto = (id) => {
    activeRecintoId.value = id;
  };

  const clearActiveRecinto = () => {
    activeRecintoId.value = null;
  };

  const activeRecinto = computed(() => {
    return recintos.value.find((r) => r.id === activeRecintoId.value) || null;
  });

  const selectedM2 = computed(() => {
    return recintos.value
      .filter((r) => selectedForBudget.value.has(r.id))
      .reduce((sum, r) => sum + r.dimensions.w * r.dimensions.l, 0);
  });

  // Computed: indicadores útiles (totales, colisiones futuras, etc.)
  const totalArea = computed(() => {
    return recintos.value.reduce(
      (sum, r) => sum + r.dimensions.w * r.dimensions.l,
      0,
    );
  });

  const recintosByType = computed(() => ({
    habitaciones: recintos.value.filter((r) => r.tipo === "habitacion").length,
    banios: recintos.value.filter((r) => r.tipo === "banio").length,
    areasComunes: recintos.value.filter((r) => r.tipo === "areaComun").length,
    pasillos: recintos.value.filter((r) => r.tipo === "pasillo").length,
  }));

  return {
    // State
    recintos,
    configMetadata,
    TOKEN_COSTS,
    DEFAULT_RECINTO,
    selectedForBudget,
    activeRecintoId,
    currentFloor,

    // Methods
    initializeLayout,
    replaceRecintos,
    addPasillo,
    addRecinto,
    setFloor,
    cloneToCurrentFloor,
    cloneEntireFloor,
    updateRecinto,
    deleteRecinto,
    toggleBudget,
    setActiveRecinto,
    clearActiveRecinto,

    rotateMatrix: (direction, oldW, oldH) => {
      recintos.value.forEach(r => {
        let nx, nz, nw = r.dimensions.l, nl = r.dimensions.w;
        if (direction === 'right') { // 90 deg clockwise
          nx = oldH - r.coords.z - r.dimensions.l;
          nz = r.coords.x;
        } else { // 90 deg counter-clockwise
          nx = r.coords.z;
          nz = oldW - r.coords.x - r.dimensions.w;
        }
        r.coords.x = nx;
        r.coords.z = nz;
        r.dimensions.w = nw;
        r.dimensions.l = nl;
      });
      saveHistoryState();
    },

    // History & Clipboard Methods
    saveHistoryState,
    undo,
    redo,
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,

    // Computed
    totalArea,
    recintosByType,
    selectedM2,
    activeRecinto,
    
    // SCRUM-98: Validador Metalcon vs Altura
    metalconValidator,
  };
});
