import { onMounted, onUnmounted, nextTick } from "vue";
import { gsap } from "gsap";
import { motionTokens, prefersReducedMotion } from "../design/motionTokens";

/**
 * Entrada escalonada para bloques con `data-motion`.
 * No usa matchMedia con solo `(prefers-reduced-motion: reduce)` — ese patrón
 * ejecutaba el callback solo con movimiento reducido y nunca animaba al resto.
 */
export function useProMotion(rootRef, options = {}) {
  let ctx;

  const {
    y = motionTokens.distance.md + 4,
    duration = motionTokens.duration.base,
    ease = motionTokens.ease.entrance,
    stagger = motionTokens.stagger.tight,
    delay = 0,
    /** Auth / shell mínimo: sin timeline `from` (evita formularios no clicables por autoAlpha 0). */
    skipIntro = false,
  } = options;

  const runIntro = () => {
    if (!rootRef?.value) return;

    const targets = rootRef.value.querySelectorAll("[data-motion]");
    if (!targets.length) return;

    if (prefersReducedMotion() || skipIntro) {
      gsap.set(targets, {
        autoAlpha: 1,
        y: 0,
        x: 0,
        scale: 1,
        clearProps: "transform",
      });
      return;
    }

    const hero = rootRef.value.querySelectorAll('[data-motion="hero"]');
    const sections = rootRef.value.querySelectorAll('[data-motion="section"]');
    const cards = rootRef.value.querySelectorAll('[data-motion="card"]');
    const items = rootRef.value.querySelectorAll('[data-motion="item"]');

    gsap.set([...hero, ...sections, ...cards, ...items], {
      willChange: "transform, opacity",
    });

    const tl = gsap.timeline({ defaults: { duration, ease }, delay });
    if (hero.length)
      tl.from(hero, {
        autoAlpha: 0,
        y: y + motionTokens.distance.xs,
        stagger: motionTokens.stagger.tight,
      });
    if (sections.length) {
      tl.from(
        sections,
        { autoAlpha: 0, y, stagger: motionTokens.stagger.tight },
        hero.length ? "-=0.28" : 0,
      );
    }
    if (cards.length)
      tl.from(cards, { autoAlpha: 0, y: y - 2, stagger }, "-=0.2");
    if (items.length)
      tl.from(
        items,
        {
          autoAlpha: 0,
          y: y - motionTokens.distance.xs,
          stagger: motionTokens.stagger.tight,
        },
        "-=0.18",
      );
    const allAnimated = [...hero, ...sections, ...cards, ...items];
    tl.call(() =>
      gsap.set(allAnimated, {
        clearProps: "willChange",
      }),
    );
    tl.eventCallback("onComplete", () => {
      gsap.set(allAnimated, {
        autoAlpha: 1,
        y: 0,
        x: 0,
        scale: 1,
      });
    });
  };

  let cancelled = false;

  onMounted(() => {
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled || !rootRef?.value) return;
          ctx = gsap.context(() => {
            runIntro();
          }, rootRef.value);
        });
      });
    });
  });

  onUnmounted(() => {
    cancelled = true;
    ctx?.revert();
  });
}
