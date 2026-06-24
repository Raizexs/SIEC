import { gsap } from "gsap";

export const motionTokens = {
  duration: {
    instant: 0.12,
    fast: 0.22,
    base: 0.38,
    slow: 0.55,
  },
  /** Press / release (installGlobalMicroMotion) */
  micro: {
    press: 0.1,
    release: 0.38,
    pressScale: 0.91,
    easePress: "power3.out",
    easeRelease: "elastic.out(1, 0.55)",
  },
  ease: {
    standardOut: "power2.out",
    emphasizedOut: "power3.out",
    standardInOut: "power2.inOut",
    /** Entradas un poco más “vivas” sin ser caricaturescas */
    entrance: "power3.out",
  },
  stagger: {
    tight: 0.04,
    base: 0.07,
    loose: 0.1,
  },
  distance: {
    xs: 8,
    sm: 12,
    md: 18,
    lg: 26,
  },
};

/** Perfiles por tier — `standard` usa tokens actuales; `premium` para Animaciones activadas. */
export const motionProfiles = {
  standard: {
    duration: motionTokens.duration,
    ease: motionTokens.ease,
    stagger: motionTokens.stagger,
    distance: motionTokens.distance,
    micro: motionTokens.micro,
    blur: null,
    overlap: { heroSection: 0.28, sectionCard: 0.2, cardItem: 0.18 },
    cardScale: null,
    routeDelay: 100,
  },
  premium: {
    duration: {
      instant: 0.14,
      fast: 0.28,
      base: 0.48,
      slow: 0.62,
    },
    ease: {
      standardOut: "power3.out",
      emphasizedOut: "power4.out",
      standardInOut: "power2.inOut",
      entrance: "power4.out",
    },
    stagger: {
      tight: 0.05,
      base: 0.09,
      loose: 0.12,
    },
    distance: {
      xs: 10,
      sm: 16,
      md: 22,
      lg: 32,
    },
    micro: {
      press: 0.08,
      release: 0.5,
      pressScale: 0.94,
      easePress: "power3.out",
      easeRelease: "elastic.out(1, 0.48)",
    },
    blur: { subtle: 4, medium: 8 },
    overlap: { heroSection: 0.4, sectionCard: 0.33, cardItem: 0.29 },
    cardScale: 0.98,
    routeDelay: 120,
  },
};

const MOTION_STORAGE_KEY = "siec.motion";

/** `system` | `full` | `reduced` — controla animaciones GSAP + clase `html.siec-motion-reduced`. */
export function getMotionPreference() {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(MOTION_STORAGE_KEY);
  if (v === "full" || v === "reduced" || v === "system") return v;
  return "system";
}

/** `none` | `standard` | `premium` — tier efectivo para animaciones GSAP. */
export function getMotionTier() {
  if (prefersReducedMotion()) return "none";
  if (getMotionPreference() === "full") return "premium";
  return "standard";
}

/** Perfil activo según tier (`standard` o `premium`). */
export function getMotionProfile() {
  const tier = getMotionTier();
  if (tier === "premium") return motionProfiles.premium;
  return motionProfiles.standard;
}

/** Micro-interacción según tier. */
export function getMicroMotionProfile() {
  return getMotionProfile().micro;
}

/**
 * Fuerza visibilidad en bloques con `data-motion` (mata tweens colgados).
 * Útil al pasar de «reducido» a «animaciones activadas» o tras cambiar la
 * preferencia durante una transición de ruta.
 */
export function resetMotionRevealState() {
  if (typeof document === "undefined") return;
  const selectors = "[data-motion], [data-legal-motion]";
  document.querySelectorAll(selectors).forEach((el) => {
    gsap.killTweensOf(el);
    gsap.set(el, {
      autoAlpha: 1,
      y: 0,
      x: 0,
      scale: 1,
      clearProps: "transform,opacity,willChange,filter",
    });
  });
}

export function setMotionPreference(value) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(MOTION_STORAGE_KEY, value);
  syncMotionHtmlClass();
  resetMotionRevealState();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("siec:motion-preference"));
  }
}

/** Alinea `html.siec-motion-reduced` con la preferencia efectiva (OS + SIEC). */
export function syncMotionHtmlClass() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(
    "siec-motion-reduced",
    prefersReducedMotion(),
  );
}

/**
 * Movimiento reducido efectivo: preferencia SIEC `reduced`, o `system` + OS,
 * o `full` fuerza animaciones aunque el OS pida reducir.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  const pref = getMotionPreference();
  if (pref === "reduced") return true;
  if (pref === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Espera doble rAF (layout estable antes de tweens). */
export function waitForNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/** Espera evento de entrada de ruta o timeout de seguridad. */
export function waitForRouteEnter(timeoutMs = 400) {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("siec:route-enter-complete", onRoute);
      resolve();
    };
    const onRoute = () => finish();
    window.addEventListener("siec:route-enter-complete", onRoute, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

export function dispatchRouteEnterComplete() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("siec:route-enter-complete"));
}

/**
 * Entrada breve (fade + slide) — misma curva que LegalDocumentShell.
 * @param {Element | Element[] | NodeList} targets
 * @param {object} [options]
 * @returns {import('gsap').core.Tween | null}
 */
export function runBriefEntranceReveal(targets, options = {}) {
  const {
    root = null,
    readyClass = null,
    stagger = 0,
    durationScale = 1,
    distanceScale = 1,
    onComplete = null,
  } = options;

  const els = gsap.utils.toArray(targets);
  if (!els.length) {
    onComplete?.();
    return null;
  }

  gsap.killTweensOf(els);
  if (root && readyClass) root.classList.remove(readyClass);

  if (prefersReducedMotion()) {
    gsap.set(els, { autoAlpha: 1, y: 0, clearProps: "transform,opacity,visibility" });
    if (root && readyClass) root.classList.add(readyClass);
    onComplete?.();
    return null;
  }

  const profile = getMotionProfile();
  gsap.set(els, { autoAlpha: 0, y: profile.distance.sm * distanceScale });

  return gsap.to(els, {
    autoAlpha: 1,
    y: 0,
    duration: profile.duration.base * durationScale,
    ease: profile.ease.entrance,
    stagger,
    clearProps: "transform",
    onComplete: () => {
      if (root && readyClass) root.classList.add(readyClass);
      gsap.set(els, { autoAlpha: 1 });
      onComplete?.();
    },
  });
}
