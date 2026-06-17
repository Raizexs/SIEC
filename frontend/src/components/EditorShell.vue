<script setup>
/**
 * EditorShell — SIEC 3D estimation workspace.
 *
 * Lenguaje visual premium:
 * - Shell con fondo slate adaptable claro/oscuro.
 * - Main area con profundidad sutil y separación visual.
 * - Secciones con spacing consistente.
 * - Hint card más elegante.
 * - Feedback de guardado vía toast global (vue-sonner).
 * - Driver.js theme actualizado para mantener coherencia visual.
 */

import { ref, computed, watchEffect, watch, nextTick, onMounted, onUnmounted, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { startWorkspaceTour } from '../composables/useWorkspaceTour.js';
import AppRail from './shell/AppRail.vue';
import Sidebar from './Sidebar.vue';
import TopNavBar from './TopNavBar.vue';
import ConfigurationPanel from './ConfigurationPanel.vue';
import MetricsPanel from './MetricsPanel.vue';
import MetricsBar from './workspace/MetricsBar.vue';
import WorkspaceStepper from './workspace/WorkspaceStepper.vue';
import FlowGuide from './workspace/FlowGuide.vue';
import RoomEditor2D from './RoomEditor2D.vue';
import Scene3D from './Scene3D.vue';
import BudgetBreakdownPanel from './BudgetBreakdownPanel.vue';
import Ley21725AlertModal from './Ley21725AlertModal.vue';
import NormativePanel from './NormativePanel.vue';

import UserManualModal from './UserManualModal.vue';
import ShareDialog from './ShareDialog.vue';
import SaveLayoutDialog from './SaveLayoutDialog.vue';
import { useRecintosStore } from '../stores/recintos';
import { useWorkspaceStore } from '../stores/workspace';
import { useTokenCounter } from '../composables/useTokenCounter';
import { useLayoutManager } from '../composables/useLayoutManager';
import { useI18n } from '../composables/useI18n';
import { useTopologyComputed } from '../composables/useTopologyComputed';
import { toast } from 'vue-sonner';
import { generateCommercialPDF } from '../utils/pdfGenerator';
import {
  captureSceneImage,
  captureProjectPreviewCollage,
  resolveMainSceneCanvas,
} from '../proposal/proposalSceneCapture.js';
import { generateLayoutThumbnail } from '../utils/thumbnailGenerator.js';
import { compressPreviewCollage } from '../utils/imageCompress.js';
import { storeProjectPreview } from '../utils/projectPreview.js';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import { useMotionPreferenceSync } from '../composables/useMotionPreferenceSync';
import {
  WORKSPACE_STEP_REVEAL,
  WORKSPACE_STEP_SWAP,
  setMotionFinalState,
  bindCardHover,
  smoothReplayReveal,
  runStepSwap,
} from '../composables/useMotionContext';
import { prefersReducedMotion, waitForRouteEnter, waitForNextFrame } from '../design/motionTokens';
import { GraduationCap, BookOpen } from 'lucide-vue-next';
import {
  useProductPreferences,
  WORKSPACE_FEATURES,
  mergePreferences,
  defaultProductPreferences,
} from '../composables/useProductPreferences';
import { useProjectsApi } from '../composables/useProjectsApi';
import { useWorkspaceFlow } from '../composables/useWorkspaceFlow';
import { useBilling } from '../composables/useBilling';
import {
  createWorkspaceBudgetSession,
  resetWorkspaceBudgetSession,
  WORKSPACE_BUDGET_SESSION_KEY,
} from '../composables/useWorkspaceBudgetSession';
import logger from '../utils/logger.js';

const props = defineProps({
  projectId: { type: String, default: null },
});

const recintosStore = useRecintosStore();
const { totalArea: totalAreaOcupada } = storeToRefs(recintosStore);
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const { totalWallLength } = useTopologyComputed();
const {
  saveLayout,
  applyLayoutToStore,
  loadLayout: normalizeSavedLayout,
} = useLayoutManager();
const projectsApi = useProjectsApi();
const { t, currentLanguage } = useI18n();

const { productPreferences } = useProductPreferences();
const route = useRoute();
const router = useRouter();

/** Altura de muro alineada con preferencias (2.4 / 2.6 / 2.8 m). */
const alturaMuroM = computed(() => {
  const h = Number(productPreferences.value.defaultRoomHeight);
  return Number.isFinite(h) && h >= 2.1 ? h : 2.4;
});

const workspaceFeatures = computed(
  () => ({
    ...WORKSPACE_FEATURES,
    ...(productPreferences.value.features || {}),
  }),
);

const editorInitialView = computed(
  () => productPreferences.value.editor.initialView || 'split',
);
const showEditor2dPanel = computed(
  () => editorInitialView.value === '2d' || editorInitialView.value === 'split',
);
const forceDesignForCapture = ref(false);
const force3dForCapture = ref(false);

const showEditor3dPanel = computed(
  () =>
    force3dForCapture.value ||
    editorInitialView.value === '3d' ||
    editorInitialView.value === 'split',
);
const editorGridClass = computed(() =>
  editorInitialView.value === 'split'
    ? 'grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch'
    : 'grid grid-cols-1 gap-4',
);

const sidebarCollapsed = ref(false);
const motionRoot = ref(null);
const stepContentRef = ref(null);
const displayedStep = ref('configure');
const stepSwapPair = ref(null);
let stepTransitionSeq = 0;
let stepRevealReady = false;
let stepTransitioning = false;
let unbindStepHover = null;

useProMotion(motionRoot, {
  delayUntilRoute: true,
  revealOptions: { levels: ['section'] },
});
useMotionPreferenceSync(motionRoot);
useMotionPreferenceSync(stepContentRef);

const findStepPanel = (stepId) => {
  if (!stepContentRef.value || !stepId) return null;
  return stepContentRef.value.querySelector(`[data-workspace-step="${stepId}"]`);
};

const isStepPanelVisible = (stepId) => {
  if (stepSwapPair.value) {
    return stepSwapPair.value.from === stepId || stepSwapPair.value.to === stepId;
  }
  if (forceDesignForCapture.value && stepId === 'design') return true;
  return displayedStep.value === stepId;
};

const showConfigurePanel = computed(() => isStepPanelVisible('configure'));
const showDesignPanel = computed(() => isStepPanelVisible('design'));
const showBudgetPanel = computed(() => isStepPanelVisible('budget'));
const showExportPanel = computed(() => isStepPanelVisible('export'));

const bindStepPanelHover = () => {
  unbindStepHover?.();
  const active = findStepPanel(displayedStep.value);
  if (!active) return;
  unbindStepHover = bindCardHover(
    active.querySelectorAll('[data-motion="card"]'),
    { lift: -4 },
  );
};

const revealInitialStep = async () => {
  await nextTick();
  await waitForNextFrame();

  const active = findStepPanel(displayedStep.value);
  if (!active) return;

  if (prefersReducedMotion()) {
    setMotionFinalState(active.querySelectorAll('[data-motion]'));
    bindStepPanelHover();
    return;
  }

  smoothReplayReveal(active, WORKSPACE_STEP_REVEAL);
  bindStepPanelHover();
};

const transitionWorkspaceStep = async (fromStep, toStep) => {
  if (!fromStep || fromStep === toStep) {
    displayedStep.value = toStep;
    bindStepPanelHover();
    return;
  }

  const seq = ++stepTransitionSeq;
  stepTransitioning = true;

  try {
    if (prefersReducedMotion() || forceDesignForCapture.value) {
      displayedStep.value = toStep;
      await nextTick();
      bindStepPanelHover();
      return;
    }

    const outEl = findStepPanel(fromStep);
    const inEl = findStepPanel(toStep);
    if (!outEl || !inEl) {
      displayedStep.value = toStep;
      await nextTick();
      bindStepPanelHover();
      return;
    }

    stepSwapPair.value = { from: fromStep, to: toStep };
    await nextTick();
    await waitForNextFrame();

    await runStepSwap(outEl, inEl, {
      ...WORKSPACE_STEP_SWAP,
      container: stepContentRef.value,
      onSettled: () => {
        if (seq !== stepTransitionSeq) return;
        stepSwapPair.value = null;
        displayedStep.value = toStep;
      },
    });

    if (seq !== stepTransitionSeq) return;

    await nextTick();
    bindStepPanelHover();
  } finally {
    stepTransitioning = false;
    if (seq === stepTransitionSeq) {
      stepSwapPair.value = null;
    }
  }
};

const showManual = ref(false);
const showLey21725Modal = ref(false);
const ley21725Alert = ref(null);

const handleApplyPreset = (layout) => {
  if (!layout) return;
  applyLayoutToStore(layout);
  if (layout.materialEstructuralId != null) {
    formData.value.materialEstructuralId = clampMaterialId(layout.materialEstructuralId);
  }
  if (layout.m2Totales != null) {
    formData.value.m2Totales = layout.m2Totales;
  }
  goToStep('design');
  toast.success('Layout aplicado. Puede ajustar recintos en 2D/3D.');
};

const onLey21725Violation = (alert) => {
  ley21725Alert.value = alert;
  showLey21725Modal.value = true;
};
const hasBudget = ref(false);
const budgetSession = createWorkspaceBudgetSession();
provide(WORKSPACE_BUDGET_SESSION_KEY, budgetSession);
const metricsExpanded = ref(false);

const { fetchBilling, limits, isFree, canUseMaterial, clampMaterialId } = useBilling();

const enforceMaterialForPlan = (materialId) => clampMaterialId(materialId);

const applyMaterialPlanLimits = () => {
  const clamped = enforceMaterialForPlan(formData.value.materialEstructuralId);
  if (formData.value.materialEstructuralId !== clamped) {
    formData.value.materialEstructuralId = clamped;
    prevMaterialId = clamped;
    if (recintosStore.configMetadata) {
      recintosStore.configMetadata.materialEstructuralId = clamped;
    }
  }
};

const recintosCount = computed(() => recintosStore.recintos?.length ?? 0);
const selectedM2 = computed(() => recintosStore.selectedM2 ?? 0);

const {
  currentStep,
  suggestedStep,
  resetToConfigure,
  goToStep,
  nextStep,
  prevStep,
  showDesignStep,
  showMetricsBar,
  isFlowGuideDismissed,
  dismissFlowGuide,
  WORKSPACE_STEPS,
} = useWorkspaceFlow({
  recintosCount,
  hasBudget,
  selectedM2,
});

watch(currentStep, async (next) => {
  if (!stepRevealReady) {
    displayedStep.value = next;
    return;
  }
  const from = displayedStep.value;
  if (from === next) return;
  if (stepTransitioning) {
    stepTransitionSeq += 1;
  }
  await transitionWorkspaceStep(from, next);
});

const appKey = computed(() => `app-${currentLanguage.value}`);

/** Evita resetear el canvas cuando solo se asigna id remoto tras guardar. */
const skipNextProjectBootstrap = ref(false);

const formData = ref({
  terrenoAncho: 15,
  terrenoLargo: 7,
  m2Totales: 105,
  materialEstructuralId: 1,
  habitacionesSimples: 0,
  habitacionesDobles: 0,
  habitacionesTriples: 0,
  banios: 0,
  areasComunes: 0,
});

watch(
  () => productPreferences.value.defaultMaterial,
  (id) => {
    if (props.projectId) return;
    const n = Number(id);
    if (!Number.isFinite(n) || !canUseMaterial(n)) return;
    const allowed = enforceMaterialForPlan(n);
    if (formData.value.materialEstructuralId !== allowed) {
      formData.value.materialEstructuralId = allowed;
    }
  },
  { immediate: true },
);

watch(
  () => limits.value.allowed_material_ids,
  () => {
    applyMaterialPlanLimits();
  },
  { deep: true },
);

watchEffect(() => {
  formData.value.m2Totales =
    (formData.value.terrenoAncho || 0) * (formData.value.terrenoLargo || 0);
});

const {
  m2Totales,
  habitacionesSimples,
  habitacionesDobles,
  habitacionesTriples,
  banios,
  areasComunes,
  costs,
  tokensUsados,
  tokensTotales,
  tokensDisponibles,
} = useTokenCounter();

watchEffect(() => {
  m2Totales.value = formData.value.m2Totales;
  habitacionesSimples.value = formData.value.habitacionesSimples;
  habitacionesDobles.value = formData.value.habitacionesDobles;
  habitacionesTriples.value = formData.value.habitacionesTriples;
  banios.value = formData.value.banios;
  areasComunes.value = formData.value.areasComunes;
});


const areaUsadaReal = computed(() => {
  return Number(recintosStore.totalArea || 0);
});

const terrainM2FromDimensions = computed(() => {
  const w = Number(formData.value.terrenoAncho) || 0;
  const l = Number(formData.value.terrenoLargo) || 0;
  return w * l;
});

const areaTotalReal = computed(() => {
  const fromDims = terrainM2FromDimensions.value;
  if (fromDims > 0) return fromDims;
  return Number(formData.value?.m2Totales || m2Totales.value || 0);
});

const porcentajeOcupacionReal = computed(() => {
  if (areaTotalReal.value <= 0) return 0;

  return areaUsadaReal.value / areaTotalReal.value;
});

const descripcionEstado = computed(() => {
  const total = areaTotalReal.value;
  const usado = areaUsadaReal.value;
  const pct = porcentajeOcupacionReal.value;

  if (total <= 0) {
    return {
      status: 'warning',
      color: '#f59e0b',
      message: 'Terreno no definido',
    };
  }

  if (usado > total) {
    return {
      status: 'danger',
      color: '#ef4444',
      message: 'Sin espacio disponible',
    };
  }

  if (pct >= 0.9) {
    return {
      status: 'warning',
      color: '#f59e0b',
      message: 'Espacio limitado',
    };
  }

  return {
    status: 'safe',
    color: '#10b981',
    message: 'Espacio disponible',
  };
});

const estado = computed(() => descripcionEstado.value.status);

let debounceTimer = null;
const isProgrammaticUpdate = ref(false);

const buildLayoutFromProject = (project) => {
  const payload =
    project?.payload && typeof project.payload === "object" ? project.payload : {};

  return {
    recintos: Array.isArray(payload.recintos) ? payload.recintos : [],
    terrenoAncho: payload.terrenoAncho ?? payload.terreno_ancho,
    terrenoLargo: payload.terrenoLargo ?? payload.terreno_largo,
    m2Totales:
      payload.m2Totales ??
      payload.m2_totales ??
      project?.m2_totales ??
      project?.m2Totales,
    materialEstructuralId:
      payload.materialEstructuralId ??
      payload.material_estructural_id ??
      project?.material_id ??
      project?.materialEstructuralId,
    currentFloor: payload.currentFloor ?? payload.current_floor ?? 1,
    habitacionesSimples: payload.habitacionesSimples ?? 0,
    habitacionesDobles: payload.habitacionesDobles ?? 0,
    habitacionesTriples: payload.habitacionesTriples ?? 0,
    banios: payload.banios ?? 0,
    areasComunes: payload.areasComunes ?? 0,
  };
};

/**
 * Returns true when the projectId is a local/offline identifier that doesn't
 * exist in the remote backend (numeric timestamps or the "local-…" prefix
 * generated by useLayoutManager / useProjectsApi offline mode).
 */
const isLocalProjectId = (id) => {
  if (!id) return true;
  if (String(id).startsWith('local-')) return true;
  // Pure numeric string → timestamp from saveLayout (useLayoutManager)
  return /^\d+$/.test(String(id));
};

const hydrateProjectWorkspace = async (projectId) => {
  isProgrammaticUpdate.value = true;

  // Local/offline projects are stored only in savedLayouts — skip the API call.
  if (isLocalProjectId(projectId)) {
    const { savedLayouts } = useLayoutManager();
    const local = savedLayouts.value.find(
      (l) => String(l.id) === String(projectId),
    );
    if (local) {
      const layoutInput = buildLayoutFromProject({ payload: local, ...local });
      if (layoutInput.recintos.length > 0) {
        const normalized = applyLayoutToStore(layoutInput);
        syncFormDataFromLayout({ ...layoutInput, ...normalized });
        setTimeout(() => { isProgrammaticUpdate.value = false; }, 500);
        return;
      }
    }
    workspaceStore.loadWorkspace();
    await nextTick();
    setTimeout(() => { isProgrammaticUpdate.value = false; }, 500);
    return;
  }

  try {
    const project = await projectsApi.get(projectId);
    if (project?.name) {
      workspaceStore.activePresetName = project.name;
    }

    const layoutInput = buildLayoutFromProject(project);
    if (layoutInput.recintos.length > 0) {
      const normalized = applyLayoutToStore(layoutInput);
      syncFormDataFromLayout({ ...layoutInput, ...normalized });
      return;
    }

    workspaceStore.loadWorkspace();
    await nextTick();
  } catch (error) {
    logger.warn("[workspace] No se pudo cargar el proyecto", projectId, error);
    workspaceStore.loadWorkspace();
    await nextTick();
  } finally {
    setTimeout(() => {
      isProgrammaticUpdate.value = false;
    }, 500);
  }
};

const bootstrapWorkspace = async () => {
  resetToConfigure();

  if (props.projectId) {
    await hydrateProjectWorkspace(props.projectId);
    return;
  }

  workspaceStore.loadWorkspace();
  await nextTick();
};

onMounted(async () => {
  await fetchBilling();
  await bootstrapWorkspace();
  applyMaterialPlanLimits();

  window.addEventListener('siec:export', onSiecExport);
  window.addEventListener('siec:save-version', onSaveVersionEvent);

  await nextTick();
  const stepQuery = route.query.step;
  if (stepQuery === 'budget' || stepQuery === 'export' || stepQuery === 'design' || stepQuery === 'configure') {
    goToStep(String(stepQuery));
  }
  if (route.query.tour === '1') {
    setTimeout(() => startTutorial(), 600);
  }

  await waitForRouteEnter();
  displayedStep.value = currentStep.value;
  await revealInitialStep();
  stepRevealReady = true;
});

onUnmounted(() => {
  unbindStepHover?.();
  window.removeEventListener('siec:save-version', onSaveVersionEvent);
  window.removeEventListener('siec:export', onSiecExport);
});

watch(
  () => props.projectId,
  async (id, prev) => {
    if (id === prev) return;
    if (skipNextProjectBootstrap.value) {
      skipNextProjectBootstrap.value = false;
      return;
    }
    await bootstrapWorkspace();
    applyMaterialPlanLimits();
  },
);

let prevMaterialId = formData.value.materialEstructuralId;

const layoutRoomCounts = () => ({
  habitacionesSimples: formData.value.habitacionesSimples,
  habitacionesDobles: formData.value.habitacionesDobles,
  habitacionesTriples: formData.value.habitacionesTriples,
  banios: formData.value.banios,
  areasComunes: formData.value.areasComunes,
});

// Solo regenerar recintos cuando cambian los contadores de espacios (tokens),
// no al redimensionar el terreno (15×7 → 15×8 conserva el diseño manual).
watch(
  layoutRoomCounts,
  async (newCounts, oldCounts) => {
    await nextTick();
    if (isProgrammaticUpdate.value) return;
    if (!oldCounts) return;

    const countsChanged = Object.keys(newCounts).some(
      (key) => newCounts[key] !== oldCounts[key],
    );
    if (!countsChanged) return;
    if (estado.value === 'danger') return;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const totalHabitaciones =
        newCounts.habitacionesSimples +
        newCounts.habitacionesDobles +
        newCounts.habitacionesTriples;

      recintosStore.initializeLayout(
        areaTotalReal.value,
        totalHabitaciones,
        newCounts.banios,
        newCounts.areasComunes,
        formData.value.materialEstructuralId,
      );
    }, 400);
  },
);

watch(
  () => formData.value.materialEstructuralId,
  (newId) => {
    if (!canUseMaterial(newId)) {
      const clamped = enforceMaterialForPlan(newId);
      formData.value.materialEstructuralId = clamped;
      return;
    }
    if (newId === prevMaterialId) return;
    prevMaterialId = newId;
    if (recintosStore.configMetadata) {
      recintosStore.configMetadata.materialEstructuralId = newId;
    }
  },
);

watch(
  terrainM2FromDimensions,
  (m2) => {
    if (m2 > 0 && formData.value.m2Totales !== m2) {
      formData.value.m2Totales = m2;
    }
    if (recintosStore.configMetadata) {
      recintosStore.configMetadata.m2Totales = m2;
    }
    if (m2Totales.value !== m2) {
      m2Totales.value = m2;
    }
  },
  { immediate: true },
);

const isSubmitting = ref(false);
const activeTab = ref('generalSpecs');
const showSaveDialog = ref(false);
const isSavingLayout = ref(false);
const showShareDialog = ref(false);

const suggestedLayoutName = computed(() => {
  const current = workspaceStore.activePresetName?.trim();
  if (current && current !== 'Proyecto Sin Título') return current;
  return t('defaultProjectName');
});

const CAPTURE_PREVIEW_TIMEOUT_MS = 14000;

const waitForSceneCanvas = async (maxMs = 5000) => {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (resolveMainSceneCanvas()) return true;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return Boolean(resolveMainSceneCanvas());
};

const prepareForSceneCapture = async () => {
  const previousStep = currentStep.value;
  forceDesignForCapture.value = true;
  force3dForCapture.value = true;

  if (previousStep !== 'design') {
    goToStep('design');
  }

  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 120));
  await waitForSceneCanvas();
  await new Promise((resolve) => setTimeout(resolve, 350));

  return previousStep;
};

const restoreAfterSceneCapture = (previousStep) => {
  force3dForCapture.value = false;
  forceDesignForCapture.value = false;
  if (previousStep && previousStep !== currentStep.value) {
    goToStep(previousStep);
  }
};

const hasRecintos = computed(() => recintosStore.recintos.length > 0);

const updateFormData = (patch) => {
  if (!patch || typeof patch !== 'object') return;

  if (Object.prototype.hasOwnProperty.call(patch, 'materialEstructuralId')) {
    patch = {
      ...patch,
      materialEstructuralId: enforceMaterialForPlan(patch.materialEstructuralId),
    };
  }

  Object.assign(formData.value, patch);

  const w = Number(formData.value.terrenoAncho) || 0;
  const l = Number(formData.value.terrenoLargo) || 0;
  formData.value.m2Totales = w * l;
};

const syncFormDataFromLayout = (layout) => {
  formData.value = {
    ...formData.value,
    terrenoAncho: layout.terrenoAncho,
    terrenoLargo: layout.terrenoLargo,
    m2Totales: layout.m2Totales,
    materialEstructuralId: enforceMaterialForPlan(
      layout.materialEstructuralId || formData.value.materialEstructuralId,
    ),
    habitacionesSimples: layout.habitacionesSimples || 0,
    habitacionesDobles: layout.habitacionesDobles || 0,
    habitacionesTriples: layout.habitacionesTriples || 0,
    banios: layout.banios || 0,
    areasComunes: layout.areasComunes || 0,
  };

  prevMaterialId = formData.value.materialEstructuralId;
};


const loadLayout = (layout) => {
  isProgrammaticUpdate.value = true;

  const normalizedInput = normalizeSavedLayout(layout);
  const normalized = applyLayoutToStore(normalizedInput);

  syncFormDataFromLayout({
    ...layout,
    ...normalized,
  });

  nextTick(() => {
    m2Totales.value = formData.value.m2Totales;
    habitacionesSimples.value = formData.value.habitacionesSimples;
    habitacionesDobles.value = formData.value.habitacionesDobles;
    habitacionesTriples.value = formData.value.habitacionesTriples;
    banios.value = formData.value.banios;
    areasComunes.value = formData.value.areasComunes;
  });

  setTimeout(() => {
    isProgrammaticUpdate.value = false;
  }, 500);
};

const buildProjectPayload = () => ({
  recintos: recintosStore.recintos,
  currentFloor: recintosStore.currentFloor,
  selectedForBudget: [...recintosStore.selectedForBudget],
  terrenoAncho: formData.value.terrenoAncho,
  terrenoLargo: formData.value.terrenoLargo,
  m2Totales: formData.value.m2Totales,
  materialEstructuralId: formData.value.materialEstructuralId,
  habitacionesSimples: formData.value.habitacionesSimples,
  habitacionesDobles: formData.value.habitacionesDobles,
  habitacionesTriples: formData.value.habitacionesTriples,
  banios: formData.value.banios,
  areasComunes: formData.value.areasComunes,
});

const resolvePreviewHero = async () => {
  try {
    const preview = await captureProjectPreviewCollage();
    if (preview?.hero) return preview;
  } catch {
    /* 3D no disponible */
  }

  const fallback = generateLayoutThumbnail(recintosStore.recintos);
  return fallback ? { hero: fallback } : null;
};

const capturePreviewWithTimeout = async () => {
  const previousStep = await prepareForSceneCapture();
  try {
    return await Promise.race([
      resolvePreviewHero(),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('preview-timeout')), CAPTURE_PREVIEW_TIMEOUT_MS);
      }),
    ]);
  } finally {
    restoreAfterSceneCapture(previousStep);
  }
};

const persistProjectRemote = async (trimmed, payload, previewHero, savedLayout) => {
  const m2 = Math.round(totalAreaOcupada.value || formData.value.m2Totales || 0);
  const materialId = enforceMaterialForPlan(formData.value.materialEstructuralId);
  const patch = {
    name: trimmed,
    payload,
    thumbnail_url: previewHero?.hero ?? undefined,
    m2_totales: m2,
    material_id: materialId,
  };

  let projectId = props.projectId;

  if (projectId && !isLocalProjectId(projectId)) {
    await projectsApi.update(projectId, patch);
    try {
      await projectsApi.createVersion(projectId, {
        summary: trimmed,
        payload,
      });
    } catch (versionErr) {
      logger.warn('[save] No se pudo crear versión:', versionErr);
    }
    return projectId;
  }

  const created = await projectsApi.create(patch);
  projectId = created.id;
  savedLayout.id = projectId;
  skipNextProjectBootstrap.value = true;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('siec.lastWorkspacePath', `/workspace/${projectId}`);
  }
  await router.replace({
    name: 'workspace',
    params: { projectId: String(projectId) },
  });
  return projectId;
};

const handleSaveLayout = async (name) => {
  const trimmed = String(name || suggestedLayoutName.value || '').trim();
  if (!trimmed || isSavingLayout.value) return;

  isSavingLayout.value = true;
  const toastId = toast.loading(t('savingProject'));

  try {
    workspaceStore.activePresetName = trimmed;
    workspaceStore.saveWorkspace();

    let previewHero = null;
    try {
      const raw = await capturePreviewWithTimeout();
      previewHero = await compressPreviewCollage(raw);
    } catch (captureErr) {
      logger.warn('[save] Captura de portada omitida:', captureErr);
    }

    const layoutExtras = {
      ...formData.value,
      ...(previewHero?.hero ? { thumbnail: previewHero.hero } : {}),
    };

    const savedLayout = saveLayout(trimmed, layoutExtras);

    const savedAt = new Date().toISOString();
    const payload = {
      ...buildProjectPayload(),
      saved_at: savedAt,
      ...(previewHero ? { preview_collage: previewHero } : {}),
    };

    if (previewHero?.hero) {
      const previewKey = props.projectId && !isLocalProjectId(props.projectId)
        ? props.projectId
        : savedLayout.id;
      storeProjectPreview(previewKey, previewHero);
    }

    let syncedRemote = false;
    if (authStore.accessToken) {
      try {
        const remoteId = await persistProjectRemote(trimmed, payload, previewHero, savedLayout);
        if (previewHero?.hero && remoteId) {
          storeProjectPreview(remoteId, previewHero);
        }
        syncedRemote = true;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('siec:projects-changed'));
        }
      } catch (apiErr) {
        logger.warn('[save] API remota falló, quedó guardado localmente:', apiErr);
      }
    }

    showSaveDialog.value = false;
    toast.success(t('layoutSaved'), {
      id: toastId,
      description: syncedRemote ? t('layoutSavedDetail') : t('layoutSavedLocalOnly'),
      duration: 4000,
    });
  } catch (err) {
    const msg = err?.message || t('saveLayoutError');
    toast.error(msg, { id: toastId });
  } finally {
    isSavingLayout.value = false;
  }
};

const onSaveVersionEvent = () => {
  showSaveDialog.value = true;
};

const onBudgetCalculated = ({ costoTotal, m2Totales, materialEstructuralId }) => {
  hasBudget.value = true;
  if (!props.projectId) return;
  if (isLocalProjectId(props.projectId)) return;
  if (!Number.isFinite(costoTotal) || costoTotal <= 0) return;

  // Call update() directly
  // autoSave uses setTimeout which can be lost if the user navigates away
  // before the debounce window elapses.
  projectsApi.update(props.projectId, {
    estimated_cost: costoTotal,
    m2_totales: Math.round(m2Totales),
    material_id: enforceMaterialForPlan(materialEstructuralId),
  }).then(() => {
    logger.debug('[workspace] Costo estimado guardado en el proyecto:', costoTotal);
  }).catch((err) => {
    const msg = err?.message || err?.statusText || JSON.stringify(err) || String(err);
    logger.warn("[workspace] No se pudo guardar el costo estimado en el proyecto:", msg);
  });
};

watch(
  () => [recintosStore.selectedM2, formData.value.materialEstructuralId],
  () => {
    hasBudget.value = false;
    resetWorkspaceBudgetSession(budgetSession);
  },
);


const handleNewEstimate = () => {
  if (
    confirm(
      '¿Estás seguro que deseas iniciar una nueva estimación? Se perderá el diseño actual no guardado.',
    )
  ) {
    isProgrammaticUpdate.value = true;

    workspaceStore.resetWorkspace();

    formData.value = {
      terrenoAncho: 15,
      terrenoLargo: 7,
      m2Totales: 105,
      habitacionesSimples: 0,
      habitacionesDobles: 0,
      habitacionesTriples: 0,
      banios: 0,
      areasComunes: 0,
      materialEstructuralId: 1,
    };

    recintosStore.configMetadata = null;
    recintosStore.replaceRecintos([], {
      currentFloor: 1,
      resetHistory: true,
    });

    prevMaterialId = 1;

    setTimeout(() => {
      isProgrammaticUpdate.value = false;
    }, 500);
  }
};

const resolveExportPrefs = (raw) =>
  raw != null && typeof raw === 'object'
    ? mergePreferences(defaultProductPreferences(), { export: raw }).export
    : productPreferences.value.export;

const executePdfExport = async (exportPrefs) => {
  const exp = resolveExportPrefs(exportPrefs);
  const toastId = 'commercial-pdf-export';

  toast.loading('Generando PDF comercial…', { id: toastId });

  try {
    // Misma captura que Propuesta premium: centra cámara vía siec:capture-scene (Scene3D).
    const snapshotDataUrl = await captureSceneImage();
    const canvas = resolveMainSceneCanvas();

    await generateCommercialPDF(canvas, workspaceStore.activePresetName, {
      export: exp,
      contingency: productPreferences.value.contingency,
      snapshotDataUrl,
      m2Totales: formData.value.m2Totales,
      materialEstructuralId: formData.value.materialEstructuralId,
      tokensUsados: tokensUsados.value,
      tokensTotales: tokensTotales.value,
      tokensDisponibles: tokensDisponibles.value,
    });

    authStore.addExportToHistory(workspaceStore.activePresetName);
    toast.success('PDF exportado correctamente', { id: toastId });
  } catch (err) {
    toast.error(err?.message || 'No se pudo exportar el PDF', { id: toastId });
    throw err;
  }
};

const onSiecExport = async (e) => {
  const d = e?.detail;
  const type = typeof d === 'string' ? d : d?.type;
  if (type !== 'pdf') return;
  const raw =
    typeof d === 'object' && d && d.preferences && typeof d.preferences === 'object'
      ? d.preferences
      : undefined;
  await executePdfExport(raw);
};

const prepareTutorialStep = async (stepId) => {
  goToStep(stepId);
  await nextTick();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
};

const startTutorial = () => {
  startWorkspaceTour({ t, prepareTutorialStep });
};
</script>

<template>
  <div
    ref="motionRoot"
    data-siec-workspace-shell
    :key="appKey"
    class="siec-app-canvas flex min-h-screen font-sans text-slate-950 antialiased transition-colors duration-300 dark:text-slate-100"
  >

    <!-- Primary navigation -->
    <AppRail active="workspace" />

    <!-- Contextual sidebar -->
    <Sidebar
      @load-layout="loadLayout"
      @apply-preset="handleApplyPreset"
      @collapse-change="(val) => (sidebarCollapsed = val)"
      @new-estimate="handleNewEstimate"
    />

    <!-- Main editor area -->
    <main class="relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-200">
      <TopNavBar
        :activeTab="activeTab"
        @save-layout="showSaveDialog = true"
      />

      <div class="flex-1 overflow-y-auto" data-workspace-scroll>
        <div class="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <!-- Workspace header strip -->
          <section
            class="siec-surface-accent mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/80 sm:flex-row sm:items-center sm:justify-between"
            data-motion="section"
          >
            <div>
              <p
                class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
              >
                {{ t('workspaceActive') }}
              </p>

              <h1 class="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                {{ t('workspaceTitle') }}
              </h1>

              <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {{ t('workspaceSubtitle') }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="siec-tutorial-trigger inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-orange-900/70 dark:hover:text-orange-300"
                @click="startTutorial"
              >
                <GraduationCap class="pointer-events-none h-3.5 w-3.5 shrink-0" :stroke-width="2.2" />
                {{ t('tutorial') }}
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
                @click="showManual = true"
              >
                <BookOpen class="h-3.5 w-3.5" :stroke-width="2.2" />
                {{ t('manual') }}
              </button>
            </div>
          </section>

          <div data-no-motion class="workspace-chrome">
          <WorkspaceStepper
            :steps="WORKSPACE_STEPS"
            :current-step="currentStep"
            :suggested-step="suggestedStep"
            @go="goToStep"
          />

          <FlowGuide
            :current-step="currentStep"
            :dismissed="isFlowGuideDismissed()"
            @dismiss="dismissFlowGuide"
          />

          <div
            v-if="showMetricsBar"
            class="mb-4"
          >
            <MetricsBar
              :form-data="formData"
              :descripcion-estado="descripcionEstado"
              :area-recintos="totalAreaOcupada"
              :expanded="metricsExpanded"
              @toggle-expand="metricsExpanded = !metricsExpanded"
            />
            <MetricsPanel
              v-if="metricsExpanded"
              class="tour-metrics-panel mt-3"
              :form-data="formData"
              :descripcion-estado="descripcionEstado"
              :area-recintos="totalAreaOcupada"
            />
          </div>
          </div>

          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              :disabled="currentStep === 'configure'"
              @click="prevStep"
            >
              {{ t('wsPrev') }}
            </button>
            <button
              type="button"
              class="rounded-xl bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-40"
              :disabled="currentStep === 'export'"
              @click="nextStep"
            >
              {{ t('wsNext') }}
            </button>
          </div>

          <div
            ref="stepContentRef"
            data-no-motion
            class="step-content-stack relative space-y-4"
          >
          <section
            v-show="showConfigurePanel"
            data-workspace-step="configure"
            class="workspace-step-panel"
          >
            <ConfigurationPanel
              class="tour-config-panel"
              :formData="formData"
              :allowed-material-ids="limits.allowed_material_ids"
              :hide-locked-materials="isFree"
              @update:formData="updateFormData"
            />
            <NormativePanel
              class="mt-4"
              :material-estructural-id="formData.materialEstructuralId"
              :m2-totales="terrainM2FromDimensions"
              :altura-muro-m="alturaMuroM"
              @ley21725-violation="onLey21725Violation"
            />
          </section>

          <section
            v-show="showDesignPanel"
            data-workspace-step="design"
            class="workspace-step-panel space-y-4"
          >
            <div
              v-if="!isFlowGuideDismissed"
              class="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
            >
              Puede asignar un material distinto a cada recinto desde el inspector 2D o 3D (pantalla completa).
              El material de Configurar se aplica solo a recintos nuevos.
            </div>
            <div :class="editorGridClass">
              <RoomEditor2D
                v-show="showEditor2dPanel"
                class="tour-editor-2d min-h-[420px] xl:min-h-[520px]"
                :editor-visible="showDesignStep && showEditor2dPanel"
                :m2-totales="terrainM2FromDimensions"
                v-model:terrenoAncho="formData.terrenoAncho"
                v-model:terrenoLargo="formData.terrenoLargo"
                :descripcionEstado="descripcionEstado"
                :show-grid="productPreferences.editor.showGrid"
                :show-labels="productPreferences.editor.showLabels"
                :default-room-height="productPreferences.defaultRoomHeight"
                :material-estructural-id="formData.materialEstructuralId"
              />

              <Scene3D
                v-show="showEditor3dPanel"
                :class="[
                  'tour-scene-3d min-h-[420px] xl:min-h-[520px]',
                  force3dForCapture
                    ? 'pointer-events-none fixed -left-[120vw] top-0 z-0 h-[720px] w-[1280px] max-w-none opacity-0'
                    : '',
                ]"
                :materialEstructuralId="formData.materialEstructuralId"
                :terreno-ancho="formData.terrenoAncho"
                :terreno-largo="formData.terrenoLargo"
                :show-minimap="productPreferences.editor.showMinimap"
                :wall-height="alturaMuroM"
                :quality-3d="productPreferences.editor.quality3d"
              />
            </div>

            <div
              v-if="recintosStore.selectedM2 > 0"
              class="flex flex-col gap-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/85 px-4 py-4 shadow-sm dark:border-emerald-900/55 dark:bg-emerald-950/30 sm:flex-row sm:items-center sm:justify-between"
              data-motion="card"
            >
              <div class="flex min-w-0 items-start gap-3">
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                  <span class="material-symbols-outlined text-[22px]">request_quote</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    {{ t('designBudgetCtaTitle') }}
                  </p>
                  <p class="mt-1 text-sm font-medium leading-relaxed text-emerald-800/90 dark:text-emerald-200/85">
                    {{
                      t('designBudgetCtaHint', {
                        count: recintosStore.selectedForBudget.size,
                        m2: Math.round(recintosStore.selectedM2),
                      })
                    }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                @click="goToStep('budget')"
              >
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                {{ t('designBudgetCtaBtn') }}
              </button>
            </div>
          </section>

          <section
            v-show="showBudgetPanel"
            data-workspace-step="budget"
            class="workspace-step-panel tour-budget-step space-y-4"
          >
            <BudgetBreakdownPanel
              v-if="recintosStore.selectedM2 > 0"
              panel-mode="budget"
              :project-id="projectId"
              :m2Totales="recintosStore.selectedM2"
              :materialEstructuralId="formData.materialEstructuralId"
              :perimetroMl="Number(totalWallLength)"
              :alturaMuroM="alturaMuroM"
              :pdf-watermark="limits.pdf_watermark"
              @budget-calculated="onBudgetCalculated"
              @go-export="goToStep('export')"
            />
            <div
              v-else
              data-motion="card"
              class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-300/80 bg-emerald-50/50 px-6 py-14 text-center dark:border-emerald-800/80 dark:bg-emerald-950/20"
            >
              <div
                class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <span class="material-symbols-outlined text-[32px]">paid</span>
              </div>
              <h3 class="text-lg font-bold text-slate-950 dark:text-slate-100">
                {{ t('budgetStepEmptyTitle') }}
              </h3>
              <p class="mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                {{ t('budgetStepEmptyHint') }}
              </p>
              <button
                type="button"
                class="mt-6 inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                @click="goToStep('design')"
              >
                <span class="material-symbols-outlined text-[18px]">edit_square</span>
                {{ t('budgetStepGoDesign') }}
              </button>
            </div>
          </section>

          <section
            v-show="showExportPanel"
            data-workspace-step="export"
            class="workspace-step-panel tour-export-step space-y-4"
          >
            <BudgetBreakdownPanel
              v-if="recintosStore.selectedM2 > 0 && hasBudget"
              panel-mode="export"
              :project-id="projectId"
              :m2Totales="recintosStore.selectedM2"
              :materialEstructuralId="formData.materialEstructuralId"
              :perimetroMl="Number(totalWallLength)"
              :alturaMuroM="alturaMuroM"
              :pdf-watermark="limits.pdf_watermark"
              @budget-calculated="onBudgetCalculated"
            />
            <div
              v-else
              data-motion="card"
              class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-violet-300/80 bg-violet-50/50 px-6 py-14 text-center dark:border-violet-800/80 dark:bg-violet-950/20"
            >
              <div
                class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-sm dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
              >
                <span class="material-symbols-outlined text-[32px]">upload_file</span>
              </div>
              <h3 class="text-lg font-bold text-slate-950 dark:text-slate-100">
                {{ t('exportStepEmptyTitle') }}
              </h3>
              <p class="mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                {{ t('exportStepEmptyHint') }}
              </p>
              <button
                type="button"
                class="mt-6 inline-flex items-center gap-2 rounded-2xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-bold text-violet-800 shadow-sm transition hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                @click="goToStep('budget')"
              >
                <span class="material-symbols-outlined text-[18px]">request_quote</span>
                {{ t('exportStepGoBudget') }}
              </button>
            </div>
          </section>
          </div>

          <footer
            class="mt-8 shrink-0 flex flex-col gap-2 border-t border-slate-200/80 py-6 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {{ t('footer') }}
            </p>

            <p class="text-xs font-medium text-slate-400 dark:text-slate-500">
              {{ t('workspaceFooterLine') }}
            </p>
          </footer>
        </div>
      </div>
    </main>

    <SaveLayoutDialog
      :show="showSaveDialog"
      :layout-name="suggestedLayoutName"
      :saving="isSavingLayout"
      @close="showSaveDialog = false"
      @save="handleSaveLayout"
    />

    <ShareDialog
      v-if="workspaceFeatures.projectShare"
      :show="showShareDialog"
      :project-id="projectId || 'local'"
      @close="showShareDialog = false"
    />



    <UserManualModal
      :show="showManual"
      @close="showManual = false"
    />

    <Ley21725AlertModal
      :show="showLey21725Modal"
      :resultado="ley21725Alert"
      @close="showLey21725Modal = false"
    />

  </div>
</template>

<style>
.step-content-stack.is-step-swapping {
  position: relative;
  overflow: hidden;
}

.step-content-stack.is-step-swapping > .workspace-step-panel {
  margin: 0;
  will-change: opacity, transform;
}

.step-content-stack:not(.is-step-swapping) {
  transition: min-height 0.28s ease-out;
}

/* ─────────────────────────────────────────────
   SIEC Driver.js Premium Tutorial Theme
   ───────────────────────────────────────────── */

.siec-driver-theme {
  overflow: hidden !important;
  width: min(380px, calc(100vw - 32px)) !important;
  border: 1px solid rgba(226, 232, 240, 0.9) !important;
  border-radius: 1.5rem !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96)) !important;
  color: #0f172a !important;
  box-shadow:
    0 28px 90px rgba(15, 23, 42, 0.24),
    0 0 0 1px rgba(255, 255, 255, 0.72) inset !important;
  font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  padding: 0 !important;
  backdrop-filter: blur(18px) !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}

/* Top orange accent */
.siec-driver-theme::before {
  display: block;
  width: 100%;
  height: 4px;
  content: '';
  background: linear-gradient(90deg, #fb923c, #f97316, #0f172a);
}

/* Inner spacing */
.siec-driver-theme .driver-popover-title,
.siec-driver-theme .driver-popover-description,
.siec-driver-theme .driver-popover-footer {
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}

.siec-driver-theme .driver-popover-title {
  position: relative !important;
  margin: 1.15rem 0 0.55rem !important;
  color: #0f172a !important;
  font-size: 1rem !important;
  font-weight: 900 !important;
  line-height: 1.2 !important;
  letter-spacing: -0.025em !important;
  cursor: default !important;
}

.siec-driver-theme .driver-popover-title::before {
  display: inline-flex;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.55rem;
  border-radius: 9999px;
  content: '';
  background: #f97316;
  box-shadow: 0 0 0 5px rgba(249, 115, 22, 0.12);
  vertical-align: 0.08em;
}

.siec-driver-theme .driver-popover-description {
  max-height: min(38vh, 220px) !important;
  overflow-y: auto !important;
  color: #64748b !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  line-height: 1.65 !important;
  padding-bottom: 0.15rem !important;
  scrollbar-width: thin;
  cursor: default !important;
}

.siec-driver-theme .driver-popover-footer {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 0.75rem !important;
  margin-top: 1.1rem !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  border-top: 1px solid rgba(226, 232, 240, 0.9) !important;
  background: rgba(248, 250, 252, 0.78) !important;
}

.siec-driver-theme .driver-popover-progress-text {
  color: #94a3b8 !important;
  font-size: 0.68rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  cursor: default !important;
}

.siec-driver-theme .driver-popover-navigation-btns {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}

.siec-driver-theme button {
  cursor: pointer !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}

.siec-driver-theme .driver-popover-footer button {
  min-height: 2.35rem !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  color: #475569 !important;
  padding: 0.55rem 0.85rem !important;
  font-size: 0.68rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  text-shadow: none !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06) !important;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease !important;
}

.siec-driver-theme .driver-popover-footer button:hover {
  transform: translateY(-1px) !important;
  border-color: #cbd5e1 !important;
  background: #f8fafc !important;
  color: #0f172a !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1) !important;
}

.siec-driver-theme .driver-popover-footer button:active {
  transform: scale(0.98) !important;
}

/* Primary button: next / done */
.siec-driver-theme .driver-popover-next-btn,
.siec-driver-theme .driver-popover-done-btn {
  border-color: #0f172a !important;
  background: #0f172a !important;
  color: #ffffff !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18) !important;
}

.siec-driver-theme .driver-popover-next-btn:hover,
.siec-driver-theme .driver-popover-done-btn:hover {
  border-color: #1e293b !important;
  background: #1e293b !important;
  color: #ffffff !important;
}

/* Close button */
.siec-driver-theme .driver-popover-close-btn {
  top: 0.85rem !important;
  right: 0.85rem !important;
  width: 2rem !important;
  height: 2rem !important;
  border-radius: 0.9rem !important;
  color: #94a3b8 !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease !important;
}

.siec-driver-theme .driver-popover-close-btn:hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  transform: rotate(90deg) !important;
}

/* Arrows */
.siec-driver-theme .driver-popover-arrow-side-left.driver-popover-arrow {
  border-left-color: rgba(255, 255, 255, 0.98) !important;
}

.siec-driver-theme .driver-popover-arrow-side-right.driver-popover-arrow {
  border-right-color: rgba(255, 255, 255, 0.98) !important;
}

.siec-driver-theme .driver-popover-arrow-side-top.driver-popover-arrow {
  border-top-color: rgba(255, 255, 255, 0.98) !important;
}

.siec-driver-theme .driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: rgba(255, 255, 255, 0.98) !important;
}

/* Overlay SVG: sin fondo sólido — el path SVG ya crea el agujero del spotlight.
   Un background aquí oscurecía también el recuadro resaltado. */
.driver-overlay {
  background: transparent !important;
  backdrop-filter: none !important;
  pointer-events: none !important;
}

.driver-overlay path {
  pointer-events: auto !important;
}

.driver-active-element {
  position: relative !important;
  z-index: 10001 !important;
  border-radius: 1.5rem !important;
  box-shadow:
    0 0 0 3px rgba(249, 115, 22, 1),
    0 0 0 10px rgba(249, 115, 22, 0.22),
    0 16px 48px rgba(15, 23, 42, 0.18) !important;
}

/* Prevent Driver from making selected complex panels look washed out */
.driver-active-element,
.driver-active-element * {
  filter: none !important;
  opacity: 1 !important;
}

/* Dark mode */
.dark .siec-driver-theme {
  border-color: rgba(30, 41, 59, 0.95) !important;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.96)) !important;
  color: #e2e8f0 !important;
  box-shadow:
    0 28px 90px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset !important;
}

.dark .siec-driver-theme .driver-popover-title {
  color: #f8fafc !important;
}

.dark .siec-driver-theme .driver-popover-description {
  color: #94a3b8 !important;
}

.dark .siec-driver-theme .driver-popover-footer {
  border-top-color: rgba(30, 41, 59, 0.9) !important;
  background: rgba(15, 23, 42, 0.72) !important;
}

.dark .siec-driver-theme .driver-popover-footer button {
  border-color: #1e293b !important;
  background: #0f172a !important;
  color: #cbd5e1 !important;
}

.dark .siec-driver-theme .driver-popover-footer button:hover {
  border-color: #334155 !important;
  background: #1e293b !important;
  color: #f8fafc !important;
}

.dark .siec-driver-theme .driver-popover-next-btn,
.dark .siec-driver-theme .driver-popover-done-btn {
  border-color: #ffffff !important;
  background: #ffffff !important;
  color: #0f172a !important;
}

.dark .siec-driver-theme .driver-popover-next-btn:hover,
.dark .siec-driver-theme .driver-popover-done-btn:hover {
  border-color: #e2e8f0 !important;
  background: #e2e8f0 !important;
  color: #0f172a !important;
}

.dark .siec-driver-theme .driver-popover-close-btn:hover {
  background: #1e293b !important;
  color: #f8fafc !important;
}

.dark .siec-driver-theme .driver-popover-arrow-side-left.driver-popover-arrow {
  border-left-color: rgba(15, 23, 42, 0.98) !important;
}

.dark .siec-driver-theme .driver-popover-arrow-side-right.driver-popover-arrow {
  border-right-color: rgba(15, 23, 42, 0.98) !important;
}

.dark .siec-driver-theme .driver-popover-arrow-side-top.driver-popover-arrow {
  border-top-color: rgba(15, 23, 42, 0.98) !important;
}

.dark .siec-driver-theme .driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: rgba(15, 23, 42, 0.98) !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>