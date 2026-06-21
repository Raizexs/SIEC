import { onMounted, onBeforeUnmount, unref } from "vue";
import { prefersReducedMotion } from "../design/motionTokens";
import { setMotionFinalState } from "./useMotionContext";
import { replayMotionReveal } from "./useProMotion";

/**
 * Re-sincroniza animaciones cuando el usuario cambia la preferencia en caliente.
 * @param {import('vue').Ref<HTMLElement|null>} rootRef
 */
export function useMotionPreferenceSync(rootRef) {
  const onPreferenceChange = () => {
    const root = unref(rootRef);
    if (!root) return;

    if (prefersReducedMotion()) {
      setMotionFinalState(root.querySelectorAll("[data-motion], [data-legal-motion]"));
      return;
    }
    replayMotionReveal(root);
  };

  onMounted(() => {
    window.addEventListener("siec:motion-preference", onPreferenceChange);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("siec:motion-preference", onPreferenceChange);
  });
}
