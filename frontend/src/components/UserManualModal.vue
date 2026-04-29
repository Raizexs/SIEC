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
    title: "1. Configuración del Terreno",
    description: "Define las dimensiones de tu terreno ingresando ancho y largo en metros. El sistema calcula automáticamente los m² totales. Luego selecciona la materialidad estructural (madera, metalcon, albañilería o ferrocemento) — puedes cambiarla en cualquier momento sin perder tu diseño.",
    icon: "terrain"
  },
  {
    title: "2. Crear Recintos Manualmente",
    description: "Usa el botón \"Añadir Recinto\" en el editor 2D para crear habitaciones, baños o pasillos con las medidas exactas que necesites. El presupuesto espacial se actualiza en tiempo real y el sistema detecta colisiones automáticamente para evitar superposiciones.",
    icon: "add_home"
  },
  {
    title: "3. Editor 2D — Posicionar y Redimensionar",
    description: "Arrastra los recintos en la grilla 2D para posicionarlos. Usa la esquina inferior derecha para redimensionar. Puedes rotar la matriz completa con los botones de rotación, y usar clic derecho + arrastre para desplazar la vista.",
    icon: "grid_view"
  },
  {
    title: "4. Vista 3D con Texturas Reales",
    description: "Tu diseño se renderiza automáticamente como modelo 3D con texturas procedurales según la materialidad elegida. Puedes arrastrar los recintos en 3D, usar las flechas para escalarlos, y alternar entre herramientas de Mover y Escalar.",
    icon: "view_in_ar"
  },
  {
    title: "5. Materialidad Estructural",
    description: "Cambiar la materialidad actualiza las texturas de muros y pisos sin alterar la disposición de tus recintos. Madera → siding horizontal, Metalcon → revestimiento vinílico, Albañilería → ladrillo a la vista, Ferrocemento → paneles con juntas visibles.",
    icon: "construction"
  },
  {
    title: "6. Presupuesto y Exportación",
    description: "Activa el icono $ en cada recinto para incluirlo en el desglose de presupuesto. El panel muestra costos detallados por materialidad y m². Puedes exportar el resultado como PDF profesional desde la barra superior.",
    icon: "payments"
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
      
      <div class="relative bg-surface dark:bg-[#151c27] w-full max-w-4xl h-[85vh] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-outline/20 flex flex-col overflow-hidden">
        
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
        <div class="flex-1 overflow-y-auto p-8 space-y-5">
          <div v-for="(step, index) in steps" :key="index" class="flex gap-5 items-start bg-slate-800/30 p-5 rounded-2xl border border-white/5 shadow-inner transition-all duration-300 hover:border-primary/20 hover:bg-slate-800/40">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-primary text-xl">{{ step.icon }}</span>
            </div>
            <div class="space-y-2">
              <h3 class="text-lg font-bold text-primary">{{ step.title }}</h3>
              <p class="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-medium">{{ step.description }}</p>
            </div>
          </div>

          <!-- Keyboard shortcuts section -->
          <div class="bg-slate-800/20 p-5 rounded-2xl border border-white/5 mt-4">
            <h3 class="text-lg font-bold text-slate-300 mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-slate-400">keyboard</span>
              Atajos de Teclado
            </h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex items-center gap-3">
                <kbd class="px-2 py-1 bg-slate-700/50 rounded-md text-xs font-mono text-slate-300 border border-slate-600/50">Delete</kbd>
                <span class="text-slate-400">Eliminar recinto seleccionado</span>
              </div>
              <div class="flex items-center gap-3">
                <kbd class="px-2 py-1 bg-slate-700/50 rounded-md text-xs font-mono text-slate-300 border border-slate-600/50">Ctrl+Z</kbd>
                <span class="text-slate-400">Deshacer</span>
              </div>
              <div class="flex items-center gap-3">
                <kbd class="px-2 py-1 bg-slate-700/50 rounded-md text-xs font-mono text-slate-300 border border-slate-600/50">Ctrl+Y</kbd>
                <span class="text-slate-400">Rehacer</span>
              </div>
              <div class="flex items-center gap-3">
                <kbd class="px-2 py-1 bg-slate-700/50 rounded-md text-xs font-mono text-slate-300 border border-slate-600/50">Scroll</kbd>
                <span class="text-slate-400">Zoom en editor 2D y 3D</span>
              </div>
              <div class="flex items-center gap-3">
                <kbd class="px-2 py-1 bg-slate-700/50 rounded-md text-xs font-mono text-slate-300 border border-slate-600/50">Clic Der. + Arrastrar</kbd>
                <span class="text-slate-400">Desplazar vista 2D</span>
              </div>
              <div class="flex items-center gap-3">
                <kbd class="px-2 py-1 bg-slate-700/50 rounded-md text-xs font-mono text-slate-300 border border-slate-600/50">Clic Izq. + Arrastrar</kbd>
                <span class="text-slate-400">Rotar cámara 3D</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </transition>
</template>
