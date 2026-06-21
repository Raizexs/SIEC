<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted, inject } from "vue";
import logger from "../utils/logger.js";
import { useI18n } from "../composables/useI18n";
import { useRecintosStore } from "../stores/recintos";
import { useWorkspaceStore } from "../stores/workspace";
import { useProductPreferences } from "../composables/useProductPreferences";
import {
  WORKSPACE_BUDGET_SESSION_KEY,
  persistWorkspaceBudgetSession,
  restoreWorkspaceBudgetSession,
} from "../composables/useWorkspaceBudgetSession";
import {
  withContingency,
  ivaOnAmount,
  formatMoneyByPreference,
  CHILE_IVA_RATE,
} from "../utils/budgetPreferenceMath";
import { toast } from "vue-sonner";
import { exportBudget, getMaterialLabel, flattenDesgloseRows } from "../utils/budgetExporter";
import { useBilling } from "../composables/useBilling";
import { useApi, HttpError } from "../composables/useApi";
import { useSiecPlace } from "../composables/useSiecPlace";
import { useRoute } from "vue-router";
import { captureSceneImage, captureScenePresetViews } from "../proposal/proposalSceneCapture";
import { resolveBrandLogoUrl } from "../proposal/proposalBrand";
import { reorganizeDesglose } from "../utils/budgetCategorizer";
import {
  buildNormativaPayload,
  normAlertCode,
  normAlertMessage,
  normInjectionLabel,
  normInjectionText,
} from "../utils/normativaPayload";

const { t, currentLanguage } = useI18n();

const numberLocale = computed(() =>
  currentLanguage.value === "en" ? "en-US" : "es-CL",
);
const recintosStore = useRecintosStore();
const workspaceStore = useWorkspaceStore();
const { productPreferences } = useProductPreferences();
const api = useApi();
const route = useRoute();
const { recordExport, handlePlanLimitError, clampMaterialId, canUseMaterial, limits, hasMarketplaceAccess } = useBilling();
const { createListing, checkoutPublish } = useSiecPlace();

const emit = defineEmits(["budget-calculated", "go-export"]);

const props = defineProps({
  m2Totales: { type: Number, required: true },
  materialEstructuralId: { type: Number, required: true },
  terrenoAncho: { type: Number, default: 15 },
  terrenoLargo: { type: Number, default: 7 },
  alturaMuroM: { type: Number, default: 2.44 },
  perimetroMl: { type: Number, default: null },
  pdfWatermark: { type: Boolean, default: true },
  /** full | budget | export — recorta UI según paso del workspace */
  panelMode: {
    type: String,
    default: "full",
    validator: (value) => ["full", "budget", "export"].includes(value),
  },
  projectId: { type: String, default: null },
});

const sharedSession = inject(WORKSPACE_BUDGET_SESSION_KEY, null);

const localHasGenerated = ref(false);
const localDesglose = ref([]);
const localCostoTotal = ref(null);
const localFechaPrecios = ref(null);
const localError = ref(null);
const localIsLoading = ref(false);
const localDisabledCategories = ref(new Set());

const hasGenerated = sharedSession?.hasGenerated ?? localHasGenerated;
const desglose = sharedSession?.desglose ?? localDesglose;
const costoTotal = sharedSession?.costoTotal ?? localCostoTotal;
const fechaPrecios = sharedSession?.fechaPrecios ?? localFechaPrecios;
const error = sharedSession?.error ?? localError;
const isLoading = sharedSession?.isLoading ?? localIsLoading;
const disabledCategories = sharedSession?.disabledCategories ?? localDisabledCategories;

const showExportControls = computed(
  () => props.panelMode === "full" || props.panelMode === "export",
);
const showExportInHeader = computed(
  () => showExportControls.value && props.panelMode !== "budget",
);
const showBreakdown = computed(
  () => props.panelMode === "full" || props.panelMode === "budget",
);
const showCalculateState = computed(
  () => props.panelMode !== "export" && !hasGenerated.value,
);
const isExportPanel = computed(() => props.panelMode === "export");
const exportMenuOpen = ref(false);
const exportFormat = ref(null);
const exportMenuRef = ref(null);
const normativaResult = ref(null);
const normativaLoading = ref(false);

const enabledDesglose = computed(() =>
  desglose.value.filter(cat => !disabledCategories.value.has(cat.categoria)),
);

const toggleCategoria = (catLabel) => {
  const next = new Set(disabledCategories.value);
  if (next.has(catLabel)) {
    next.delete(catLabel);
  } else {
    next.add(catLabel);
  }
  disabledCategories.value = next;
};

const isCategoriaDisabled = (catLabel) => disabledCategories.value.has(catLabel);

const perimetroMl = computed(() => {
  if (props.perimetroMl != null && props.perimetroMl > 0) {
    return props.perimetroMl;
  }
  const a = Number(props.terrenoAncho) || 15;
  const l = Number(props.terrenoLargo) || 7;
  return 2 * (a + l);
});

/** Presupuesto listo: flujo de cotización finalizado sin errores. */
const canExport = computed(
  () =>
    hasGenerated.value &&
    !isLoading.value &&
    !error.value &&
    (costoTotal.value != null || desglose.value.length > 0),
);

const showBudgetExportFooter = computed(
  () => props.panelMode === "budget" && canExport.value,
);

const resolvedProjectId = computed(
  () => props.projectId || route.params.projectId || null,
);

const isPublishableProject = computed(() => {
  const id = resolvedProjectId.value;
  if (!id) return false;
  if (String(id).startsWith("local-")) return false;
  return !/^\d+$/.test(String(id));
});

const showSiecPlacePublish = computed(
  () =>
    canExport.value &&
    hasMarketplaceAccess.value &&
    isPublishableProject.value &&
    (props.panelMode === "budget" || props.panelMode === "export"),
);

const publishDialogOpen = ref(false);
const publishTitle = ref("");
const publishRegion = ref("");
const publishLoading = ref(false);

const openPublishDialog = () => {
  publishTitle.value = workspaceStore.activePresetName || t("siecplacePublishTitle");
  publishRegion.value = "";
  publishDialogOpen.value = true;
};

const submitPublish = async () => {
  if (!resolvedProjectId.value) return;
  publishLoading.value = true;
  try {
    const listing = await createListing({
      project_id: String(resolvedProjectId.value),
      title: publishTitle.value.trim() || t("siecplacePublishTitle"),
      region: publishRegion.value.trim() || null,
      m2: Math.round(props.m2Totales),
      material_id: props.materialEstructuralId,
      estimated_total_clp: totalPreferido.value ?? motorTotal.value,
    });
    publishDialogOpen.value = false;
    await checkoutPublish(listing.id);
  } catch (err) {
    logger.error("[siecplace] publish failed", err);
  } finally {
    publishLoading.value = false;
  }
};

const showPrintExportHint = computed(
  () =>
    (isExportPanel.value || props.panelMode === "budget") &&
    canExport.value &&
    productPreferences.value.export?.includePrintReviewBlock !== true,
);

const exportOptions = [
  { id: "pdf", label: "PDF", icon: "picture_as_pdf" },
  { id: "xlsx", label: "Excel", icon: "table_chart" },
  { id: "csv", label: "CSV", icon: "table_rows" },
];

const formatCurrency = (value) => {
  if (value == null) return t("budgetPricesUnavailable");

  return new Intl.NumberFormat(numberLocale.value, {
    style: "currency",
    currency: "CLP",
  }).format(value);
};

/** Total devuelto por el motor (CLP) — solo categorías habilitadas. */
const motorTotal = computed(() =>
  enabledDesglose.value.reduce((sum, cat) => sum + (cat.subtotal_categoria || 0), 0),
);

const subtotalConContingencia = computed(() =>
  withContingency(motorTotal.value, productPreferences.value.contingency),
);

const montoIva = computed(() =>
  ivaOnAmount(
    subtotalConContingencia.value,
    productPreferences.value.includeTax,
  ),
);

/** Total referencial: subtotal con contingencia + IVA (si aplica), misma base numérica en CLP. */
const totalPreferido = computed(() => {
  const sub = subtotalConContingencia.value;
  if (sub == null || !Number.isFinite(sub)) return null;
  return sub + montoIva.value;
});

const monedaPreferida = computed(() => productPreferences.value.currency);

const quoteStats = computed(() => {
  const rows = flattenDesgloseRows(enabledDesglose.value);
  const total = rows.length;
  const quoted = rows.filter((row) => {
    const price = Number(row.precio_unitario);
    return Number.isFinite(price) && price > 0;
  }).length;
  return {
    total,
    quoted,
    hasPartial: total > 0 && quoted > 0 && quoted < total,
    hasNone: total > 0 && quoted === 0,
  };
});

const deltaContingencia = computed(() => {
  const m = motorTotal.value;
  const s = subtotalConContingencia.value;
  if (m == null || s == null || !Number.isFinite(m) || !Number.isFinite(s))
    return null;
  return s - m;
});

const formatStoreName = (name) => {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const formatCurrencyCell = (value) => {
  if (value == null) return t("budgetNa");

  return new Intl.NumberFormat(numberLocale.value, {
    style: "currency",
    currency: "CLP",
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const fetchNormativaForBudget = async () => {
  normativaLoading.value = true;
  try {
    const payload = buildNormativaPayload({
      recintos: recintosStore.recintos || [],
      m2Totales: props.m2Totales,
      materialEstructuralId: props.materialEstructuralId,
      alturaMuroM: props.alturaMuroM,
    });
    normativaResult.value = await api.post("/api/validar-normativa", payload);
  } catch (err) {
    logger.warn("Normativa no disponible:", err);
    normativaResult.value = null;
  } finally {
    normativaLoading.value = false;
  }
};

const normativaAlerts = computed(() => normativaResult.value?.alerts ?? []);
const normativaInjections = computed(() => normativaResult.value?.injections ?? []);
const normativaCompliant = computed(
  () => normativaResult.value?.compliant !== false,
);

const handleGenerateBudget = () => {
  hasGenerated.value = true;
  fetchBudget();
};

const selectedBudgetRooms = computed(() => {
  const selectedIds = recintosStore.selectedForBudget;
  const rooms = recintosStore.recintos || [];
  const selected = rooms.filter((room) => selectedIds?.has?.(room.id));

  return selected.length > 0 ? selected : rooms;
});

const buildRecintosInsumosPayload = () =>
  selectedBudgetRooms.value
    .map((room) => {
      const width = Number(room.dimensions?.w) || 0;
      const length = Number(room.dimensions?.l) || 0;
      if (width <= 0 || length <= 0) return null;
      const m2 = width * length;
      const materialId = Number(
        room.materialEstructuralId ?? props.materialEstructuralId,
      );
      return {
        id: room.id,
        m2: Math.round(m2 * 100) / 100,
        material_id: clampMaterialId(materialId),
      };
    })
    .filter(Boolean);

const buildLayoutRecintosPayload = () =>
  selectedBudgetRooms.value
    .map((room) => {
      const width = Number(room.dimensions?.w) || 0;
      const length = Number(room.dimensions?.l) || 0;
      if (width <= 0 || length <= 0) return null;
      return {
        piso: room.piso || 1,
        coords_x: room.coords?.x ?? 0,
        coords_z: room.coords?.z ?? 0,
        width,
        length,
      };
    })
    .filter(Boolean);

const fetchBudget = async () => {
  if (!hasGenerated.value) return;

  if (props.m2Totales <= 0) {
    desglose.value = [];
    costoTotal.value = null;
    fechaPrecios.value = null;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const materialId = clampMaterialId(props.materialEstructuralId);
    if (!canUseMaterial(props.materialEstructuralId)) {
      throw new Error(t("planMaterialLocked"));
    }

    const simData = await api.post("/api/simulacion/parametros", {
      m2Totales: Math.max(1, Math.round(props.m2Totales)),
      materialEstructuralId: materialId,
      perimetro_ml: Math.round(perimetroMl.value * 100) / 100,
      altura_muro_m: props.alturaMuroM,
      incluir_techumbre: true,
    });

    const recintosInsumos = buildRecintosInsumosPayload();
    const calcBody = {
      area_bruta_m2: Math.max(1, Math.round(props.m2Totales)),
      recintos: buildLayoutRecintosPayload(),
    };
    if (recintosInsumos.length > 0) {
      calcBody.recintos_insumos = recintosInsumos;
    }

    const data = await api.post(
      `/api/simulacion/${simData.idSimulacion}/calcular-insumos`,
      calcBody,
    );

    desglose.value = reorganizeDesglose(data.desglose || []);
    costoTotal.value = data.costo_total;
    fechaPrecios.value = data.fecha_precios;

    if (data.costo_total != null && Number.isFinite(data.costo_total)) {
      emit("budget-calculated", {
        costoTotal: data.costo_total,
        m2Totales: props.m2Totales,
        materialEstructuralId: props.materialEstructuralId,
      });
    }

    if (sharedSession) {
      persistWorkspaceBudgetSession(
        props.projectId,
        props.m2Totales,
        props.materialEstructuralId,
        sharedSession,
      );
    }

    await fetchNormativaForBudget();
  } catch (err) {
    if (err instanceof HttpError && err.status === 403) {
      const detail = err.payload?.detail;
      const msg =
        typeof detail === "object" ? detail.message : detail || t("planMaterialLocked");
      error.value = msg;
      handlePlanLimitError(err);
    } else {
      error.value = err.message;
    }
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => [props.m2Totales, props.materialEstructuralId],
  () => {
    hasGenerated.value = false;
    exportMenuOpen.value = false;
    normativaResult.value = null;
  },
);

const buildExportPayload = () => {
  const desgloseSnapshot = JSON.parse(JSON.stringify(enabledDesglose.value || []));
  const canBrand = limits.value.custom_export_branding === true;

  return {
    projectName: workspaceStore.activePresetName,
    businessName: canBrand
      ? productPreferences.value.export?.businessName?.trim() || ""
      : "",
    reportFooter: canBrand
      ? productPreferences.value.export?.reportFooter?.trim() || ""
      : "",
    m2Totales: props.m2Totales,
    materialEstructuralId: props.materialEstructuralId,
    materialNombre: getMaterialLabel(props.materialEstructuralId),
    fechaPrecios: fechaPrecios.value,
    fechaExportacion: new Date().toISOString(),
    desglose: desgloseSnapshot,
    motorTotal: motorTotal.value,
    subtotalConContingencia: subtotalConContingencia.value,
    deltaContingencia: deltaContingencia.value,
    montoIva: montoIva.value,
    totalPreferido: totalPreferido.value,
    totalFormatted:
      totalPreferido.value != null
        ? formatMoneyByPreference(totalPreferido.value, monedaPreferida.value)
        : formatCurrency(costoTotal.value),
    contingencyPct: productPreferences.value.contingency,
    includeTax: productPreferences.value.includeTax,
    includeLogo: canBrand
      ? productPreferences.value.export?.includeLogo !== false
      : true,
    includeMaterialsBreakdown:
      productPreferences.value.export?.includeMaterialsBreakdown !== false,
    includeUnitPrices: productPreferences.value.export?.includeUnitPrices !== false,
    includeSnapshots: productPreferences.value.export?.includeSnapshots !== false,
    includePrintReviewBlock:
      productPreferences.value.export?.includePrintReviewBlock === true,
    export: { ...productPreferences.value.export },
    logoUrl: resolveBrandLogoUrl(),
    pdfWatermark: props.pdfWatermark,
    counts: {
      recintos:
        recintosStore.recintosByType.habitaciones +
        recintosStore.recintosByType.banios +
        recintosStore.recintosByType.areasComunes,
      pasillos: recintosStore.recintosByType.pasillos,
    },
    normativa: normativaResult.value
      ? {
          compliant: normativaResult.value.compliant,
          alerts: normativaResult.value.alerts || [],
          injections: normativaResult.value.injections || [],
        }
      : null,
  };
};

const scrollToExportMenu = async () => {
  await nextTick();

  if (!exportMenuRef.value) return;

  exportMenuRef.value.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "end",
  });
};

const handleToggleExportMenu = async () => {
  exportMenuOpen.value = !exportMenuOpen.value;

  if (exportMenuOpen.value) {
    await scrollToExportMenu();
  }
};

const handleExport = async (format) => {
  if (!canExport.value) return;

  exportFormat.value = format;
  exportMenuOpen.value = false;

  const toastId = format === "pdf" ? "budget-pdf-export" : null;
  try {
    await recordExport();
    const payload = buildExportPayload();
    if (format === "pdf") {
      if (payload.includeSnapshots !== false) {
        toast.loading(t("budgetPdfGenerating"), { id: toastId });
        payload.sceneImageDataUrl = await captureSceneImage();
        payload.sceneViews = await captureScenePresetViews();
      }
    }
    await exportBudget(format, payload);
    if (toastId) toast.dismiss(toastId);
    const labels = { pdf: "PDF", xlsx: "Excel", csv: "CSV" };
    toast.success(
      t("budgetExportSuccess", { format: labels[format] || format }),
    );
  } catch (err) {
    if (toastId) toast.dismiss(toastId);
    if (handlePlanLimitError(err)) return;
    logger.error("Error al exportar presupuesto:", err);
    toast.error(err?.message || t("budgetExportFailed"));
  } finally {
    exportFormat.value = null;
  }
};

const onDocumentClick = (event) => {
  if (!event.target.closest?.(".budget-export-menu")) {
    exportMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", onDocumentClick);

  if (!sharedSession) return;
  const restored = restoreWorkspaceBudgetSession(
    props.projectId,
    props.m2Totales,
    props.materialEstructuralId,
    sharedSession,
  );
  if (restored && costoTotal.value != null) {
    emit("budget-calculated", {
      costoTotal: costoTotal.value,
      m2Totales: props.m2Totales,
      materialEstructuralId: props.materialEstructuralId,
    });
  }
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<template>
  <section
    class="relative overflow-visible rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 sm:p-6 lg:p-8"
  >
    <!-- Subtle background accent -->
    <div
      class="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
    ></div>

    <div
      v-if="panelMode === 'budget'"
      class="relative z-20 mb-5 flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3.5 shadow-sm backdrop-blur-sm dark:border-amber-900/60 dark:bg-amber-950/40"
      role="note"
    >
      <span
        class="material-symbols-outlined mt-0.5 shrink-0 text-[22px] text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      >
        info
      </span>
      <div class="min-w-0">
        <p class="text-sm font-bold text-amber-950 dark:text-amber-100">
          {{ t('budgetDisclaimerBannerTitle') }}
        </p>
        <p class="mt-1 text-sm font-medium leading-relaxed text-amber-900/90 dark:text-amber-200/85">
          {{ t('budgetDisclaimerBannerBody') }}
        </p>
      </div>
    </div>

    <!-- Header -->
    <header
      v-if="!isExportPanel"
      class="relative z-10 mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[23px]">
            request_quote
          </span>
        </div>

        <div>
          <p
            class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t("budgetEconomicEstimate") }}
          </p>

          <h2
            class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
          >
            {{ t("budgetDetailedTitle") }}
          </h2>

          <p
            class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {{ t("budgetSubtitle") }}
          </p>
        </div>
      </div>

      <div
        class="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <span class="material-symbols-outlined text-[15px] text-slate-400">
          square_foot
        </span>
        {{ t("budgetM2Calculated", { m2: Math.round(m2Totales) }) }}
      </div>
    </header>

    <header
      v-else
      class="relative z-10 mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-600 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"
        >
          <span class="material-symbols-outlined text-[23px]">
            upload_file
          </span>
        </div>

        <div>
          <p
            class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t("budgetExportTitle") }}
          </p>

          <h2
            class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
          >
            {{ t("exportPanelTitle") }}
          </h2>

          <p
            class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {{ t("exportPanelSubtitle") }}
          </p>
        </div>
      </div>

      <div
        class="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <span class="material-symbols-outlined text-[15px] text-slate-400">
          square_foot
        </span>
        {{ t("budgetM2Calculated", { m2: Math.round(m2Totales) }) }}
      </div>
    </header>

    <div
      v-if="showPrintExportHint && isExportPanel && hasGenerated && !isLoading"
      class="relative z-10 mb-5 flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/30"
    >
      <span class="material-symbols-outlined mt-0.5 text-[18px] text-sky-600 dark:text-sky-300">
        info
      </span>
      <p class="text-xs font-medium leading-relaxed text-sky-900 dark:text-sky-100">
        {{ t("budgetPrintPrefHint") }}
        <a
          href="/settings?tab=preferences"
          class="font-bold underline decoration-sky-400/70 underline-offset-2 hover:text-sky-700 dark:hover:text-sky-200"
        >
          {{ t("budgetPrintPrefLink") }}
        </a>
      </p>
    </div>

    <!-- Initial state -->
    <div
      v-if="showCalculateState"
      class="relative z-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50"
    >
      <div
        class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-orange-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-orange-300"
      >
        <span class="material-symbols-outlined text-[32px]"> calculate </span>
      </div>

      <h3
        class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100"
      >
        {{ t("budgetInactive") }}
      </h3>

      <p
        class="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
      >
        {{ t("budgetInactiveHint") }}
      </p>

      <button
        type="button"
        class="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98]"
        @click="handleGenerateBudget"
      >
        <span class="material-symbols-outlined text-[18px]"> calculate </span>
        {{ t("budgetCalculateReal") }}
      </button>

      <p class="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
        {{ t("budgetScraperHint") }}
      </p>
    </div>

    <!-- Generated state -->
    <div v-else class="relative z-10">
      <!-- Loading -->
      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50/70 py-16 dark:border-slate-800 dark:bg-slate-900/50"
      >
        <div
          class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div
            class="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500 dark:border-slate-700 dark:border-t-orange-300"
          ></div>
        </div>

        <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
          {{ t("budgetLoading") }}
        </p>

        <p class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
          {{ t("budgetLoadingHint") }}
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <span class="material-symbols-outlined text-[20px]"> error </span>
        </div>

        <div>
          <p class="text-sm font-bold leading-snug">
            {{ t("budgetErrorTitle") }}
          </p>
          <p class="mt-1 text-xs font-medium leading-relaxed">
            {{ error }}
          </p>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Total cost card -->
        <section
          class="relative overflow-visible rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 sm:p-7"
        >
          <div
            class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl"
          ></div>

          <div
            class="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          >
            <div>
              <p
                class="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300"
              >
                {{ t("budgetTotalEstimated") }}
                <span
                  v-if="quoteStats.hasPartial"
                  class="ml-2 normal-case tracking-normal text-amber-300"
                >
                  {{ t("budgetPartialTotal") }}
                </span>
              </p>

              <p
                v-if="quoteStats.total > 0"
                class="mt-1 text-xs font-medium text-slate-400"
              >
                {{
                  t("budgetQuoteStats", {
                    quoted: quoteStats.quoted,
                    total: quoteStats.total,
                  })
                }}
              </p>

              <p
                v-if="quoteStats.hasNone"
                class="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
              >
                {{ t("budgetNoPricesWarning") }}
              </p>

              <div
                class="mt-2 font-mono text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl"
                :class="
                  costoTotal == null
                    ? 'font-sans text-lg opacity-90 sm:text-xl'
                    : ''
                "
              >
                {{
                  totalPreferido != null
                    ? formatMoneyByPreference(totalPreferido, monedaPreferida)
                    : formatCurrency(costoTotal)
                }}
              </div>

              <div
                v-if="costoTotal != null"
                class="mt-3 space-y-1.5 text-xs font-medium leading-relaxed text-slate-400"
              >
                <p>
                  {{ t("budgetMotorSubtotal") }}
                  <span class="font-mono font-bold text-slate-200">{{
                    formatCurrencyCell(motorTotal)
                  }}</span>
                </p>
                <p
                  v-if="
                    productPreferences.contingency > 0 &&
                    deltaContingencia != null
                  "
                >
                  {{
                    t("budgetContingency", {
                      pct: productPreferences.contingency,
                    })
                  }}
                  <span class="font-mono font-bold text-slate-200"
                    >+{{ formatCurrencyCell(deltaContingencia) }}</span
                  >
                  {{ t("budgetContingencyNote") }}
                </p>
                <p v-if="productPreferences.includeTax && montoIva > 0">
                  {{
                    t("budgetIvaRef", { pct: Math.round(CHILE_IVA_RATE * 100) })
                  }}
                  <span class="font-mono font-bold text-slate-200"
                    >+{{ formatCurrencyCell(montoIva) }}</span
                  >
                  {{ t("budgetIvaNote") }}
                </p>
                <p
                  v-if="monedaPreferida !== 'CLP'"
                  class="text-[11px] text-slate-500"
                >
                  {{ t("budgetCurrencyViewNote") }}
                </p>
              </div>

              <p class="mt-2 text-xs font-medium text-slate-400">
                {{ t("budgetRefValueNote") }}
              </p>
            </div>

            <div class="flex flex-col items-start gap-3 md:items-end">
              <div
                v-if="fechaPrecios"
                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-md"
              >
                <span
                  class="material-symbols-outlined text-[14px] text-orange-300"
                >
                  update
                </span>
                {{ t("budgetUpdated") }} {{ formatDate(fechaPrecios) }}
              </div>

              <div v-if="(showExportInHeader && canExport) || showSiecPlacePublish" class="flex flex-wrap items-center gap-2">
                <button
                  v-if="showSiecPlacePublish"
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300/70 bg-violet-600 px-4 py-2.5 text-xs font-bold uppercase tracking-tight text-white shadow-lg shadow-violet-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-500"
                  @click="openPublishDialog"
                >
                  <span class="material-symbols-outlined text-[16px]">storefront</span>
                  {{ t("siecplacePublishCta") }}
                </button>

              <div v-if="showExportInHeader && canExport" class="relative budget-export-menu">
                <button
                  type="button"
                  :title="t('budgetExportTitle')"
                  aria-haspopup="menu"
                  :aria-expanded="exportMenuOpen"
                  class="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500 px-4 py-2.5 text-xs font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98]"
                  @click.stop="handleToggleExportMenu"
                >
                  <span class="material-symbols-outlined text-[16px]">
                    download
                  </span>
                  {{ t("budgetExport") }}
                  <span
                    class="material-symbols-outlined text-[14px] opacity-80"
                  >
                    expand_more
                  </span>
                </button>

                <Transition name="export-menu">
                  <div
                    v-if="exportMenuOpen"
                    ref="exportMenuRef"
                    role="menu"
                    class="absolute right-0 top-full z-[70] mt-2 max-h-[min(320px,60vh)] w-56 overflow-y-auto rounded-3xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
                  >
                    <button
                      v-for="option in exportOptions"
                      :key="option.id"
                      type="button"
                      role="menuitem"
                      class="group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 active:scale-[0.99] dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                      @click.stop.prevent="handleExport(option.id)"
                    >
                      <span
                        class="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors duration-200 group-hover:border-emerald-300 group-hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:group-hover:border-emerald-700 dark:group-hover:bg-emerald-950/60"
                      >
                        <span class="material-symbols-outlined text-[16px]">
                          {{ option.icon }}
                        </span>
                      </span>

                      <span
                        class="pointer-events-none min-w-0 flex-1 select-none"
                      >
                        {{ option.label }}
                      </span>

                      <span
                        v-if="exportFormat === option.id"
                        class="pointer-events-none material-symbols-outlined animate-spin text-[15px] text-emerald-500 dark:text-emerald-300"
                      >
                        progress_activity
                      </span>
                    </button>
                  </div>
                </Transition>
              </div>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="hasGenerated && (normativaLoading || normativaResult)"
          class="rounded-3xl border border-slate-200/90 bg-white/80 shadow-sm dark:border-slate-800/90 dark:bg-slate-950/60"
        >
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-orange-500">gavel</span>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  {{ t("budgetNormativaTitle") }}
                </p>
                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {{
                    normativaLoading
                      ? t("budgetNormativaLoading")
                      : normativaCompliant
                        ? t("budgetNormativaOk")
                        : t("budgetNormativaReview")
                  }}
                </p>
              </div>
            </div>
            <span
              v-if="!normativaLoading"
              class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
              :class="
                normativaCompliant
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              "
            >
              {{ normativaCompliant ? "OK" : t("budgetNormativaAlerts") }}
            </span>
          </div>

          <div
            v-if="!normativaLoading && (normativaAlerts.length || normativaInjections.length)"
            class="space-y-2 border-t border-slate-200/80 px-4 py-3 dark:border-slate-800/80"
          >
            <ul v-if="normativaAlerts.length" class="space-y-2">
              <li
                v-for="(alert, idx) in normativaAlerts"
                :key="'alert-' + idx"
                class="rounded-xl border px-3 py-2 text-xs"
                :class="
                  alert.severity === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
                "
              >
                <strong>{{ normAlertCode(alert) }}:</strong> {{ normAlertMessage(alert) }}
              </li>
            </ul>

            <ul v-if="normativaInjections.length" class="space-y-2">
              <li
                v-for="(item, idx) in normativaInjections"
                :key="'inj-' + idx"
                class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100"
              >
                <strong>{{ normInjectionLabel(item) }}:</strong> {{ normInjectionText(item) }}
              </li>
            </ul>
          </div>

          <p
            v-else-if="!normativaLoading && normativaResult"
            class="border-t border-slate-200/80 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/80"
          >
            {{ t("budgetNormativaEmpty") }}
          </p>
        </section>

        <!-- Breakdown -->
        <section v-if="showBreakdown" class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3
                class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100"
              >
                {{ t("budgetBreakdownTitle") }}
              </h3>
              <p
                class="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                {{ t("budgetBreakdownHint") }}
              </p>
            </div>

            <span
              class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            >
              {{ t("budgetCategoriesCount", { count: enabledDesglose.length }) }}
            </span>
          </div>

          <transition-group name="budget-list" tag="div" class="space-y-4">
            <article
              v-for="cat in desglose"
              :key="cat.categoria"
              class="overflow-hidden rounded-2xl border shadow-sm transition-all duration-200"
              :class="isCategoriaDisabled(cat.categoria)
                ? 'border-slate-200/60 bg-slate-50/40 opacity-55 dark:border-slate-800/50 dark:bg-slate-900/30'
                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'"
            >
              <!-- Category header -->
              <header
                class="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                :class="isCategoriaDisabled(cat.categoria)
                  ? 'border-slate-200/50 bg-slate-100/40 dark:border-slate-800/40 dark:bg-slate-950/20'
                  : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-950/50'"
              >
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-200"
                    :class="isCategoriaDisabled(cat.categoria)
                      ? 'border-slate-300 bg-slate-200 text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'"
                    :title="isCategoriaDisabled(cat.categoria) ? 'Habilitar categoría' : 'Deshabilitar categoría'"
                    @click="toggleCategoria(cat.categoria)"
                  >
                    <span class="material-symbols-outlined text-[15px]">
                      {{ isCategoriaDisabled(cat.categoria) ? 'radio_button_unchecked' : 'check_circle' }}
                    </span>
                  </button>

                  <div>
                    <p
                      class="font-bold tracking-tight"
                      :class="isCategoriaDisabled(cat.categoria) ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'"
                    >
                      {{ cat.categoria }}
                    </p>
                    <p
                      class="text-xs font-medium text-slate-400 dark:text-slate-500"
                    >
                      {{
                        t("budgetItemsAssociated", {
                          count: cat.items?.length || 0,
                        })
                      }}
                    </p>
                  </div>
                </div>

                <div class="text-left sm:text-right">
                  <p
                    class="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500"
                  >
                    {{ t("budgetSubtotal") }}
                  </p>
                  <p
                    class="font-mono text-sm font-black"
                    :class="isCategoriaDisabled(cat.categoria) ? 'text-slate-400 dark:text-slate-500' : 'text-orange-600 dark:text-orange-300'"
                  >
                    {{ formatCurrencyCell(cat.subtotal_categoria) }}
                  </p>
                </div>
              </header>

              <!-- Desktop table -->
              <div class="hidden p-4 md:block">
                <div
                  class="grid grid-cols-12 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                >
                  <div class="col-span-4">Insumo</div>
                  <div class="col-span-2 text-right">Cant.</div>
                  <div class="col-span-2 text-right">Precio unit.</div>
                  <div class="col-span-2 text-right">Tienda</div>
                  <div class="col-span-2 text-right">Subtotal</div>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="item in cat.items"
                    :key="item.insumo"
                    class="grid grid-cols-12 items-center rounded-xl border border-transparent bg-slate-50/80 px-3 py-3 text-xs transition-colors duration-200 hover:border-slate-200 hover:bg-white dark:bg-slate-950/50 dark:hover:border-slate-800 dark:hover:bg-slate-950"
                  >
                    <div
                      class="col-span-4 pr-3 font-semibold leading-snug text-slate-700 dark:text-slate-300"
                    >
                      {{ item.insumo }}
                    </div>

                    <div class="col-span-2 text-right">
                      <span
                        class="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {{
                          item.cantidad.toLocaleString(numberLocale, {
                            maximumFractionDigits: 2,
                          })
                        }}
                        <span class="ml-1 text-[9px] text-slate-400">
                          {{ item.unidad }}
                        </span>
                      </span>
                    </div>

                    <div
                      class="col-span-2 text-right font-mono font-semibold text-slate-500 dark:text-slate-400"
                    >
                      {{ formatCurrencyCell(item.precio_unitario) }}
                    </div>

                    <div class="col-span-2 text-right">
                      <a
                        v-if="item.tienda && item.url_producto"
                        :href="item.url_producto"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium underline decoration-dotted underline-offset-2 transition-colors"
                        :class="
                          item.tienda === 'Referencia'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                        "
                      >
                        {{ formatStoreName(item.tienda) }}
                      </a>
                      <span
                        v-else-if="item.tienda"
                        class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :class="
                          item.tienda === 'Referencia'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        "
                      >
                        {{ formatStoreName(item.tienda) }}
                      </span>
                    </div>

                    <div
                      class="col-span-2 text-right font-mono font-black text-slate-950 dark:text-slate-100"
                    >
                      {{ formatCurrencyCell(item.subtotal) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mobile cards -->
              <div class="space-y-2 p-4 md:hidden">
                <div
                  v-for="item in cat.items"
                  :key="item.insumo"
                  class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <p
                    class="text-sm font-bold leading-snug text-slate-800 dark:text-slate-200"
                  >
                    {{ item.insumo }}
                  </p>

                  <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p
                        class="text-[10px] font-bold uppercase tracking-tight text-slate-400"
                      >
                        {{ t("budgetQuantity") }}
                      </p>
                      <p
                        class="mt-1 font-mono font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {{
                          item.cantidad.toLocaleString(numberLocale, {
                            maximumFractionDigits: 2,
                          })
                        }}
                        {{ item.unidad }}
                      </p>
                    </div>

                    <div class="text-right">
                      <p
                        class="text-[10px] font-bold uppercase tracking-tight text-slate-400"
                      >
                        {{ t("budgetSubtotal") }}
                      </p>
                      <p
                        class="mt-1 font-mono font-black text-slate-950 dark:text-slate-100"
                      >
                        {{ formatCurrencyCell(item.subtotal) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </transition-group>

          <!-- Empty -->
          <div
            v-if="desglose.length === 0"
            class="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
            >
              <span class="material-symbols-outlined text-[30px]">
                inventory_2
              </span>
            </div>

            <p class="font-bold text-slate-700 dark:text-slate-200">
              {{ t("budgetEmptyTitle") }}
            </p>

            <p
              class="max-w-sm text-xs font-medium text-slate-400 dark:text-slate-500"
            >
              {{ t("budgetEmptyHint") }}
            </p>
          </div>
        </section>

        <section
          v-if="showBudgetExportFooter"
          class="relative overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-white p-6 shadow-lg shadow-emerald-500/10 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-950/80 sm:p-7"
        >
          <div
            class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl"
          ></div>

          <div class="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                {{ t("budgetReadyExportTitle") }}
              </p>
              <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                {{ t("budgetReadyExportHint") }}
              </p>
              <p
                v-if="showPrintExportHint"
                class="mt-3 flex items-start gap-2 text-[11px] font-medium leading-relaxed text-sky-800 dark:text-sky-200"
              >
                <span class="material-symbols-outlined mt-0.5 text-[16px] text-sky-600 dark:text-sky-300">
                  info
                </span>
                <span>
                  {{ t("budgetPrintPrefHint") }}
                  <a
                    href="/settings?tab=preferences"
                    class="font-bold underline decoration-sky-400/70 underline-offset-2"
                  >
                    {{ t("budgetPrintPrefLink") }}
                  </a>
                </span>
              </p>
            </div>

            <div class="relative shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                v-if="showSiecPlacePublish"
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/70 bg-violet-600 px-5 py-3 text-sm font-bold uppercase tracking-tight text-white shadow-lg shadow-violet-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-500 sm:w-auto"
                @click="openPublishDialog"
              >
                <span class="material-symbols-outlined text-[18px]">storefront</span>
                {{ t("siecplacePublishCta") }}
              </button>

              <button
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-600 px-5 py-3 text-sm font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] sm:w-auto"
                @click="emit('go-export')"
              >
                <span class="material-symbols-outlined text-[18px]">
                  upload_file
                </span>
                {{ t("budgetGoExport") }}
                <span class="material-symbols-outlined text-[16px] opacity-80">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div
      v-if="publishDialogOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="t('siecplacePublishTitle')"
    >
      <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <h3 class="text-lg font-black text-slate-950 dark:text-slate-50">
          {{ t("siecplacePublishTitle") }}
        </h3>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {{ t("siecplacePublishHint") }}
        </p>

        <label class="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">
          {{ t("budgetExportTitle") }}
          <input
            v-model="publishTitle"
            type="text"
            class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <label class="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
          {{ t("siecplacePublishRegion") }}
          <input
            v-model="publishRegion"
            type="text"
            class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <div class="mt-6 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold dark:border-slate-700"
            :disabled="publishLoading"
            @click="publishDialogOpen = false"
          >
            {{ t("settingsBack") }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-2xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60"
            :disabled="publishLoading"
            @click="submitPublish"
          >
            {{ publishLoading ? "…" : t("siecplacePublishSubmit") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.budget-list-enter-active,
.budget-list-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.budget-list-enter-from,
.budget-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.export-menu-enter-active,
.export-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.export-menu-enter-from,
.export-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
