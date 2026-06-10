/** Altura estándar de muros/recintos (m). Sincronizar con productPreferences.defaultRoomHeight. */
export const DEFAULT_WALL_HEIGHT = 2.4;

/** Máximo de pisos/niveles en modelaje 2D/3D. */
export const MAX_FLOORS = 10;

/** Altura mínima de recinto (m) — OGUC / store. */
export const MIN_ROOM_HEIGHT = 2.1;

/** Altura máxima de muro en workspace (m) — alineado con preferencias avanzadas. */
export const MAX_WALL_HEIGHT = 5.0;

export const WALL_HEIGHT_STEP = 0.05;

export const WALL_HEIGHT_PRESETS = [2.4, 2.6, 2.8];

/**
 * Limita altura de muro a un rango válido; rechaza NaN e infinito (evita notación e+ en UI).
 * @param {unknown} value
 * @param {number} [fallback=DEFAULT_WALL_HEIGHT]
 */
export const clampWallHeight = (value, fallback = DEFAULT_WALL_HEIGHT) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, MIN_ROOM_HEIGHT), MAX_WALL_HEIGHT);
};
