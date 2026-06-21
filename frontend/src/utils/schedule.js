/**
 * Utilidades de planificación para reducir trabajo redundante en la UI.
 */

export function debounce(fn, waitMs = 400) {
  let timer = null;
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
  debounced.flush = (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

export function cloneState(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fallback below
    }
  }
  return JSON.parse(JSON.stringify(value));
}
