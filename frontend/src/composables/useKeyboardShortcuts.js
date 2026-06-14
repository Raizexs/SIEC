/**
 * useKeyboardShortcuts — global shortcut registry.
 *
 * Tracks "G + key" sequences (vim-style) and single-key actions. Skips when
 * the user is typing in an input/textarea/contenteditable.
 */
import { onMounted, onBeforeUnmount, ref } from "vue";

export function useKeyboardShortcuts(handlers) {
  const lastKey = ref(null);
  let lastKeyTs = 0;
  const isTyping = (e) => {
    const t = e.target;
    if (!t) return false;
    return (
      t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)
    );
  };

  const onKey = (e) => {
    if (isTyping(e)) return;
    const key = e.key;

    // ? help
    if (key === "?") {
      handlers.help?.();
      return;
    }

    // G + X sequence
    if (key === "g" || key === "G") {
      lastKey.value = "g";
      lastKeyTs = Date.now();
      return;
    }
    if (lastKey.value === "g" && Date.now() - lastKeyTs < 1500) {
      lastKey.value = null;
      if (key === "d" || key === "D") return handlers.gotoDashboard?.();
      if (key === "w" || key === "W") return handlers.gotoWorkspace?.();
      if (key === "s" || key === "S") return handlers.gotoSettings?.();
    }

    // Save version
    if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === "s") {
      e.preventDefault();
      return handlers.saveVersion?.();
    }

    // Single-letter mode toggles
    if (key === "f" || key === "F") return handlers.fullscreen?.();
    if (key === "m" || key === "M") return handlers.measure?.();
    if (key === "v" || key === "V") return handlers.walkthrough?.();
  };

  onMounted(() => document.addEventListener("keydown", onKey));
  onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
}
