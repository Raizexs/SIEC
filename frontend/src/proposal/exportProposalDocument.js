import { buildProposalHtml } from './buildProposalHtml.js';
import { normalizeProposalPayload } from './normalizeProposalPayload.js';
import {
  resolveBrandLogoDataUrl,
  resolveBrandSignatureDataUrl,
} from './proposalBrand.js';
import { downloadProposalPdfInBrowser } from './proposalPdfBrowser.js';
import {
  downloadVectorProposalPdf,
  isPlaywrightPdfReady,
} from './proposalPdfClient.js';

/**
 * Exporta propuesta PDF con descarga automática (sin diálogo de impresión).
 * 1) Backend Playwright (texto vectorial) si está disponible.
 * 2) Generación en navegador (HTML/CSS premium → PDF multipágina).
 */
export const exportProposalPdf = async (payload, buildFilename) => {
  if (typeof document === 'undefined') {
    throw new Error('La exportación PDF solo está disponible en el navegador.');
  }

  const [logoUrl, signatureUrl] = await Promise.all([
    payload.logoUrl || resolveBrandLogoDataUrl(),
    payload.signatureUrl || resolveBrandSignatureDataUrl(),
  ]);

  const prepared = { ...payload, logoUrl, signatureUrl };
  const normalized = normalizeProposalPayload(prepared);

  const html = buildProposalHtml(normalized);
  const filename = buildFilename(normalized.projectName, 'pdf');

  if (await isPlaywrightPdfReady()) {
    try {
      await downloadVectorProposalPdf(html, filename);
      return;
    } catch (err) {
      console.warn('[PDF] API vectorial falló, usando generador en navegador:', err?.message);
    }
  }

  await downloadProposalPdfInBrowser(html, filename);
};
