// src/composables/useSpatialConstraints.js
// Fuente única de verdad para límites espaciales 2D/3D.
// El terreno manda. El editor puede mover, escalar y renderizar,
// pero no puede corromper la planta.

export const MIN_ROOM_DIM = 0.5;
export const MIN_ROOM_HEIGHT = 1.0;
export const MOVE_OVERFLOW_MARGIN = 0; // 0 = no salir del terreno. Usa 0.5/0.75 si quieres tolerancia visual.
export const OVERLAP_EPS = 0.001;
/** Si dos bordes quedan a esta distancia o menos, se alinean sin hueco (evita “muro fantasma” en 3D). */
export const SNAP_FLUSH_EPS = 0.12;

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

export const rectsOverlap = (a, b, epsilon = OVERLAP_EPS) => {
  const ra = normalizeRoomRect(a);
  const rb = normalizeRoomRect(b);

  return (
    ra.x < rb.x + rb.w - epsilon &&
    ra.x + ra.w > rb.x + epsilon &&
    ra.z < rb.z + rb.l - epsilon &&
    ra.z + ra.l > rb.z + epsilon
  );
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
  { snapStep = 0, margin = MOVE_OVERFLOW_MARGIN } = {},
) => {
  if (!room) return null;

  const base = normalizeRoomRect(room);
  let x = snapCoord(nextX, snapStep);
  let z = snapCoord(nextZ, snapStep);

  const tryRect = (tx, tz) => {
    const clamped = clampRectToTerrain(
      { ...base, x: tx, z: tz },
      terrain,
      margin,
    );
    if (roomOverlapsAny(clamped, rooms)) return null;
    return clamped;
  };

  const accept = (candidate) => {
    if (!candidate) return null;
    const flushed = snapRectFlushToNeighbors(candidate, rooms);
    if (roomOverlapsAny(flushed, rooms)) return null;
    return flushed;
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
  { snapStep = 0, margin = MOVE_OVERFLOW_MARGIN } = {},
) => {
  if (!room) return null;

  const base = normalizeRoomRect(room);
  const w = Math.max(MIN_ROOM_DIM, snapCoord(nextW, snapStep));
  const l = Math.max(MIN_ROOM_DIM, snapCoord(nextL, snapStep));

  let clamped = clampRectToTerrain({ ...base, w, l }, terrain, margin);
  clamped = snapResizeFlushToNeighbors(clamped, rooms);
  clamped = clampRectToTerrain(clamped, terrain, margin);
  if (roomOverlapsAny(clamped, rooms)) return null;
  return clamped;
};
