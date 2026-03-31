import { describe, it, expect, beforeEach } from 'vitest';
import { useTokenCounter } from '../useTokenCounter';

describe('useTokenCounter Composable', () => {
  let counter;

  beforeEach(() => {
    counter = useTokenCounter();
  });

  it('calculates available tokens correctly', () => {
    counter.m2Totales.value = 100;
    counter.habitaciones.value = 2; // 2 * 9 = 18
    counter.banios.value = 1; // 1 * 4 = 4
    counter.areasComunes.value = 1; // 1 * 12 = 12

    expect(counter.tokensUsados.value).toBe(34);
    expect(counter.tokensDisponibles.value).toBe(66);
    expect(counter.estado.value).toBe('safe');
  });

  it('identifies warning state', () => {
    counter.m2Totales.value = 100;
    counter.habitaciones.value = 6; // 6 * 9 = 54
    counter.banios.value = 3; // 3 * 4 = 12
    counter.areasComunes.value = 1; // 1 * 12 = 12
    
    // total = 78, which is > 70%, so it's a warning
    expect(counter.tokensUsados.value).toBe(78);
    expect(counter.estado.value).toBe('warning');
  });

  it('identifies danger state', () => {
    counter.m2Totales.value = 100;
    counter.habitaciones.value = 8; // 8 * 9 = 72
    counter.banios.value = 3; // 3 * 4 = 12
    counter.areasComunes.value = 2; // 2 * 12 = 24
    
    // total = 108, which > 100%
    expect(counter.estado.value).toBe('danger');
    expect(counter.tokensDisponibles.value).toBe(0);
  });
});
