/** Quita @import del SVG: Plus Jakarta Sans ya está en index.html. */
export const prepareInlineSvg = (raw) =>
  raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(/<style>@import[^<]*<\/style>\s*/i, '');

const inlineSvgCache = new Map();

const loadInlineSvg = async (key, importer) => {
  if (inlineSvgCache.has(key)) return inlineSvgCache.get(key);
  const raw = (await importer()).default;
  const markup = prepareInlineSvg(raw);
  inlineSvgCache.set(key, markup);
  return markup;
};

export const loadHorizontalLogoInline = (isDark) =>
  isDark
    ? loadInlineSvg('horizontal-dark', () => import('../assets/siec-logo-horizontal-dark.svg?raw'))
    : loadInlineSvg('horizontal-light', () => import('../assets/siec-logo-horizontal-light.svg?raw'));

export const loadMonochromeLogoInline = (isDark) =>
  isDark
    ? loadInlineSvg('monochrome-white', () => import('../assets/siec-logo-monochrome-white.svg?raw'))
    : loadInlineSvg('monochrome-navy', () => import('../assets/siec-logo-monochrome-navy.svg?raw'));
