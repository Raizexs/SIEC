/**
 * SCRUM-31: Contador Visual de Espacio Disponible y Saldo de Tokens
 * 
 * Módulo que implementa lógica pura para visualización y cálculo de tokens.
 * Similar a room-blocker.js, proporciona funciones reutilizables y helpers
 * para actualizar la UI de forma reactiva.
 * 
 * Sin dependencias externas - Vanilla JavaScript puro
 */

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Costos por defecto en tokens para cada tipo de recinto
 * Nota: Estos valores deberían venir de SCRUM-30 (configurables)
 */
const DEFAULT_COSTS = {
  habitacion: 9,
  banio: 4,
  area_comun: 12
};

/**
 * Umbrales para estados visuales del contador
 */
const STATUS_THRESHOLDS = {
  safe: 0.70,      // < 70% = seguro (verde)
  warning: 0.90,   // 70-90% = advertencia (naranja)
  danger: 1.0      // > 90% = crítico (rojo)
};

/**
 * Colores para cada estado (hex RGB)
 */
const STATUS_COLORS = {
  safe: '#7ab87a',
  warning: '#e88a40',
  danger: '#e84040'
};

// ════════════════════════════════════════════════════════════════════════════════
// FUNCIONES PURAS DE CÁLCULO
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Calcula tokens consumidos por cada tipo de recinto
 * @param {number} habitaciones - Cantidad de habitaciones
 * @param {number} banios - Cantidad de baños
 * @param {number} areasComunes - Cantidad de áreas comunes
 * @param {object} costs - Objeto con costos personalizados {habitacion, banio, area_comun}
 * @returns {object} Breakdown detallado de tokens consumidos
 */
function calculateTokenBreakdown(habitaciones, banios, areasComunes, costs = DEFAULT_COSTS) {
  const usedByType = {
    habitaciones: habitaciones * costs.habitacion,
    banios: banios * costs.banio,
    areasComunes: areasComunes * costs.area_comun
  };

  return {
    usedByType,
    totalUsed: usedByType.habitaciones + usedByType.banios + usedByType.areasComunes,
    itemCount: {
      habitaciones,
      banios,
      areasComunes
    }
  };
}

/**
 * Calcula tokens disponibles después de consumo
 * @param {number} totalM2 - Metros cuadrados totales (= tokens totales)
 * @param {number} habitaciones - Cantidad de habitaciones
 * @param {number} banios - Cantidad de baños
 * @param {number} areasComunes - Cantidad de áreas comunes
 * @param {object} costs - Costos personalizados
 * @returns {number} Tokens disponibles (nunca negativo)
 */
function calculateAvailableTokens(totalM2, habitaciones, banios, areasComunes, costs = DEFAULT_COSTS) {
  const breakdown = calculateTokenBreakdown(habitaciones, banios, areasComunes, costs);
  return Math.max(0, totalM2 - breakdown.totalUsed);
}

/**
 * Calcula el porcentaje de uso de tokens (0-100)
 * @param {number} used - Tokens usados
 * @param {number} total - Tokens totales
 * @returns {number} Porcentaje (0-100)
 */
function calculateTokenPercentage(used, total) {
  if (total === 0) return 0;
  return Math.min((used / total) * 100, 100);
}

/**
 * Determina el estado visual del contador basado en porcentaje
 * @param {number} percentage - Porcentaje de uso (0-100)
 * @returns {string} Estado: 'safe' | 'warning' | 'danger'
 */
function getTokenStatus(percentage) {
  const ratio = percentage / 100;
  if (ratio <= STATUS_THRESHOLDS.safe) return 'safe';
  if (ratio <= STATUS_THRESHOLDS.warning) return 'warning';
  return 'danger';
}

/**
 * Genera texto descriptivo para el estado de tokens
 * @param {number} used - Tokens usados
 * @param {number} total - Tokens totales
 * @param {number} available - Tokens disponibles
 * @returns {object} Objeto con descripciones
 */
function formatTokenStatus(used, total, available) {
  const percentage = calculateTokenPercentage(used, total);
  const status = getTokenStatus(percentage);

  let message = '';
  let subtitle = '';

  if (status === 'safe') {
    message = '✅ Espacio disponible';
    subtitle = `${available} tokens libres`;
  } else if (status === 'warning') {
    message = '⚠️ Espacio limitado';
    subtitle = `${available} tokens libres`;
  } else {
    message = '❌ Sin espacio disponible';
    subtitle = `Exceso de ${used - total} tokens`;
  }

  return {
    status,
    percentage,
    message,
    subtitle,
    color: STATUS_COLORS[status]
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS PARA UI
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Crea un objeto de estado completo para la UI
 * @param {number} totalM2 - Metros cuadrados totales
 * @param {number} habitaciones - Cantidad de habitaciones
 * @param {number} banios - Cantidad de baños
 * @param {number} areasComunes - Cantidad de áreas comunes
 * @param {object} costs - Costos personalizados
 * @returns {object} Estado completo listo para renderizar
 */
function buildTokenCounterState(totalM2, habitaciones, banios, areasComunes, costs = DEFAULT_COSTS) {
  const breakdown = calculateTokenBreakdown(habitaciones, banios, areasComunes, costs);
  const available = calculateAvailableTokens(totalM2, habitaciones, banios, areasComunes, costs);
  const statusInfo = formatTokenStatus(breakdown.totalUsed, totalM2, available);

  return {
    total: totalM2,
    used: breakdown.totalUsed,
    available,
    breakdown: breakdown.usedByType,
    itemCount: breakdown.itemCount,
    costs,
    ...statusInfo
  };
}

/**
 * Actualiza un elemento HTML del contador
 * @param {string} elementId - ID del elemento a actualizar
 * @param {object} state - Estado del contador
 * @returns {void}
 */
function updateTokenCounterDisplay(elementId, state) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Token counter element not found: ${elementId}`);
    return;
  }

  // Actualizar valores numéricos
  const tokUsed = element.querySelector('[data-token="used"]');
  const tokFree = element.querySelector('[data-token="available"]');
  const tokTotal = element.querySelector('[data-token="total"]');

  if (tokUsed) tokUsed.textContent = state.used;
  if (tokFree) tokFree.textContent = state.available;
  if (tokTotal) tokTotal.textContent = state.total;

  // Actualizar barra de progreso
  const bar = element.querySelector('[data-token="bar"]');
  if (bar) {
    bar.style.width = state.percentage + '%';
    bar.style.background = state.color;
  }

  // Actualizar indicador de estado
  const statusEl = element.querySelector('[data-token="status"]');
  if (statusEl) {
    statusEl.textContent = state.message;
    statusEl.style.color = state.color;
  }

  // Actualizar subtítulo
  const subtitleEl = element.querySelector('[data-token="subtitle"]');
  if (subtitleEl) {
    subtitleEl.textContent = state.subtitle;
    subtitleEl.style.color = state.color;
  }

  // Actualizar breakdown por tipo
  const habEl = element.querySelector('[data-breakdown="habitaciones"]');
  if (habEl) habEl.textContent = `${state.itemCount.habitaciones} × ${state.costs.habitacion} = ${state.breakdown.habitaciones}`;

  const banEl = element.querySelector('[data-breakdown="banios"]');
  if (banEl) banEl.textContent = `${state.itemCount.banios} × ${state.costs.banio} = ${state.breakdown.banios}`;

  const comEl = element.querySelector('[data-breakdown="areasComunes"]');
  if (comEl) comEl.textContent = `${state.itemCount.areasComunes} × ${state.costs.area_comun} = ${state.breakdown.areasComunes}`;

  // Actualizar clase de estado para estilos
  element.className = element.className.replace(/status-\w+/g, '');
  element.classList.add(`status-${state.status}`);
}

/**
 * Obtiene el color de la barra según el estado
 * @param {number} percentage - Porcentaje de uso
 * @returns {string} Color en hex
 */
function getBarColor(percentage) {
  const status = getTokenStatus(percentage);
  return STATUS_COLORS[status];
}

/**
 * Valida si se puede agregar un recinto más
 * @param {number} available - Tokens disponibles
 * @param {number} requiredTokens - Tokens necesarios para el recinto
 * @returns {object} {canAdd: boolean, reason: string}
 */
function validateTokensForAddition(available, requiredTokens) {
  if (available >= requiredTokens) {
    return {
      canAdd: true,
      reason: `Saldo suficiente: ${available} tokens disponibles`
    };
  }

  return {
    canAdd: false,
    reason: `Saldo insuficiente. Necesita ${requiredTokens} tokens, disponibles: ${available}`
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTAR (para Node.js/Jest)
// ════════════════════════════════════════════════════════════════════════════════

// Si está en Node.js environment (para tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Cálculos
    calculateTokenBreakdown,
    calculateAvailableTokens,
    calculateTokenPercentage,
    getTokenStatus,
    formatTokenStatus,
    
    // UI
    buildTokenCounterState,
    updateTokenCounterDisplay,
    getBarColor,
    validateTokensForAddition,
    
    // Constantes
    DEFAULT_COSTS,
    STATUS_THRESHOLDS,
    STATUS_COLORS
  };
}
