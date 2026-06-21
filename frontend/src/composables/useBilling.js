import { ref, computed } from 'vue';
import { useApi, HttpError } from './useApi';
import { toast } from 'vue-sonner';

const billingState = ref(null);
const loading = ref(false);
let fetchPromise = null;

const DEFAULT_LIMITS = {
  max_active_projects: 1,
  max_saved_projects: 1,
  max_exports_per_month: 2,
  allowed_material_ids: [1],
  pdf_watermark: true,
  commercial_proposal: false,
  custom_export_branding: false,
  construction_layers_3d: false,
  walkthrough_3d: false,
  marketplace_access: false,
};

export function useBilling() {
  const api = useApi();

  const plan = computed(() => billingState.value?.plan ?? 'free');
  const limits = computed(() => billingState.value?.limits ?? DEFAULT_LIMITS);
  const usage = computed(() => billingState.value?.usage ?? {});
  const pricing = computed(() => billingState.value?.pricing ?? {});

  const isFree = computed(() => plan.value === 'free');
  const isPro = computed(() => plan.value === 'pro');
  const isProPlus = computed(() => plan.value === 'pro_plus');
  const hasMarketplaceAccess = computed(() => limits.value.marketplace_access === true);

  const allowedMaterialIds = computed(
    () => limits.value.allowed_material_ids || [1],
  );

  const canUseMaterial = (materialId) => {
    return allowedMaterialIds.value.includes(Number(materialId));
  };

  /** Fuerza un ID de material permitido por el plan (p. ej. Free → solo Madera). */
  const clampMaterialId = (materialId) => {
    const n = Number(materialId);
    if (canUseMaterial(n)) return n;
    return allowedMaterialIds.value[0] ?? 1;
  };

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
      const res = await api.post('/billing/record-export', {});
      if (billingState.value?.usage) {
        billingState.value = {
          ...billingState.value,
          usage: {
            ...billingState.value.usage,
            exports_this_month: res.exports_this_month,
          },
          limits: {
            ...billingState.value.limits,
            pdf_watermark: res.pdf_watermark,
          },
        };
      }
      return res;
    } catch (err) {
      if (err instanceof HttpError && err.status === 403) {
        const detail = err.payload?.detail;
        const msg =
          typeof detail === 'object' ? detail.message : detail || 'Límite de exportaciones alcanzado';
        toast.error(msg, {
          action: {
            label: 'Ver planes',
            onClick: () => {
              window.location.href = '/settings?tab=billing';
            },
          },
        });
      }
      throw err;
    }
  };

  const startCheckout = async (targetPlan) => {
    try {
      const res = await api.post('/billing/checkout', { plan: targetPlan });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return res;
      }
      toast.error('No se pudo iniciar el pago.');
      return res;
    } catch (err) {
      const detail = err.payload?.detail;
      const msg =
        typeof detail === 'object' ? detail.message : detail || 'Pagos no disponibles';
      toast.error(msg);
      throw err;
    }
  };

  const handlePlanLimitError = (err) => {
    if (!(err instanceof HttpError) || err.status !== 403) return false;
    const detail = err.payload?.detail;
    if (!detail || typeof detail !== 'object') return false;
    toast.error(detail.message || 'Límite de tu plan alcanzado', {
      action: {
        label: 'Mejorar plan',
        onClick: () => {
          window.location.href = '/settings?tab=billing';
        },
      },
    });
    return true;
  };

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
