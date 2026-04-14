/**
 * tokenMath.js
 * Pure mathematical functions for token calculation (HU11 - Sistema de Validación Espacial)
 *
 * No Vue dependencies here - these are pure functions for testability.
 * 1 token per 10 m² total
 * Token costs: habitación simple (5), doble (8), triple (12), baño (4), área común (12)
 */

export const DEFAULT_COSTS = {
  habitacionSimple: 5,
  habitacionDoble: 8,
  habitacionTriple: 12,
  banio: 4,
  area_comun: 12,
};

export const STATUS_THRESHOLDS = {
  safe: 0.7,
  warning: 0.9,
  danger: 1.0,
};

export const STATUS_COLORS = {
  safe: "#7ab87a",
  warning: "#e88a40",
  danger: "#e84040",
};

export const MAX_M2 = 2500;

/**
 * Calculate tokens used by room type
 * @param {Object} counts - { habitacionesSimples, habitacionesDobles, habitacionesTriples, banios, areasComunes }
 * @param {Object} costs - { habitacionSimple, habitacionDoble, habitacionTriple, banio, area_comun }
 * @returns {Object} tokens used by type
 */
export function calculateTokensUsedByType(counts, costs = DEFAULT_COSTS) {
  if (!counts) {
    return {
      habitacionesSimples: 0,
      habitacionesDobles: 0,
      habitacionesTriples: 0,
      banios: 0,
      areasComunes: 0,
    };
  }

  return {
    habitacionesSimples:
      (counts.habitacionesSimples || 0) * costs.habitacionSimple,
    habitacionesDobles:
      (counts.habitacionesDobles || 0) * costs.habitacionDoble,
    habitacionesTriples:
      (counts.habitacionesTriples || 0) * costs.habitacionTriple,
    banios: (counts.banios || 0) * costs.banio,
    areasComunes: (counts.areasComunes || 0) * costs.area_comun,
  };
}

/**
 * Calculate total tokens used across all room types
 * @param {Object} tokensUsedByType - result from calculateTokensUsedByType()
 * @returns {number} total tokens used
 */
export function calculateTotalTokensUsed(tokensUsedByType) {
  if (!tokensUsedByType) return 0;

  return Object.values(tokensUsedByType).reduce(
    (sum, val) => sum + (val || 0),
    0,
  );
}

/**
 * Calculate total tokens available based on m² (1 token per 10 m²)
 * @param {number} m2Totales - total square meters
 * @returns {number} total tokens available (floored)
 */
export function calculateTotalTokens(m2Totales) {
  if (!m2Totales || m2Totales < 0 || isNaN(m2Totales)) return 0;
  const clampedM2 = Math.min(m2Totales, MAX_M2);
  return Math.floor(clampedM2 / 10);
}

/**
 * Calculate available tokens (free/unused)
 * @param {number} totalTokens - total tokens available
 * @param {number} usedTokens - tokens already used
 * @returns {number} available tokens (min 0)
 */
export function calculateAvailableTokens(totalTokens, usedTokens) {
  if (typeof totalTokens !== "number" || typeof usedTokens !== "number")
    return 0;
  return Math.max(0, totalTokens - usedTokens);
}

/**
 * Calculate usage percentage
 * @param {number} usedTokens - tokens used
 * @param {number} totalTokens - total tokens
 * @returns {number} percentage (0-100), clamped to 100
 */
export function calculateUsagePercentage(usedTokens, totalTokens) {
  if (!totalTokens || totalTokens === 0) return 0;
  return Math.min((usedTokens / totalTokens) * 100, 100);
}

/**
 * Get status based on usage ratio
 * @param {number} ratio - usage ratio (0-1), calculated as usedTokens / totalTokens
 * @param {Object} thresholds - custom thresholds (optional)
 * @returns {string} 'safe' | 'warning' | 'danger'
 */
export function getStatusByRatio(ratio, thresholds = STATUS_THRESHOLDS) {
  if (ratio <= thresholds.safe) return "safe";
  if (ratio <= thresholds.warning) return "warning";
  return "danger";
}

/**
 * Get status from absolute tokens
 * @param {number} usedTokens - tokens used
 * @param {number} totalTokens - total tokens
 * @returns {string} 'safe' | 'warning' | 'danger'
 */
export function getStatus(usedTokens, totalTokens) {
  if (totalTokens === 0) return "safe";
  const ratio = usedTokens / totalTokens;
  return getStatusByRatio(ratio);
}

/**
 * Generate status description with messages and color
 * @param {string} status - 'safe' | 'warning' | 'danger'
 * @param {number} availableTokens - free tokens remaining
 * @param {number} usedTokens - tokens used
 * @param {number} totalTokens - total tokens
 * @returns {Object} { message, subtitle, color }
 */
export function generateStatusDescription(
  status,
  availableTokens,
  usedTokens,
  totalTokens,
) {
  let message = "";
  let subtitle = "";

  // 1 token = 10 m², convertimos para mostrar al usuario
  const availableM2 = availableTokens * 10;
  const excessM2 = (usedTokens - totalTokens) * 10;

  if (status === "safe") {
    message = "Espacio OK";
    subtitle = `${availableM2} m² disponibles`;
  } else if (status === "warning") {
    message = "⚠️ Espacio limitado";
    subtitle = `${availableM2} m² disponibles`;
  } else {
    message = "❌ Sin espacio";
    subtitle = `${excessM2} m² en exceso`;
  }

  return {
    message,
    subtitle,
    color: STATUS_COLORS[status],
  };
}

/**
 * Validate if tokens are sufficient to add a new room
 * @param {number} requiredTokens - tokens needed for the room
 * @param {number} availableTokens - tokens currently available
 * @returns {Object} { canAdd: boolean, reason: string }
 */
export function validateTokensForAddition(requiredTokens, availableTokens) {
  if (availableTokens >= requiredTokens) {
    return {
      canAdd: true,
      reason: `Saldo suficiente: ${availableTokens} tokens disponibles`,
    };
  }
  return {
    canAdd: false,
    reason: `Saldo insuficiente. Necesita ${requiredTokens} tokens, disponibles: ${availableTokens}`,
  };
}

/**
 * Complete token calculation workflow
 * Returns all calculated values in a single object
 * @param {Object} params - { m2Totales, habitacionesSimples, habitacionesDobles, habitacionesTriples, banios, areasComunes }
 * @param {Object} costs - custom cost map (optional)
 * @returns {Object} complete calculation result
 */
export function calculateTokensComplete(params, costs = DEFAULT_COSTS) {
  const counts = {
    habitacionesSimples: params.habitacionesSimples || 0,
    habitacionesDobles: params.habitacionesDobles || 0,
    habitacionesTriples: params.habitacionesTriples || 0,
    banios: params.banios || 0,
    areasComunes: params.areasComunes || 0,
  };

  const tokensUsedByType = calculateTokensUsedByType(counts, costs);
  const totalTokens = calculateTotalTokens(params.m2Totales);
  const usedTokens = calculateTotalTokensUsed(tokensUsedByType);
  const availableTokens = calculateAvailableTokens(totalTokens, usedTokens);
  const usagePercentage = calculateUsagePercentage(usedTokens, totalTokens);
  const status = getStatus(usedTokens, totalTokens);
  const description = generateStatusDescription(
    status,
    availableTokens,
    usedTokens,
    totalTokens,
  );

  return {
    tokensUsedByType,
    usedTokens,
    totalTokens,
    availableTokens,
    usagePercentage,
    status,
    description,
  };
}
