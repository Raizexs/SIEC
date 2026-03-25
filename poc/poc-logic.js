/**
 * poc-logic.js
 * Lógica pura del Motor 3D del POC - separada del renderer Three.js
 * para poder ser testeada independientemente con Jest.
 */

// ════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════

/** Costo en tokens por tipo de recinto */
const COSTS = { hab: 9, ban: 4, com: 12 };

/** Dimensión mínima de cualquier recinto en metros */
const MIN_DIM = 2.2;

/** Altura de muros en metros */
const WALL_H = 2.8;

/** Grosor de muro en metros */
const WALL_T = 0.20;

/** Rugosidad por material estructural (para Three.js MeshStandardMaterial) */
const ROUGHNESS_MAP = {
  madera:      0.90,
  metalcom:    0.30,
  albanileria: 0.95,
  hormigon:    0.75,
};

// ════════════════════════════════════
// LÓGICA DE TOKENS
// ════════════════════════════════════

/**
 * Calcula el total de tokens utilizados dado el número de recintos.
 * @param {number} hab - Cantidad de habitaciones
 * @param {number} ban - Cantidad de baños
 * @param {number} com - Cantidad de áreas comunes
 * @returns {number} Tokens totales utilizados
 */
function calcTokensUsed(hab, ban, com) {
  return hab * COSTS.hab + ban * COSTS.ban + com * COSTS.com;
}

/**
 * Calcula los tokens libres (no asignados) dentro del presupuesto total de m².
 * @param {number} m2 - Superficie total en m² (= presupuesto total de tokens)
 * @param {number} hab
 * @param {number} ban
 * @param {number} com
 * @returns {number} Tokens libres
 */
function calcTokensFree(m2, hab, ban, com) {
  return m2 - calcTokensUsed(hab, ban, com);
}

/**
 * Indica si la configuración de recintos excede el presupuesto disponible.
 * @returns {boolean}
 */
function isOverBudget(m2, hab, ban, com) {
  return calcTokensUsed(hab, ban, com) > m2;
}

// ════════════════════════════════════
// ALGORITMO DE LAYOUT
// ════════════════════════════════════

/**
 * Genera un arreglo de recintos con dimensiones en metros y posiciones (x, z)
 * relativas al centro del conjunto - basado en presupuesto proporcional de m².
 *
 * @param {number} m2   - Superficie total disponible en m²
 * @param {number} hab  - Cantidad de habitaciones
 * @param {number} ban  - Cantidad de baños
 * @param {number} com  - Cantidad de áreas comunes
 * @returns {{ type: string, area: number, w: number, d: number, x: number, z: number }[]}
 */
function buildLayout(m2, hab, ban, com) {
  const totalCost = hab * COSTS.hab + ban * COSTS.ban + com * COSTS.com;
  if (totalCost === 0) return [];

  const rooms = [];

  function push(type, count, cost) {
    for (let i = 0; i < count; i++) {
      const area = (cost / totalCost) * m2;
      // Aspect ratio por tipo: baños más cuadrados, comunes más anchos
      const asp = type === 'ban' ? 0.6 : type === 'com' ? 1.6 : 1.15;
      const w = Math.max(Math.sqrt(area / asp), MIN_DIM);
      const d = Math.max(area / w, MIN_DIM);
      rooms.push({ type, area, w, d, x: 0, z: 0 });
    }
  }

  push('com', com, COSTS.com);
  push('hab', hab, COSTS.hab);
  push('ban', ban, COSTS.ban);

  // Empaquetar en filas horizontales
  const maxRowW = Math.sqrt(m2) * 2.0;
  let cx = 0, cz = 0, rowH = 0;

  rooms.forEach((r, i) => {
    if (i > 0 && cx + r.w > maxRowW) {
      cz += rowH;
      cx = 0;
      rowH = 0;
    }
    r.x = cx;
    r.z = cz;
    cx += r.w;
    rowH = Math.max(rowH, r.d);
  });

  // Centrar el conjunto en el origen
  const totalW = Math.max(...rooms.map(r => r.x + r.w));
  const totalD = Math.max(...rooms.map(r => r.z + r.d));
  rooms.forEach(r => {
    r.x -= totalW / 2;
    r.z -= totalD / 2;
  });

  return rooms;
}

/**
 * Calcula cuántos segmentos de pared se generarán (4 por recinto).
 * @param {Object[]} rooms - Resultado de buildLayout()
 * @returns {number}
 */
function calcWallCount(rooms) {
  return rooms.length * 4;
}

module.exports = {
  COSTS,
  MIN_DIM,
  WALL_H,
  WALL_T,
  ROUGHNESS_MAP,
  calcTokensUsed,
  calcTokensFree,
  isOverBudget,
  buildLayout,
  calcWallCount,
};
