import { watch, onBeforeUnmount, nextTick, unref } from "vue";
import { gsap } from "gsap";
import { getMotionProfile, getMotionTier, prefersReducedMotion } from "../design/motionTokens";
import { setMotionFinalState, revealMotionItems } from "./useMotionContext";

/**
 * Animación tier-aware para modales/overlays.
 * @param {import('vue').Ref<boolean>|() => boolean} showRef
 * @param {{ backdropRef?: import('vue').Ref, panelRef?: import('vue').Ref, staggerItems?: boolean, emphasis?: boolean }} options
 */
export function useMotionModal(showRef, options = {}) {
  const {
    backdropRef = null,
    panelRef = null,
    staggerItems = false,
    emphasis = false,
  } = options;

  let ctx = null;

  const resetPanelMotion = (panel) => {
    if (!panel) return;
    setMotionFinalState(panel.querySelectorAll('[data-motion="item"]'));
    setMotionFinalState(panel);
  };

  const animateOpen = async () => {
    if (prefersReducedMotion()) return;
    await nextTick();

    const profile = getMotionProfile();
    const tier = getMotionTier();
    const backdrop = backdropRef?.value;
    const panel = panelRef?.value;

    ctx?.revert();
    ctx = gsap.context(() => {
      if (backdrop) {
        gsap.fromTo(
          backdrop,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: profile.duration.fast,
            ease: profile.ease.standardOut,
          },
        );
      }

      if (panel) {
        resetPanelMotion(panel);

        const from = {
          autoAlpha: 0,
          scale: tier === "premium" ? 0.96 : 0.97,
          y: profile.distance.sm,
        };
        gsap.fromTo(panel, from, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          rotation: 0,
          duration: profile.duration.base,
          ease: profile.ease.entrance,
          clearProps: "transform,opacity,rotation,visibility",
        });

        if (staggerItems) {
          revealMotionItems(panel, '[data-motion="item"]', {
            delay: profile.duration.fast * 0.35,
          });
        }

        if (emphasis && tier === "premium") {
          gsap.fromTo(
            panel,
            { x: 0 },
            {
              x: 4,
              duration: 0.08,
              delay: profile.duration.base,
              yoyo: true,
              repeat: 3,
              ease: "power1.inOut",
              clearProps: "x",
            },
          );
        }
      }
    });
  };

  const animateClose = () => {
    ctx?.revert();
    ctx = null;
    resetPanelMotion(panelRef?.value);
    if (backdropRef?.value) setMotionFinalState(backdropRef.value);
  };

  const stop = watch(
    () => unref(showRef),
    (visible) => {
      if (visible) animateOpen();
      else animateClose();
    },
  );

  onBeforeUnmount(() => {
    stop();
    ctx?.revert();
    resetPanelMotion(panelRef?.value);
  });

  return { animateOpen };
}
