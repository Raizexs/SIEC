<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const steps = [
  {
    title: 'Configuración del terreno',
    description:
      'Define las dimensiones de tu terreno ingresando ancho y largo en metros. El sistema calcula automáticamente los m² totales. Luego selecciona la materialidad estructural: madera, metalcon, albañilería o ferrocemento. Puedes cambiarla en cualquier momento sin perder tu diseño.',
    icon: 'terrain',
  },
  {
    title: 'Crear recintos manualmente',
    description:
      'Usa el botón “Añadir Recinto” en el editor 2D para crear habitaciones, baños o pasillos con medidas exactas. El presupuesto espacial se actualiza en tiempo real y el sistema detecta colisiones para evitar superposiciones.',
    icon: 'add_home',
  },
  {
    title: 'Editor 2D: posicionar y redimensionar',
    description:
      'Arrastra los recintos en la grilla 2D para posicionarlos. Usa la esquina inferior derecha para redimensionar. También puedes rotar la matriz completa y usar clic derecho más arrastre para desplazar la vista.',
    icon: 'grid_view',
  },
  {
    title: 'Vista 3D con texturas reales',
    description:
      'Tu diseño se renderiza automáticamente como modelo 3D con texturas procedurales según la materialidad elegida. Puedes mover recintos en 3D, escalarlos y alternar entre herramientas de mover y escalar.',
    icon: 'view_in_ar',
  },
  {
    title: 'Materialidad estructural',
    description:
      'Cambiar la materialidad actualiza las texturas de muros y pisos sin alterar la disposición de tus recintos. Madera usa siding horizontal, Metalcon usa revestimiento vinílico, Albañilería usa ladrillo a la vista y Ferrocemento usa paneles con juntas visibles.',
    icon: 'construction',
  },
  {
    title: 'Presupuesto y exportación',
    description:
      'Activa el icono $ en cada recinto para incluirlo en el desglose de presupuesto. El panel muestra costos detallados por materialidad y m². Puedes exportar el resultado como PDF profesional desde la barra superior.',
    icon: 'payments',
  },
];

const shortcuts = [
  {
    keys: ['Delete'],
    description: 'Eliminar recinto seleccionado',
  },
  {
    keys: ['Ctrl', 'Z'],
    description: 'Deshacer',
  },
  {
    keys: ['Ctrl', 'Y'],
    description: 'Rehacer',
  },
  {
    keys: ['Scroll'],
    description: 'Zoom en editor 2D y 3D',
  },
  {
    keys: ['Clic der.', 'Arrastrar'],
    description: 'Desplazar vista 2D',
  },
  {
    keys: ['Clic izq.', 'Arrastrar'],
    description: 'Rotar cámara 3D',
  },
];

const closeManual = () => {
  emit('close');
};
</script>

<template>
  <transition name="manual-overlay">
    <div
      v-if="props.show"
      class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-manual-title"
    >
      <!-- Overlay -->
      <div
        class="absolute inset-0 bg-slate-950/50 backdrop-blur-md dark:bg-black/60"
        @click="closeManual"
      ></div>

      <!-- Modal -->
      <transition name="manual-card" appear>
        <section
          class="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
        >
          <!-- Top accent -->
          <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

          <!-- Header -->
          <header
            class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60 sm:px-6"
          >
            <div class="flex min-w-0 items-start gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[25px]">
                  menu_book
                </span>
              </div>

              <div class="min-w-0">
                <p
                  class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  Guía de uso
                </p>

                <h2
                  id="user-manual-title"
                  class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                >
                  Manual de Usuario SIEC
                </h2>

                <p class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  Guía paso a paso para configurar, editar, visualizar y presupuestar un proyecto dentro del workspace.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              aria-label="Cerrar manual de usuario"
              @click="closeManual"
            >
              <span
                class="material-symbols-outlined text-[21px] transition-transform duration-200 group-hover:rotate-90"
              >
                close
              </span>
            </button>
          </header>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6 select-text">
            <div class="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <!-- Steps -->
              <section class="space-y-3">
                <article
                  v-for="(step, index) in steps"
                  :key="step.title"
                  class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20"
                >
                  <div
                    class="absolute inset-x-0 top-0 h-px bg-slate-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-slate-700"
                  ></div>

                  <div class="flex items-start gap-4">
                    <div
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-orange-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-orange-300"
                    >
                      <span class="material-symbols-outlined text-[23px]">
                        {{ step.icon }}
                      </span>
                    </div>

                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-2 text-[10px] font-black text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                        >
                          {{ index + 1 }}
                        </span>

                        <h3 class="text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                          {{ step.title }}
                        </h3>
                      </div>

                      <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        {{ step.description }}
                      </p>
                    </div>
                  </div>
                </article>
              </section>

              <!-- Shortcuts -->
              <aside
                class="h-fit rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:sticky lg:top-0"
              >
                <div class="mb-4 flex items-start gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <span class="material-symbols-outlined text-[22px]">
                      keyboard
                    </span>
                  </div>

                  <div>
                    <h3 class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                      Atajos de teclado
                    </h3>

                    <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      Comandos rápidos para trabajar con más fluidez.
                    </p>
                  </div>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="shortcut in shortcuts"
                    :key="shortcut.description"
                    class="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <div class="mb-2 flex flex-wrap gap-1.5">
                      <kbd
                        v-for="key in shortcut.keys"
                        :key="key"
                        class="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase leading-none tracking-tight text-slate-700 shadow-[0_1px_0_0_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)]"
                      >
                        {{ key }}
                      </kbd>
                    </div>

                    <p class="text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                      {{ shortcut.description }}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <!-- Footer -->
          <footer
            class="flex shrink-0 flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
              Recomendación: completa el flujo en orden para evitar inconsistencias entre diseño, presupuesto y exportación.
            </p>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              @click="closeManual"
            >
              Entendido
            </button>
          </footer>
        </section>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.manual-overlay-enter-active,
.manual-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.manual-overlay-enter-from,
.manual-overlay-leave-to {
  opacity: 0;
}

.manual-card-enter-active,
.manual-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.manual-card-enter-from,
.manual-card-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>