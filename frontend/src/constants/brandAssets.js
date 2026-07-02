import logoHorizontalLight from '../assets/siec-logo-horizontal-light.svg';
import logoHorizontalDark from '../assets/siec-logo-horizontal-dark.svg';
import logoMonochromeNavy from '../assets/siec-logo-monochrome-navy.svg';
import logoMonochromeWhite from '../assets/siec-logo-monochrome-white.svg';
import isotipoLight from '../assets/siec-isotipo-light.svg';
import isotipoDark from '../assets/siec-isotipo-dark.svg';
import faviconSvg from '../assets/siec-favicon.svg';

export const BRAND_ASSETS = {
  horizontal: {
    light: logoHorizontalLight,
    dark: logoHorizontalDark,
  },
  monochrome: {
    light: logoMonochromeNavy,
    dark: logoMonochromeWhite,
  },
  isotipo: {
    light: isotipoLight,
    dark: isotipoDark,
  },
  favicon: faviconSvg,
};

/** Logo horizontal del navbar según tema. */
export const getHorizontalLogo = (isDark) =>
  isDark ? BRAND_ASSETS.horizontal.dark : BRAND_ASSETS.horizontal.light;

/** Isotipo cuadrado (rail, iconos compactos). */
export const getIsotipoLogo = (isDark) =>
  isDark ? BRAND_ASSETS.isotipo.dark : BRAND_ASSETS.isotipo.light;

/** Logo monocromo del footer según tema. */
export const getMonochromeLogo = (isDark) =>
  isDark ? BRAND_ASSETS.monochrome.dark : BRAND_ASSETS.monochrome.light;
