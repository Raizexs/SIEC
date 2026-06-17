import { gsap } from "gsap";
import {
  getMotionProfile,
  getMotionTier,
  prefersReducedMotion,
  waitForNextFrame,
} from "../design/motionTokens";

/**
 * Utilidades GSAP compartidas — reveal, crossfade, card hover.
 * Respeta tier premium/standard/none vía getMotionTier().
 *
 * Contrato motion SIEC:
 * - Bloques animables: `data-motion="hero|section|card|item"` (canvas: `data-no-motion`)
 * - Modales: `useMotionModal(showRef, { backdropRef, panelRef })`
 * - Preferencia en caliente: `useMotionPreferenceSync(rootRef)` + evento `siec:motion-preference`
 * - Páginas: `useProMotion(rootRef, { delayUntilRoute })` en app shell; `{ mode: 'auto' }` en auth bare
 *
 * Patrón orquestador (Settings / Dashboard / Workspace):
 * 1. `motionRoot` + `useProMotion` — solo shell persistente (hero, nav, toggle)
 * 2. `contentRef` + `data-no-motion` — tabs/steps/vistas intercambiables
 * 3. `replayMotionReveal(contentRef, PRESET)` — snappy, secuencia cancelable (`revealSeq`)
 * 4. Post-async — tras fetch o `v-if` mount, replay scoped al contenedor que apareció
 * 5. Selectores secundarios (`data-legal-motion`, canvas) — lifecycle propio, no mezclar en el orquestador
 */

export function setMotionFinalState(targets) {
  const list = gsap.utils.toArray(targets).filter(Boolean);
  if (!list.length) return;
  gsap.set(list, {
    autoAlpha: 1,
    y: 0,
    x: 0,
    scale: 1,
    filter: "none",
    clearProps: "transform,opacity,willChange,filter",
  });
}

/** Excluye nodos bajo `[data-no-motion]` ajeno al root del reveal activo. */
export function filterMotionTargets(elements, root) {
  return gsap.utils.toArray(elements).filter((el) => {
    if (!el || !root) return false;
    const zone = el.closest("[data-no-motion]");
    if (!zone) return true;
    return zone === root;
  });
}

/**
 * Reveal escalonado con selectores data-motion o data-legal-motion.
 * @param {HTMLElement} root
 * @param {object} options
 * @param {'default'|'snappy'|'smooth'} [options.pace] — snappy: tabs rápidos; smooth: dashboard/workspace
 * @param {Array<'hero'|'section'|'card'|'item'>} [options.levels]
 */
export function runReveal(root, options = {}) {
  if (!root || prefersReducedMotion()) {
    if (root) {
      setMotionFinalState(root.querySelectorAll("[data-motion], [data-legal-motion]"));
    }
    return null;
  }

  const profile = getMotionProfile();
  const tier = getMotionTier();
  const {
    delay = 0,
    selector = "[data-motion]",
    groups = null,
    pace = "default",
    levels = ["hero", "section", "card", "item"],
  } = options;

  const snappy = pace === "snappy";
  const smooth = pace === "smooth";

  let y;
  let duration;
  let ease;
  let stagger;
  let overlap;

  if (smooth) {
    y = Math.max(4, Math.round(profile.distance.xs * 0.55));
    duration = profile.duration.base * 0.95;
    ease = profile.ease.entrance;
    stagger = profile.stagger.base;
    overlap = {
      heroSection: profile.overlap.heroSection * 1.12,
      sectionCard: profile.overlap.sectionCard * 1.18,
      cardItem: profile.overlap.cardItem * 1.14,
    };
  } else if (snappy) {
    y = profile.distance.sm;
    duration = profile.duration.fast;
    ease = profile.ease.emphasizedOut;
    stagger = profile.stagger.tight * 0.85;
    overlap = {
      heroSection: profile.overlap.heroSection * 1.25,
      sectionCard: profile.overlap.sectionCard * 1.3,
      cardItem: profile.overlap.cardItem * 1.2,
    };
  } else {
    y = profile.distance.md + 4;
    duration = profile.duration.base;
    ease = profile.ease.entrance;
    stagger = profile.stagger.base;
    overlap = profile.overlap;
  }

  let hero;
  let sections;
  let cards;
  let items;

  if (groups) {
    hero = gsap.utils.toArray(groups.hero || []);
    sections = gsap.utils.toArray(groups.section || []);
    cards = gsap.utils.toArray(groups.card || []);
    items = gsap.utils.toArray(groups.item || []);
  } else if (selector === "[data-legal-motion]") {
    const label = root.querySelector('[data-legal-motion="label"]');
    const cardEls = root.querySelectorAll('[data-legal-motion="card"]');
    hero = label ? [label] : [];
    cards = [...cardEls];
    sections = [];
    items = [];
  } else {
    hero = filterMotionTargets(root.querySelectorAll('[data-motion="hero"]'), root);
    sections = filterMotionTargets(root.querySelectorAll('[data-motion="section"]'), root);
    cards = filterMotionTargets(root.querySelectorAll('[data-motion="card"]'), root);
    items = filterMotionTargets(root.querySelectorAll('[data-motion="item"]'), root);
  }

  const allAnimated = filterMotionTargets(
    [...hero, ...sections, ...cards, ...items],
    root,
  );
  if (!allAnimated.length) return null;

  if (!levels.includes("hero")) hero = [];
  if (!levels.includes("section")) sections = [];
  if (!levels.includes("card")) cards = [];
  if (!levels.includes("item")) items = [];

  const animated = filterMotionTargets(
    [...hero, ...sections, ...cards, ...items],
    root,
  );
  if (!animated.length) return null;

  const allowBlur =
    !snappy &&
    tier === "premium" &&
    profile.blur &&
    animated.length <= 20;

  gsap.set(animated, { willChange: "transform, opacity" });

  const tl = gsap.timeline({
    defaults: { duration, ease },
    delay,
  });

  const heroY = y + profile.distance.xs;
  const heroFrom = {
    autoAlpha: 0,
    y: heroY,
    stagger: profile.stagger.tight,
  };
  if (tier === "premium" && profile.blur && allowBlur) {
    heroFrom.filter = `blur(${Math.min(profile.blur.subtle, 8)}px)`;
  }

  if (hero.length) tl.from(hero, heroFrom);

  if (sections.length) {
    const sectionFrom = {
      autoAlpha: 0,
      y,
      stagger: smooth ? stagger : profile.stagger.tight,
      force3D: smooth,
    };
    if (tier === "premium" && profile.blur && allowBlur) {
      sectionFrom.filter = `blur(${Math.min(profile.blur.subtle, 8)}px)`;
    }
    tl.from(
      sections,
      sectionFrom,
      hero.length ? `-=${overlap.heroSection}` : 0,
    );
  }

  if (cards.length) {
    const cardFrom = {
      autoAlpha: 0,
      y: y - 2,
      stagger,
      force3D: smooth || cards.length > 6,
    };
    if (tier === "premium" && profile.cardScale && !snappy) {
      cardFrom.scale = smooth ? Math.max(0.992, profile.cardScale + 0.012) : profile.cardScale;
    }
    tl.from(cards, cardFrom, sections.length || hero.length ? `-=${overlap.sectionCard}` : 0);
  }

  if (items.length) {
    const itemFrom = {
      autoAlpha: 0,
      y: Math.max(3, y - profile.distance.xs),
      stagger: smooth ? stagger : profile.stagger.tight,
      force3D: smooth || items.length > 6,
    };
    tl.from(
      items,
      itemFrom,
      cards.length || sections.length ? `-=${overlap.cardItem}` : 0,
    );
  }

  tl.call(() => {
    gsap.set(animated, { clearProps: "willChange" });
  });

  tl.eventCallback("onComplete", () => {
    setMotionFinalState(animated);
  });

  return tl;
}

/** Preset rápido para tabs de Settings (sections/cards, sin items). */
export const SETTINGS_TAB_REVEAL = {
  pace: "snappy",
  levels: ["section", "card"],
};

/** Preset fluido para Dashboard (tabs + grid). */
export const DASHBOARD_TAB_REVEAL = {
  pace: "smooth",
  levels: ["section", "card", "item"],
};

/** Preset fluido para pasos del workspace (intro inicial, solo cards). */
export const WORKSPACE_STEP_REVEAL = {
  pace: "smooth",
  levels: ["card"],
};

/** Opciones para crossfade paralelo entre paneles de paso. */
export const WORKSPACE_STEP_SWAP = {
  pace: "smooth",
};

/**
 * Replay sin flash: neutraliza estado, luego `.from()` en un solo tween.
 * Preferir esto sobre kill + gsap.set(autoAlpha:0) + replay.
 */
export function smoothReplayReveal(rootEl, options = {}) {
  if (!rootEl || prefersReducedMotion()) {
    if (rootEl) {
      setMotionFinalState(rootEl.querySelectorAll("[data-motion], [data-legal-motion]"));
    }
    return null;
  }

  const targets = filterMotionTargets(
    rootEl.querySelectorAll("[data-motion]"),
    rootEl,
  );
  gsap.killTweensOf(targets);
  setMotionFinalState(targets);
  return runReveal(rootEl, options);
}

/**
 * Primera pintura tras mount: stagger ligero sin pre-ocultar (evita flash azul vacío).
 */
export function introMotionReveal(rootEl, options = {}) {
  if (!rootEl || prefersReducedMotion()) {
    if (rootEl) {
      setMotionFinalState(rootEl.querySelectorAll("[data-motion], [data-legal-motion]"));
    }
    return null;
  }

  const profile = getMotionProfile();
  const targets = filterMotionTargets(
    rootEl.querySelectorAll("[data-motion]"),
    rootEl,
  );
  if (!targets.length) return null;

  gsap.killTweensOf(targets);
  setMotionFinalState(targets);

  const levels = options.levels ?? ["section", "card", "item"];
  const filtered = targets.filter((el) => {
    const level = el.getAttribute("data-motion");
    return levels.includes(level);
  });
  const list = filtered.length ? filtered : targets;

  return gsap.from(list, {
    autoAlpha: 0.88,
    y: Math.max(4, Math.round(profile.distance.xs * 0.35)),
    stagger: profile.stagger.tight,
    duration: profile.duration.fast,
    ease: profile.ease.entrance,
    force3D: true,
    clearProps: "transform,opacity,visibility,willChange",
    onComplete: () => setMotionFinalState(list),
  });
}

/** Stagger ligero solo para filas/items (filtro/búsqueda, modales). */
export function revealMotionItems(rootEl, itemSelector = '[data-motion="item"]', options = {}) {
  if (!rootEl || prefersReducedMotion()) return null;

  const profile = getMotionProfile();
  const items = filterMotionTargets(
    rootEl.querySelectorAll(itemSelector),
    rootEl,
  );
  if (!items.length) return null;

  gsap.killTweensOf(items);
  setMotionFinalState(items);

  return gsap.from(items, {
    autoAlpha: 0.9,
    y: Math.max(3, Math.round(profile.distance.xs * 0.3)),
    stagger: profile.stagger.tight,
    duration: profile.duration.fast,
    delay: options.delay ?? 0,
    ease: profile.ease.entrance,
    force3D: true,
    clearProps: "transform,opacity,visibility,willChange",
    onComplete: () => setMotionFinalState(items),
  });
}

/**
 * Crossfade paralelo entre dos paneles de paso (workspace).
 * Salida e entrada simultáneas — evita el corte brusco de v-show.
 */
export function runStepSwap(outEl, inEl, options = {}) {
  if (!outEl || !inEl || prefersReducedMotion()) {
    setMotionFinalState([outEl, inEl].filter(Boolean));
    options.onSettled?.();
    return Promise.resolve();
  }

  const profile = getMotionProfile();
  const tier = getMotionTier();
  const pace = options.pace === "smooth" ? 1.22 : 1;
  const slide = options.slide ?? Math.max(12, Math.round(profile.distance.sm * 0.85));
  const duration = Math.max(0.42, profile.duration.base * pace);
  const outDuration = duration * 0.75;
  const container = options.container || outEl.parentElement;

  gsap.killTweensOf([outEl, inEl, container]);

  const outHeight = outEl.offsetHeight || outEl.scrollHeight;
  const inHeight = inEl.scrollHeight || inEl.offsetHeight;
  const stackHeight = Math.max(outHeight, inHeight, 120);

  if (container) {
    gsap.set(container, { minHeight: stackHeight });
    container.classList.add("is-step-swapping");
  }

  gsap.set(inEl, {
    visibility: "visible",
    display: "block",
    position: "absolute",
    width: "100%",
    top: 0,
    left: 0,
    autoAlpha: 0,
    y: slide,
    zIndex: 2,
    pointerEvents: "none",
  });
  gsap.set(outEl, {
    position: "absolute",
    width: "100%",
    top: 0,
    left: 0,
    autoAlpha: 1,
    y: 0,
    zIndex: 1,
    pointerEvents: "none",
  });

  const settleLayout = () => {
    options.onSettled?.();

    gsap.set(inEl, { clearProps: "all" });
    gsap.set(outEl, { clearProps: "all" });
    setMotionFinalState(inEl);
    setMotionFinalState(outEl);

    const targetH = Math.max(inEl.offsetHeight || inHeight, 80);

    if (!container) return Promise.resolve();

    const delta = Math.abs(stackHeight - targetH);
    if (delta <= 6) {
      container.classList.remove("is-step-swapping");
      gsap.set(container, { clearProps: "minHeight" });
      return Promise.resolve();
    }

    gsap.set(container, { minHeight: stackHeight });
    return new Promise((resolve) => {
      gsap.to(container, {
        minHeight: targetH,
        duration: Math.min(0.3, profile.duration.base * 0.75),
        ease: profile.ease.standardOut,
        onComplete: () => {
          container.classList.remove("is-step-swapping");
          gsap.set(container, { clearProps: "minHeight" });
          resolve();
        },
      });
    });
  };

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        void settleLayout().then(resolve);
      },
    });

    tl.to(
      outEl,
      {
        autoAlpha: 0,
        y: -slide * 0.4,
        duration: outDuration,
        ease: profile.ease.standardOut,
      },
      0,
    );

    const inStart = { autoAlpha: 0, y: slide };
    if (tier === "premium" && profile.blur) {
      inStart.filter = `blur(${Math.min(profile.blur.subtle, 6)}px)`;
    }

    tl.fromTo(
      inEl,
      inStart,
      {
        autoAlpha: 1,
        y: 0,
        filter: "none",
        duration,
        ease: profile.ease.entrance,
        clearProps: "transform,opacity,filter,visibility",
      },
      0.08,
    );
  });
}

/**
 * Crossfade entre conjuntos de elementos (tabs, onboarding steps).
 */
export async function runCrossfade(outTargets, inTargets, options = {}) {
  const out = gsap.utils.toArray(outTargets).filter(Boolean);
  const incoming = gsap.utils.toArray(inTargets).filter(Boolean);
  const { axis = "y", slide = null } = options;

  if (prefersReducedMotion()) {
    setMotionFinalState(out);
    setMotionFinalState(incoming);
    return;
  }

  const profile = getMotionProfile();
  const tier = getMotionTier();
  const slideDistance = slide ?? (axis === "x" ? 12 : profile.distance.xs);
  const outProp = axis === "x" ? "x" : "y";
  const inProp = axis === "x" ? "x" : "y";

  gsap.killTweensOf([...out, ...incoming]);

  await new Promise((resolve) => {
    const outVars = {
      autoAlpha: 0,
      duration: profile.duration.fast,
      ease: profile.ease.standardOut,
      stagger: profile.stagger.tight * 0.6,
      onComplete: resolve,
    };
    outVars[outProp] = axis === "x" ? -slideDistance : profile.distance.xs;
    if (tier === "premium" && profile.blur && out.length + incoming.length <= 20) {
      outVars.filter = `blur(${Math.min(profile.blur.subtle, 8)}px)`;
    }
    gsap.to(out, outVars);
  });

  setMotionFinalState(out);

  const inStart = {
    autoAlpha: 0,
    [inProp]: axis === "x" ? slideDistance : profile.distance.sm,
  };
  if (tier === "premium" && profile.blur && out.length + incoming.length <= 20) {
    inStart.filter = `blur(${Math.min(profile.blur.subtle, 8)}px)`;
  }

  await new Promise((resolve) => {
    gsap.fromTo(incoming, inStart, {
      autoAlpha: 1,
      [inProp]: 0,
      filter: "none",
      duration: profile.duration.base,
      ease: profile.ease.entrance,
      stagger: profile.stagger.base,
      clearProps: "transform,opacity,filter",
      onComplete: () => {
        setMotionFinalState(incoming);
        resolve();
      },
    });
  });
}

/** Hover lift en tarjetas clicables — retorna función cleanup. */
export function bindCardHover(cards, options = {}) {
  const list = gsap.utils.toArray(cards).filter(Boolean);
  if (!list.length) return () => {};

  const profile = getMotionProfile();
  const lift = options.lift ?? -4;
  const iconSelector = options.iconSelector || "[data-legal-motion='icon'], [data-motion-hover='icon']";
  const chevronSelector = options.chevronSelector || "[data-legal-motion='chevron'], [data-motion-hover='chevron']";

  const handlers = [];

  list.forEach((card) => {
    const icon = card.querySelector(iconSelector);
    const chevron = card.querySelector(chevronSelector);

    const onEnter = () => {
      if (prefersReducedMotion()) return;
      gsap.to(card, {
        y: lift,
        duration: profile.duration.base * 0.72,
        ease: profile.ease.standardOut,
        overwrite: "auto",
        force3D: true,
      });
      if (icon) {
        gsap.to(icon, {
          scale: 1.06,
          duration: profile.duration.fast,
          ease: profile.ease.standardOut,
          overwrite: "auto",
        });
      }
      if (chevron) {
        gsap.to(chevron, {
          x: 3,
          duration: profile.duration.fast,
          ease: profile.ease.standardOut,
          overwrite: "auto",
        });
      }
    };

    const onLeave = () => {
      gsap.to(card, {
        y: 0,
        duration: profile.duration.base * 0.65,
        ease: profile.ease.standardOut,
        overwrite: "auto",
      });
      if (icon) {
        gsap.to(icon, {
          scale: 1,
          duration: profile.duration.fast,
          ease: profile.ease.standardOut,
          overwrite: "auto",
        });
      }
      if (chevron) {
        gsap.to(chevron, {
          x: 0,
          duration: profile.duration.fast,
          ease: profile.ease.standardOut,
          overwrite: "auto",
        });
      }
    };

    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);
    handlers.push({ card, onEnter, onLeave });
  });

  return () => {
    handlers.forEach(({ card, onEnter, onLeave }) => {
      card.removeEventListener("mouseenter", onEnter);
      card.removeEventListener("mouseleave", onLeave);
    });
  };
}

/** Crea contexto GSAP con doble rAF — retorna { run, cleanup }. */
export function createMotionScope(rootRef, runFn) {
  let ctx = null;
  let hoverCleanup = null;
  let cancelled = false;

  const run = async (extraDelay = 0) => {
    await waitForNextFrame();
    if (cancelled || !rootRef?.value) return;

    ctx?.revert();
    hoverCleanup?.();
    ctx = gsap.context(() => {
      runFn(rootRef.value);
    }, rootRef.value);
  };

  const cleanup = () => {
    cancelled = true;
    hoverCleanup?.();
    ctx?.revert();
  };

  const bindHover = (cards, opts) => {
    hoverCleanup?.();
    hoverCleanup = bindCardHover(cards, opts);
  };

  return { run, cleanup, bindHover };
}

export { waitForNextFrame };
