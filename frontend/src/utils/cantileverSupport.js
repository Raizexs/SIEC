/**
 * Apoyo vertical con voladizos permitidos vía vigas (capa estructura 3D).
 * Límites referenciales por material — no sustituyen cálculo estructural.
 */
import {
  OVERLAP_EPS,
  getSupportedFraction,
  isRoomFullySupported,
  normalizeRoomRect,
  toFiniteNumber,
} from '../composables/useSpatialConstraints.js';

/** Voladizo máximo admisible (m) sin proyecto de ingeniería dedicado. */
export const MAX_CANTILEVER_BY_MATERIAL = {
  1: 1.0, // Madera
  2: 1.2, // Metalcon
  3: 1.5, // Albañilería
  4: 2.0, // Hormigón
  5: 1.35, // Híbrido
};

const EDGE_SAMPLE_STEP = 0.12;
const MIN_BEAM_DEPTH = 0.06;

const round3 = (value) => Number(toFiniteNumber(value, 0).toFixed(3));

export const getMaxAllowedCantilever = (materialId = 1) => {
  const id = Number(materialId);
  return MAX_CANTILEVER_BY_MATERIAL[id] ?? MAX_CANTILEVER_BY_MATERIAL[2];
};

const measureWestOverhang = (upper, lowerRooms) => {
  let maxDepth = 0;
  for (let z = upper.z + EDGE_SAMPLE_STEP / 2; z < upper.z + upper.l; z += EDGE_SAMPLE_STEP) {
    let minLowerWest = Infinity;
    for (const lower of lowerRooms) {
      const lr = normalizeRoomRect(lower);
      if (z < lr.z - OVERLAP_EPS || z > lr.z + lr.l + OVERLAP_EPS) continue;
      const overlapX =
        Math.min(upper.x + upper.w, lr.x + lr.w) - Math.max(upper.x, lr.x);
      if (overlapX <= OVERLAP_EPS) continue;
      minLowerWest = Math.min(minLowerWest, lr.x);
    }
    if (!Number.isFinite(minLowerWest)) {
      maxDepth = Math.max(maxDepth, upper.w);
      continue;
    }
    maxDepth = Math.max(maxDepth, Math.max(0, minLowerWest - upper.x));
  }
  return maxDepth;
};

const measureEastOverhang = (upper, lowerRooms) => {
  let maxDepth = 0;
  for (let z = upper.z + EDGE_SAMPLE_STEP / 2; z < upper.z + upper.l; z += EDGE_SAMPLE_STEP) {
    let maxLowerEast = -Infinity;
    for (const lower of lowerRooms) {
      const lr = normalizeRoomRect(lower);
      if (z < lr.z - OVERLAP_EPS || z > lr.z + lr.l + OVERLAP_EPS) continue;
      const overlapX =
        Math.min(upper.x + upper.w, lr.x + lr.w) - Math.max(upper.x, lr.x);
      if (overlapX <= OVERLAP_EPS) continue;
      maxLowerEast = Math.max(maxLowerEast, lr.x + lr.w);
    }
    if (!Number.isFinite(maxLowerEast)) continue;
    maxDepth = Math.max(maxDepth, Math.max(0, upper.x + upper.w - maxLowerEast));
  }
  return maxDepth;
};

const measureSouthOverhang = (upper, lowerRooms) => {
  let maxDepth = 0;
  for (let x = upper.x + EDGE_SAMPLE_STEP / 2; x < upper.x + upper.w; x += EDGE_SAMPLE_STEP) {
    let minLowerSouth = Infinity;
    for (const lower of lowerRooms) {
      const lr = normalizeRoomRect(lower);
      if (x < lr.x - OVERLAP_EPS || x > lr.x + lr.w + OVERLAP_EPS) continue;
      const overlapZ =
        Math.min(upper.z + upper.l, lr.z + lr.l) - Math.max(upper.z, lr.z);
      if (overlapZ <= OVERLAP_EPS) continue;
      minLowerSouth = Math.min(minLowerSouth, lr.z);
    }
    if (!Number.isFinite(minLowerSouth)) {
      maxDepth = Math.max(maxDepth, upper.l);
      continue;
    }
    maxDepth = Math.max(maxDepth, Math.max(0, minLowerSouth - upper.z));
  }
  return maxDepth;
};

const measureNorthOverhang = (upper, lowerRooms) => {
  let maxDepth = 0;
  for (let x = upper.x + EDGE_SAMPLE_STEP / 2; x < upper.x + upper.w; x += EDGE_SAMPLE_STEP) {
    let maxLowerNorth = -Infinity;
    for (const lower of lowerRooms) {
      const lr = normalizeRoomRect(lower);
      if (x < lr.x - OVERLAP_EPS || x > lr.x + lr.w + OVERLAP_EPS) continue;
      const overlapZ =
        Math.min(upper.z + upper.l, lr.z + lr.l) - Math.max(upper.z, lr.z);
      if (overlapZ <= OVERLAP_EPS) continue;
      maxLowerNorth = Math.max(maxLowerNorth, lr.z + lr.l);
    }
    if (!Number.isFinite(maxLowerNorth)) continue;
    maxDepth = Math.max(maxDepth, Math.max(0, upper.z + upper.l - maxLowerNorth));
  }
  return maxDepth;
};

/**
 * Bordes con voladizo y datos para colocar vigas en 3D.
 * @returns {Array<{ side: string, depthM: number, spanM: number, centerX: number, centerZ: number, axis: 'x'|'z' }>}
 */
export const analyzeCantileverEdges = (roomRect, lowerRooms = []) => {
  const upper = normalizeRoomRect(roomRect);
  if (!lowerRooms.length) return [];

  const edges = [];

  const west = round3(measureWestOverhang(upper, lowerRooms));
  if (west >= MIN_BEAM_DEPTH) {
    edges.push({
      side: 'west',
      depthM: west,
      spanM: upper.l,
      centerX: upper.x - west / 2,
      centerZ: upper.z + upper.l / 2,
      axis: 'z',
    });
  }

  const east = round3(measureEastOverhang(upper, lowerRooms));
  if (east >= MIN_BEAM_DEPTH) {
    edges.push({
      side: 'east',
      depthM: east,
      spanM: upper.l,
      centerX: upper.x + upper.w + east / 2,
      centerZ: upper.z + upper.l / 2,
      axis: 'z',
    });
  }

  const south = round3(measureSouthOverhang(upper, lowerRooms));
  if (south >= MIN_BEAM_DEPTH) {
    edges.push({
      side: 'south',
      depthM: south,
      spanM: upper.w,
      centerX: upper.x + upper.w / 2,
      centerZ: upper.z - south / 2,
      axis: 'x',
    });
  }

  const north = round3(measureNorthOverhang(upper, lowerRooms));
  if (north >= MIN_BEAM_DEPTH) {
    edges.push({
      side: 'north',
      depthM: north,
      spanM: upper.w,
      centerX: upper.x + upper.w / 2,
      centerZ: upper.z + upper.l + north / 2,
      axis: 'x',
    });
  }

  return edges;
};

/**
 * @returns {{
 *   valid: boolean,
 *   fullySupported: boolean,
 *   supportedFraction: number,
 *   maxOverhangM: number,
 *   allowedOverhangM: number,
 *   beams: ReturnType<typeof analyzeCantileverEdges>,
 * }}
 */
export const validateStructuralSupport = (
  roomRect,
  lowerRooms = [],
  materialId = 1,
) => {
  const floor = roomRect?.piso || normalizeRoomRect(roomRect).piso || 1;
  const allowedOverhangM = getMaxAllowedCantilever(materialId);

  if (floor <= 1) {
    return {
      valid: true,
      fullySupported: true,
      supportedFraction: 1,
      maxOverhangM: 0,
      allowedOverhangM,
      beams: [],
    };
  }

  if (!lowerRooms.length) {
    return {
      valid: false,
      fullySupported: false,
      supportedFraction: 0,
      maxOverhangM: Infinity,
      allowedOverhangM,
      beams: [],
    };
  }

  const supportedFraction = getSupportedFraction(roomRect, lowerRooms);
  const fullySupported = isRoomFullySupported(roomRect, lowerRooms);

  if (fullySupported) {
    return {
      valid: true,
      fullySupported: true,
      supportedFraction,
      maxOverhangM: 0,
      allowedOverhangM,
      beams: [],
    };
  }

  const beams = analyzeCantileverEdges(roomRect, lowerRooms);
  const maxOverhangM = beams.reduce((max, edge) => Math.max(max, edge.depthM), 0);
  const valid = maxOverhangM <= allowedOverhangM + OVERLAP_EPS;

  return {
    valid,
    fullySupported: false,
    supportedFraction,
    maxOverhangM,
    allowedOverhangM,
    beams: valid ? beams : [],
  };
};

export const isRoomStructurallyValid = (roomRect, lowerRooms = [], materialId = 1) =>
  validateStructuralSupport(roomRect, lowerRooms, materialId).valid;
