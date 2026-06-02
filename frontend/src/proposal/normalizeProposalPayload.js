import {
  formatClp,
  getMaterialLabel,
  normalizeDesglose,
} from '../utils/budgetExportShared.js';

export const DEFAULT_BUSINESS_NAME = 'SIEC · Inteligencia Constructiva';
export const DEFAULT_FOOTER_BRAND = 'SIEC';

/** Etiqueta corta para el pie de página (logo + nombre visible). */
export const resolveFooterBrandName = (businessName) => {
  const trimmed = trimText(businessName);
  if (!trimmed) return DEFAULT_FOOTER_BRAND;

  const beforeDot = trimmed.split('·')[0].trim();
  if (/^siec$/i.test(beforeDot)) return DEFAULT_FOOTER_BRAND;

  return beforeDot || DEFAULT_FOOTER_BRAND;
};
export const DEFAULT_COVER_HEADLINE = 'Propuesta comercial';
export const DEFAULT_PROJECT_NAME = 'Proyecto sin título';
export const DEFAULT_MATERIAL_LABEL = 'Materialidad por definir';

/**
 * Quita prefijos redundantes "Propuesta comercial" del título de portada.
 * @param {unknown} name
 * @returns {string}
 */
export const normalizeCoverTitle = (name) => {
  const cleaned = String(name ?? '')
    .replace(/^\s*propuesta\s+comercial\s*[-–—:·|]\s*/i, '')
    .replace(/^\s*propuesta\s+comercial\s+/i, '')
    .replace(/^[·•\-–—:|]\s*/, '')
    .trim();

  return cleaned || DEFAULT_PROJECT_NAME;
};

const trimText = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

/**
 * @param {unknown} value
 * @param {number} [fallback]
 */
const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * @param {unknown} value
 * @param {string} [fallback]
 */
const toIsoDateString = (value, fallback = new Date().toISOString()) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

/**
 * @param {unknown} counts
 */
const normalizeCounts = (counts) => ({
  habitaciones: Math.max(0, Math.round(toFiniteNumber(counts?.habitaciones, 0))),
  banios: Math.max(0, Math.round(toFiniteNumber(counts?.banios, 0))),
});

/**
 * Normaliza el payload de exportación antes de renderizar la propuesta PDF.
 * Centraliza defaults, tipos, título de portada y totales financieros.
 *
 * @param {Record<string, unknown>} [raw]
 * @returns {import('./proposalPayload.types.js').NormalizedProposalPayload}
 */
export const normalizeProposalPayload = (raw = {}) => {
  const materialEstructuralId =
    raw.materialEstructuralId ?? raw.materialId ?? null;

  const materialNombre =
    trimText(raw.materialNombre) ||
    (materialEstructuralId != null
      ? getMaterialLabel(materialEstructuralId)
      : '') ||
    DEFAULT_MATERIAL_LABEL;

  const motorTotal = toFiniteNumber(raw.motorTotal, 0);
  const contingencyPct = Math.max(0, toFiniteNumber(raw.contingencyPct, 0));
  const deltaContingencia = toFiniteNumber(raw.deltaContingencia, 0);
  const subtotalConContingencia = toFiniteNumber(
    raw.subtotalConContingencia,
    motorTotal + deltaContingencia,
  );
  const includeTax = Boolean(raw.includeTax);
  const montoIva = includeTax ? Math.max(0, toFiniteNumber(raw.montoIva, 0)) : 0;

  const totalPreferido =
    raw.totalPreferido != null
      ? toFiniteNumber(raw.totalPreferido)
      : subtotalConContingencia + montoIva;

  const totalFormatted =
    trimText(raw.totalFormatted) || formatClp(totalPreferido ?? motorTotal);

  const sceneImage = trimText(raw.sceneImageDataUrl);

  return {
    projectName: normalizeCoverTitle(raw.projectName),
    coverHeadline: trimText(raw.coverHeadline) || DEFAULT_COVER_HEADLINE,
    businessName: trimText(raw.businessName) || DEFAULT_BUSINESS_NAME,
    footerBrandName:
      trimText(raw.footerBrandName) ||
      resolveFooterBrandName(trimText(raw.businessName) || DEFAULT_BUSINESS_NAME),
    reportFooter: trimText(raw.reportFooter),

    includeLogo: raw.includeLogo !== false,
    logoUrl: trimText(raw.logoUrl),
    signatureUrl: trimText(raw.signatureUrl),

    m2Totales: Math.max(0, toFiniteNumber(raw.m2Totales, 0)),
    materialEstructuralId,
    materialNombre,

    fechaPrecios: toIsoDateString(raw.fechaPrecios),
    fechaExportacion: toIsoDateString(raw.fechaExportacion),

    motorTotal,
    contingencyPct,
    deltaContingencia,
    subtotalConContingencia,
    montoIva,
    totalPreferido,
    totalFormatted,
    includeTax,

    desglose: normalizeDesglose(raw.desglose),
    counts: normalizeCounts(raw.counts),
    sceneImageDataUrl: sceneImage || null,
    pdfWatermark: Boolean(raw.pdfWatermark),
  };
};
