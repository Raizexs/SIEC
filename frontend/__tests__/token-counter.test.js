/**
 * SCRUM-31: Tests de Contador Visual de Tokens
 * 
 * Suite completa de pruebas unitarias para el módulo token-counter.js
 * Validamos: cálculos, estados, breakdowns y helpers de UI
 */

// Importar funciones del módulo
const {
  calculateTokenBreakdown,
  calculateAvailableTokens,
  calculateTokenPercentage,
  getTokenStatus,
  formatTokenStatus,
  buildTokenCounterState,
  validateTokensForAddition,
  DEFAULT_COSTS,
  STATUS_THRESHOLDS,
  STATUS_COLORS
} = require('../js/token-counter.js');

describe('SCRUM-31: Contador Visual de Espacio Disponible y Saldo de Tokens', () => {

  // ════════════════════════════════════════════════════════════════════════════════
  // calculateTokenBreakdown
  // ════════════════════════════════════════════════════════════════════════════════

  describe('calculateTokenBreakdown', () => {
    test('Debe retornar estructura correcta', () => {
      const result = calculateTokenBreakdown(2, 1, 1);
      
      expect(result).toHaveProperty('usedByType');
      expect(result).toHaveProperty('totalUsed');
      expect(result).toHaveProperty('itemCount');
    });

    test('Debe calcular 0 tokens para 0 recintos', () => {
      const result = calculateTokenBreakdown(0, 0, 0);
      
      expect(result.totalUsed).toBe(0);
      expect(result.usedByType.habitaciones).toBe(0);
      expect(result.usedByType.banios).toBe(0);
      expect(result.usedByType.areasComunes).toBe(0);
    });

    test('Debe calcular correctamente habitaciones (9 tokens c/u)', () => {
      const result = calculateTokenBreakdown(3, 0, 0);
      
      expect(result.usedByType.habitaciones).toBe(27);
      expect(result.totalUsed).toBe(27);
    });

    test('Debe calcular correctamente baños (4 tokens c/u)', () => {
      const result = calculateTokenBreakdown(0, 2, 0);
      
      expect(result.usedByType.banios).toBe(8);
      expect(result.totalUsed).toBe(8);
    });

    test('Debe calcular correctamente áreas comunes (12 tokens c/u)', () => {
      const result = calculateTokenBreakdown(0, 0, 2);
      
      expect(result.usedByType.areasComunes).toBe(24);
      expect(result.totalUsed).toBe(24);
    });

    test('Debe sumar correctamente recintos mixtos', () => {
      // 2 hab (18) + 1 ban (4) + 1 común (12) = 34
      const result = calculateTokenBreakdown(2, 1, 1);
      
      expect(result.usedByType.habitaciones).toBe(18);
      expect(result.usedByType.banios).toBe(4);
      expect(result.usedByType.areasComunes).toBe(12);
      expect(result.totalUsed).toBe(34);
    });

    test('Debe preservar itemCount correctamente', () => {
      const result = calculateTokenBreakdown(3, 2, 1);
      
      expect(result.itemCount.habitaciones).toBe(3);
      expect(result.itemCount.banios).toBe(2);
      expect(result.itemCount.areasComunes).toBe(1);
    });

    test('Debe permitir costos personalizados', () => {
      const customCosts = { habitacion: 10, banio: 5, area_comun: 15 };
      const result = calculateTokenBreakdown(1, 1, 1, customCosts);
      
      expect(result.usedByType.habitaciones).toBe(10);
      expect(result.usedByType.banios).toBe(5);
      expect(result.usedByType.areasComunes).toBe(15);
      expect(result.totalUsed).toBe(30);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // calculateAvailableTokens
  // ════════════════════════════════════════════════════════════════════════════════

  describe('calculateAvailableTokens', () => {
    test('Debe calcular tokens disponibles correctamente', () => {
      // m2=100, usado=34 (2 hab, 1 ban, 1 común) → disponible=66
      const available = calculateAvailableTokens(100, 2, 1, 1);
      expect(available).toBe(66);
    });

    test('Debe retornar 0 si se usan todos los tokens', () => {
      // m2=34, usado=34 → disponible=0
      const available = calculateAvailableTokens(34, 2, 1, 1);
      expect(available).toBe(0);
    });

    test('Debe nunca retornar negativo', () => {
      // m2=10, usado=34 → debería retornar 0, no -24
      const available = calculateAvailableTokens(10, 2, 1, 1);
      expect(available).toBe(0);
    });

    test('Debe retornar total si no hay uso', () => {
      const available = calculateAvailableTokens(100, 0, 0, 0);
      expect(available).toBe(100);
    });

    test('Debe calcular correctamente para superficie grande', () => {
      // m2=500, usado=27 (3 hab) → disponible=473
      const available = calculateAvailableTokens(500, 3, 0, 0);
      expect(available).toBe(473);
    });

    test('Debe respetar costos personalizados', () => {
      const customCosts = { habitacion: 10, banio: 5, area_comun: 15 };
      // m2=50, usado=30 (1 hab + 1 ban + 1 común = 10+5+15) → disponible=20
      const available = calculateAvailableTokens(50, 1, 1, 1, customCosts);
      expect(available).toBe(20);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // calculateTokenPercentage
  // ════════════════════════════════════════════════════════════════════════════════

  describe('calculateTokenPercentage', () => {
    test('Debe retornar 0 si no hay uso', () => {
      expect(calculateTokenPercentage(0, 100)).toBe(0);
    });

    test('Debe retornar 100 si está lleno', () => {
      expect(calculateTokenPercentage(100, 100)).toBe(100);
    });

    test('Debe calcular 50% correctamente', () => {
      expect(calculateTokenPercentage(50, 100)).toBe(50);
    });

    test('Debe limitar a máximo 100%', () => {
      expect(calculateTokenPercentage(150, 100)).toBe(100);
    });

    test('Debe retornar 0 si total es 0', () => {
      expect(calculateTokenPercentage(50, 0)).toBe(0);
    });

    test('Debe calcular porcentajes decimales', () => {
      expect(calculateTokenPercentage(33, 100)).toBe(33);
      expect(calculateTokenPercentage(66, 100)).toBe(66);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // getTokenStatus
  // ════════════════════════════════════════════════════════════════════════════════

  describe('getTokenStatus', () => {
    test('Debe retornar "safe" para uso < 70%', () => {
      expect(getTokenStatus(0)).toBe('safe');
      expect(getTokenStatus(50)).toBe('safe');
      expect(getTokenStatus(69)).toBe('safe');
    });

    test('Debe retornar "warning" para 70% <= uso <= 90%', () => {
      expect(getTokenStatus(70.01)).toBe('warning');
      expect(getTokenStatus(80)).toBe('warning');
      expect(getTokenStatus(90)).toBe('warning');
    });

    test('Debe retornar "danger" para uso > 90%', () => {
      expect(getTokenStatus(91)).toBe('danger');
      expect(getTokenStatus(100)).toBe('danger');
    });

    test('Debe manejar límites precisos', () => {
      expect(getTokenStatus(69.99)).toBe('safe');
      expect(getTokenStatus(70.01)).toBe('warning');
      expect(getTokenStatus(90)).toBe('warning');
      expect(getTokenStatus(90.01)).toBe('danger');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // formatTokenStatus
  // ════════════════════════════════════════════════════════════════════════════════

  describe('formatTokenStatus', () => {
    test('Debe retornar estructura completa', () => {
      const result = formatTokenStatus(30, 100, 70);
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('percentage');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('subtitle');
      expect(result).toHaveProperty('color');
    });

    test('Debe generar mensaje correcto para estado safe', () => {
      const result = formatTokenStatus(30, 100, 70);
      
      expect(result.status).toBe('safe');
      expect(result.message).toBe('✅ Espacio disponible');
      expect(result.subtitle).toBe('70 tokens libres');
    });

    test('Debe generar mensaje correcto para estado warning', () => {
      const result = formatTokenStatus(75, 100, 25);
      
      expect(result.status).toBe('warning');
      expect(result.message).toBe('⚠️ Espacio limitado');
      expect(result.subtitle).toBe('25 tokens libres');
    });

    test('Debe generar mensaje correcto para estado danger', () => {
      const result = formatTokenStatus(110, 100, 0);
      
      expect(result.status).toBe('danger');
      expect(result.message).toBe('❌ Sin espacio disponible');
      expect(result.subtitle).toContain('Exceso');
    });

    test('Debe asignar colores correctos', () => {
      expect(formatTokenStatus(30, 100, 70).color).toBe('#7ab87a');
      expect(formatTokenStatus(75, 100, 25).color).toBe('#e88a40');
      expect(formatTokenStatus(95, 100, 5).color).toBe('#e84040');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // buildTokenCounterState
  // ════════════════════════════════════════════════════════════════════════════════

  describe('buildTokenCounterState', () => {
    test('Debe construir estado completo', () => {
      const state = buildTokenCounterState(100, 2, 1, 1);
      
      expect(state).toHaveProperty('total');
      expect(state).toHaveProperty('used');
      expect(state).toHaveProperty('available');
      expect(state).toHaveProperty('breakdown');
      expect(state).toHaveProperty('itemCount');
      expect(state).toHaveProperty('costs');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('percentage');
      expect(state).toHaveProperty('message');
    });

    test('Debe calcular valores correctamente', () => {
      const state = buildTokenCounterState(100, 2, 1, 1);
      
      expect(state.total).toBe(100);
      expect(state.used).toBe(34);
      expect(state.available).toBe(66);
      expect(state.percentage).toBe(34);
    });

    test('Debe incluir breakdown por tipo', () => {
      const state = buildTokenCounterState(100, 2, 1, 1);
      
      expect(state.breakdown.habitaciones).toBe(18);
      expect(state.breakdown.banios).toBe(4);
      expect(state.breakdown.areasComunes).toBe(12);
    });

    test('Debe incluir item counts', () => {
      const state = buildTokenCounterState(100, 2, 1, 1);
      
      expect(state.itemCount.habitaciones).toBe(2);
      expect(state.itemCount.banios).toBe(1);
      expect(state.itemCount.areasComunes).toBe(1);
    });

    test('Debe manejar costos personalizados', () => {
      const customCosts = { habitacion: 10, banio: 5, area_comun: 15 };
      const state = buildTokenCounterState(100, 1, 1, 1, customCosts);
      
      expect(state.used).toBe(30);
      expect(state.available).toBe(70);
      expect(state.costs).toEqual(customCosts);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // validateTokensForAddition
  // ════════════════════════════════════════════════════════════════════════════════

  describe('validateTokensForAddition', () => {
    test('Debe permitir agregar si hay saldo suficiente', () => {
      const result = validateTokensForAddition(50, 9);
      
      expect(result.canAdd).toBe(true);
      expect(result.reason).toContain('suficiente');
    });

    test('Debe bloquear agregar si saldo es insuficiente', () => {
      const result = validateTokensForAddition(5, 9);
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain('Saldo insuficiente');
    });

    test('Debe permitir si saldo es exacto', () => {
      const result = validateTokensForAddition(9, 9);
      
      expect(result.canAdd).toBe(true);
    });

    test('Debe incluir detalles en el mensaje', () => {
      const result = validateTokensForAddition(5, 12);
      
      expect(result.reason).toContain('12');
      expect(result.reason).toContain('5');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // Casos extremos (Edge Cases)
  // ════════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    test('Debe manejar superficie mínima (15 m²)', () => {
      const state = buildTokenCounterState(15, 1, 0, 0);
      expect(state.total).toBe(15);
      expect(state.available).toBe(6);
    });

    test('Debe manejar superficie muy grande (1000 m²)', () => {
      const state = buildTokenCounterState(1000, 10, 5, 3);
      expect(state.total).toBe(1000);
      expect(state.available).toBeGreaterThan(0);
    });

    test('Debe manejar muchos recintos', () => {
      const breakdown = calculateTokenBreakdown(50, 30, 10);
      expect(breakdown.usedByType.habitaciones).toBe(450);
      expect(breakdown.usedByType.banios).toBe(120);
      expect(breakdown.usedByType.areasComunes).toBe(120);
    });

    test('Debe manejar costos mínimos (1 token)', () => {
      const customCosts = { habitacion: 1, banio: 1, area_comun: 1 };
      const state = buildTokenCounterState(100, 1, 1, 1, customCosts);
      expect(state.used).toBe(3);
    });

    test('Debe manejar costos máximos (50 tokens)', () => {
      const customCosts = { habitacion: 50, banio: 50, area_comun: 50 };
      const state = buildTokenCounterState(200, 1, 1, 1, customCosts);
      expect(state.used).toBe(150);
      expect(state.available).toBe(50);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // Flujos completos (Integration Tests)
  // ════════════════════════════════════════════════════════════════════════════════

  describe('Flujos completos de usuario', () => {
    test('Simulación típica: 80 m², 2 hab, 1 ban, 1 área común', () => {
      const state = buildTokenCounterState(80, 2, 1, 1);
      
      expect(state.total).toBe(80);
      expect(state.used).toBe(34);
      expect(state.available).toBe(46);
      expect(state.status).toBe('safe');
      expect(state.percentage).toBe(42.5);
    });

    test('Simulación crítica: ocupación al 95%', () => {
      // 8 hab (72) + 3 ban (12) + 2 común (24) = 108 tokens usados
      const state = buildTokenCounterState(100, 8, 3, 2);
      
      expect(state.used).toBe(108);
      expect(state.available).toBe(0);
      expect(state.status).toBe('danger');
      expect(state.percentage).toBe(100);
    });

    test('Simulación overcapacity (exceso)', () => {
      const state = buildTokenCounterState(50, 4, 2, 1);
      
      expect(state.used).toBe(56);
      expect(state.available).toBe(0);
      expect(state.status).toBe('danger');
      expect(state.percentage).toBe(100);
    });

    test('Agregar recinto y actualizar estado', () => {
      let state = buildTokenCounterState(100, 2, 1, 1);
      expect(state.status).toBe('safe');

      // Agregar una habitación
      state = buildTokenCounterState(100, 3, 1, 1);
      expect(state.used).toBe(43);
      expect(state.available).toBe(57);
      expect(state.status).toBe('safe');

      // Agregar más recintos hasta warning
      // 6 hab (54) + 3 ban (12) + 1 común (12) = 78 tokens (78% > 70%)
      state = buildTokenCounterState(100, 6, 3, 1);
      expect(state.used).toBe(78);
      expect(state.status).toBe('warning');
    });

    test('Cambiar costos y recalcular', () => {
      const customCosts = { habitacion: 15, banio: 6, area_comun: 18 };
      // 2 hab (30) + 1 ban (6) + 1 común (18) = 54 tokens
      const state = buildTokenCounterState(100, 2, 1, 1, customCosts);
      
      expect(state.used).toBe(54);
      expect(state.available).toBe(46);
      expect(state.breakdown.habitaciones).toBe(30);
      expect(state.breakdown.banios).toBe(6);
    });
  });

});
