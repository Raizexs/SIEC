<script setup>
import { ref, computed, watchEffect, watch, nextTick } from "vue";
import Sidebar from "./components/Sidebar.vue";
import TopNavBar from "./components/TopNavBar.vue";
import ConfigurationPanel from "./components/ConfigurationPanel.vue";
import MetricsPanel from "./components/MetricsPanel.vue";
import SaveLayoutDialog from "./components/SaveLayoutDialog.vue";
import RoomEditor2D from "./components/RoomEditor2D.vue";
import Scene3D from "./components/Scene3D.vue";
import MaterialsPanel from "./components/MaterialsPanel.vue";
import LayerSelectionPanel from "./components/LayerSelectionPanel.vue";
import BudgetBreakdownPanel from "./components/BudgetBreakdownPanel.vue";
import PreventiveLogisticsAlertModal from "./components/PreventiveLogisticsAlertModal.vue";
import UserManualModal from "./components/UserManualModal.vue";
import { useRecintosStore } from "./stores/recintos";
import { useTokenCounter } from "./composables/useTokenCounter";
import { useLayoutManager } from "./composables/useLayoutManager";
import { useI18n } from "./composables/useI18n";

const recintosStore = useRecintosStore();
const { saveLayout } = useLayoutManager();
const { t, currentLanguage } = useI18n();

const sidebarCollapsed = ref(false);
const showPreventiveLogisticsModal = ref(false);
const showManual = ref(false);
const is3DMode = ref(false);
const HEAVY_LOGISTICS_MATERIAL_ID = 4;
const LIGHTWEIGHT_QUOTE_MATERIAL_ID = 2;
const materialTriggerReady = ref(false);

// Key reactiva para forzar re-render cuando cambia idioma
const appKey = computed(() => `app-${currentLanguage.value}`);

const showToast = ref(false);

const formData = ref({
  m2Totales: 150,
  materialEstructuralId: 4,
  habitacionesSimples: 2,
  habitacionesDobles: 0,
  habitacionesTriples: 0,
  banios: 1,
  areasComunes: 1,
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
watch(
  formData,
  async (newVal) => {
    await nextTick(); // Esperamos que useTokenCounter actualice 'estado'

    if (estado.value === "danger") {
      // Si excede el límite de tokens, abortar regeneración para no corromper el modelo 3D
      return;
    }

    if (hasRecintos.value) {
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
      }, 400); // Debounce de 400ms para evitar congelamientos en cambios continuos (sliders/flechas)
    }
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
  formData.value = {
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
};

// Cargar layout guardado
const loadLayout = (layout) => {
  formData.value = {
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

  recintosStore.initializeLayout(
    formData.value.m2Totales,
    totalHabitaciones,
    formData.value.banios,
    formData.value.areasComunes,
    formData.value.materialEstructuralId,
  );
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
</script>

<template>
  <div
    :key="appKey"
    class="min-h-screen bg-background dark:bg-[#0d1117] font-body text-on-surface dark:text-slate-100 antialiased"
  >
    <Sidebar
      @loadPreset="loadPreset"
      @loadLayout="loadLayout"
      @collapse-change="sidebarCollapsed = $event"
      @open-manual="showManual = true"
    />

    <main
      :class="sidebarCollapsed ? 'ml-0' : 'ml-64'"
      class="min-h-screen transition-all duration-300"
    >
      <TopNavBar :activeTab="activeTab" :is3DMode="is3DMode" @tab-change="handleTabChange" @save-layout="showSaveDialog = true" @toggle-3d="is3DMode = $event" />

      <div class="p-10 max-w-7xl mx-auto grid grid-cols-12 gap-10">
        <ConfigurationPanel
          v-show="activeTab === 'generalSpecs'"
          :formData="formData"
          :costs="costs"
          :tokensDisponibles="tokensDisponibles"
          :isSubmitting="isSubmitting"
          @update:formData="updateFormData"
          @submit="submitForm"
        />
        <MaterialsPanel
          v-show="activeTab === 'materials'"
          :selectedMaterialId="formData.materialEstructuralId"
          :totalM2="formData.m2Totales"
          @material-selected="handleMaterialSelection"
          class="col-span-7"
        />

        <MetricsPanel
          :formData="formData"
          :tokensUsados="tokensUsados"
          :tokensTotales="tokensTotales"
          :tokensDisponibles="tokensDisponibles"
          :descripcionEstado="descripcionEstado"
          :totalAreaUsado="recintosStore.totalArea"
        />
      </div>

      <div v-if="hasRecintos" class="p-10 pt-0 max-w-7xl mx-auto space-y-6">
        <LayerSelectionPanel />
        
        <!-- Toggle 2D/3D Container -->
        <transition name="fade" mode="out-in">
          <KeepAlive>
            <Scene3D v-if="is3DMode" :materialEstructuralId="formData.materialEstructuralId" />
            <RoomEditor2D
              v-else
              :m2Totales="formData.m2Totales"
              :descripcionEstado="descripcionEstado"
            />
          </KeepAlive>
        </transition>

        <!-- Presupuesto: aparece cuando hay recintos con $ activado -->
        <BudgetBreakdownPanel
          v-if="recintosStore.selectedM2 > 0"
          :m2Totales="recintosStore.selectedM2"
          :materialEstructuralId="formData.materialEstructuralId"
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
  transform: scale(0.95);
}
</style>
