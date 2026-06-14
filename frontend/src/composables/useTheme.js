/**
 * useTheme — light/dark/system theme with auto-detection and GSAP transition.
 * Persists choice in localStorage + applies the `dark` class on <html>.
 */
import { ref, watch, computed } from "vue";
import { gsap } from "gsap";

const stored =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("siec.theme")
    : null;
const userPref = ref(stored || "system");

const mql =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
const systemDark = ref(mql ? mql.matches : true);
mql?.addEventListener("change", (e) => (systemDark.value = e.matches));

const isDark = computed(() =>
  userPref.value === "system" ? systemDark.value : userPref.value === "dark",
);

const apply = (animate = true) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = isDark.value;
  if (animate) {
    gsap.fromTo(
      root,
      { opacity: 0.92 },
      { opacity: 1, duration: 0.25, ease: "power2.out" },
    );
  }
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
};

watch(isDark, () => apply(true), { immediate: false });

const setTheme = (mode) => {
  userPref.value = mode;
  localStorage.setItem("siec.theme", mode);
  apply(true);
};

export function useTheme() {
  return { userPref, isDark, setTheme, apply };
}
