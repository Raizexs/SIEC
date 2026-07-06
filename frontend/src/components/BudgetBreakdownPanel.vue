<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted, inject } from "vue";
import gsap from "gsap";
import { getMotionProfile, prefersReducedMotion } from "../design/motionTokens";
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
import { usePrivacy } from "../composables/usePrivacy";
import ConsentModal from "./privacy/ConsentModal.vue";
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
const { fetchPolicy, grantConsent, hasConsent } = usePrivacy();

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

const BUDGET_LOADING_STEPS = ["sim", "supplies", "normativa"];
const loadingPhase = ref(null);
const loadingProgressDisplay = ref(0);
const loadingEtaSeconds = ref(28);
const budgetLoadingRef = ref(null);
const budgetSpinnerRef = ref(null);
const loadingProgressState = { value: 0 };
let loadingSpinnerTween = null;
let loadingCreepTween = null;
let loadingEtaTimer = null;
let loadingStartedAt = 0;

const loadingPhaseLabel = computed(() => {
  const keyByPhase = {
    sim: "budgetLoadingStepSim",
    supplies: "budgetLoadingStepSupplies",
    normativa: "budgetLoadingStepNormativa",
  };
  const key = keyByPhase[loadingPhase.value];
  return key ? t(key) : t("budgetLoading");
});

const loadingSteps = computed(() => [
  { id: "sim", label: t("budgetLoadingStepSimShort") },
  { id: "supplies", label: t("budgetLoadingStepSuppliesShort") },
  { id: "normativa", label: t("budgetLoadingStepNormativaShort") },
]);

const loadingStepState = (stepId) => {
  const current = BUDGET_LOADING_STEPS.indexOf(loadingPhase.value);
  const stepIdx = BUDGET_LOADING_STEPS.indexOf(stepId);
  if (current < 0 || stepIdx < 0) return "pending";
  if (stepIdx < current) return "done";
  if (stepIdx === current) return "active";
  return "pending";
};

const syncLoadingProgressBar = () => {
  loadingProgressDisplay.value = loadingProgressState.value;
};

const animateLoadingProgress = (target, duration = 0.85) => {
  loadingCreepTween?.kill();
  loadingCreepTween = null;

  if (prefersReducedMotion()) {
    loadingProgressState.value = target;
    syncLoadingProgressBar();
    return;
  }

  const profile = getMotionProfile();
  gsap.to(loadingProgressState, {
    value: target,
    duration,
    ease: profile.ease.standardOut,
    onUpdate: syncLoadingProgressBar,
  });
};

const startLoadingCreep = (from, to, duration = 26) => {
  loadingCreepTween?.kill();
  loadingProgressState.value = from;
  syncLoadingProgressBar();

  if (prefersReducedMotion()) return;

  loadingCreepTween = gsap.to(loadingProgressState, {
    value: to,
    duration,
    ease: "none",
    onUpdate: syncLoadingProgressBar,
  });
};

const setLoadingPhase = (phase, targetProgress, options = {}) => {
  loadingPhase.value = phase;
  if (options.creep) {
    startLoadingCreep(targetProgress, options.creepTo ?? targetProgress + 24, options.creepDuration);
    return;
  }
  animateLoadingProgress(targetProgress, options.duration ?? 0.85);
};

const startLoadingMotion = async () => {
  loadingStartedAt = Date.now();
  loadingPhase.value = "sim";
  loadingProgressState.value = 0;
  loadingProgressDisplay.value = 0;
  loadingEtaSeconds.value = 28;

  await nextTick();

  const spinner = budgetSpinnerRef.value;
  const panel = budgetLoadingRef.value;

  loadingSpinnerTween?.kill();
  if (spinner && !prefersReducedMotion()) {
    gsap.set(spinner, { rotation: 0, transformOrigin: "50% 50%" });
    loadingSpinnerTween = gsap.to(spinner, {
      rotation: 360,
      duration: 1.15,
      ease: "none",
      repeat: -1,
    });
  }

  if (panel && !prefersReducedMotion()) {
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.38, ease: "power3.out" },
    );
  }

  loadingEtaTimer = window.setInterval(() => {
    if (!isLoading.value) return;
    const elapsed = (Date.now() - loadingStartedAt) / 1000;
    const progress = Math.max(loadingProgressDisplay.value, 10) / 100;
    const remaining = Math.round((elapsed / progress) * (1 - progress));
    loadingEtaSeconds.value = Math.max(2, Math.min(45, remaining));
  }, 700);
};

const stopLoadingMotion = async () => {
  loadingCreepTween?.kill();
  loadingCreepTween = null;
  loadingSpinnerTween?.kill();
  loadingSpinnerTween = null;

  if (loadingEtaTimer) {
    clearInterval(loadingEtaTimer);
    loadingEtaTimer = null;
  }

  if (!prefersReducedMotion() && loadingProgressDisplay.value < 100) {
    await new Promise((resolve) => {
      animateLoadingProgress(100, 0.28);
      window.setTimeout(resolve, 280);
    });
  }

  loadingPhase.value = null;
  loadingProgressState.value = 0;
  loadingProgressDisplay.value = 0;
};

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

const localStoreSelections = ref({});
const storeSelections = sharedSession?.storeSelections ?? localStoreSelections;

const localTiendaRecomendada = ref(null);
const tiendaRecomendada = sharedSession?.tiendaRecomendada ?? localTiendaRecomendada;

const localTiendasConsolidadas = ref([]);
const tiendasConsolidadas = sharedSession?.tiendasConsolidadas ?? localTiendasConsolidadas;

// Modal de compra consolidada "Todo en el mismo lugar"
const showConsolidatedModal = ref(false);
const pendingItem = ref(null);
const pendingStore = ref(null);

const applyStoreSelection = (item, store) => {
  const key = item.insumo;
  const next = { ...storeSelections.value };
  if (store) {
    next[key] = { tienda: store.tienda, precio: store.precio, url: store.url };
  } else {
    delete next[key];
  }
  storeSelections.value = next;
  
  if (sharedSession) {
    persistWorkspaceBudgetSession(
      props.projectId,
      props.m2Totales,
      props.materialEstructuralId,
      sharedSession,
    );
  }
};

const selectStore = (item, store) => {
  if (store && store.tag === "todo_mismo_lugar") {
    // Si elige "Todo en el mismo lugar", abrir el modal de confirmación
    pendingItem.value = item;
    pendingStore.value = store;
    showConsolidatedModal.value = true;
  } else {
    applyStoreSelection(item, store);
  }
};

const applyStoreToAll = (storeName) => {
  const next = { ...storeSelections.value };
  effectiveDesglose.value.forEach((cat) => {
    if (cat.categoria.toLowerCase() !== "mano de obra") {
      cat.items.forEach((item) => {
        if (item.tiendas_alternativas) {
          const match = item.tiendas_alternativas.find(
            (s) => s.tienda.toLowerCase() === storeName.toLowerCase()
          );
          if (match) {
            next[item.insumo] = { tienda: match.tienda, precio: match.precio, url: match.url };
          }
        }
      });
    }
  });
  storeSelections.value = next;
  
  if (sharedSession) {
    persistWorkspaceBudgetSession(
      props.projectId,
      props.m2Totales,
      props.materialEstructuralId,
      sharedSession,
    );
  }
  
  toast.success(`Se aplicó ${formatStoreName(storeName)} a todos los materiales compatibles.`);
};

const applyRecommendedStore = () => {
  if (tiendaRecomendada.value && tiendaRecomendada.value.tienda) {
    applyStoreToAll(tiendaRecomendada.value.tienda);
  }
};

const confirmConsolidatedSelection = (applyToAll) => {
  if (!pendingItem.value || !pendingStore.value) return;
  
  if (applyToAll) {
    applyStoreToAll(pendingStore.value.tienda);
  } else {
    applyStoreSelection(pendingItem.value, pendingStore.value);
  }
  
  showConsolidatedModal.value = false;
  pendingItem.value = null;
  pendingStore.value = null;
};

const getStoreTagLabel = (tag) => {
  if (tag === 'todo_mismo_lugar') return 'Todo en el mismo lugar';
  if (tag === 'mas_barato') return 'Más barato';
  if (tag === 'alternativa') return 'Alternativa';
  return '';
};

const getStoreTagClass = (tag) => {
  if (tag === 'todo_mismo_lugar') return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30';
  if (tag === 'mas_barato') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
};

const isStoreSelected = (item, store) => {
  const sel = storeSelections.value[item.insumo];
  if (sel) {
    return sel.tienda.toLowerCase() === store.tienda.toLowerCase();
  }
  return item.tienda && item.tienda.toLowerCase() === store.tienda.toLowerCase();
};

const effectiveDesglose = computed(() => {
  const selections = storeSelections.value;
  // Excluir la categoría Mano de Obra del desglose del presupuesto
  const filteredDesglose = desglose.value.filter(
    (cat) => (cat.categoria || "").trim().toLowerCase() !== "mano de obra"
  );
  return filteredDesglose.map((cat) => {
    const items = cat.items.map((item) => {
      const override = selections[item.insumo];
      if (!override) return item;
      const precio = override.precio;
      const subt = precio != null ? precio * item.cantidad : item.subtotal;
      return { ...item, precio_unitario: precio, subtotal: subt, tienda: override.tienda, url_producto: override.url };
    });
    const hasSubt = items.some((i) => i.subtotal != null);
    const subcat = hasSubt ? items.reduce((s, i) => s + (i.subtotal || 0), 0) : null;
    return { ...cat, items, subtotal_categoria: subcat };
  });
});

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
const showPlaceConsent = ref(false);
const policyVersion = ref("1.0");

const openPublishDialog = async () => {
  publishTitle.value = workspaceStore.activePresetName || t("siecplacePublishTitle");
  publishRegion.value = "";
  try {
    const policy = await fetchPolicy();
    policyVersion.value = policy.version;
  } catch {
    policyVersion.value = "1.0";
  }
  publishDialogOpen.value = true;
};

const startPublishFlow = async () => {
  const publishOk = await hasConsent("siecplace_publish").catch(() => false);
  const contactOk = await hasConsent("siecplace_contact_share").catch(() => false);
  if (!publishOk || !contactOk) {
    showPlaceConsent.value = true;
    return;
  }
  await submitPublish();
};

const onPlaceConsentConfirm = async () => {
  await grantConsent("siecplace_publish", policyVersion.value);
  await grantConsent("siecplace_contact_share", policyVersion.value);
  showPlaceConsent.value = false;
  await submitPublish();
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
    console.error("[siecplace] publish failed", err);
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

/** Total devuelto por el motor (CLP) — solo categorías habilitadas, con tiendas seleccionadas. */
const motorTotal = computed(() =>
  effectiveDesglose.value
    .filter(cat => !disabledCategories.value.has(cat.categoria))
    .reduce((sum, cat) => sum + (cat.subtotal_categoria || 0), 0),
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
  const rows = flattenDesgloseRows(effectiveDesglose.value.filter(cat => !disabledCategories.value.has(cat.categoria)));
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
    console.warn("Normativa no disponible:", err);
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
  void startLoadingMotion();
  setLoadingPhase("sim", 12, { duration: 0.45 });

  try {
    const materialId = clampMaterialId(props.materialEstructuralId);

    const simData = await api.post("/api/simulacion/parametros", {
      m2Totales: Math.max(1, Math.round(props.m2Totales)),
      materialEstructuralId: materialId,
      perimetro_ml: Math.round(perimetroMl.value * 100) / 100,
      altura_muro_m: props.alturaMuroM,
      incluir_techumbre: true,
    });

    setLoadingPhase("supplies", 34, { creep: true, creepTo: 72, creepDuration: 32 });

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

    setLoadingPhase("normativa", 82, { duration: 0.5 });

    desglose.value = reorganizeDesglose(data.desglose || []);
    costoTotal.value = data.costo_total;
    fechaPrecios.value = data.fecha_precios;
    tiendaRecomendada.value = data.tienda_recomendada || null;
    tiendasConsolidadas.value = data.tiendas_consolidadas || [];

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
    await stopLoadingMotion();
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

watch(
  () => props.materialEstructuralId,
  () => {
    storeSelections.value = {};
  },
);

const buildExportPayload = () => {
  const desgloseSnapshot = JSON.parse(JSON.stringify(
    effectiveDesglose.value.filter(cat => !disabledCategories.value.has(cat.categoria)) || []
  ));
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
    console.error("Error al exportar presupuesto:", err);
    toast.error(err?.message || t("budgetExportFailed"));
  } finally {
    exportFormat.value = null;
  }
};

const onDocumentClick = (event) => {
  if (!event.target.closest?.(".budget-export-menu")) {
    exportMenuOpen.value = false;
  }
  if (!event.target.closest?.(".store-selector")) {
    effectiveDesglose.value.forEach((cat) =>
      cat.items.forEach((item) => {
        if (item._showStores) item._showStores = false;
      }),
    );
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
  loadingCreepTween?.kill();
  loadingSpinnerTween?.kill();
  if (loadingEtaTimer) clearInterval(loadingEtaTimer);
});
</script>

<template>
  <section
    data-motion="section"
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
        ref="budgetLoadingRef"
        class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50 via-white to-orange-50/20 px-6 py-12 dark:border-slate-800/90 dark:from-slate-950 dark:via-slate-900/70 dark:to-orange-950/10 sm:px-8 sm:py-14"
      >
        <div
          class="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/15"
          aria-hidden="true"
        />

        <div class="relative mx-auto flex max-w-md flex-col items-center text-center">
          <div class="relative mb-6 flex h-[4.75rem] w-[4.75rem] items-center justify-center">
            <div
              class="absolute inset-1 rounded-full bg-orange-400/20 blur-md dark:bg-orange-500/25"
              aria-hidden="true"
            />

            <div
              class="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/30"
            >
              <svg
                ref="budgetSpinnerRef"
                class="absolute h-10 w-10 text-orange-500 dark:text-orange-400"
                viewBox="0 0 40 40"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  class="text-slate-200 dark:text-slate-800"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-dasharray="42 100"
                  class="text-orange-500 dark:text-orange-400"
                />
              </svg>

              <span class="material-symbols-outlined relative text-[20px] text-orange-600 dark:text-orange-300">
                calculate
              </span>
            </div>
          </div>

          <p class="text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ loadingPhaseLabel }}
          </p>

          <p class="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {{ t("budgetLoadingHint") }}
          </p>

          <div class="mt-8 w-full">
            <div class="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              <span>{{ t("budgetLoadingProgress") }}</span>
              <span class="tabular-nums text-slate-600 dark:text-slate-300">
                {{ Math.round(loadingProgressDisplay) }}%
              </span>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800/90">
              <div
                class="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                :style="{ width: `${loadingProgressDisplay}%` }"
              />
            </div>

            <p class="mt-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {{
                loadingEtaSeconds <= 3
                  ? t("budgetLoadingAlmostDone")
                  : t("budgetLoadingEta", { seconds: loadingEtaSeconds })
              }}
            </p>
          </div>

          <ol class="mt-8 w-full space-y-2 text-left">
            <li
              v-for="step in loadingSteps"
              :key="step.id"
              class="flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors duration-200"
              :class="
                loadingStepState(step.id) === 'active'
                  ? 'border-orange-200/90 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/20'
                  : loadingStepState(step.id) === 'done'
                    ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/15'
                    : 'border-slate-200/70 bg-white/50 dark:border-slate-800/70 dark:bg-slate-950/40'
              "
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black"
                :class="
                  loadingStepState(step.id) === 'active'
                    ? 'border-orange-300 bg-white text-orange-600 dark:border-orange-800 dark:bg-slate-950 dark:text-orange-300'
                    : loadingStepState(step.id) === 'done'
                      ? 'border-emerald-300 bg-emerald-500 text-white dark:border-emerald-700 dark:bg-emerald-600'
                      : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'
                "
              >
                <span
                  v-if="loadingStepState(step.id) === 'done'"
                  class="material-symbols-outlined text-[14px]"
                >
                  check
                </span>
                <span
                  v-else-if="loadingStepState(step.id) === 'active'"
                  class="h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-400"
                />
                <span v-else class="text-[10px]">{{ loadingSteps.findIndex((s) => s.id === step.id) + 1 }}</span>
              </span>

              <span
                class="min-w-0 flex-1 text-xs font-semibold leading-snug"
                :class="
                  loadingStepState(step.id) === 'active'
                    ? 'text-slate-900 dark:text-slate-100'
                    : loadingStepState(step.id) === 'done'
                      ? 'text-slate-600 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500'
                "
              >
                {{ step.label }}
              </span>
            </li>
          </ol>
        </div>
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
                  class="tour-export-step inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500 px-4 py-2.5 text-xs font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98]"
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
              {{ t("budgetCategoriesCount", { count: effectiveDesglose.length }) }}
            </span>
          </div>

          <div
            v-if="tiendaRecomendada && tiendaRecomendada.tienda"
            class="relative overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/10 shadow-sm"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 mt-0.5">local_mall</span>
                <div>
                  <h4 class="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                    Recomendación de compra consolidada
                  </h4>
                  <p class="mt-1 text-xs text-indigo-700 dark:text-indigo-400 leading-normal">
                    Puedes comprar la gran mayoría de tus materiales en <strong class="font-extrabold text-indigo-900 dark:text-indigo-300">{{ formatStoreName(tiendaRecomendada.tienda) }}</strong> 
                    (cubre <strong class="font-extrabold text-indigo-900 dark:text-indigo-300">{{ tiendaRecomendada.cobertura }}</strong> de {{ tiendaRecomendada.total_materiales }} materiales por un total estimado de <strong class="font-extrabold text-indigo-900 dark:text-indigo-300">{{ formatCurrencyCell(tiendaRecomendada.costo_total) }}</strong>).
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow transition-all hover:bg-indigo-700 cursor-pointer active:scale-95"
                @click="applyRecommendedStore"
              >
                <span class="material-symbols-outlined text-[14px]">checklist</span>
                Aplicar a todo el lote
              </button>
            </div>
          </div>

          <transition-group name="budget-list" tag="div" class="space-y-4">
            <article
              v-for="cat in effectiveDesglose"
              :key="cat.categoria"
              class="overflow-visible rounded-2xl border shadow-sm transition-all duration-200"
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
                    :title="isCategoriaDisabled(cat.categoria) ? t('budgetCategoryEnable') : t('budgetCategoryDisable')"
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

                    <div class="col-span-2 text-right relative store-selector">
                      <div
                        v-if="item.tienda"
                        class="inline-flex items-center gap-1 store-selector"
                      >
                        <!-- Badge estático si no hay alternativas -->
                        <span
                          v-if="!item.tiendas_alternativas || item.tiendas_alternativas.length <= 1"
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          :class="item.tienda === 'Referencia'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
                        >
                          {{ formatStoreName(item.tienda) }}
                        </span>
                        <!-- Botón interactivo si hay alternativas -->
                        <button
                          v-else
                          type="button"
                          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-900/50 cursor-pointer"
                          :class="item.tienda === 'Referencia'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
                          @click.stop="item._showStores = !item._showStores"
                        >
                          {{ formatStoreName(item.tienda) }}
                          <span
                            class="material-symbols-outlined text-[12px] leading-none"
                          >expand_more</span>
                        </button>
                        <a
                          v-if="item.tienda !== 'Referencia' && item.url_producto"
                          :href="item.url_producto"
                          target="_blank"
                          rel="noopener"
                          class="material-symbols-outlined text-[14px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                          title="Ir a la tienda"
                        >open_in_new</a>
                      </div>
                      <!-- Dropdown de alternativas con etiquetas -->
                      <div
                        v-if="item._showStores && item.tiendas_alternativas"
                        class="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/30"
                      >
                        <button
                          v-for="store in item.tiendas_alternativas"
                          :key="store.tienda"
                          type="button"
                          class="flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 text-left"
                          :class="isStoreSelected(item, store) ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''"
                          @click.stop="selectStore(item, store); item._showStores = false"
                        >
                          <div class="flex items-center justify-between w-full">
                            <span class="font-semibold text-slate-700 dark:text-slate-300">{{ formatStoreName(store.tienda) }}</span>
                            <span class="font-mono font-bold text-slate-500 dark:text-slate-400">{{ formatCurrencyCell(store.precio) }}</span>
                          </div>
                          <div v-if="store.tag" class="self-start mt-0.5">
                            <span class="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" :class="getStoreTagClass(store.tag)">
                              {{ getStoreTagLabel(store.tag) }}
                            </span>
                          </div>
                        </button>
                      </div>
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

                  <div v-if="item.tienda" class="mt-2 flex items-center gap-2 text-xs border-t border-slate-200 dark:border-slate-800 pt-2 relative store-selector">
                    <span class="text-[10px] font-bold uppercase text-slate-400">{{ t("budgetStore") }}</span>
                    <!-- Badge estático si no hay alternativas -->
                    <span
                      v-if="!item.tiendas_alternativas || item.tiendas_alternativas.length <= 1"
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="item.tienda === 'Referencia' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
                    >
                      {{ formatStoreName(item.tienda) }}
                    </span>
                    <!-- Botón interactivo si hay alternativas -->
                    <button
                      v-else
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-900/50 cursor-pointer"
                      :class="item.tienda === 'Referencia' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'"
                      @click.stop="item._showStores = !item._showStores"
                    >
                      {{ formatStoreName(item.tienda) }}
                      <span class="material-symbols-outlined text-[12px] leading-none">expand_more</span>
                    </button>
                    <span class="font-mono font-semibold text-slate-600 dark:text-slate-400">{{ formatCurrencyCell(item.precio_unitario) }}</span>
                    <!-- Dropdown de alternativas con etiquetas -->
                    <div
                      v-if="item._showStores && item.tiendas_alternativas"
                      class="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/30"
                    >
                      <button
                        v-for="store in item.tiendas_alternativas"
                        :key="store.tienda"
                        type="button"
                        class="flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 text-left"
                        :class="isStoreSelected(item, store) ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''"
                        @click.stop="selectStore(item, store); item._showStores = false"
                      >
                        <div class="flex items-center justify-between w-full">
                          <span class="font-semibold text-slate-700 dark:text-slate-300">{{ formatStoreName(store.tienda) }}</span>
                          <span class="font-mono font-bold text-slate-500 dark:text-slate-400">{{ formatCurrencyCell(store.precio) }}</span>
                        </div>
                        <div v-if="store.tag" class="self-start mt-0.5">
                          <span class="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" :class="getStoreTagClass(store.tag)">
                            {{ getStoreTagLabel(store.tag) }}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </transition-group>

          <!-- Empty -->
          <div
            v-if="effectiveDesglose.length === 0"
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
          Al publicar, contratistas que paguen el lead podrán ver tu nombre y correo electrónico.
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
            @click="startPublishFlow"
          >
            {{ publishLoading ? "…" : t("siecplacePublishSubmit") }}
          </button>
        </div>
      </div>
    </div>

    <ConsentModal
      :show="showPlaceConsent"
      title="Publicar en SIEC Place"
      description="Al publicar tu obra, los contratistas que desbloqueen el contacto podrán ver tu nombre y correo electrónico. Este consentimiento es independiente del registro de cuenta."
      consent-type="siecplace_publish"
      :policy-version="policyVersion"
      @confirm="onPlaceConsentConfirm"
      @cancel="showPlaceConsent = false"
      @close="showPlaceConsent = false"
    />

    <!-- Modal "Todo en el mismo lugar" -->
    <div
      v-if="showConsolidatedModal && pendingStore"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 scale-100">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <span class="material-symbols-outlined">shopping_basket</span>
          </div>
          <div>
            <h3 class="text-sm font-black text-slate-900 dark:text-slate-100">
              Compra Consolidada
            </h3>
            <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {{ formatStoreName(pendingStore.tienda) }}
            </p>
          </div>
        </div>

        <p class="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Has seleccionado la opción <strong class="text-indigo-600 dark:text-indigo-400">"Todo en el mismo lugar"</strong> para este material. ¿Deseas aplicar <strong class="font-bold text-slate-800 dark:text-slate-100">{{ formatStoreName(pendingStore.tienda) }}</strong> a todos los materiales que tengan disponibilidad en esta tienda?
        </p>

        <!-- Optional swap to other consolidated stores if multiple exist -->
        <div
          v-if="tiendasConsolidadas.length > 1"
          class="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/50"
        >
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Otras tiendas con alta cobertura:
          </p>
          <div class="mt-2 space-y-1">
            <button
              v-for="altStore in tiendasConsolidadas"
              v-show="altStore.tienda.toLowerCase() !== pendingStore.tienda.toLowerCase()"
              :key="altStore.tienda"
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              @click="pendingStore = { tienda: altStore.tienda, tag: 'todo_mismo_lugar' }"
            >
              <span>Cambiar a lote completo de <strong>{{ formatStoreName(altStore.tienda) }}</strong></span>
              <span class="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-400">
                Cubre {{ altStore.cobertura }}/{{ altStore.total_materiales }}
              </span>
            </button>
          </div>
        </div>

        <div class="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            class="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            @click="confirmConsolidatedSelection(false)"
          >
            Solo a esta fila
          </button>
          <button
            type="button"
            class="flex-1 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all"
            @click="confirmConsolidatedSelection(true)"
          >
            Aplicar a todo el lote
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
