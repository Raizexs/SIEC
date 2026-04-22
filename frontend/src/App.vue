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
import { useRecintosStore } from "./stores/recintos";
import { useTokenCounter } from "./composables/useTokenCounter";
import { useLayoutManager } from "./composables/useLayoutManager";
import { useI18n } from "./composables/useI18n";
import RegulatoryValidator from "./components/RegulatoryValidator.vue";

const recintosStore = useRecintosStore();
const { saveLayout } = useLayoutManager();
const { t, currentLanguage } = useI18n();

// Key reactiva para forzar re-render cuando cambia idioma
const appKey = computed(() => `app-${currentLanguage.value}`);

const formData = ref({
  m2Totales: 400,
  materialEstructuralId: 4,
  habitacionesSimples: 1,
  habitacionesDobles: 0,
  habitacionesTriples: 0,
  banios: 1,
  areasComunes: 0,
  numPisos: 2,
  zonaClimatica: "Central",
  isComplex: false,
  hasEngineer: false,
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

// Reactividad con el motor (HU03/HU11) - con debounce para rendimiento
let debounceTimer = null;
watch(formData, async (newVal) => {
  await nextTick(); // Esperamos que useTokenCounter actualice 'estado'
  
  if (estado.value === "danger") {
    // Si excede el límite de tokens, abortar regeneración para no corromper el modelo 3D
    return;
  }
  
  if (hasRecintos.value) {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      const totalHabitaciones = newVal.habitacionesSimples + newVal.habitacionesDobles + newVal.habitacionesTriples;
      recintosStore.initializeLayout(
        newVal.m2Totales,
        totalHabitaciones,
        newVal.banios,
        newVal.areasComunes,
        newVal.materialEstructuralId
      );
    }, 400); // Debounce de 400ms para evitar congelamientos en cambios continuos (sliders/flechas)
  }
}, { deep: true });

const isSubmitting = ref(false);
const activeTab = ref("generalSpecs");
const showSaveDialog = ref(false);

const handleTabChange = (tab) => {
  activeTab.value = tab;
};

const hasRecintos = computed(() => recintosStore.recintos.length > 0);

// Mapeo de materialEstructuralId a nombre de material para validación regulatoria
const materialMap = {
  1: "Madera",
  2: "Metalcom",
  3: "Albañilería",
  4: "Hormigón Armado"
};

const materialEstructuralNombre = computed(() => {
  return materialMap[formData.value.materialEstructuralId] || "Hormigón Armado";
});

// Datos para pasar al validador regulatorio
const projectDataForValidator = computed(() => ({
  m2_totales: formData.value.m2Totales,
  material_estructural: materialEstructuralNombre.value,
  num_stories: formData.value.numPisos,
  zona_climatica: formData.value.zonaClimatica,
  is_complex: formData.value.isComplex,
  has_engineer: formData.value.hasEngineer
}));

const updateFormData = (newData) => {
  formData.value = newData;
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
  
  const totalHabitaciones = formData.value.habitacionesSimples + formData.value.habitacionesDobles + formData.value.habitacionesTriples;
  
  recintosStore.initializeLayout(
    formData.value.m2Totales,
    totalHabitaciones,
    formData.value.banios,
    formData.value.areasComunes,
    formData.value.materialEstructuralId
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
  
  const totalHabitaciones = formData.value.habitacionesSimples + formData.value.habitacionesDobles + formData.value.habitacionesTriples;
  
  recintosStore.initializeLayout(
    formData.value.m2Totales,
    totalHabitaciones,
    formData.value.banios,
    formData.value.areasComunes,
    formData.value.materialEstructuralId
  );
};

const submitForm = async () => {
  if (estado.value === "danger") {
    alert("No puedes generar el layout. Excedes el límite de tokens disponibles.");
    return;
  }

  isSubmitting.value = true;

  try {
    const totalHabitaciones = formData.value.habitacionesSimples + formData.value.habitacionesDobles + formData.value.habitacionesTriples;

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
  <div :key="appKey" class="min-h-screen bg-background font-body text-on-surface antialiased">
    <Sidebar @loadPreset="loadPreset" @loadLayout="loadLayout" />

    <main class="ml-64 min-h-screen">
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
          @material-selected="(id) => formData.materialEstructuralId = id"
          class="col-span-7"
        />
        <RegulatoryValidator
          v-show="activeTab === 'regulatory'"
          :projectData="projectDataForValidator"
          class="col-span-12"
        />

        <MetricsPanel
          :formData="formData"
          :tokensUsados="tokensUsados"
          :tokensTotales="tokensTotales"
          :tokensDisponibles="tokensDisponibles"
          :descripcionEstado="descripcionEstado"
        />
      </div>

      <div v-if="hasRecintos" class="p-10 pt-0 max-w-7xl mx-auto space-y-6">
        <RoomEditor2D />
        <Scene3D />
      </div>

      <footer class="p-10 pt-0 text-slate-400 text-[10px] font-bold uppercase tracking-widest flex justify-between items-center">
        <div>{{ t('footer') }}</div>
        <div class="flex gap-6">
          <div class="flex items-center gap-2 mr-4 text-emerald-500/70">
            <span class="material-symbols-outlined text-[14px]">cloud_done</span>
            <span>{{ t('draftsSynced') }}</span>
          </div>
          <a class="hover:text-primary transition-colors" href="#">{{ t('privacyPolicy') }}</a>
          <a class="hover:text-primary transition-colors" href="#">{{ t('termsOfService') }}</a>
          <a class="hover:text-primary transition-colors" href="#">{{ t('supportPortal') }}</a>
        </div>
      </footer>
    </main>

    <SaveLayoutDialog 
      :show="showSaveDialog"
      @close="showSaveDialog = false"
      @save="handleSaveLayout"
    />
  </div>
</template>
