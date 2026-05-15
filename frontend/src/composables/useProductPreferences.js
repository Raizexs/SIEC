import { ref } from 'vue';

/** @deprecated Usar PRODUCT_PREFERENCES_STORAGE_KEY; se mantiene alias por compatibilidad. */
export const PRODUCT_PREFERENCES_KEY = 'siec.product_preferences';
export const PRODUCT_PREFERENCES_STORAGE_KEY = PRODUCT_PREFERENCES_KEY;

export const defaultProductPreferences = () => ({
  currency: 'CLP',
  unit: 'metric',
  contingency: 10,
  includeTax: true,
  defaultMaterial: 4,
  defaultRoomHeight: 2.4,
  useCustomRoomHeight: false,
  editor: {
    showGrid: true,
    snapToGrid: true,
    gridSize: 0.5,
    showLabels: true,
    showMinimap: true,
    initialView: 'split',
    quality3d: 'medium',
  },
  export: {
    preferredFormat: 'PDF',
    includeLogo: true,
    includeMaterialsBreakdown: true,
    includeUnitPrices: true,
    includeSnapshots: true,
    businessName: '',
    reportFooter: '',
  },
});

/**
 * Mezcla segura de preferencias (evita undefined en editor/export al añadir claves).
 * @param {ReturnType<typeof defaultProductPreferences>} base
 * @param {Record<string, unknown>} [incoming]
 */
export const mergePreferences = (base, incoming = {}) => {
  if (!incoming || typeof incoming !== 'object') {
    return { ...base };
  }

  return {
    ...base,
    ...incoming,
    editor: { ...base.editor, ...(incoming.editor || {}) },
    export: { ...base.export, ...(incoming.export || {}) },
  };
};

const productPreferences = ref(defaultProductPreferences());

let hydrated = false;
let storageListenerAttached = false;

const dispatchPreferencesUpdated = () => {
  if (typeof window === 'undefined') return;

  try {
    window.dispatchEvent(
      new CustomEvent('siec:preferences-updated', {
        detail: JSON.parse(JSON.stringify(productPreferences.value)),
      }),
    );
  } catch {
    window.dispatchEvent(
      new CustomEvent('siec:preferences-updated', {
        detail: productPreferences.value,
      }),
    );
  }
};

const hydrateFromStorage = () => {
  if (hydrated) return;
  hydrated = true;

  try {
    const raw = localStorage.getItem(PRODUCT_PREFERENCES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    productPreferences.value = mergePreferences(
      defaultProductPreferences(),
      parsed,
    );
  } catch {
    productPreferences.value = defaultProductPreferences();
  }
};

const attachStorageSync = () => {
  if (storageListenerAttached || typeof window === 'undefined') return;
  storageListenerAttached = true;

  window.addEventListener('storage', (event) => {
    if (event.key !== PRODUCT_PREFERENCES_STORAGE_KEY || !event.newValue) return;

    try {
      productPreferences.value = mergePreferences(
        defaultProductPreferences(),
        JSON.parse(event.newValue),
      );
    } catch {
      /* ignore */
    }
  });
};

/**
 * Preferencias de producto (singleton) compartidas en Settings y Workspace.
 */
export function useProductPreferences() {
  hydrateFromStorage();
  attachStorageSync();

  const loadProductPreferences = () => {
    try {
      const raw = localStorage.getItem(PRODUCT_PREFERENCES_STORAGE_KEY);
      if (!raw) {
        productPreferences.value = defaultProductPreferences();
        return;
      }
      productPreferences.value = mergePreferences(
        defaultProductPreferences(),
        JSON.parse(raw),
      );
    } catch {
      productPreferences.value = defaultProductPreferences();
    }
  };

  const saveProductPreferences = () => {
    localStorage.setItem(
      PRODUCT_PREFERENCES_STORAGE_KEY,
      JSON.stringify(productPreferences.value),
    );
    dispatchPreferencesUpdated();
  };

  const updateProductPreferences = (patch) => {
    productPreferences.value = mergePreferences(productPreferences.value, patch);
  };

  const resetProductPreferences = () => {
    productPreferences.value = defaultProductPreferences();
    saveProductPreferences();
  };

  return {
    productPreferences,
    defaultProductPreferences,
    loadProductPreferences,
    saveProductPreferences,
    updateProductPreferences,
    resetProductPreferences,
    mergePreferences,
    PRODUCT_PREFERENCES_STORAGE_KEY,
    PRODUCT_PREFERENCES_KEY,
  };
}
