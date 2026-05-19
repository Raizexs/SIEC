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
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import AppRail from './shell/AppRail.vue';
import Sidebar from './Sidebar.vue';
import TopNavBar from './TopNavBar.vue';
import ConfigurationPanel from './ConfigurationPanel.vue';
import MetricsPanel from './MetricsPanel.vue';
import RoomEditor2D from './RoomEditor2D.vue';
import Scene3D from './Scene3D.vue';
import LayerSelectionPanel from './LayerSelectionPanel.vue';
import BudgetBreakdownPanel from './BudgetBreakdownPanel.vue';
import SaveLayoutDialog from './SaveLayoutDialog.vue';
import PreventiveLogisticsAlertModal from './PreventiveLogisticsAlertModal.vue';
import UserManualModal from './UserManualModal.vue';
import ShareDialog from './ShareDialog.vue';
import { useRecintosStore } from '../stores/recintos';
import { useWorkspaceStore } from '../stores/workspace';
import { useTokenCounter } from '../composables/useTokenCounter';
import { useLayoutManager } from '../composables/useLayoutManager';
import { useI18n } from '../composables/useI18n';
import { generateCommercialPDF } from '../utils/pdfGenerator';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import {
  useProductPreferences,
  mergePreferences,
  defaultProductPreferences,
} from '../composables/useProductPreferences';

const props = defineProps({
  projectId: { type: String, default: null },
});

const recintosStore = useRecintosStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const {
  saveLayout,
  createPresetLayout,
  applyLayoutToStore,
  loadLayout: normalizeSavedLayout,
} = useLayoutManager();
const { t, currentLanguage } = useI18n();

const { productPreferences } = useProductPreferences();

const sidebarCollapsed = ref(false);
const motionRoot = ref(null);

useProMotion(motionRoot, { skipIntro: true });

let siecExportListener = null;

onMounted(() => {
  workspaceStore.loadWorkspace();
  siecExportListener = (ev) => {
    onSiecExport(ev);
  };
  window.addEventListener('siec:export', siecExportListener);
});

onUnmounted(() => {
  if (siecExportListener && typeof window !== 'undefined') {
    window.removeEventListener('siec:export', siecExportListener);
  }
});

const showPreventiveLogisticsModal = ref(false);
const showManual = ref(false);

const HEAVY_LOGISTICS_MATERIAL_ID = 4;
const LIGHTWEIGHT_QUOTE_MATERIAL_ID = 2;

const materialTriggerReady = ref(false);

const appKey = computed(() => `app-${currentLanguage.value}`);

const showToast = ref(false);

const formData = ref({
  terrenoAncho: 15,
  terrenoLargo: 7,
  m2Totales: 105,
  materialEstructuralId: 4,
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
    if (!Number.isFinite(n)) return;
    if (formData.value.materialEstructuralId !== n) {
      formData.value.materialEstructuralId = n;
    }
  },
  { immediate: true },
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

watch(
  () => formData.value.materialEstructuralId,
  (newMaterialId, oldMaterialId) => {
    if (!materialTriggerReady.value) {
      materialTriggerReady.value = true;
      return;
    }

    if (
      newMaterialId === HEAVY_LOGISTICS_MATERIAL_ID &&
      oldMaterialId !== HEAVY_LOGISTICS_MATERIAL_ID
    ) {
      showPreventiveLogisticsModal.value = true;
    }
  },
);

const areaUsadaReal = computed(() => {
  return Number(recintosStore.totalArea || 0);
});

const areaTotalReal = computed(() => {
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

let prevMaterialId = formData.value.materialEstructuralId;

watch(
  formData,
  async (newVal) => {
    await nextTick();

    if (newVal.materialEstructuralId !== prevMaterialId) {
      prevMaterialId = newVal.materialEstructuralId;
      recintosStore.configMetadata.materialEstructuralId = newVal.materialEstructuralId;
      return;
    }

    if (estado.value === 'danger') return;
    if (isProgrammaticUpdate.value) return;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const totalHabitaciones =
        newVal.habitacionesSimples +
        newVal.habitacionesDobles +
        newVal.habitacionesTriples;

      recintosStore.initializeLayout(
        newVal.m2Totales,
        totalHabitaciones,
        newVal.banios,
        newVal.areasComunes,
        newVal.materialEstructuralId,
      );
    }, 400);
  },
  { deep: true },
);

const isSubmitting = ref(false);
const activeTab = ref('generalSpecs');
const showSaveDialog = ref(false);
const showShareDialog = ref(false);

const hasRecintos = computed(() => recintosStore.recintos.length > 0);

const updateFormData = (newData) => {
  formData.value = newData;
};

const syncFormDataFromLayout = (layout) => {
  formData.value = {
    ...formData.value,
    terrenoAncho: layout.terrenoAncho,
    terrenoLargo: layout.terrenoLargo,
    m2Totales: layout.m2Totales,
    materialEstructuralId:
      layout.materialEstructuralId || formData.value.materialEstructuralId,
    habitacionesSimples: layout.habitacionesSimples || 0,
    habitacionesDobles: layout.habitacionesDobles || 0,
    habitacionesTriples: layout.habitacionesTriples || 0,
    banios: layout.banios || 0,
    areasComunes: layout.areasComunes || 0,
  };

  prevMaterialId = formData.value.materialEstructuralId;
};

const dismissPreventiveLogisticsModal = () => {
  showPreventiveLogisticsModal.value = false;
};

const quoteWithLightweightMaterials = () => {
  formData.value = {
    ...formData.value,
    materialEstructuralId: LIGHTWEIGHT_QUOTE_MATERIAL_ID,
  };

  showPreventiveLogisticsModal.value = false;
};

const loadPreset = (preset) => {
  isProgrammaticUpdate.value = true;

  const layout = createPresetLayout(preset);
  const normalized = applyLayoutToStore(layout);

  syncFormDataFromLayout({
    ...preset,
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
  const canvas = document.querySelector('.scene3d-canvas canvas');
  await generateCommercialPDF(canvas, workspaceStore.activePresetName, { export: exp });
  authStore.addExportToHistory(workspaceStore.activePresetName);
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

const handleExportPDF = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('siec:export', {
      detail: {
        type: 'pdf',
        preferences: { ...productPreferences.value.export },
      },
    }),
  );
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
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Empezar',
    progressText: '{{current}} de {{total}}',
    steps: [
      {
        popover: {
          title: 'Bienvenido a SIEC',
          description:
            'Este tour te muestra el flujo principal: configurar terreno, controlar métricas, editar en 2D, revisar en 3D y presupuestar recintos.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '.tour-config-panel',
        popover: {
          title: 'Configuración del terreno',
          description:
            'Define dimensiones, superficie disponible y materialidad estructural. Esta información alimenta el diseño, las métricas y el presupuesto.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '.tour-metrics-panel',
        popover: {
          title: 'Presupuesto espacial',
          description:
            'Aquí ves el área usada, el espacio disponible y el estado del proyecto. Si te pasas del límite, SIEC te lo avisa antes de presupuestar mal.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '.tour-editor-2d',
        popover: {
          title: 'Editor 2D',
          description:
            'Crea recintos con medidas exactas. Puedes mover, redimensionar y activar el símbolo $ para incluir espacios específicos en el presupuesto.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '.tour-scene-3d',
        popover: {
          title: 'Vista 3D en tiempo real',
          description:
            'El modelo se actualiza visualmente mientras diseñas. Úsalo para validar proporciones, materialidad y presentación del proyecto.',
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Listo para diseñar',
          description:
            'Empieza agregando recintos desde el editor 2D. Cuando tengas espacios seleccionados para presupuesto, SIEC generará el desglose constructivo.',
          side: 'top',
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
    class="flex min-h-screen bg-slate-50 font-sans text-slate-950 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
  >
    <!-- Background accents -->
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        class="absolute -left-40 top-20 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl dark:bg-orange-400/5"
      ></div>
      <div
        class="absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5"
      ></div>
    </div>

    <!-- Primary navigation -->
    <AppRail active="workspace" />

    <!-- Contextual sidebar -->
    <Sidebar
      @load-preset="loadPreset"
      @load-layout="loadLayout"
      @collapse-change="(val) => (sidebarCollapsed = val)"
      @open-manual="showManual = true"
      @new-estimate="handleNewEstimate"
      @start-tutorial="startTutorial"
    />

    <!-- Main editor area -->
    <main class="relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-200">
      <TopNavBar
        :activeTab="activeTab"
        @save-layout="showSaveDialog = true"
        @export-pdf="handleExportPDF"
        @share="showShareDialog = true"
      />

      <div class="flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <!-- Workspace header strip -->
          <section
            class="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/75 sm:flex-row sm:items-center sm:justify-between"
            data-motion="section"
          >
            <div>
              <p
                class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
              >
                Workspace activo
              </p>

              <h1 class="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                Simulación constructiva inteligente
              </h1>

              <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Configura el terreno, edita recintos, visualiza el modelo 3D y genera presupuesto desde una única experiencia.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <span class="material-symbols-outlined text-[15px] text-orange-500 dark:text-orange-300">
                  square_foot
                </span>
                {{ Math.round(formData.m2Totales) }} m²
              </span>

              <span
                class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <span class="material-symbols-outlined text-[15px] text-slate-400">
                  token
                </span>
                {{ tokensDisponibles }} tokens disponibles
              </span>
            </div>
          </section>

          <!-- Top row: Configuration + Metrics -->
          <section class="grid grid-cols-12 gap-6" data-motion="section">
            <ConfigurationPanel
              class="tour-config-panel"
              :formData="formData"
              :costs="costs"
              :tokensDisponibles="tokensDisponibles"
              @update:formData="updateFormData"
            />

            <MetricsPanel
              class="tour-metrics-panel"
              :formData="formData"
              :tokensUsados="tokensUsados"
              :tokensTotales="tokensTotales"
              :tokensDisponibles="tokensDisponibles"
              :descripcionEstado="descripcionEstado"
              :totalAreaUsado="recintosStore.totalArea"
            />
          </section>

          <!-- Layers + 2D + 3D + Budget stack -->
          <section class="mt-6 space-y-6" data-motion="section">
            <LayerSelectionPanel />

            <!-- Premium hint card -->
            <div
              class="flex items-start gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/70 p-4 shadow-sm backdrop-blur-md dark:border-orange-900/60 dark:bg-orange-950/20"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-white text-orange-600 shadow-sm dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[19px]">
                  add_home
                </span>
              </div>

              <div>
                <p
                  class="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300"
                >
                  Agregar recintos
                </p>

                <p class="mt-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  Usa
                  <strong class="font-black text-slate-950 dark:text-slate-100">
                    “Añadir Recinto”
                  </strong>
                  en el editor 2D para crear espacios con medidas exactas y luego seleccionarlos para presupuestar.
                </p>
              </div>
            </div>

            <RoomEditor2D
              class="tour-editor-2d"
              :m2Totales="formData.m2Totales"
              v-model:terrenoAncho="formData.terrenoAncho"
              v-model:terrenoLargo="formData.terrenoLargo"
              :descripcionEstado="descripcionEstado"
              :show-grid="productPreferences.editor.showGrid"
              :snap-to-grid="productPreferences.editor.snapToGrid"
              :grid-size="productPreferences.editor.gridSize"
              :show-labels="productPreferences.editor.showLabels"
              :default-room-height="productPreferences.defaultRoomHeight"
            />

            <Scene3D
              class="tour-scene-3d"
              :materialEstructuralId="formData.materialEstructuralId"
              :terreno-ancho="formData.terrenoAncho"
              :terreno-largo="formData.terrenoLargo"
              :show-minimap="productPreferences.editor.showMinimap"
            />

            <BudgetBreakdownPanel
              v-if="recintosStore.selectedM2 > 0"
              :m2Totales="recintosStore.selectedM2"
              :materialEstructuralId="formData.materialEstructuralId"
            />
          </section>

          <footer
            class="mt-8 flex flex-col gap-2 border-t border-slate-200/80 py-6 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {{ t('footer') }}
            </p>

            <p class="text-xs font-medium text-slate-400 dark:text-slate-500">
              SIEC Workspace · Simulación, diseño y presupuesto constructivo
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
      :show="showShareDialog"
      :project-id="projectId || 'local'"
      @close="showShareDialog = false"
    />

    <PreventiveLogisticsAlertModal
      :show="showPreventiveLogisticsModal"
      @close="dismissPreventiveLogisticsModal"
      @quote-light-materials="quoteWithLightweightMaterials"
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
            El diseño quedó guardado correctamente.
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
</style>