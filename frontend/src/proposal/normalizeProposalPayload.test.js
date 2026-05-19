import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOOTER_BRAND,
  DEFAULT_PROJECT_NAME,
  normalizeCoverTitle,
  normalizeProposalPayload,
  resolveFooterBrandName,
} from './normalizeProposalPayload.js';

describe('normalizeCoverTitle', () => {
  it('elimina prefijo Propuesta comercial duplicado', () => {
    expect(normalizeCoverTitle('Propuesta comercial - Casa Los Boldos')).toBe(
      'Casa Los Boldos',
    );
  });

  it('usa fallback si queda vacío', () => {
    expect(normalizeCoverTitle('  Propuesta comercial  ')).toBe(DEFAULT_PROJECT_NAME);
  });
});

describe('normalizeProposalPayload', () => {
  it('aplica defaults y tipos numéricos', () => {
    const result = normalizeProposalPayload({
      projectName: 'Propuesta comercial · Torre Norte',
      motorTotal: '1200000',
      contingencyPct: '10',
      includeTax: true,
      montoIva: '228000',
      desglose: [{ categoria: 'Madera', items: [] }],
    });

    expect(result.projectName).toBe('Torre Norte');
    expect(result.motorTotal).toBe(1200000);
    expect(result.contingencyPct).toBe(10);
    expect(result.montoIva).toBe(228000);
    expect(result.totalFormatted).toMatch(/\$/);
    expect(result.counts).toEqual({ habitaciones: 0, banios: 0 });
    expect(Array.isArray(result.desglose)).toBe(true);
  });

  it('resuelve footerBrandName como SIEC', () => {
    expect(resolveFooterBrandName('SIEC · Inteligencia Constructiva')).toBe(
      DEFAULT_FOOTER_BRAND,
    );
    expect(normalizeProposalPayload({}).footerBrandName).toBe(DEFAULT_FOOTER_BRAND);
  });

  it('omite IVA si includeTax es false', () => {
    const result = normalizeProposalPayload({
      includeTax: false,
      montoIva: 50000,
    });

    expect(result.montoIva).toBe(0);
  });
});
