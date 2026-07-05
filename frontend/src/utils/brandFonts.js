let loadPromise = null;

/** Asegura que Plus Jakarta Sans esté lista (logos SVG con <text> y tipografía de marca). */
export function ensurePlusJakartaSans() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!document.fonts?.load) return;
    const weights = [400, 500, 600, 700, 800];
    await Promise.all(
      weights.map((weight) =>
        document.fonts.load(`${weight} 1em "Plus Jakarta Sans"`),
      ),
    ).catch(() => {});
    await document.fonts.ready;
  })();

  return loadPromise;
}
