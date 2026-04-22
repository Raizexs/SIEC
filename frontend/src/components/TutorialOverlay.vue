<script setup>
import { ref, onMounted } from 'vue';

const isVisible = ref(false);
const currentStep = ref(0);

const steps = [
  {
    title: "Geometría del Proyecto",
    description: "Define el tamaño, la cantidad de habitaciones y el material estructural de tu diseño en este panel.",
  },
  {
    title: "Explorador 3D Avanzado",
    description: "Visualiza el proyecto en tiempo real. Usa el panel izquierdo para encender o apagar las capas constructivas como aislación o instalaciones.",
  },
  {
    title: "Presupuesto por Recinto",
    description: "En el mapa 2D, selecciona los recintos (activando el icono $) para incluirlos en el presupuesto detallado.",
  },
  {
    title: "Guardar Progreso",
    description: "Cuando estés satisfecho, haz clic en el botón superior derecho 'Guardar' para guardar tu diseño en el historial lateral.",
  }
];

onMounted(() => {
  const dismissed = localStorage.getItem('siec_tutorial_dismissed');
  if (!dismissed) {
    // Show tutorial after a short delay so the UI can render
    setTimeout(() => {
      isVisible.value = true;
    }, 1000);
  }
});

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  } else {
    dismissTutorial();
  }
};

const dismissTutorial = () => {
  isVisible.value = false;
  localStorage.setItem('siec_tutorial_dismissed', 'true');
};
</script>

<template>
  <transition name="fade">
    <div v-if="isVisible" class="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <!-- Backdrop with blur -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-opacity" @click="dismissTutorial"></div>
      
      <!-- Tutorial Dialog -->
      <div class="relative z-10 bg-surface dark:bg-[#151c27] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-outline/20 pointer-events-auto transform transition-all">
        <!-- Decoration -->
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">school</span>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 dark:text-slate-200">Guía Interactiva</h3>
            <p class="text-xs text-slate-500 font-semibold tracking-wide uppercase">Paso {{ currentStep + 1 }} de {{ steps.length }}</p>
          </div>
        </div>

        <h4 class="text-xl font-black text-primary mb-3">{{ steps[currentStep].title }}</h4>
        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
          {{ steps[currentStep].description }}
        </p>

        <div class="flex items-center justify-between mt-auto">
          <button @click="dismissTutorial" class="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-widest transition-colors">
            Omitir Guía
          </button>
          <button @click="nextStep" class="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-xl font-bold tracking-wide shadow-lg shadow-primary/30 hover:scale-105 transition-transform">
            {{ currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente' }}
          </button>
        </div>
        
        <!-- Progress dots -->
        <div class="flex justify-center gap-2 mt-6">
          <div v-for="(_, index) in steps" :key="index" class="w-2 h-2 rounded-full transition-all duration-300" :class="index === currentStep ? 'bg-primary w-6' : 'bg-outline/20'"></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
