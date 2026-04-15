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

const recintosStore = useRecintosStore();
const { saveLayout } = useLayoutManager();
const { t, currentLanguage } = useI18n();

const sidebarCollapsed = ref(false);

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
  <div :key="appKey" class="min-h-screen bg-background dark:bg-[#0d1117] font-body text-on-surface dark:text-slate-100 antialiased">
    <Sidebar @loadPreset="loadPreset" @loadLayout="loadLayout" @collapse-change="sidebarCollapsed = $event" />

    <main :class="sidebarCollapsed ? 'ml-0' : 'ml-64'" class="min-h-screen transition-all duration-300">
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

        <!-- CTA Final — después del modelo 3D -->
        <button
          class="group w-full bg-gradient-to-br from-primary to-primary-container text-white p-6 rounded-2xl shadow-lg flex items-center justify-between overflow-hidden relative transition-all active:scale-[0.98]"
        >
          <div class="relative z-10 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined">calculate</span>
            </div>
            <div class="text-left">
              <span class="block text-sm font-bold">{{ t('generateFinal') }}</span>
              <span class="text-[10px] opacity-70 uppercase font-medium">{{ t('lockedFor24h') }}</span>
            </div>
          </div>
          <span class="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
          <div class="absolute top-0 left-0 w-full h-full bg-white/5 translate-x-full group-hover:translate-x-0 transition-transform skew-x-12 origin-left"></div>
        </button>
      </div>

      <footer class="p-10 pt-0 text-slate-400 text-[10px] font-bold uppercase tracking-widest flex justify-between items-center">
        <div>{{ t('footer') }}</div>
      </footer>
    </main>

    <SaveLayoutDialog 
      :show="showSaveDialog"
      @close="showSaveDialog = false"
      @save="handleSaveLayout"
    />
  </div>
</template>
