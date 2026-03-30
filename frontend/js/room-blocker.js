/**
 * SCRUM-32: Bloqueo de Adición de Recintos por Saldo Insuficiente
 * 
 * Módulo que implementa la lógica de validación que impide al usuario
 * añadir nuevos recintos cuando el saldo de tokens sea insuficiente.
 * 
 * Responsabilidades:
 * - Validar disponibilidad de tokens
 * - Bloquear interfaz de adición
 * - Mostrar mensajes de advertencia
 */

/**
 * Configuración de costos por tipo de recinto
 * (Nota: Estos valores deberían venir de SCRUM-30)
 */
const ROOM_COSTS = {
  habitacion: 9,
  banio: 4,
  area_comun: 12
};

/**
 * Calcula los tokens usados basado en cantidad de recintos
 * @param {number} habitaciones - Cantidad de habitaciones
 * @param {number} banios - Cantidad de baños
 * @param {number} areasComunes - Cantidad de áreas comunes
 * @returns {number} Total de tokens usados
 */
function calculateUsedTokens(habitaciones, banios, areasComunes) {
  return (habitaciones * ROOM_COSTS.habitacion) +
         (banios * ROOM_COSTS.banio) +
         (areasComunes * ROOM_COSTS.area_comun);
}

/**
 * Calcula tokens disponibles después de descontar uso
 * @param {number} totalM2 - Superficie total en m²
 * @param {number} habitaciones - Cantidad de habitaciones
 * @param {number} banios - Cantidad de baños
 * @param {number} areasComunes - Cantidad de áreas comunes
 * @returns {number} Tokens disponibles (0 o más)
 */
function calculateAvailableTokens(totalM2, habitaciones, banios, areasComunes) {
  const usedTokens = calculateUsedTokens(habitaciones, banios, areasComunes);
  return Math.max(0, totalM2 - usedTokens);
}

/**
 * SCRUM-32: Valida si se puede agregar un nuevo recinto
 * 
 * Verifica si existe saldo suficiente de tokens para añadir
 * una unidad de un tipo de recinto específico.
 * 
 * @param {number} totalM2 - Superficie total en m²
 * @param {number} habitaciones - Cantidad actual de habitaciones
 * @param {number} banios - Cantidad actual de baños
 * @param {number} areasComunes - Cantidad actual de áreas comunes
 * @param {string} roomType - Tipo de recinto a agregar ('habitacion', 'banio', 'area_comun')
 * @returns {object} {
 *   canAdd: boolean,
 *   availableTokens: number,
 *   requiredTokens: number,
 *   message: string
 * }
 */
function validateRoomAddition(totalM2, habitaciones, banios, areasComunes, roomType) {
  // Validar tipo de recinto válido
  if (!ROOM_COSTS.hasOwnProperty(roomType)) {
    return {
      canAdd: false,
      availableTokens: 0,
      requiredTokens: 0,
      message: `Tipo de recinto inválido: ${roomType}`
    };
  }

  const requiredTokens = ROOM_COSTS[roomType];
  const availableTokens = calculateAvailableTokens(totalM2, habitaciones, banios, areasComunes);
  const canAdd = availableTokens >= requiredTokens;

  let message = '';
  if (canAdd) {
    message = `✅ Saldo suficiente. Tokens disponibles: ${availableTokens}`;
  } else {
    message = `❌ Advertencia: Saldo insuficiente de tokens.\n`;
    message += `Requeridos: ${requiredTokens} | Disponibles: ${availableTokens}\n`;
    message += `No es posible agregar un recinto ${roomType} en este momento.`;
  }

  return {
    canAdd,
    availableTokens,
    requiredTokens,
    message
  };
}

/**
 * SCRUM-32: Controla el estado del botón/UI de adición
 * 
 * Determina si un elemento de interfaz (botón, input) debe
 * estar habilitado o bloqueado.
 * 
 * @param {string} roomType - Tipo de recinto
 * @param {number} totalM2 - Superficie total
 * @param {number} habitaciones - Cantidad de habitaciones
 * @param {number} banios - Cantidad de baños
 * @param {number} areasComunes - Cantidad de áreas comunes
 * @returns {object} {enabled: boolean, reason: string}
 */
function getRoomAdditionBlockState(totalM2, habitaciones, banios, areasComunes, roomType) {
  const validation = validateRoomAddition(totalM2, habitaciones, banios, areasComunes, roomType);

  return {
    enabled: validation.canAdd,
    reason: validation.canAdd 
      ? `Puedes agregar un ${roomType}` 
      : `No hay saldo para ${roomType}. Necesitas ${validation.requiredTokens} tokens.`
  };
}

/**
 * SCRUM-32: Aplica el bloqueo visual a un elemento del DOM
 * 
 * @param {HTMLElement} element - Elemento a bloquear/desbloquear
 * @param {boolean} isBlocked - true = bloqueado, false = habilitado
 * @param {string} reason - Razón del bloqueo (para tooltip)
 */
function applyRoomBlockUI(element, isBlocked, reason = '') {
  if (!element) return;

  if (isBlocked) {
    element.disabled = true;
    element.classList.add('room-blocked');
    element.classList.remove('room-allowed');
    element.title = reason || 'Saldo insuficiente de tokens';
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
  } else {
    element.disabled = false;
    element.classList.remove('room-blocked');
    element.classList.add('room-allowed');
    element.title = reason || 'Agregar recinto';
    element.style.opacity = '1';
    element.style.cursor = 'pointer';
  }
}

/**
 * SCRUM-32: Muestra advertencia al usuario si intenta agregar sin saldo
 * 
 * @param {string} roomType - Tipo de recinto que intentó agregar
 * @param {object} validation - Objeto de validación de validateRoomAddition()
 */
function showInsufficientBalanceWarning(roomType, validation) {
  const warningMessage = `
⚠️ ADVERTENCIA: Saldo Insuficiente

No es posible agregar un recinto de tipo: ${roomType}

Tokens requeridos: ${validation.requiredTokens}
Tokens disponibles: ${validation.availableTokens}

Por favor, reduce la quantidade de otros recintos o aumenta la superficie total.
  `.trim();

  // Mostrar alerta al usuario
  alert(warningMessage);

  // Opcional: Loguear en consola para debugging
  console.warn('[SCRUM-32 Bloqueo]', {
    roomType,
    required: validation.requiredTokens,
    available: validation.availableTokens,
    timestamp: new Date().toISOString()
  });
}

/**
 * SCRUM-32: Handler para evento de intento de agregar recinto
 * 
 * @param {string} roomType - Tipo de recinto
 * @param {object} state - {totalM2, habitaciones, banios, areasComunes}
 * @param {function} onSuccess - Callback si se permite agregar
 * @returns {boolean} true si se permitió, false si fue bloqueado
 */
function handleRoomAdditionAttempt(roomType, state, onSuccess) {
  const validation = validateRoomAddition(
    state.totalM2,
    state.habitaciones,
    state.banios,
    state.areasComunes,
    roomType
  );

  if (!validation.canAdd) {
    showInsufficientBalanceWarning(roomType, validation);
    return false;
  }

  // Si pasó validación, ejecutar callback de éxito
  if (onSuccess && typeof onSuccess === 'function') {
    onSuccess(roomType);
  }

  return true;
}

// Exportar para Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ROOM_COSTS,
    calculateUsedTokens,
    calculateAvailableTokens,
    validateRoomAddition,
    getRoomAdditionBlockState,
    applyRoomBlockUI,
    showInsufficientBalanceWarning,
    handleRoomAdditionAttempt
  };
}
