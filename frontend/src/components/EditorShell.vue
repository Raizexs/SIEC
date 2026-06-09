<script setup>
/**
 * EditorShell — SIEC 3D estimation workspace.
 *
 * Lenguaje visual premium:
 * - Shell con fondo slate adaptable claro/oscuro.
 * - Main area con profundidad sutil y separación visual.
 * - Secciones con spacing consistente.
 * - Hint card más elegante.
 * - Toast premium.
 * - Driver.js theme actualizado para mantener coherencia visual.
 */

import { ref, computed, watchEffect, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
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
import SaveLayoutDialog from './SaveLayoutDialog.vue';

import UserManualModal from './UserManualModal.vue';
import ShareDialog from './ShareDialog.vue';
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
  resolveMainSceneCanvas,
} from '../proposal/proposalSceneCapture.js';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
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

const workspaceFeatures = computed(
  () => ({
    ...WORKSPACE_FEATURES,
    ...(productPreferences.value.features || {}),
  }),
);

const sidebarCollapsed = ref(false);
const motionRoot = ref(null);

useProMotion(motionRoot, { skipIntro: true });

const showManual = ref(false);
const hasBudget = ref(false);
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
  goToStep,
  nextStep,
  prevStep,
  showConfigure,
  showDesignStep,
  showBudgetStep,
  showMetricsBar,
  isFlowGuideDismissed,
  dismissFlowGuide,
  WORKSPACE_STEPS,
} = useWorkspaceFlow({
  recintosCount,
  hasBudget,
  selectedM2,
});

const appKey = computed(() => `app-${currentLanguage.value}`);

const showToast = ref(false);

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

const ensureDefaultRecinto = () => {
  if (recintosStore.recintos.length === 0) {
    recintosStore.addRecinto("habitacion", "Habitación", 3.5, 3.0, 2.4);
  }
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
    ensureDefaultRecinto();
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
    ensureDefaultRecinto();
  } catch (error) {
    logger.warn("[workspace] No se pudo cargar el proyecto", projectId, error);
    workspaceStore.loadWorkspace();
    await nextTick();
    ensureDefaultRecinto();
  } finally {
    setTimeout(() => {
      isProgrammaticUpdate.value = false;
    }, 500);
  }
};

const bootstrapWorkspace = async () => {
  if (props.projectId) {
    await hydrateProjectWorkspace(props.projectId);
    return;
  }

  workspaceStore.loadWorkspace();
  await nextTick();
  ensureDefaultRecinto();
};

onMounted(async () => {
  await fetchBilling();
  await bootstrapWorkspace();
  applyMaterialPlanLimits();
});

watch(
  () => props.projectId,
  async (id, prev) => {
    if (id === prev) return;
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
const showShareDialog = ref(false);

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

const handleSaveLayout = (name) => {
  saveLayout(name, formData.value);
  showSaveDialog.value = false;
  showToast.value = true;

  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

const onSaveVersionEvent = () => {
  showSaveDialog.value = true;
};

const onBudgetCalculated = ({ costoTotal, m2Totales, materialEstructuralId }) => {
  hasBudget.value = true;
  if (!props.projectId) return;
  if (isLocalProjectId(props.projectId)) return;
  if (!Number.isFinite(costoTotal) || costoTotal <= 0) return;

  // Call update() directly (not autoSave) so the PATCH fires immediately.
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

onMounted(() => {
  window.addEventListener('siec:save-version', onSaveVersionEvent);
});

onUnmounted(() => {
  window.removeEventListener('siec:save-version', onSaveVersionEvent);
});

const handleNewEstimate = () => {
  if (confirm(t('wsNewEstimateConfirm'))) {
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

  toast.loading(t('wsPdfGenerating'), { id: toastId });

  try {
    // Misma captura que Propuesta premium: centra cámara vía siec:capture-scene (Scene3D).
    const snapshotDataUrl = await captureSceneImage();
    const canvas = resolveMainSceneCanvas();

    await generateCommercialPDF(canvas, workspaceStore.activePresetName, {
      export: exp,
      snapshotDataUrl,
      m2Totales: formData.value.m2Totales,
      materialEstructuralId: formData.value.materialEstructuralId,
      tokensUsados: tokensUsados.value,
      tokensTotales: tokensTotales.value,
      tokensDisponibles: tokensDisponibles.value,
    });

    authStore.addExportToHistory(workspaceStore.activePresetName);
    toast.success(t('wsPdfExported'), { id: toastId });
  } catch (err) {
    toast.error(err?.message || t('wsPdfFailed'), { id: toastId });
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
  const driverObj = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.58,
    stagePadding: 10,
    stageRadius: 22,
    popoverClass: 'siec-driver-theme',
    nextBtnText: t('tourBtnNext'),
    prevBtnText: t('tourBtnPrev'),
    doneBtnText: t('tourBtnDone'),
    progressText: '{{current}} / {{total}}',
    steps: [
      {
        popover: {
          title: t('tourWelcomeTitle'),
          description: t('tourWelcomeDesc'),
          side: 'over',
          align: 'center',
        },
      },
      {
        element: '.tour-workspace-stepper',
        popover: {
          title: t('tourStepperTitle'),
          description: t('tourStepperDesc'),
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-config-panel',
        onHighlightStarted: () => {
          void prepareTutorialStep('configure');
        },
        popover: {
          title: t('tourConfigureTitle'),
          description: t('tourConfigureDesc'),
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '.tour-metrics-bar',
        onHighlightStarted: () => {
          void prepareTutorialStep('design');
        },
        popover: {
          title: t('tourMetricsTitle'),
          description: t('tourMetricsDesc'),
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-editor-2d-toolbar',
        onHighlightStarted: () => {
          void prepareTutorialStep('design');
        },
        popover: {
          title: t('tourEditorToolsTitle'),
          description: t('tourEditorToolsDesc'),
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-editor-2d-actions',
        onHighlightStarted: () => {
          void prepareTutorialStep('design');
        },
        popover: {
          title: t('tourEditorActionsTitle'),
          description: t('tourEditorActionsDesc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '.tour-editor-2d',
        onHighlightStarted: () => {
          void prepareTutorialStep('design');
        },
        popover: {
          title: t('tourEditorCanvasTitle'),
          description: t('tourEditorCanvasDesc'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '.tour-scene-3d-tools',
        onHighlightStarted: () => {
          void prepareTutorialStep('design');
        },
        popover: {
          title: t('tourSceneToolsTitle'),
          description: t('tourSceneToolsDesc'),
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-scene-3d-actions',
        onHighlightStarted: () => {
          void prepareTutorialStep('design');
        },
        popover: {
          title: t('tourSceneActionsTitle'),
          description: t('tourSceneActionsDesc'),
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '.tour-budget-step',
        onHighlightStarted: () => {
          void prepareTutorialStep('budget');
        },
        popover: {
          title: t('tourBudgetTitle'),
          description: t('tourBudgetDesc'),
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: t('tourDoneTitle'),
          description: t('tourDoneDesc'),
          side: 'over',
          align: 'center',
        },
      },
    ],
  });

  driverObj.drive();
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
                class="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-orange-900/70 dark:hover:text-orange-300"
                @click="startTutorial"
              >
                <GraduationCap class="h-3.5 w-3.5" :stroke-width="2.2" />
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
              :disabled="currentStep === 'budget'"
              @click="nextStep"
            >
              {{ t('wsNext') }}
            </button>
          </div>

          <section v-show="showConfigure" data-motion="section">
            <ConfigurationPanel
              class="tour-config-panel"
              :formData="formData"
              :allowed-material-ids="limits.allowed_material_ids"
              :hide-locked-materials="isFree"
              @update:formData="updateFormData"
            />
          </section>

          <section v-show="showDesignStep" class="space-y-4" data-motion="section">
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
              <RoomEditor2D
                class="tour-editor-2d min-h-[420px] xl:min-h-[520px]"
                :editor-visible="showDesignStep"
                :m2-totales="terrainM2FromDimensions"
                v-model:terrenoAncho="formData.terrenoAncho"
                v-model:terrenoLargo="formData.terrenoLargo"
                :descripcionEstado="descripcionEstado"
                :show-grid="productPreferences.editor.showGrid"
                :show-labels="productPreferences.editor.showLabels"
                :default-room-height="productPreferences.defaultRoomHeight"
              />

              <Scene3D
                class="tour-scene-3d min-h-[420px] xl:min-h-[520px]"
                :materialEstructuralId="formData.materialEstructuralId"
                :terreno-ancho="formData.terrenoAncho"
                :terreno-largo="formData.terrenoLargo"
                :show-minimap="productPreferences.editor.showMinimap"
              />
            </div>
          </section>

          <section v-show="showBudgetStep" class="tour-budget-step space-y-4" data-motion="section">
            <BudgetBreakdownPanel
              v-if="recintosStore.selectedM2 > 0"
              :m2Totales="recintosStore.selectedM2"
              :materialEstructuralId="formData.materialEstructuralId"
              :perimetroMl="Number(totalWallLength)"
              :alturaMuroM="2.44"
              :pdf-watermark="limits.pdf_watermark"
              @budget-calculated="onBudgetCalculated"
            />
            <div
              v-else
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

          <footer
            class="mt-8 flex flex-col gap-2 border-t border-slate-200/80 py-6 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between"
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

    <!-- Premium toast -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-3 opacity-0 scale-[0.98]"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-3 opacity-0 scale-[0.98]"
    >
      <div
        v-if="showToast"
        class="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-emerald-900/70 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-black/30"
        role="status"
        aria-live="polite"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <span class="material-symbols-outlined text-[20px]">
            check_circle
          </span>
        </div>

        <div>
          <p class="font-bold leading-snug">
            {{ t('layoutSaved') }}
          </p>
          <p class="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {{ t('layoutSavedDetail') }}
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style>
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
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  padding: 0 !important;
  backdrop-filter: blur(18px) !important;
  -webkit-user-select: text !important;
  user-select: text !important;
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
  color: #64748b !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  line-height: 1.65 !important;
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
}

.siec-driver-theme .driver-popover-navigation-btns {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}

.siec-driver-theme .driver-popover-footer button {
  cursor: pointer !important;
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

/* Overlay: NO blur. This fixes the unfocused highlighted area. */
.driver-overlay {
  background: rgba(2, 6, 23, 0.58) !important;
  backdrop-filter: none !important;
}

/* Highlighted element */
.driver-active-element {
  border-radius: 1.5rem !important;
  box-shadow:
    0 0 0 2px rgba(249, 115, 22, 0.9),
    0 0 0 8px rgba(249, 115, 22, 0.18),
    0 24px 80px rgba(15, 23, 42, 0.28) !important;
}

/* Prevent Driver from making selected complex panels look washed out */
.driver-active-element,
.driver-active-element * {
  filter: none !important;
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