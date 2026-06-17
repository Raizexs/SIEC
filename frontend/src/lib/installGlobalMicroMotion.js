import { gsap } from "gsap";
import {
  getMicroMotionProfile,
  getMotionProfile,
  prefersReducedMotion,
} from "../design/motionTokens";

/**
 * Micro-interacción táctil global: press con GSAP + soltado tipo resorte.
 * Delegación en `document` (captura) para incluir portales y contenido fuera de #app.
 * Respeta `prefersReducedMotion()` en cada evento (incl. preferencia SIEC en Preferencias).
 */
const PRESSABLE_SELECTOR = [
  "button:not(:disabled):not([data-no-motion])",
  '[role="button"]:not([aria-disabled="true"]):not([data-no-motion])',
  '.rail-link:not([aria-disabled="true"])',
  "a.btn-primary",
  "a.btn-accent",
  "a.btn-ghost",
].join(",");

function isExcluded(el) {
  if (!el?.closest) return true;
  if (el.closest(".scene3d-root")) return true;
  if (el.closest("canvas")) return true;
  if (el.closest("[data-no-motion]")) return true;
  return false;
}

export function installGlobalMicroMotion() {
  if (typeof window === "undefined") return () => {};

  let pressedEl = null;

  const micro = () => getMicroMotionProfile();
  const profile = () => getMotionProfile();

  const onPointerDown = (event) => {
    if (prefersReducedMotion()) return;
    if (event.button !== 0) return;
    const el = event.target.closest(PRESSABLE_SELECTOR);
    if (!el || isExcluded(el)) return;

    const { press, pressScale, easePress } = micro();

    if (pressedEl && pressedEl !== el) {
      const prev = pressedEl;
      pressedEl = null;
      if (document.body.contains(prev)) {
        gsap.to(prev, {
          scale: 1,
          duration: profile().duration.fast,
          ease: profile().ease.standardOut,
          overwrite: "auto",
        });
      }
    }

    pressedEl = el;
    gsap.killTweensOf(el);
    gsap.set(el, { transformOrigin: "50% 50%" });
    gsap.to(el, {
      scale: pressScale,
      duration: press,
      ease: easePress,
      overwrite: "auto",
    });
  };

  const releasePress = () => {
    if (!pressedEl) return;
    const el = pressedEl;
    pressedEl = null;
    if (prefersReducedMotion()) return;
    if (!document.body.contains(el)) return;
    const { release, easeRelease } = micro();
    gsap.to(el, {
      scale: 1,
      duration: release,
      ease: easeRelease,
      overwrite: "auto",
    });
  };

  document.addEventListener("pointerdown", onPointerDown, { capture: true });
  window.addEventListener("pointerup", releasePress, { capture: true });
  window.addEventListener("pointercancel", releasePress, { capture: true });

  return () => {
    document.removeEventListener("pointerdown", onPointerDown, {
      capture: true,
    });
    window.removeEventListener("pointerup", releasePress, { capture: true });
    window.removeEventListener("pointercancel", releasePress, {
      capture: true,
    });
  };
}
