/**
 * poc-logic.test.js
 * Tests unitarios del Motor 3D del POC SIEC
 *
 * Ejecutar: npm test
 * Cobertura: npm run test:coverage
 */

const {
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
} = require('../poc-logic');

// ────────────────────────────────────────────────────────────────
// SUITE 1: Constantes
// ────────────────────────────────────────────────────────────────
describe('Constantes del sistema', () => {
  test('Costo habitación = 9 tokens', () => {
    expect(COSTS.hab).toBe(9);
  });

  test('Costo baño = 4 tokens', () => {
    expect(COSTS.ban).toBe(4);
  });

  test('Costo área común = 12 tokens', () => {
    expect(COSTS.com).toBe(12);
  });

  test('Dimensión mínima de recinto = 2.2m', () => {
    expect(MIN_DIM).toBe(2.2);
  });

  test('Altura de muro = 2.8m', () => {
    expect(WALL_H).toBe(2.8);
  });

  test('Grosor de muro = 0.20m', () => {
    expect(WALL_T).toBe(0.20);
  });
});

// ────────────────────────────────────────────────────────────────
// SUITE 2: Cálculo de tokens
// ────────────────────────────────────────────────────────────────
describe('calcTokensUsed()', () => {
    test('Configuración vacía → 0 tokens', () => {
      expect(calcTokensUsed(0, 0, 0)).toBe(0);
    });

    test('1 habitación → 9 tokens', () => {
      expect(calcTokensUsed(1, 0, 0)).toBe(9);
    });

    test('1 baño → 4 tokens', () => {
      expect(calcTokensUsed(0, 1, 0)).toBe(4);
    });

    test('1 área común → 12 tokens', () => {
      expect(calcTokensUsed(0, 0, 1)).toBe(12);
    });

    test('Config por defecto (2 hab + 1 ban + 1 com) → 34 tokens', () => {
      // 2*9 + 1*4 + 1*12 = 18 + 4 + 12 = 34
      expect(calcTokensUsed(2, 1, 1)).toBe(34);
    });

    test('Config grande (5 hab + 3 ban + 2 com) → 81 tokens', () => {
      // 5*9 + 3*4 + 2*12 = 45 + 12 + 24 = 81
      expect(calcTokensUsed(5, 3, 2)).toBe(81);
    });
});

// ────────────────────────────────────────────────────────────────
// SUITE 3: Tokens libres
// ────────────────────────────────────────────────────────────────
describe('calcTokensFree()', () => {
    test('80 m² con config por defecto → 46 tokens libres', () => {
      expect(calcTokensFree(80, 2, 1, 1)).toBe(46);
    });

    test('Presupuesto exacto → 0 libres', () => {
      // 1 hab (9) con 9 m²
      expect(calcTokensFree(9, 1, 0, 0)).toBe(0);
    });

    test('Sin recintos → todos los m² son libres', () => {
      expect(calcTokensFree(80, 0, 0, 0)).toBe(80);
    });
});

// ────────────────────────────────────────────────────────────────
// SUITE 4: Verificación de presupuesto
// ────────────────────────────────────────────────────────────────
describe('isOverBudget()', () => {
    test('Config normal no excede presupuesto', () => {
      expect(isOverBudget(80, 2, 1, 1)).toBe(false);
    });

    test('Exceder presupuesto retorna true', () => {
      // 20 m² con 3 habs (27 tokens) → over budget
      expect(isOverBudget(20, 3, 0, 0)).toBe(true);
    });

    test('Presupuesto exacto no es over budget', () => {
      expect(isOverBudget(34, 2, 1, 1)).toBe(false);
    });

    test('Exceso de 1 token = over budget', () => {
      expect(isOverBudget(33, 2, 1, 1)).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────
// SUITE 5: Algoritmo de layout
// ────────────────────────────────────────────────────────────────
describe('buildLayout()', () => {
    test('Sin recintos retorna array vacío', () => {
      expect(buildLayout(80, 0, 0, 0)).toEqual([]);
    });

    test('Retorna el número correcto de recintos', () => {
      const rooms = buildLayout(80, 2, 1, 1); // 4 recintos total
      expect(rooms).toHaveLength(4);
    });

    test('Los tipos de recinto son correctos', () => {
      const rooms = buildLayout(80, 2, 1, 1);
      const types = rooms.map(r => r.type);
      expect(types.filter(t => t === 'hab').length).toBe(2);
      expect(types.filter(t => t === 'ban').length).toBe(1);
      expect(types.filter(t => t === 'com').length).toBe(1);
    });

    test('Todos los recintos respetan la dimensión mínima (w y d >= MIN_DIM)', () => {
      const rooms = buildLayout(80, 2, 1, 1);
      rooms.forEach(r => {
        expect(r.w).toBeGreaterThanOrEqual(MIN_DIM);
        expect(r.d).toBeGreaterThanOrEqual(MIN_DIM);
      });
    });

    test('Las áreas de los recintos suman aproximadamente el total de m² disponible', () => {
      const m2 = 80;
      const rooms = buildLayout(m2, 2, 1, 1);
      const totalArea = rooms.reduce((acc, r) => acc + r.area, 0);
      // Tolerancia de 0.01 m² por redondeo flotante
      expect(totalArea).toBeCloseTo(m2, 1);
    });

    test('El layout está centrado (suma de xCentros ≈ 0)', () => {
      const rooms = buildLayout(80, 2, 1, 1);
      const sumX = rooms.reduce((acc, r) => acc + (r.x + r.w / 2), 0);
      // El centroide horizontal debe ser cercano a 0 (tolerancia 2m)
      expect(Math.abs(sumX / rooms.length)).toBeLessThan(2);
    });

    test('El área común tiene más m² que el baño', () => {
      const rooms = buildLayout(100, 1, 1, 1);
      const areaComun = rooms.find(r => r.type === 'com').area;
      const areaBano = rooms.find(r => r.type === 'ban').area;
      expect(areaComun).toBeGreaterThan(areaBano);
    });

    test('Con presupuesto mínimo (20 m², 1 hab) genera 1 recinto válido', () => {
      const rooms = buildLayout(20, 1, 0, 0);
      expect(rooms).toHaveLength(1);
      expect(rooms[0].w).toBeGreaterThanOrEqual(MIN_DIM);
    });

    test('Presupuesto grande genera recintos proporcionales', () => {
      const rooms = buildLayout(200, 3, 2, 1);
      rooms.forEach(r => {
        // Ningún recinto puede ser más grande que el total de m²
        expect(r.area).toBeLessThan(200);
        expect(r.area).toBeGreaterThan(0);
      });
    });
});

// ────────────────────────────────────────────────────────────────
// SUITE 6: Conteo de segmentos de pared
// ────────────────────────────────────────────────────────────────
describe('calcWallCount()', () => {
    test('0 recintos → 0 segmentos de pared', () => {
      expect(calcWallCount([])).toBe(0);
    });

    test('4 recintos → 16 segmentos de pared (4 por recinto)', () => {
      const rooms = buildLayout(80, 2, 1, 1);
      expect(calcWallCount(rooms)).toBe(16);
    });

    test('5 recintos → 20 segmentos de pared', () => {
      const rooms = buildLayout(80, 3, 1, 1);
      expect(calcWallCount(rooms)).toBe(20);
    });

    test('1 recinto siempre tiene exactamente 4 paredes', () => {
      const rooms = buildLayout(80, 1, 0, 0);
      expect(calcWallCount(rooms)).toBe(4);
    });
  });
