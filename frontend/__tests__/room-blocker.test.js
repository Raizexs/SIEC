/**
 * SCRUM-32: Tests de Bloqueo de Adición de Recintos
 * 
 * Suite de pruebas que valida la funcionalidad de bloqueo
 * cuando no hay saldo suficiente de tokens
 */

describe('SCRUM-32: Bloqueo de Adición de Recintos por Saldo Insuficiente', () => {

  describe('calculateUsedTokens', () => {
    test('Debe calcular 0 tokens para 0 recintos', () => {
      expect(calculateUsedTokens(0, 0, 0)).toBe(0);
    });

    test('Debe calcular correctamente tokens para habitaciones (9 c/u)', () => {
      expect(calculateUsedTokens(1, 0, 0)).toBe(9);
      expect(calculateUsedTokens(3, 0, 0)).toBe(27);
    });

    test('Debe calcular correctamente tokens para baños (4 c/u)', () => {
      expect(calculateUsedTokens(0, 1, 0)).toBe(4);
      expect(calculateUsedTokens(2, 0, 0)).toBe(8);
    });

    test('Debe calcular correctamente tokens para áreas comunes (12 c/u)', () => {
      expect(calculateUsedTokens(0, 0, 1)).toBe(12);
      expect(calculateUsedTokens(0, 0, 2)).toBe(24);
    });

    test('Debe sumar correctamente recintos mixtos', () => {
      // 2 hab (18) + 1 baño (4) + 1 área común (12) = 34
      expect(calculateUsedTokens(2, 1, 1)).toBe(34);
    });
  });

  describe('calculateAvailableTokens', () => {
    test('Debe calcular tokens disponibles correctamente', () => {
      // m2=100, usado=34 (2 hab, 1 baño, 1 común) → disponible=66
      expect(calculateAvailableTokens(100, 2, 1, 1)).toBe(66);
    });

    test('Debe retornar 0 si se usan todos los tokens', () => {
      // m2=34, usado=34 → disponible=0
      expect(calculateAvailableTokens(34, 2, 1, 1)).toBe(0);
    });

    test('Debe nunca retornar negativo', () => {
      // m2=10, usado=34 → debería retornar 0, no -24
      expect(calculateAvailableTokens(10, 2, 1, 1)).toBe(0);
    });

    test('Debe calcular correctamente para superficie grande', () => {
      // m2=500, usado=27 (3 hab) → disponible=473
      expect(calculateAvailableTokens(500, 3, 0, 0)).toBe(473);
    });
  });

  describe('validateRoomAddition', () => {
    test('Debe permitir agregar habitación si hay saldo suficiente', () => {
      // m2=100, usado=0 → disponible=100, requiere 9 → OK
      const result = validateRoomAddition(100, 0, 0, 0, 'habitacion');
      expect(result.canAdd).toBe(true);
      expect(result.requiredTokens).toBe(9);
      expect(result.availableTokens).toBe(100);
    });

    test('Debe bloquear agregar habitación si NO hay saldo suficiente', () => {
      // m2=50, usado=45 (5 hab) → disponible=5, requiere 9 → BLOQUEADO
      const result = validateRoomAddition(50, 5, 0, 0, 'habitacion');
      expect(result.canAdd).toBe(false);
      expect(result.availableTokens).toBe(5);
    });

    test('Debe permitir agregar baño si hay saldo suficiente (requiere 4)', () => {
      // m2=100, usado=0 → disponible=100, requiere 4 → OK
      const result = validateRoomAddition(100, 0, 0, 0, 'banio');
      expect(result.canAdd).toBe(true);
      expect(result.requiredTokens).toBe(4);
    });

    test('Debe bloquear agregar baño si NO hay saldo suficiente', () => {
      // m2=20, usado=18 (2 hab) → disponible=2, requiere 4 → BLOQUEADO
      const result = validateRoomAddition(20, 2, 0, 0, 'banio');
      expect(result.canAdd).toBe(false);
    });

    test('Debe permitir agregar área común si hay saldo (requiere 12)', () => {
      // m2=100, usado=0 → disponible=100, requiere 12 → OK
      const result = validateRoomAddition(100, 0, 0, 0, 'area_comun');
      expect(result.canAdd).toBe(true);
      expect(result.requiredTokens).toBe(12);
    });

    test('Debe bloquear agregar área común si NO hay saldo', () => {
      // m2=30, usado=27 (3 hab) → disponible=3, requiere 12 → BLOQUEADO
      const result = validateRoomAddition(30, 3, 0, 0, 'area_comun');
      expect(result.canAdd).toBe(false);
    });

    test('Debe rechazar tipo de recinto inválido', () => {
      const result = validateRoomAddition(100, 0, 0, 0, 'tipo_invalido');
      expect(result.canAdd).toBe(false);
      expect(result.message).toContain('inválido');
    });

    test('Debe retornar mensaje descriptivo cuando se bloquea', () => {
      const result = validateRoomAddition(20, 2, 0, 0, 'banio');
      expect(result.message).toContain('Advertencia');
      expect(result.message).toContain('insuficiente');
    });

    test('Debe permitir agregar si hay exactamente el saldo requerido', () => {
      // m2=50, usado=41 (4 hab + 1 baño) → disponible=9, requiere 9 → EXACTO → OK
      const result = validateRoomAddition(50, 4, 1, 0, 'habitacion');
      expect(result.canAdd).toBe(true);
    });
  });

  describe('getRoomAdditionBlockState', () => {
    test('Debe habilitar botón si hay saldo', () => {
      const state = getRoomAdditionBlockState(100, 0, 0, 0, 'habitacion');
      expect(state.enabled).toBe(true);
      expect(state.reason).toContain('Puedes');
    });

    test('Debe deshabilitar botón si NO hay saldo', () => {
      const state = getRoomAdditionBlockState(20, 2, 0, 0, 'banio');
      expect(state.enabled).toBe(false);
      expect(state.reason).toContain('No hay saldo');
    });

    test('Debe incluir detalles de tokens requeridos en el motivo', () => {
      const state = getRoomAdditionBlockState(20, 2, 0, 0, 'habitacion');
      expect(state.reason).toContain('9 tokens');
    });
  });

  describe('Casos extremos y validación', () => {
    test('Debe manejar superficie mínima (20 m²)', () => {
      const result = validateRoomAddition(20, 0, 0, 0, 'habitacion');
      expect(result.canAdd).toBe(true); // 20 - 0 = 20, requiere 9
    });

    test('Debe manejar superficie máxima (500 m²)', () => {
      const result = validateRoomAddition(500, 0, 0, 0, 'area_comun');
      expect(result.canAdd).toBe(true); // 500 - 0 = 500, requiere 12
    });

    test('Debe manejar recintos mixtos complejos', () => {
      // m2=100, 5hab (45) + 3baños (12) + 2comunes (24) = 81 usado
      // disponible = 100 - 81 = 19
      const result = validateRoomAddition(100, 5, 3, 2, 'habitacion');
      expect(result.canAdd).toBe(true); // requiere 9, disponible 19
      expect(result.availableTokens).toBe(19);
    });

    test('Debe bloquear cuando está al límite después de agregar', () => {
      // m2=100, 10hab (90) + 5baños (20) = 110 PERO se limita a 0 disponible
      // Intenta agregar otra habitación
      const result = validateRoomAddition(100, 10, 5, 0, 'habitacion');
      expect(result.canAdd).toBe(false);
      expect(result.availableTokens).toBe(0);
    });

    test('Debe prevenir agregar recinto si solo hay 1 token disponible', () => {
      // m2=100, 99 usados → disponible=1, requiere 4 para baño
      const result = validateRoomAddition(100, 11, 0, 0, 'banio'); // 11*9=99
      expect(result.canAdd).toBe(false);
    });
  });

  describe('Flujo completo de usuario', () => {
    test('Escenario: Usuario llena la casa, intenta agregar baño sin saldo', () => {
      // Estado inicial
      let currentState = {
        totalM2: 100,
        habitaciones: 3,
        banios: 2,
        areasComunes: 1
      };

      // Validar: ¿puedo agregar otro baño?
      let validation = validateRoomAddition(
        currentState.totalM2,
        currentState.habitaciones,
        currentState.banios,
        currentState.areasComunes,
        'banio'
      );

      // Debería permitir si hay saldo
      expect(validation.canAdd).toBe(true);

      // Cambiar estado: agregar más recintos para llenar presupuesto
      currentState.habitaciones = 6; // 6*9 = 54
      currentState.banios = 4;       // 4*4 = 16
      currentState.areasComunes = 2; // 2*12 = 24
      // Total usado: 94, disponible: 6

      // Validar nuevamente
      validation = validateRoomAddition(
        currentState.totalM2,
        currentState.habitaciones,
        currentState.banios,
        currentState.areasComunes,
        'banio' // requiere 4
      );

      // Debería permitir porque 6 >= 4
      expect(validation.canAdd).toBe(true);

      // Agregar otro recinto  
      currentState.areasComunes = 3; // +12 = 106 total (100-106 = -6, pero se limita a 0)
      
      validation = validateRoomAddition(
        currentState.totalM2,
        currentState.habitaciones,
        currentState.banios,
        currentState.areasComunes,
        'habitacion' // requiere 9
      );

      // Ahora debe bloquear
      expect(validation.canAdd).toBe(false);
      expect(validation.message).toContain('Advertencia');
    });
  });
});
