const CAPTURE_TIMEOUT_MS = 1400;

/**
 * Canvas WebGL principal (excluye el minimapa 2D, que también vive en .scene3d-canvas).
 * @returns {HTMLCanvasElement | null}
 */
const resolveMainSceneCanvas = () => {
  const tagged = document.querySelector('[data-siec-scene-canvas]');
  if (tagged instanceof HTMLCanvasElement) return tagged;

  const container = document.querySelector('.scene3d-canvas');
  if (!container) return null;

  const canvases = [...container.querySelectorAll('canvas')].filter(
    (canvas) => !canvas.closest('[data-siec-minimap]'),
  );
  if (!canvases.length) return null;

  return canvases.reduce((largest, canvas) =>
    canvas.width * canvas.height > largest.width * largest.height
      ? canvas
      : largest,
  );
};

const captureFromCanvas = () => {
  try {
    const canvas = resolveMainSceneCanvas();
    if (!canvas) return null;
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
};

/**
 * Captura de escena 3D para el anexo del PDF.
 * Dispara `siec:capture-scene` (centra cámara + render en Scene3D) y devuelve data URL.
 * @returns {Promise<string | null>}
 */
export const captureSceneImage = () => {
  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (url) => {
      if (settled) return;
      settled = true;
      resolve(url);
    };

    if (typeof window === 'undefined') {
      finish(captureFromCanvas());
      return;
    }

    const timeoutId = window.setTimeout(
      () => finish(captureFromCanvas()),
      CAPTURE_TIMEOUT_MS,
    );

    window.dispatchEvent(
      new CustomEvent('siec:capture-scene', {
        detail: {
          complete: (url) => {
            window.clearTimeout(timeoutId);
            finish(url ?? captureFromCanvas());
          },
        },
      }),
    );
  });
};
