import { ref, computed } from 'vue';
import {
  useProductPreferences,
  defaultProductPreferences,
  mergePreferences,
} from './useProductPreferences';
import { getMotionPreference, setMotionPreference } from '../design/motionTokens';
import { useBilling } from './useBilling';

export const PREFERENCES_DRAFT_KEY = Symbol('siec.preferencesDraft');

const clonePreferences = (source) =>
  mergePreferences(defaultProductPreferences(), JSON.parse(JSON.stringify(source)));

/**
 * Borrador local de preferencias de producto para la pestaña Ajustes.
 * Los cambios no afectan al workspace hasta commit().
 */
export function usePreferencesDraft() {
  const { productPreferences, saveProductPreferences, loadProductPreferences } =
    useProductPreferences();

  const draft = ref(defaultProductPreferences());
  const savedSnapshot = ref('');
  const motionDraft = ref(getMotionPreference());
  const savedMotion = ref(getMotionPreference());
  const saveMessage = ref('');
  const saveMessageType = ref('success');

  const isDirty = computed(
    () =>
      JSON.stringify(draft.value) !== savedSnapshot.value ||
      motionDraft.value !== savedMotion.value,
  );

  const sanitizeDraftForPlan = () => {
    const { clampMaterialId, limits } = useBilling();
    draft.value.defaultMaterial = clampMaterialId(draft.value.defaultMaterial);
    if (!limits.value.custom_export_branding) {
      draft.value.export.businessName = '';
      draft.value.export.reportFooter = '';
      draft.value.export.includeLogo = true;
    }
  };

  const syncFromSaved = () => {
    loadProductPreferences();
    draft.value = clonePreferences(productPreferences.value);
    sanitizeDraftForPlan();
    savedSnapshot.value = JSON.stringify(draft.value);
    motionDraft.value = getMotionPreference();
    savedMotion.value = motionDraft.value;
    saveMessage.value = '';
  };

  const commit = () => {
    sanitizeDraftForPlan();
    productPreferences.value = clonePreferences(draft.value);
    saveProductPreferences();
    setMotionPreference(motionDraft.value);
    savedSnapshot.value = JSON.stringify(draft.value);
    savedMotion.value = motionDraft.value;
    saveMessageType.value = 'success';
    saveMessage.value = '';
    return true;
  };

  const revert = () => {
    try {
      draft.value = JSON.parse(savedSnapshot.value);
    } catch {
      draft.value = clonePreferences(productPreferences.value);
    }
    motionDraft.value = savedMotion.value;
    saveMessage.value = '';
  };

  const markSavedMessage = (message) => {
    saveMessageType.value = 'success';
    saveMessage.value = message;
  };

  const markErrorMessage = (message) => {
    saveMessageType.value = 'error';
    saveMessage.value = message;
  };

  return {
    draft,
    motionDraft,
    isDirty,
    saveMessage,
    saveMessageType,
    syncFromSaved,
    commit,
    revert,
    markSavedMessage,
    markErrorMessage,
  };
}
