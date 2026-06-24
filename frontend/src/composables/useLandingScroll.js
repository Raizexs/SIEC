import { nextTick } from 'vue';

const SECTION_IDS = new Set(['que-es', 'como-funciona', 'beneficios']);

/** Scroll a sección de la landing sin escribir hash en la URL. */
export function useLandingScroll() {
  const clearHash = () => {
    if (typeof window === 'undefined') return;
    const { pathname, search } = window.location;
    if (window.location.hash) {
      history.replaceState(history.state, '', pathname + search);
    }
  };

  const scrollToSection = (id) => {
    if (typeof window === 'undefined' || !SECTION_IDS.has(id)) return;
    clearHash();
    nextTick(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const consumeInitialHash = () => {
    if (typeof window === 'undefined') return;
    const id = window.location.hash.replace(/^#/, '');
    clearHash();
    if (SECTION_IDS.has(id)) {
      window.setTimeout(() => scrollToSection(id), 120);
    }
  };

  return { scrollToSection, clearHash, consumeInitialHash };
}
