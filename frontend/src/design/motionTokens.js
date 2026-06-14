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

const MOTION_STORAGE_KEY = "siec.motion";

/** `system` | `full` | `reduced` — controla animaciones GSAP + clase `html.siec-motion-reduced`. */
export function getMotionPreference() {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(MOTION_STORAGE_KEY);
  if (v === "full" || v === "reduced" || v === "system") return v;
  return "system";
}

/**
 * Fuerza visibilidad en bloques con `data-motion` (mata tweens colgados).
 * Útil al pasar de «reducido» a «animaciones activadas» o tras cambiar la
 * preferencia durante una transición de ruta.
 */
export function resetMotionRevealState() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-motion]").forEach((el) => {
    gsap.killTweensOf(el);
    gsap.set(el, {
      autoAlpha: 1,
      y: 0,
      x: 0,
      scale: 1,
      clearProps: "transform,opacity,willChange",
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
