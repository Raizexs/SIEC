// src/composables/useSpatialConstraints.js
// Fuente única de verdad para límites espaciales 2D/3D.
// El terreno manda. El editor puede mover, escalar y renderizar,
// pero no puede corromper la planta.

import { isRoomStructurallyValid } from '../utils/cantileverSupport.js';
export const MIN_ROOM_DIM = 0.5;
export const MIN_ROOM_HEIGHT = 1.0;
export const MOVE_OVERFLOW_MARGIN = 0; // 0 = no salir del terreno. Usa 0.5/0.75 si quieres tolerancia visual.
export const OVERLAP_EPS = 0.001;
/** Si dos bordes quedan a esta distancia o menos, se alinean sin hueco (evita “muro fantasma” en 3D). */
export const SNAP_FLUSH_EPS = 0.2;
const DEFAULT_FINE_STEP = 0.1;

export const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const clampNumber = (value, min, max) => {
  const n = toFiniteNumber(value, min);
  return Math.min(Math.max(n, min), max);
};

export const normalizeTerrain = (terrain = {}) => ({
  w: Math.max(
    MIN_ROOM_DIM,
    toFiniteNumber(terrain.w ?? terrain.width ?? terrain.ancho, 7),
  ),
  h: Math.max(
    MIN_ROOM_DIM,
    toFiniteNumber(terrain.h ?? terrain.length ?? terrain.largo, 15),
  ),
});

export const normalizeRoomRect = (room = {}) => {
  const dimensions = room.dimensions || room;
  const coords = room.coords || room;

  return {
    id: room.id,
    piso: room.piso || 1,
    x: toFiniteNumber(coords.x, 0),
    z: toFiniteNumber(coords.z, 0),
    w: Math.max(MIN_ROOM_DIM, toFiniteNumber(dimensions.w, MIN_ROOM_DIM)),
    l: Math.max(MIN_ROOM_DIM, toFiniteNumber(dimensions.l, MIN_ROOM_DIM)),
  };
};

export const getMovementBounds = (
  terrain,
  roomRect,
  margin = MOVE_OVERFLOW_MARGIN,
) => {
  const t = normalizeTerrain(terrain);
  const r = normalizeRoomRect(roomRect);
  const safeMargin = Math.max(0, toFiniteNumber(margin, 0));

  return {
    minX: -safeMargin,
    minZ: -safeMargin,
    maxX: Math.max(-safeMargin, t.w - r.w + safeMargin),
    maxZ: Math.max(-safeMargin, t.h - r.l + safeMargin),
  };
};

export const clampRectToTerrain = (
  roomRect,
  terrain,
  margin = MOVE_OVERFLOW_MARGIN,
) => {
  const t = normalizeTerrain(terrain);
  const r = normalizeRoomRect(roomRect);
  const safeMargin = Math.max(0, toFiniteNumber(margin, 0));

  let x = clampNumber(r.x, -safeMargin, Math.max(-safeMargin, t.w - MIN_ROOM_DIM + safeMargin));
  let z = clampNumber(r.z, -safeMargin, Math.max(-safeMargin, t.h - MIN_ROOM_DIM + safeMargin));

  let w = clampNumber(r.w, MIN_ROOM_DIM, Math.max(MIN_ROOM_DIM, t.w - x + safeMargin));
  let l = clampNumber(r.l, MIN_ROOM_DIM, Math.max(MIN_ROOM_DIM, t.h - z + safeMargin));

  const bounds = getMovementBounds(t, { ...r, x, z, w, l }, margin);
  x = clampNumber(x, bounds.minX, bounds.maxX);
  z = clampNumber(z, bounds.minZ, bounds.maxZ);
  w = clampNumber(w, MIN_ROOM_DIM, Math.max(MIN_ROOM_DIM, t.w - x + safeMargin));
  l = clampNumber(l, MIN_ROOM_DIM, Math.max(MIN_ROOM_DIM, t.h - z + safeMargin));

  return { ...r, x, z, w, l };
};

/** Solapamiento con área (permite compartir borde al unir pasillo ↔ recinto). */
export const rectsOverlap = (a, b, epsilon = OVERLAP_EPS) => {
  const ra = normalizeRoomRect(a);
  const rb = normalizeRoomRect(b);
  const overlapX = Math.min(ra.x + ra.w, rb.x + rb.w) - Math.max(ra.x, rb.x);
  const overlapZ = Math.min(ra.z + ra.l, rb.z + rb.l) - Math.max(ra.z, rb.z);
  return overlapX > epsilon && overlapZ > epsilon;
};

export const roomOverlapsAny = (
  roomRect,
  rooms = [],
  epsilon = OVERLAP_EPS,
) => {
  const r = normalizeRoomRect(roomRect);

  return rooms.some((room) => {
    if (!room || room.id === r.id) return false;
    if ((room.piso || 1) !== r.piso) return false;
    return rectsOverlap(r, normalizeRoomRect(room), epsilon);
  });
};

export const canPlaceRoom = (
  roomRect,
  rooms,
  terrain,
  margin = MOVE_OVERFLOW_MARGIN,
) => {
  const clamped = clampRectToTerrain(roomRect, terrain, margin);
  const r = normalizeRoomRect(roomRect);

  const stayedInsideBounds =
    Math.abs(clamped.x - r.x) <= OVERLAP_EPS &&
    Math.abs(clamped.z - r.z) <= OVERLAP_EPS;

  return stayedInsideBounds && !roomOverlapsAny(r, rooms);
};

export const snapCoord = (value, step) => {
  const s = toFiniteNumber(step, 0);
  if (s <= 0) return toFiniteNumber(value, 0);
  return Math.round(toFiniteNumber(value, 0) / s) * s;
};

const round3 = (value) => Number(toFiniteNumber(value, 0).toFixed(3));

/**
 * Alinea bordes casi coincidentes para que los recintos queden pegados (sin ranura).
 */
export const snapRectFlushToNeighbors = (
  roomRect,
  rooms = [],
  epsilon = SNAP_FLUSH_EPS,
) => {
  let r = normalizeRoomRect(roomRect);
  const eps = Math.max(OVERLAP_EPS, toFiniteNumber(epsilon, SNAP_FLUSH_EPS));

  const neighbors = rooms.filter(
    (room) => room && room.id !== r.id && (room.piso || 1) === r.piso,
  );

  for (const raw of neighbors) {
    const o = normalizeRoomRect(raw);

    if (Math.abs(r.x - (o.x + o.w)) <= eps) {
      r = { ...r, x: round3(o.x + o.w) };
    }
    if (Math.abs((r.x + r.w) - o.x) <= eps) {
      r = { ...r, x: round3(o.x - r.w) };
    }
    if (Math.abs(r.z - (o.z + o.l)) <= eps) {
      r = { ...r, z: round3(o.z + o.l) };
    }
    if (Math.abs((r.z + r.l) - o.z) <= eps) {
      r = { ...r, z: round3(o.z - r.l) };
    }
  }

  return r;
};

/** Ajusta ancho/largo al acercarse al borde de un vecino (resize desde esquina fija). */
export const snapResizeFlushToNeighbors = (
  roomRect,
  rooms = [],
  epsilon = SNAP_FLUSH_EPS,
) => {
  let r = normalizeRoomRect(roomRect);
  const eps = Math.max(OVERLAP_EPS, toFiniteNumber(epsilon, SNAP_FLUSH_EPS));

  for (const raw of rooms) {
    if (!raw || raw.id === r.id) continue;
    if ((raw.piso || 1) !== r.piso) continue;

    const o = normalizeRoomRect(raw);

    if (Math.abs(r.x + r.w - o.x) <= eps) {
      r = { ...r, w: round3(Math.max(MIN_ROOM_DIM, o.x - r.x)) };
    }
    if (Math.abs(r.z + r.l - o.z) <= eps) {
      r = { ...r, l: round3(Math.max(MIN_ROOM_DIM, o.z - r.z)) };
    }
  }

  return r;
};

/** Terreno desde props del editor (ancho = X, largo = Z). */
export const terrainFromEditor = (terrenoAncho, terrenoLargo) =>
  normalizeTerrain({ w: terrenoAncho, h: terrenoLargo });

/** Mínimo de muestreo de apoyo vertical (evita falsos positivos en voladizos). */
export const SUPPORT_SAMPLE_THRESHOLD = 0.98;
const SUPPORT_GRID = 4;

export const getRoomsOnFloor = (rooms = [], floor = 1) =>
  rooms.filter((room) => (room?.piso || 1) === floor);

export const getSupportRoomsBelow = (rooms = [], floor = 1) => {
  if (floor <= 1) return [];
  return getRoomsOnFloor(rooms, floor - 1);
};

export const pointInsideRoomRect = (px, pz, room, epsilon = OVERLAP_EPS) => {
  const r = normalizeRoomRect(room);
  return (
    px >= r.x - epsilon &&
    px <= r.x + r.w + epsilon &&
    pz >= r.z - epsilon &&
    pz <= r.z + r.l + epsilon
  );
};

/** Fracción del área superior cubierta por recintos del piso inferior (muestreo en grilla). */
export const getSupportedFraction = (roomRect, lowerRooms = []) => {
  const upper = normalizeRoomRect(roomRect);
  if (!lowerRooms.length) return 0;

  let supported = 0;
  let total = 0;

  for (let i = 0; i <= SUPPORT_GRID; i += 1) {
    for (let j = 0; j <= SUPPORT_GRID; j += 1) {
      const px = upper.x + (upper.w * i) / SUPPORT_GRID;
      const pz = upper.z + (upper.l * j) / SUPPORT_GRID;
      total += 1;
      if (lowerRooms.some((lower) => pointInsideRoomRect(px, pz, lower))) {
        supported += 1;
      }
    }
  }

  return total > 0 ? supported / total : 0;
};

export const isRoomFullySupported = (
  roomRect,
  lowerRooms = [],
  threshold = SUPPORT_SAMPLE_THRESHOLD,
) => {
  const floor = roomRect?.piso || normalizeRoomRect(roomRect).piso || 1;
  if (floor <= 1) return true;
  if (!lowerRooms.length) return false;
  return getSupportedFraction(roomRect, lowerRooms) >= threshold;
};

/**
 * Encuentra posición válida sobre el piso inferior (sin solapar en el mismo piso).
 * @returns {{ x: number, z: number } | null}
 */
export const findSupportedPosition = (
  room,
  w,
  l,
  allRooms = [],
  sameFloorRooms = [],
  materialId = 1,
) => {
  const floor = room?.piso || 1;
  if (floor <= 1) return null;

  const lowerRooms = getSupportRoomsBelow(allRooms, floor);
  if (!lowerRooms.length) return null;

  const candidates = [];
  const step = DEFAULT_FINE_STEP;
  const safeW = Math.max(MIN_ROOM_DIM, toFiniteNumber(w, MIN_ROOM_DIM));
  const safeL = Math.max(MIN_ROOM_DIM, toFiniteNumber(l, MIN_ROOM_DIM));

  for (const lower of lowerRooms) {
    const base = normalizeRoomRect(lower);
    candidates.push({ x: base.x, z: base.z });
    candidates.push({ x: base.x + base.w - safeW, z: base.z });
    candidates.push({ x: base.x, z: base.z + base.l - safeL });
    candidates.push({
      x: base.x + base.w - safeW,
      z: base.z + base.l - safeL,
    });

    for (let z = base.z; z <= base.z + base.l - safeL + OVERLAP_EPS; z += step) {
      for (let x = base.x; x <= base.x + base.w - safeW + OVERLAP_EPS; x += step) {
        candidates.push({
          x: round3(x),
          z: round3(z),
        });
      }
    }
  }

  const seen = new Set();
  for (const { x, z } of candidates) {
    const key = `${x}|${z}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const candidate = {
      id: room?.id,
      piso: floor,
      x,
      z,
      w: safeW,
      l: safeL,
    };

    if (roomOverlapsAny(candidate, sameFloorRooms)) continue;
    if (!isRoomStructurallyValid(candidate, lowerRooms, materialId)) continue;
    return { x, z };
  }

  return null;
};

/** Ajusta posición/tamaño para eliminar voladizo sobre el piso inferior. */
export const clampRectToVerticalSupport = (
  roomRect,
  lowerRooms = [],
  allRooms = [],
  materialId = 1,
) => {
  const base = normalizeRoomRect(roomRect);
  if ((base.piso || 1) <= 1) return base;
  if (!lowerRooms.length) return null;
  if (isRoomStructurallyValid(base, lowerRooms, materialId)) return base;

  const positioned = findSupportedPosition(
    { id: base.id, piso: base.piso },
    base.w,
    base.l,
    allRooms,
    allRooms.filter(
      (room) => room?.id !== base.id && (room?.piso || 1) === (base.piso || 1),
    ),
    materialId,
  );

  if (positioned) {
    const candidate = { ...base, x: positioned.x, z: positioned.z };
    if (isRoomStructurallyValid(candidate, lowerRooms, materialId)) return candidate;
  }

  let w = base.w;
  let l = base.l;
  const x = base.x;
  const z = base.z;

  while (w > MIN_ROOM_DIM) {
    const candidate = { ...base, x, z, w, l };
    if (isRoomStructurallyValid(candidate, lowerRooms, materialId)) return candidate;
    w = round3(w - 0.05);
  }

  while (l > MIN_ROOM_DIM) {
    const candidate = { ...base, x, z, w, l };
    if (isRoomStructurallyValid(candidate, lowerRooms, materialId)) return candidate;
    l = round3(l - 0.05);
  }

  return null;
};

/**
 * Posición final alineada 2D/3D: snap → límites del terreno → colisiones (slide X/Z).
 * @returns {{ x: number, z: number, w: number, l: number } | null} null = sin cambio válido
 */
export const resolveRoomDragPosition = (
  room,
  nextX,
  nextZ,
  terrain,
  rooms,
  { snapStep = 0, margin = MOVE_OVERFLOW_MARGIN, materialId = 1 } = {},
) => {
  if (!room) return null;

  const base = normalizeRoomRect(room);
  const floor = base.piso || room.piso || 1;
  const lowerRooms = getSupportRoomsBelow(rooms, floor);
  let x = snapCoord(nextX, snapStep);
  let z = snapCoord(nextZ, snapStep);

  const structurallyOk = (rect) =>
    floor <= 1 ||
    !lowerRooms.length ||
    isRoomStructurallyValid({ ...rect, piso: floor }, lowerRooms, materialId);

  const tryRect = (tx, tz) => {
    const clamped = clampRectToTerrain(
      { ...base, x: tx, z: tz },
      terrain,
      margin,
    );
    if (roomOverlapsAny(clamped, rooms)) return null;
    if (!structurallyOk(clamped)) return null;
    return clamped;
  };

  const accept = (candidate) => {
    if (!candidate) return null;
    if (roomOverlapsAny(candidate, rooms)) return null;
    if (!structurallyOk(candidate)) return null;
    const flushed = snapRectFlushToNeighbors(candidate, rooms);
    if (!roomOverlapsAny(flushed, rooms)) {
      if (!structurallyOk(flushed)) return candidate;
      return flushed;
    }
    return candidate;
  };

  const direct = accept(tryRect(x, z));
  if (direct) return direct;

  const slideX = accept(tryRect(x, base.z));
  if (slideX) return slideX;

  const slideZ = accept(tryRect(base.x, z));
  if (slideZ) return slideZ;

  return null;
};

/**
 * Dimensiones finales alineadas 2D/3D (esquina fija, snap en bordes).
 */
export const resolveRoomResize = (
  room,
  nextW,
  nextL,
  terrain,
  rooms,
  { snapStep = 0, margin = MOVE_OVERFLOW_MARGIN, materialId = 1 } = {},
) => {
  if (!room) return null;

  const base = normalizeRoomRect(room);
  const floor = base.piso || room.piso || 1;
  const lowerRooms = getSupportRoomsBelow(rooms, floor);
  const w = Math.max(MIN_ROOM_DIM, snapCoord(nextW, snapStep));
  const l = Math.max(MIN_ROOM_DIM, snapCoord(nextL, snapStep));

  let clamped = clampRectToTerrain({ ...base, w, l }, terrain, margin);
  clamped = snapResizeFlushToNeighbors(clamped, rooms);
  clamped = clampRectToTerrain(clamped, terrain, margin);
  if (roomOverlapsAny(clamped, rooms)) return null;

  if (floor > 1 && lowerRooms.length) {
    const supported = clampRectToVerticalSupport(
      { ...clamped, piso: floor },
      lowerRooms,
      rooms,
      materialId,
    );
    if (!supported) return null;
    clamped = supported;
  }

  return clamped;
};
