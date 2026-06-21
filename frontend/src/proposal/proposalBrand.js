import logger from '../utils/logger.js';

/** Logo SIEC (portada, pie) — /public/siec-logo.svg */
export const SIEC_LOGO_FILE = 'siec-logo.svg';

/** Firma manuscrita SIEC — /public/firma-siec.svg */
export const SIEC_SIGNATURE_FILE = 'firma-siec.svg';

const resolvePublicAssetUrl = (fileName) => {
  if (typeof window === 'undefined') return `/${fileName}`;

  const base = import.meta.env.BASE_URL || '/';
  const path = base.endsWith('/')
    ? `${base}${fileName}`
    : `${base}/${fileName}`;
  return new URL(path, window.location.origin).href;
};

export const resolveBrandLogoUrl = () => resolvePublicAssetUrl(SIEC_LOGO_FILE);

export const resolveBrandSignatureUrl = () =>
  resolvePublicAssetUrl(SIEC_SIGNATURE_FILE);

const fetchSvgDataUrl = async (fileName) => {
  const httpUrl = resolvePublicAssetUrl(fileName);

  if (typeof window === 'undefined') return httpUrl;

  try {
    const response = await fetch(httpUrl);
    if (!response.ok) throw new Error(`${fileName} HTTP ${response.status}`);
    const svgText = await response.text();
    const encoded = btoa(unescape(encodeURIComponent(svgText)));
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (err) {
    logger.error(`[proposalBrand] Error al convertir ${fileName} a data URL:`, err);
    return httpUrl;
  }
};

let cachedLogoDataUrl = null;
let cachedSignatureDataUrl = null;

/**
 * Incrusta el logo SVG como data URL para PDF (iframe / html2canvas sin fallos CORS).
 * @returns {Promise<string>}
 */
export const resolveBrandLogoDataUrl = async () => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  cachedLogoDataUrl = await fetchSvgDataUrl(SIEC_LOGO_FILE);
  return cachedLogoDataUrl;
};

/**
 * Incrusta la firma SVG como data URL para PDF.
 * @returns {Promise<string>}
 */
export const resolveBrandSignatureDataUrl = async () => {
  if (cachedSignatureDataUrl) return cachedSignatureDataUrl;
  cachedSignatureDataUrl = await fetchSvgDataUrl(SIEC_SIGNATURE_FILE);
  return cachedSignatureDataUrl;
};
