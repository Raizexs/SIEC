/** @returns {Element | null} */
export function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    null
  );
}

/**
 * @param {Element} el
 * @returns {Promise<void>}
 */
export async function requestAppFullscreen(el) {
  if (!el) throw new Error('No element');
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen;
  if (!fn) throw new Error('Fullscreen API unavailable');
  await fn.call(el);
}

/** @returns {Promise<void>} */
export async function exitAppFullscreen() {
  if (typeof document === 'undefined') return;
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen;
  if (fn) await fn.call(document);
}

/** @param {(entering: boolean) => void} handler */
export function bindFullscreenChange(handler) {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
