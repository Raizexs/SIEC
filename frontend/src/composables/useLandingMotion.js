import { onMounted, onBeforeUnmount, onActivated, nextTick, unref } from 'vue';
import { gsap } from 'gsap';
import { bindCardHover } from './useMotionContext';
import { prefersReducedMotion, waitForRouteEnter, runBriefEntranceReveal } from '../design/motionTokens';

/**
 * Reveal + hover GSAP para la landing pública.
 * Primera visita y regreso desde legal: fade breve alineado con LegalDocumentShell.
 */
export function useLandingMotion(rootRef) {
  let cleanups = [];
  let revealCtx;
  let hasRevealedOnce = false;
  let skipActivateReveal = false;

  const getRoot = () => unref(rootRef);

  const unbindAll = () => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  };

  const setReady = (root) => {
    root?.classList.add('landing-shell--ready');
  };

  const bind = (root, selector, options) => {
    const cleanup = bindCardHover(root.querySelectorAll(selector), options);
    if (cleanup) cleanups.push(cleanup);
  };

  const bindLandingHover = () => {
    const root = getRoot();
    if (!root) return;

    unbindAll();

    const chevron = '[data-motion-hover="chevron"]';
    const icon = 'svg';

    bind(root, '[data-landing-hover="brand"]', { lift: -2, iconSelector: icon });
    bind(root, '[data-landing-hover="nav-item"]', { lift: -2 });
    bind(root, '[data-landing-hover="nav-action"]', { lift: -3, chevronSelector: chevron, iconSelector: icon });
    bind(root, '[data-landing-hover="footer-brand"]', { lift: -2, iconSelector: icon });
    bind(root, '[data-landing-hover="footer-link"]', { lift: -2 });
    bind(root, '[data-landing-hover="preview"]', { lift: -6 });
    bind(root, '[data-landing-hover="feature"]', { lift: -4, iconSelector: icon });
    bind(root, '[data-landing-hover="cta-panel"]', { lift: -3 });
    bind(root, '[data-landing-hover="step-card"]', { lift: -5, iconSelector: icon });
    bind(root, '[data-landing-hover="benefit-card"]', { lift: -4, iconSelector: icon });
    bind(root, '[data-landing-hover="chrome"]', { lift: -1 });
  };

  const restoreVisible = (root) => {
    const layers = root.querySelectorAll('[data-landing-reveal]');
    gsap.killTweensOf(layers);
    gsap.set(layers, { autoAlpha: 1, y: 0, clearProps: 'transform,opacity,visibility' });
    setReady(root);
  };

  const runReveal = async ({ reentry = false } = {}) => {
    const root = getRoot();
    if (!root) return;

    await waitForRouteEnter();
    await nextTick();

    const layers = root.querySelectorAll('[data-landing-reveal]');
    if (!layers.length) {
      setReady(root);
      bindLandingHover();
      hasRevealedOnce = true;
      return;
    }

    revealCtx?.kill();

    if (prefersReducedMotion()) {
      restoreVisible(root);
      bindLandingHover();
      hasRevealedOnce = true;
      return;
    }

    revealCtx = gsap.context(() => {
      runBriefEntranceReveal(layers, {
        root,
        readyClass: 'landing-shell--ready',
        stagger: reentry ? 0.05 : 0.07,
        durationScale: reentry ? 0.92 : 1,
        distanceScale: reentry ? 0.85 : 0.72,
        onComplete: () => bindLandingHover(),
      });
    }, root);

    if (!reentry) bindLandingHover();
    hasRevealedOnce = true;
  };

  const onPreferenceChange = () => {
    const root = getRoot();
    if (!root) return;
    if (prefersReducedMotion()) {
      restoreVisible(root);
    }
    bindLandingHover();
  };

  onMounted(() => {
    skipActivateReveal = true;
    runReveal({ reentry: false });
    window.addEventListener('siec:motion-preference', onPreferenceChange);
  });

  onActivated(() => {
    if (skipActivateReveal) {
      skipActivateReveal = false;
      return;
    }
    if (!hasRevealedOnce) return;
    runReveal({ reentry: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('siec:motion-preference', onPreferenceChange);
    revealCtx?.kill();
    unbindAll();
  });

  return { rebind: bindLandingHover, reveal: runReveal };
}
