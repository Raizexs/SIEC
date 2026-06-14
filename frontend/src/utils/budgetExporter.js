import {
  buildBudgetFilename,
  flattenDesgloseRows,
  getMaterialLabel,
  normalizeDesglose,
} from './budgetExportShared.js';

export {
  buildBudgetFilename,
  flattenDesgloseRows,
  getMaterialLabel,
  normalizeDesglose,
} from './budgetExportShared.js';

/** @deprecated Solo tests legacy. */
export const SIEC_PDF_THEME = {
  navy: [15, 23, 42],
  orange: [249, 115, 22],
};

/**
 * Exporta presupuesto: PDF (propuesta HTML), Excel o CSV.
 * @param {'pdf' | 'xlsx' | 'csv'} format
 * @param {Record<string, unknown>} payload
 */
export const exportBudget = async (format, payload) => {
  const normalized = {
    ...payload,
    desglose: normalizeDesglose(payload.desglose),
  };

  if (format === 'pdf') {
    const { exportProposalPdf } = await import('../proposal/exportProposalDocument.js');
    return exportProposalPdf(normalized, buildBudgetFilename);
  }

  const { exportBudgetCSV, exportBudgetExcel } = await import('./budgetSpreadsheet.js');

  if (format === 'xlsx') {
    return exportBudgetExcel(normalized, buildBudgetFilename);
  }
  if (format === 'csv') {
    return exportBudgetCSV(normalized, buildBudgetFilename);
  }

  throw new Error(`Formato de exportación no soportado: ${format}`);
};
