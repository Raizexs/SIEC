import { watch, onBeforeUnmount, unref } from "vue";

let lockCount = 0;
let savedScrollY = 0;
let bodyStyles = null;
const lockedScrollables = new Map();

const SCROLLABLE_SELECTORS = [
  "[data-workspace-scroll]",
  "main.overflow-y-auto",
];

function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}

function lockScrollables() {
  for (const selector of SCROLLABLE_SELECTORS) {
    document.querySelectorAll(selector).forEach((el) => {
      if (lockedScrollables.has(el)) return;
      lockedScrollables.set(el, {
        overflow: el.style.overflow,
        overscrollBehavior: el.style.overscrollBehavior,
      });
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "none";
    });
  }
}

function unlockScrollables() {
  lockedScrollables.forEach((prev, el) => {
    el.style.overflow = prev.overflow;
    el.style.overscrollBehavior = prev.overscrollBehavior;
  });
  lockedScrollables.clear();
}

function preventBackgroundScroll(event) {
  if (
    event.target?.closest?.(
      '[data-scroll-lock-scroll], [data-scroll-lock-panel], [data-scroll-lock-ignore]',
    )
  ) {
    return;
  }
  event.preventDefault();
}

function lockBody() {
  lockCount += 1;
  if (lockCount > 1) return;

  savedScrollY = window.scrollY || document.documentElement.scrollTop;

  bodyStyles = {
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
    overflow: document.body.style.overflow,
    paddingRight: document.body.style.paddingRight,
  };

  const scrollbarWidth = getScrollbarWidth();
  document.documentElement.classList.add("siec-scroll-locked");
  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  lockScrollables();
  document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
  document.addEventListener("touchmove", preventBackgroundScroll, {
    passive: false,
  });
}

function unlockBody() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  document.removeEventListener("wheel", preventBackgroundScroll);
  document.removeEventListener("touchmove", preventBackgroundScroll);
  unlockScrollables();

  document.documentElement.classList.remove("siec-scroll-locked");
  if (bodyStyles) {
    document.body.style.position = bodyStyles.position;
    document.body.style.top = bodyStyles.top;
    document.body.style.width = bodyStyles.width;
    document.body.style.overflow = bodyStyles.overflow;
    document.body.style.paddingRight = bodyStyles.paddingRight;
  }
  window.scrollTo(0, savedScrollY);
  bodyStyles = null;
}

/**
 * Bloquea el scroll de fondo (body + paneles principales) mientras un modal está abierto.
 * Soporta varios modales anidados mediante contador interno.
 *
 * @param {import('vue').Ref<boolean> | (() => boolean)} visible
 */
export function useBodyScrollLock(visible) {
  watch(
    () => unref(visible),
    (isOpen) => {
      if (isOpen) lockBody();
      else unlockBody();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (unref(visible)) {
      lockCount = 1;
      unlockBody();
    }
  });
}
