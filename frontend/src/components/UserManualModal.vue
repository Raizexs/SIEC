<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const steps = [
  {
    title: "1. Configuración Inicial",
    description: "Define el tamaño de tu terreno, la cantidad de habitaciones deseadas y el material estructural de base en el panel central de configuración. Puedes ver en tiempo real cómo cambia tu presupuesto de tokens en base a tus elecciones.",
    image: "/manual/config_ui.png"
  },
  {
    title: "2. Editor Espacial 2D",
    description: "Una vez generado el layout, utiliza el mapa 2D para arrastrar y reposicionar las habitaciones. Puedes redimensionarlas libremente arrastrando la esquina inferior derecha. El indicador de espacio libre se actualizará automáticamente para evitar colisiones.",
    image: "/manual/editor_2d.png"
  },
  {
    title: "3. Vista 3D y Presupuesto",
    description: "Alterna al explorador volumétrico 3D usando el toggle superior central para visualizar el proyecto completo. Activa el icono de Presupuesto ($) en las habitaciones para incluirlas en el desglose de materiales y costos en el panel lateral derecho.",
    image: "/manual/scene_3d.png"
  }
];

const closeManual = () => {
  emit('close');
};
</script>

<template>
  <transition name="fade-scale">
    <div v-if="props.show" class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8">
      <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md" @click="closeManual"></div>
      
      <div class="relative bg-surface dark:bg-[#151c27] w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-outline/20 flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="px-8 py-6 border-b border-outline/10 flex justify-between items-center shrink-0 bg-slate-800/20">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100">Manual de Usuario SIEC</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">Guía paso a paso para dominar la plataforma de simulación</p>
            </div>
          </div>
          <button @click="closeManual" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Content (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-8 space-y-10">
          <div v-for="(step, index) in steps" :key="index" class="flex flex-col md:flex-row gap-8 items-center bg-slate-800/30 p-6 rounded-3xl border border-white/5 shadow-inner">
            <div class="md:w-1/3 space-y-4">
              <h3 class="text-xl font-bold text-primary">{{ step.title }}</h3>
              <p class="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-medium">{{ step.description }}</p>
            </div>
            <div class="md:w-2/3 w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-[#0b1220] aspect-video flex items-center justify-center relative group">
              <div class="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none"></div>
              <img :src="step.image" :alt="step.title" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
            </div>
          </div>
        </div>

      </div>
    </div>
  </transition>
</template>
