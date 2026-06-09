import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useApi, HttpError } from './useApi';
import { toast } from 'vue-sonner';
import { useI18n } from './useI18n';

const billingState = ref(null);
const loading = ref(false);
let fetchPromise = null;

const DEFAULT_LIMITS = {
  max_active_projects: 999,
  max_saved_projects: 999,
  max_exports_per_month: 9999,
  allowed_material_ids: [1, 2, 3, 4],
  pdf_watermark: false,
  commercial_proposal: true,
  custom_export_branding: true,
  construction_layers_3d: true,
  walkthrough_3d: true,
  marketplace_access: true,
};

export function useBilling() {
  const api = useApi();
  const { t } = useI18n();
  const router = useRouter();

  const plan = computed(() => billingState.value?.plan ?? 'free');
  const limits = computed(() => billingState.value?.limits ?? DEFAULT_LIMITS);
  const usage = computed(() => billingState.value?.usage ?? {});
  const pricing = computed(() => billingState.value?.pricing ?? {});

  const isFree = computed(() => plan.value === 'free');
  const isPro = computed(() => plan.value === 'pro');
  const isProPlus = computed(() => plan.value === 'pro_plus');
  const hasMarketplaceAccess = computed(() => true);

  const allowedMaterialIds = computed(
    () => limits.value.allowed_material_ids || [1],
  );

  const canUseMaterial = (_materialId) => true;

  const clampMaterialId = (materialId) => Number(materialId);

  const fetchBilling = async (force = false) => {
    if (fetchPromise) return fetchPromise;
    if (billingState.value && !force) return billingState.value;

    loading.value = true;
    fetchPromise = api
      .get('/billing/plan')
      .then((data) => {
        billingState.value = data;
        return data;
      })
      .catch((err) => {
        if (err instanceof HttpError && err.status === 401) return null;
        console.warn('[billing]', err);
        billingState.value = {
          plan: 'free',
          plan_label: 'Free',
          limits: DEFAULT_LIMITS,
          usage: {},
        };
        return billingState.value;
      })
      .finally(() => {
        loading.value = false;
        fetchPromise = null;
      });

    return fetchPromise;
  };

  const recordExport = async () => {
    try {
      await api.post('/billing/record-export', {});
    } catch { /* noop – sin limites de plan */ }
  };

  const startCheckout = async (targetPlan) => {
    try {
      const res = await api.post('/billing/checkout', { plan: targetPlan });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return res;
      }
      toast.error(t('limitPaymentFailed'));
      return res;
    } catch (err) {
      const detail = err.payload?.detail;
      const msg =
        typeof detail === 'object' ? detail.message : detail || t('limitPaymentUnavailable');
      toast.error(msg);
      throw err;
    }
  };

  const handlePlanLimitError = (_err) => false;

  return {
    billingState,
    loading,
    plan,
    limits,
    usage,
    pricing,
    isFree,
    isPro,
    isProPlus,
    hasMarketplaceAccess,
    allowedMaterialIds,
    canUseMaterial,
    clampMaterialId,
    fetchBilling,
    recordExport,
    startCheckout,
    handlePlanLimitError,
  };
}
