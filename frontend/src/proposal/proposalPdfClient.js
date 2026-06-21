import { useAuthStore } from '../stores/auth';
import logger from '../utils/logger.js';
import { API_BASE_URL } from '../config/apiConfig.js';

const API_BASE = API_BASE_URL;

const parseErrorDetail = (payload, status) => {
  if (!payload) return `HTTP ${status}`;
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
      .join('; ');
  }
  if (typeof payload.detail === 'string') return payload.detail;
  return payload.message || `HTTP ${status}`;
};

const isServerPdfUnavailable = (status, message) => {
  if (status === 0 || status === 401 || status === 403 || status === 503 || status === 404) {
    return true;
  }
  const m = message.toLowerCase();
  return (
    m.includes('playwright') ||
    m.includes('chromium') ||
    m.includes('jwt') ||
    m.includes('token') ||
    m.includes('autoriz') ||
    m.includes('no disponible') ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('conectar con el api')
  );
};

export const checkProposalPdfServer = async () => {
  try {
    const res = await fetch(`${API_BASE}/export/proposal-pdf/status`);
    if (!res.ok) return { available: false, apiBase: API_BASE };
    return { ...(await res.json()), apiBase: API_BASE };
  } catch (err) {
    logger.error('[proposalPdfClient] Error verificando estado del servidor PDF:', err);
    return { available: false, apiBase: API_BASE };
  }
};

/** Si el motor Playwright no está listo, ir directo a impresión del navegador. */
export const isPlaywrightPdfReady = async () => {
  const status = await checkProposalPdfServer();
  return Boolean(status?.available);
};

/**
 * Descarga PDF vectorial generado en backend (Playwright / Chromium print).
 * @param {string} html
 * @param {string} filename
 * @throws {Error} con mensaje legible
 */
export const downloadVectorProposalPdf = async (html, filename) => {
  const auth = useAuthStore();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/pdf',
  };
  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/export/proposal-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ html, filename }),
    });
  } catch (err) {
    const msg =
      err?.message?.includes('fetch') || err?.name === 'TypeError'
        ? `No se pudo conectar con el API (${API_BASE}). ¿Está corriendo el backend?`
        : err?.message || 'Error de red al exportar PDF';
    const error = new Error(msg);
    error.status = 0;
    error.retryable = true;
    throw error;
  }

  if (!res.ok) {
    let payload = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (err) {
        logger.error('[proposalPdfClient] Error al parsear respuesta de error:', err);
        payload = text;
      }
    }
    const detail = parseErrorDetail(payload, res.status);
    const error = new Error(detail);
    error.status = res.status;
    error.retryable = isServerPdfUnavailable(res.status, detail);
    throw error;
  }

  const blob = await res.blob();
  if (!blob.size) {
    const error = new Error('El servidor devolvió un PDF vacío.');
    error.status = 502;
    error.retryable = true;
    throw error;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
