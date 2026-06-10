/**
 * Reduce data-URL size for API payloads and sessionStorage.
 * @param {string | null | undefined} dataUrl
 * @param {number} maxWidth
 * @param {number} quality
 * @returns {Promise<string | null>}
 */
export function compressDataUrl(dataUrl, maxWidth = 960, quality = 0.75) {
  if (!dataUrl || typeof dataUrl !== 'string') return Promise.resolve(null);
  if (!dataUrl.startsWith('data:image') || typeof document === 'undefined') {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const longest = Math.max(img.width, img.height, 1);
        const scale = Math.min(1, maxWidth / longest);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * @param {{ hero?: string } | null} preview
 * @returns {Promise<{ hero: string } | null>}
 */
export async function compressPreviewCollage(preview) {
  if (!preview?.hero) return null;

  const hero = await compressDataUrl(preview.hero, 1280, 0.8);
  return hero ? { hero } : null;
}
