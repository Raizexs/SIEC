/**
 * tokenMath.js
 * Pure mathematical functions for token calculation (HU11 - Sistema de Validación Espacial)
 *
 * 1 token de presupuesto = 10 m² de terreno (parte entera).
 * Costes por tipo de recinto en tokens discretos.
 */

export const DEFAULT_COSTS = {
  habitacionSimple: 5,
  habitacionDoble: 8,
  habitacionTriple: 12,
  banio: 4,
  area_comun: 12,
  pasillo: 0,
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
 * @param {Object} counts
 * @param {Object} costs
 */
export function calculateTokensUsedByType(counts, costs = DEFAULT_COSTS) {
  if (!counts) {
    return {
      habitacionesSimples: 0,
      habitacionesDobles: 0,
      habitacionesTriples: 0,
      banios: 0,
      areasComunes: 0,
      pasillos: 0,
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
    pasillos: (counts.pasillos || 0) * (costs.pasillo ?? 0),
  };
}

export function calculateTotalTokensUsed(tokensUsedByType) {
  if (!tokensUsedByType) return 0;

  return Object.values(tokensUsedByType).reduce(
    (sum, val) => sum + (val || 0),
    0,
  );
}

/** Tokens totales disponibles según m² del terreno (1 token cada 10 m², parte entera). */
export function calculateTotalTokens(m2Totales) {
  if (!m2Totales || m2Totales < 0 || isNaN(m2Totales)) return 0;
  const clampedM2 = Math.min(m2Totales, MAX_M2);
  return Math.floor(clampedM2 / 10);
}

export function calculateAvailableTokens(totalTokens, usedTokens) {
  if (typeof totalTokens !== "number" || typeof usedTokens !== "number")
    return 0;
  return Math.max(0, totalTokens - usedTokens);
}

export function calculateUsagePercentage(usedTokens, totalTokens) {
  if (!totalTokens || totalTokens === 0) return 0;
  return Math.min((usedTokens / totalTokens) * 100, 100);
}

export function getStatusByRatio(ratio, thresholds = STATUS_THRESHOLDS) {
  if (ratio <= thresholds.safe) return "safe";
  if (ratio <= thresholds.warning) return "warning";
  return "danger";
}

export function getStatus(usedTokens, totalTokens) {
  if (totalTokens === 0) return "safe";
  const ratio = usedTokens / totalTokens;
  return getStatusByRatio(ratio);
}

export function generateStatusDescription(
  status,
  availableTokens,
  usedTokens,
  totalTokens,
) {
  let message = "";
  let subtitle = "";

  if (status === "safe") {
    message = "✅ Espacio disponible";
    subtitle = `${availableTokens} tokens disponibles`;
  } else if (status === "warning") {
    message = "⚠️ Espacio limitado";
    subtitle = `${availableTokens} tokens disponibles`;
  } else {
    message = "❌ Sin espacio";
    subtitle = `Exceso de ${Math.max(usedTokens - totalTokens, 0)} tokens`;
  }

  return {
    message,
    subtitle,
    color: STATUS_COLORS[status],
    status,
  };
}

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

export function calculateTokensComplete(params, costs = DEFAULT_COSTS) {
  const counts = {
    habitacionesSimples: params.habitacionesSimples || 0,
    habitacionesDobles: params.habitacionesDobles || 0,
    habitacionesTriples: params.habitacionesTriples || 0,
    banios: params.banios || 0,
    areasComunes: params.areasComunes || 0,
    pasillos: params.pasillos || 0,
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
