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
import BudgetBreakdownPanel from "./components/BudgetBreakdownPanel.vue";
import PreventiveLogisticsAlertModal from "./components/PreventiveLogisticsAlertModal.vue";
import { useRecintosStore } from "./stores/recintos";
import { useTokenCounter } from "./composables/useTokenCounter";
import { useLayoutManager } from "./composables/useLayoutManager";
import { useI18n } from "./composables/useI18n";

const recintosStore = useRecintosStore();
const { saveLayout } = useLayoutManager();
const { t, currentLanguage } = useI18n();

const sidebarCollapsed = ref(false);
const showPreventiveLogisticsModal = ref(false);
const HEAVY_LOGISTICS_MATERIAL_ID = 4;
const LIGHTWEIGHT_QUOTE_MATERIAL_ID = 2;
const materialTriggerReady = ref(false);

// Key reactiva para forzar re-render cuando cambia idioma
const appKey = computed(() => `app-${currentLanguage.value}`);

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

    showSaveDialog.value = true;
  } catch (error) {
    console.error("Error:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const handleSaveLayout = (name) => {
  saveLayout(name, formData.value);
  showSaveDialog.value = false;
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
    />

    <main
      :class="sidebarCollapsed ? 'ml-0' : 'ml-64'"
      class="min-h-screen transition-all duration-300"
    >
      <TopNavBar :activeTab="activeTab" @tab-change="handleTabChange" />

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
        <RoomEditor2D
          :m2Totales="formData.m2Totales"
          :descripcionEstado="descripcionEstado"
        />
        <Scene3D />

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
  </div>
</template>
