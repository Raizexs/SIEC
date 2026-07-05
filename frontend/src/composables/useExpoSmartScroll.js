import { nextTick } from 'vue';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../design/motionTokens';
import { EXPOSMART_SECTION_IDS } from '../constants/exposmartContent.js';

let scrollTopTween;

/** Scroll a sección de ExpoSmart sin escribir hash en la URL. */
export function useExpoSmartScroll() {
  const clearHash = () => {
    if (typeof window === 'undefined') return;
    const { pathname, search } = window.location;
    if (window.location.hash) {
      history.replaceState(history.state, '', pathname + search);
    }
  };

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    clearHash();

    const currentY = window.scrollY || document.documentElement.scrollTop;
    if (currentY <= 4) return;

    if (prefersReducedMotion()) {
      window.scrollTo(0, 0);
      return;
    }

    scrollTopTween?.kill();

    const scroll = { y: currentY };
    scrollTopTween = gsap.to(scroll, {
      y: 0,
      duration: 0.62,
      ease: 'power2.out',
      onUpdate: () => window.scrollTo(0, scroll.y),
    });
  };

  const scrollToSection = (id) => {
    if (typeof window === 'undefined' || !EXPOSMART_SECTION_IDS.has(id)) return;
    clearHash();
    nextTick(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const consumeInitialHash = () => {
    if (typeof window === 'undefined') return;
    const id = window.location.hash.replace(/^#/, '');
    clearHash();
    if (EXPOSMART_SECTION_IDS.has(id)) {
      window.setTimeout(() => scrollToSection(id), 120);
    }
  };

  return { scrollToSection, scrollToTop, clearHash, consumeInitialHash };
}
