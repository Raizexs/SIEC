import { onMounted, onUnmounted, nextTick } from "vue";
import { gsap } from "gsap";
import {
  getMotionProfile,
  getMotionTier,
  prefersReducedMotion,
  waitForRouteEnter,
  waitForNextFrame,
} from "../design/motionTokens";
import { runReveal, setMotionFinalState, filterMotionTargets } from "./useMotionContext";

/**
 * Entrada escalonada para bloques con `data-motion`.
 * Tier premium/standard inferido de preferencias; `mode: 'off'` fuerza skip.
 */
export function useProMotion(rootRef, options = {}) {
  let ctx;
  let cancelled = false;

  const {
    delay: extraDelay = 0,
    /** Espera siec:route-enter-complete antes del stagger (app shell). */
    delayUntilRoute = false,
    /** 'off' | 'standard' | 'premium' | 'auto' */
    mode = "auto",
    /** Opciones pasadas a runReveal (pace, levels, …). */
    revealOptions = {},
    /** @deprecated Usar mode: 'off' */
    skipIntro = false,
  } = options;

  const resolveMode = () => {
    if (skipIntro || mode === "off") return "off";
    if (mode === "standard" || mode === "premium") return mode;
    return getMotionTier() === "premium" ? "premium" : getMotionTier() === "standard" ? "standard" : "off";
  };

  const runIntro = () => {
    if (!rootRef?.value) return;

    const targets = filterMotionTargets(
      rootRef.value.querySelectorAll("[data-motion]"),
      rootRef.value,
    );
    if (!targets.length) return;

    const effectiveMode = resolveMode();
    if (prefersReducedMotion() || effectiveMode === "off") {
      setMotionFinalState(targets);
      return;
    }

    const profile = getMotionProfile();
    const levels = revealOptions.levels ?? ["hero", "section", "card", "item"];
    const shellOnly = levels.length === 1 && levels[0] === "hero";
    const routeDelay =
      delayUntilRoute && !shellOnly ? profile.routeDelay / 1000 : 0;

    ctx = gsap.context(() => {
      runReveal(rootRef.value, {
        delay: routeDelay + extraDelay,
        pace: shellOnly ? "snappy" : "smooth",
        ...revealOptions,
        levels,
      });
    }, rootRef.value);
  };

  const scheduleIntro = async () => {
    if (delayUntilRoute) await waitForRouteEnter();
    await waitForNextFrame();
    if (cancelled || !rootRef?.value) return;
    runIntro();
  };

  onMounted(() => {
    nextTick(() => {
      scheduleIntro();
    });
  });

  onUnmounted(() => {
    cancelled = true;
    ctx?.revert();
  });

  return { replay: scheduleIntro };
}

/** Reveal bajo demanda (tabs, steps) sin montar hook completo. */
export function replayMotionReveal(rootEl, options = {}) {
  if (!rootEl || prefersReducedMotion()) {
    if (rootEl) {
      setMotionFinalState(rootEl.querySelectorAll("[data-motion], [data-legal-motion]"));
    }
    return;
  }
  const targets = filterMotionTargets(
    rootEl.querySelectorAll("[data-motion]"),
    rootEl,
  );
  gsap.killTweensOf(targets);
  runReveal(rootEl, options);
}
