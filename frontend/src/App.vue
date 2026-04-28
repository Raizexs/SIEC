<script setup>
import { ref, computed, watchEffect, watch, nextTick, onMounted } from "vue";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import Sidebar from "./components/Sidebar.vue";
import TopNavBar from "./components/TopNavBar.vue";
import ConfigurationPanel from "./components/ConfigurationPanel.vue";
import MetricsPanel from "./components/MetricsPanel.vue";
import RoomEditor2D from "./components/RoomEditor2D.vue";
import Scene3D from "./components/Scene3D.vue";
import LayerSelectionPanel from "./components/LayerSelectionPanel.vue";
import BudgetBreakdownPanel from "./components/BudgetBreakdownPanel.vue";
import SaveLayoutDialog from "./components/SaveLayoutDialog.vue";
import LoginOverlay from "./components/LoginOverlay.vue";
import PreventiveLogisticsAlertModal from "./components/PreventiveLogisticsAlertModal.vue";
import UserManualModal from "./components/UserManualModal.vue";
import { useRecintosStore } from "./stores/recintos";
import { useWorkspaceStore } from "./stores/workspace";
import { useTokenCounter } from "./composables/useTokenCounter";
import { useLayoutManager } from "./composables/useLayoutManager";
import { useI18n } from "./composables/useI18n";
import { generateCommercialPDF } from "./utils/pdfGenerator";
import { useAuthStore } from "./stores/auth";

const recintosStore = useRecintosStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const { saveLayout } = useLayoutManager();
const { t, currentLanguage } = useI18n();

const sidebarCollapsed = ref(false);

onMounted(() => {
  authStore.initializeAuth();
  workspaceStore.loadWorkspace();
  // Auto-inicializar layout al montar (sin necesidad de clic en "Generar")
  const fd = formData.value;
  const totalHabitaciones = fd.habitacionesSimples + fd.habitacionesDobles + fd.habitacionesTriples;
  recintosStore.initializeLayout(
    fd.m2Totales,
    totalHabitaciones,
    fd.banios,
    fd.areasComunes,
    fd.materialEstructuralId,
  );
});
const showPreventiveLogisticsModal = ref(false);
const showManual = ref(false);
const HEAVY_LOGISTICS_MATERIAL_ID = 4;
const LIGHTWEIGHT_QUOTE_MATERIAL_ID = 2;
const materialTriggerReady = ref(false);

// Key reactiva para forzar re-render cuando cambia idioma
const appKey = computed(() => `app-${currentLanguage.value}`);

const showToast = ref(false);
const formData = ref({
  terrenoAncho: 7,
  terrenoLargo: 15,
  m2Totales: 105,
  materialEstructuralId: 4,
  habitacionesSimples: 2,
  habitacionesDobles: 0,
  habitacionesTriples: 0,
  banios: 1,
  areasComunes: 1,
});

watchEffect(() => {
  formData.value.m2Totales = (formData.value.terrenoAncho || 0) * (formData.value.terrenoLargo || 0);
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
  estado,
  descripcionEstado,
} = useTokenCounter();

// Sync form data with composable
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

// Reactividad con el motor (HU03/HU11) - con debounce para rendimiento
let debounceTimer = null;
const isProgrammaticUpdate = ref(false);

watch(
  formData,
  async (newVal) => {
    await nextTick();

    if (estado.value === "danger") return;
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
const activeTab = ref("generalSpecs");
const showSaveDialog = ref(false);

const handleTabChange = (tab) => {
  activeTab.value = tab;
};

const hasRecintos = computed(() => recintosStore.recintos.length > 0);

const updateFormData = (newData) => {
  formData.value = newData;
};

const handleMaterialSelection = (materialId) => {
  formData.value.materialEstructuralId = materialId;
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

// Cargar preset desde sidebar
const loadPreset = (preset) => {
  isProgrammaticUpdate.value = true;
  formData.value = {
    terrenoAncho: preset.terrenoAncho || Math.round(Math.sqrt((preset.m2Totales || 105) / 2)),
    terrenoLargo: preset.terrenoLargo || Math.round(Math.sqrt((preset.m2Totales || 105) * 2)),
    m2Totales: preset.m2Totales,
    materialEstructuralId: preset.materialEstructuralId,
    habitacionesSimples: preset.habitacionesSimples || 0,
    habitacionesDobles: preset.habitacionesDobles || 0,
    habitacionesTriples: preset.habitacionesTriples || 0,
    banios: preset.banios,
    areasComunes: preset.areasComunes,
  };

  const totalHabitaciones =
    formData.value.habitacionesSimples +
    formData.value.habitacionesDobles +
    formData.value.habitacionesTriples;

  recintosStore.initializeLayout(
    formData.value.m2Totales,
    totalHabitaciones,
    formData.value.banios,
    formData.value.areasComunes,
    formData.value.materialEstructuralId,
  );
  
  setTimeout(() => { isProgrammaticUpdate.value = false; }, 500);
};

// Cargar layout guardado
const loadLayout = (layout) => {
  isProgrammaticUpdate.value = true;
  formData.value = {
    terrenoAncho: layout.terrenoAncho || Math.round(Math.sqrt((layout.m2Totales || 105) / 2)),
    terrenoLargo: layout.terrenoLargo || Math.round(Math.sqrt((layout.m2Totales || 105) * 2)),
    m2Totales: layout.m2Totales,
    materialEstructuralId: layout.materialEstructuralId,
    habitacionesSimples: layout.habitacionesSimples || 0,
    habitacionesDobles: layout.habitacionesDobles || 0,
    habitacionesTriples: layout.habitacionesTriples || 0,
    banios: layout.banios,
    areasComunes: layout.areasComunes,
  };

  const totalHabitaciones =
    formData.value.habitacionesSimples +
    formData.value.habitacionesDobles +
    formData.value.habitacionesTriples;

  // Cargar topología 3D personalizada si existe en el layout
  if (layout.recintos && layout.recintos.length > 0) {
    // Saltamos la inicialización genérica y cargamos directamente la topología
    recintosStore.configMetadata = {
      m2Totales: formData.value.m2Totales,
      habitaciones: totalHabitaciones,
      banios: formData.value.banios,
      areasComunes: formData.value.areasComunes,
      materialEstructuralId: formData.value.materialEstructuralId,
    };
    recintosStore.recintos = JSON.parse(JSON.stringify(layout.recintos));
    recintosStore.currentFloor = layout.currentFloor || 1;
  } else {
    recintosStore.initializeLayout(
      formData.value.m2Totales,
      totalHabitaciones,
      formData.value.banios,
      formData.value.areasComunes,
      formData.value.materialEstructuralId,
    );
  }
  
  setTimeout(() => { isProgrammaticUpdate.value = false; }, 500);
};

const submitForm = async () => {
  if (estado.value === "danger") {
    alert(
      "No puedes generar el layout. Excedes el límite de tokens disponibles.",
    );
    return;
  }

  isSubmitting.value = true;

  try {
    const totalHabitaciones =
      formData.value.habitacionesSimples +
      formData.value.habitacionesDobles +
      formData.value.habitacionesTriples;

    recintosStore.initializeLayout(
      formData.value.m2Totales,
      totalHabitaciones,
      formData.value.banios,
      formData.value.areasComunes,
      formData.value.materialEstructuralId,
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const handleSaveLayout = (name) => {
  saveLayout(name, formData.value);
  showSaveDialog.value = false;
  showToast.value = true;
  setTimeout(() => showToast.value = false, 3000);
};

const handleNewEstimate = () => {
  if (confirm("¿Estás seguro que deseas iniciar una nueva estimación? Se perderá el diseño actual no guardado.")) {
    isProgrammaticUpdate.value = true;
    workspaceStore.resetWorkspace();
    formData.value = {
      terrenoAncho: 7,
      terrenoLargo: 15,
      m2Totales: 105,
      habitacionesSimples: 0,
      habitacionesDobles: 0,
      habitacionesTriples: 0,
      banios: 0,
      areasComunes: 0,
      materialEstructuralId: 1
    };
    recintosStore.configMetadata = null;
    setTimeout(() => { isProgrammaticUpdate.value = false; }, 500);
  }
};

const handleExportPDF = async () => {
  const canvas = document.querySelector('canvas');
  await generateCommercialPDF(canvas, workspaceStore.activePresetName);
  authStore.addExportToHistory(workspaceStore.activePresetName);
};

const startTutorial = () => {
  const driverObj = driver({
    showProgress: true,
    popoverClass: 'siec-driver-theme',
    steps: [
      { 
        popover: { 
          title: 'Bienvenido a SIEC', 
          description: 'Esta es tu plataforma de inteligencia constructiva. Te daremos un breve recorrido por el simulador.',
          side: "left", align: 'start'
        }
      },
      {
        element: '.tour-config-panel',
        popover: {
          title: 'Configuración del Proyecto',
          description: 'Aquí puedes definir los metros cuadrados de tu terreno, la cantidad de habitaciones, baños y el material estructural.',
          side: "right", align: 'start'
        }
      },
      {
        element: '.tour-metrics-panel',
        popover: {
          title: 'Presupuesto Espacial',
          description: 'Este panel te muestra en tiempo real cómo se distribuye el espacio de tu terreno a medida que agregas recintos.',
          side: "left", align: 'start'
        }
      },
      {
        popover: {
          title: '¡Todo listo!',
          description: 'Haz clic en "Generar Modelo" cuando estés listo para visualizar tu proyecto en 3D.',
          side: "top", align: 'center'
        }
      }
    ]
  });
  
  driverObj.drive();
};
</script>

<template>
  <div
    :key="appKey"
    class="min-h-screen bg-background dark:bg-[#0d1117] font-body text-on-surface dark:text-slate-100 antialiased"
  >
    <Sidebar 
        @load-preset="loadPreset" 
        @load-layout="loadLayout" 
        @collapse-change="(val) => sidebarCollapsed = val" 
        @open-manual="showManual = true"
        @new-estimate="handleNewEstimate"
        @start-tutorial="startTutorial"
      />

    <main
      :class="sidebarCollapsed ? 'ml-0' : 'ml-64'"
      class="min-h-screen transition-all duration-300"
    >
      <TopNavBar :activeTab="activeTab" @save-layout="showSaveDialog = true" @export-pdf="handleExportPDF" />

      <div class="p-10 max-w-7xl mx-auto grid grid-cols-12 gap-10">
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
      </div>

      <div class="p-10 pt-0 max-w-7xl mx-auto space-y-6">
        <LayerSelectionPanel />

        <!-- Hint: crear recintos -->
        <div class="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30">
          <span class="material-symbols-outlined text-indigo-500 dark:text-indigo-400 text-[18px] mt-0.5">add_home</span>
          <div>
            <p class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Agregar recintos</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Usa <strong class="text-indigo-400">"Añadir Recinto"</strong> en el editor 2D para crear espacios con medidas exactas.
            </p>
          </div>
        </div>

        <!-- Editor 2D -->
        <RoomEditor2D
          :m2Totales="formData.m2Totales"
          v-model:terrenoAncho="formData.terrenoAncho"
          v-model:terrenoLargo="formData.terrenoLargo"
          :descripcionEstado="descripcionEstado"
        />

        <!-- Render 3D (siempre debajo del 2D) -->
        <Scene3D :materialEstructuralId="formData.materialEstructuralId" />

        <!-- Presupuesto: aparece cuando hay recintos con $ activado -->
        <BudgetBreakdownPanel
          v-if="recintosStore.selectedM2 > 0"
          :m2Totales="recintosStore.selectedM2"
          :materialEstructuralId="formData.materialEstructuralId"
          @export-pdf="handleExportPDF"
        />
      </div>

      <footer
        class="p-10 pt-0 text-slate-400 text-[10px] font-bold uppercase tracking-widest flex justify-between items-center"
      >
        <div>{{ t("footer") }}</div>
      </footer>
    </main>



    <SaveLayoutDialog
      :show="showSaveDialog"
      @close="showSaveDialog = false"
      @save="handleSaveLayout"
    />

    <PreventiveLogisticsAlertModal
      :show="showPreventiveLogisticsModal"
      @close="dismissPreventiveLogisticsModal"
      @quote-light-materials="quoteWithLightweightMaterials"
    />

    <UserManualModal :show="showManual" @close="showManual = false" />

    <!-- Toast Notification -->
    <transition enter-active-class="transition ease-out duration-300" enter-from-class="transform translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition ease-in duration-200" leave-from-class="transform translate-y-0 opacity-100" leave-to-class="transform translate-y-2 opacity-0">
      <div v-if="showToast" class="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 font-semibold text-sm">
        <span class="material-symbols-outlined">check_circle</span>
        {{ t('layoutSaved') }}
      </div>
    </transition>

    <LoginOverlay />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
}

/* ── Driver.js Premium Theme ─────────────────────────────────────────────────── */
.siec-driver-theme {
  background-color: #0d1117 !important;
  color: #e2e8f0 !important;
  border: 1px solid #30363d !important;
  border-radius: 1rem !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
  font-family: 'Inter', sans-serif !important;
  padding: 1.25rem !important;
}
.siec-driver-theme .driver-popover-title {
  font-size: 1.125rem !important;
  font-weight: 800 !important;
  color: #fff !important;
  margin-bottom: 0.75rem !important;
}
.siec-driver-theme .driver-popover-description {
  font-size: 0.875rem !important;
  color: #94a3b8 !important;
  line-height: 1.6 !important;
}
.siec-driver-theme .driver-popover-footer {
  margin-top: 1rem !important;
}
.siec-driver-theme .driver-popover-footer button {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
  border: 1px solid #334155 !important;
  border-radius: 0.5rem !important;
  padding: 0.5rem 1rem !important;
  font-weight: 600 !important;
  font-size: 0.8rem !important;
  transition: all 0.2s !important;
  text-shadow: none !important;
  cursor: pointer !important;
}
.siec-driver-theme .driver-popover-footer button:hover {
  background-color: #3b82f6 !important;
  border-color: #60a5fa !important;
  color: #fff !important;
}
.siec-driver-theme .driver-popover-progress-text {
  color: #64748b !important;
  font-weight: 600 !important;
  font-size: 0.75rem !important;
}
</style>
