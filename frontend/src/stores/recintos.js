import { defineStore } from "pinia";
import { ref, computed } from "vue";
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
    habitacion: { w: 3.5, l: 3.0 },
    banio:      { w: 2.0, l: 2.0 },
    areaComun:  { w: 4.5, l: 3.5 },
    pasillo:    { w: 1.5, l: 3.0 },
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
    const GAP = 0.15; // small gap so rooms aren't flush
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
  };

  const addPasillo = () => {
    const pasillosExistentes = recintos.value.filter(r => r.tipo === "pasillo").length;
    const offset = pasillosExistentes * 2.0;

    const id = generateId();
    recintos.value.push({
      id,
      stackId: id,
      tipo: "pasillo",
      piso: currentFloor.value,
      coords: { x: offset, z: offset },
      dimensions: { ...BASE_DIMS.pasillo },
    });
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
      dimensions: { w: source.dimensions.w, l: source.dimensions.l }
    });
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
      
      const hasDims = updates.dimensions || updates.w !== undefined || updates.l !== undefined;
      if (hasDims) {
        const newW = updates.dimensions?.w ?? updates.w ?? target.dimensions.w;
        const newL = updates.dimensions?.l ?? updates.l ?? target.dimensions.l;
        const proposedDims = { w: newW, l: newL };

        const roomBelow = recintos.value.find(r => (r.stackId || r.id) === stackId && r.piso === target.piso - 1);
        if (roomBelow) {
          proposedDims.w = Math.min(proposedDims.w, roomBelow.dimensions.w);
          proposedDims.l = Math.min(proposedDims.l, roomBelow.dimensions.l);
        }
        
        target.dimensions = { ...proposedDims };
        
        const stack = recintos.value.filter(r => (r.stackId || r.id) === stackId).sort((a,b) => a.piso - b.piso);
        for (let i = 1; i < stack.length; i++) {
          const lower = stack[i-1];
          const upper = stack[i];
          if (upper.dimensions.w > lower.dimensions.w || upper.dimensions.l > lower.dimensions.l) {
            upper.dimensions.w = Math.min(upper.dimensions.w, lower.dimensions.w);
            upper.dimensions.l = Math.min(upper.dimensions.l, lower.dimensions.l);
          }
        }
      }

      const hasCoords = updates.coords || updates.x !== undefined || updates.z !== undefined;
      if (hasCoords) {
        const newX = updates.coords?.x ?? updates.x ?? target.coords.x;
        const newZ = updates.coords?.z ?? updates.z ?? target.coords.z;
        target.coords = { x: newX, z: newZ };
        
        const stack = recintos.value.filter(r => (r.stackId || r.id) === stackId);
        stack.forEach(r => {
          r.coords = { x: newX, z: newZ };
        });
      }
    }
  };

  const deleteRecinto = (id) => {
    recintos.value = recintos.value.filter((r) => r.id !== id);
    selectedForBudget.value.delete(id);
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
    selectedForBudget,
    activeRecintoId,
    currentFloor,

    // Methods
    initializeLayout,
    addPasillo,
    setFloor,
    cloneToCurrentFloor,
    updateRecinto,
    deleteRecinto,
    toggleBudget,
    setActiveRecinto,
    clearActiveRecinto,

    // Computed
    totalArea,
    recintosByType,
    selectedM2,
    activeRecinto,
  };
});
