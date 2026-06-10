const CAPTURE_TIMEOUT_MS = 2200;

/**
 * Canvas WebGL principal (excluye el minimapa 2D, que también vive en .scene3d-canvas).
 * @returns {HTMLCanvasElement | null}
 */
export const resolveMainSceneCanvas = () => {
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

const PRESET_VIEW_LABELS = [
  { key: 'top', label: 'Planta (vista superior)' },
  { key: 'front', label: 'Fachada (vista frontal)' },
  { key: 'side', label: 'Corte (vista lateral)' },
];

/**
 * Portada del dashboard: render 3D con todas las capas.
 * @returns {Promise<{ hero: string } | null>}
 */
export const captureProjectPreviewCollage = async () => {
  const hero = await captureSceneImage();
  return hero ? { hero } : null;
};

export const captureScenePresetViews = (options = {}) => {
  if (typeof window === 'undefined') return Promise.resolve([]);

  const presets =
    Array.isArray(options.presets) && options.presets.length
      ? options.presets
      : PRESET_VIEW_LABELS;
  const presetCount = presets.length;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (views) => {
      if (settled) return;
      settled = true;
      resolve(Array.isArray(views) ? views : []);
    };

    const timeoutId = window.setTimeout(
      () => finish([]),
      CAPTURE_TIMEOUT_MS * Math.max(presetCount, 1),
    );

    window.dispatchEvent(
      new CustomEvent('siec:capture-scene-views', {
        detail: {
          presets,
          tight: options.tight === true,
          complete: (views) => {
            window.clearTimeout(timeoutId);
            finish(views);
          },
        },
      }),
    );
  });
};
