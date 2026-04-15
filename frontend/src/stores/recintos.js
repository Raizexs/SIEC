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
  // Estado reactivo: array de recintos con id, tipo, coordenadas y dimensiones
  const recintos = ref([]);

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
    let zCursor = 0;
    strips.forEach((strip) => {
      const rawStripW = strip.reduce((s, r) => s + r.w, 0);
      const scale    = layoutW / rawStripW;          // stretch to fill width
      const stripH   = strip.reduce((h, r) => Math.max(h, r.l), 0);

      let xCursor = 0;
      strip.forEach((room) => {
        const scaledW = parseFloat((room.w * scale).toFixed(3));
        recintos.value.push({
          id: generateId(),
          tipo: room.tipo,
          coords:     { x: parseFloat(xCursor.toFixed(3)), z: parseFloat(zCursor.toFixed(3)) },
          dimensions: { w: scaledW, l: room.l },
        });
        xCursor += scaledW;       // zero gap → rooms are flush with each other
      });
      zCursor += stripH;          // next strip sits immediately below this one
    });
  };

  /**
   * Mutadores limpios para que la Capa 3 (Editor) pueda alterar posición/tamaño
   * El editor debe llamar a estos para invalidar el cache de topología
   */
  const updateRecinto = (id, updates) => {
    const recinto = recintos.value.find((r) => r.id === id);
    if (!recinto) return;

    if (updates.x !== undefined) recinto.coords.x = updates.x;
    if (updates.z !== undefined) recinto.coords.z = updates.z;
    if (updates.w !== undefined) recinto.dimensions.w = updates.w;
    if (updates.l !== undefined) recinto.dimensions.l = updates.l;
  };

  const deleteRecinto = (id) => {
    recintos.value = recintos.value.filter((r) => r.id !== id);
  };

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
  }));

  return {
    // State
    recintos,
    configMetadata,
    TOKEN_COSTS,

    // Methods
    initializeLayout,
    updateRecinto,
    deleteRecinto,

    // Computed
    totalArea,
    recintosByType,
  };
});
