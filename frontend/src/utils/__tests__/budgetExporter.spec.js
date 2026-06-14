import { describe, it, expect } from 'vitest';
import {
  buildBudgetFilename,
  flattenDesgloseRows,
  getMaterialLabel,
  normalizeDesglose,
  SIEC_PDF_THEME,
} from '../budgetExporter.js';

describe('budgetExporter', () => {
  it('buildBudgetFilename sanitizes project name', () => {
    const name = buildBudgetFilename('Mi Proyecto #1', 'pdf');
    expect(name).toMatch(/^SIEC_Presupuesto_Mi_Proyecto_1_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('flattenDesgloseRows expands categories into line items', () => {
    const rows = flattenDesgloseRows([
      {
        categoria: 'Estructura',
        subtotal_categoria: 1000,
        items: [
          { insumo: 'Cemento', cantidad: 10, unidad: 'saco', precio_unitario: 50, subtotal: 500 },
          { insumo: 'Arena', cantidad: 2, unidad: 'm3', precio_unitario: 250, subtotal: 500 },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].categoria).toBe('Estructura');
    expect(rows[1].insumo).toBe('Arena');
  });

  it('getMaterialLabel returns known materials', () => {
    expect(getMaterialLabel(4)).toBe('Hormigón armado');
    expect(getMaterialLabel(5)).toBe('Híbrido madera + metalcon');
    expect(getMaterialLabel(99)).toContain('99');
  });

  it('normalizeDesglose clones nested items', () => {
    const source = [{ categoria: 'A', items: [{ insumo: 'X', cantidad: 1 }] }];
    const copy = normalizeDesglose(source);
    expect(copy[0].items[0].insumo).toBe('X');
    source[0].items[0].insumo = 'Y';
    expect(copy[0].items[0].insumo).toBe('X');
  });

  it('SIEC_PDF_THEME uses brand navy and orange', () => {
    expect(SIEC_PDF_THEME.navy).toEqual([15, 23, 42]);
    expect(SIEC_PDF_THEME.orange).toEqual([249, 115, 22]);
  });
});
