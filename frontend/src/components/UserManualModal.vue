<script setup>
import { defineProps, defineEmits, watch, onBeforeUnmount, onMounted } from 'vue';

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

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
      'Define ancho, largo y materialidad. El sistema calcula los m² y permite cambiar estructura sin perder el diseño.',
    icon: 'terrain',
  },
  {
    title: 'Crear recintos',
    description:
      'Usa “Añadir Recinto” para crear habitaciones, baños o pasillos con medidas exactas y presupuesto en tiempo real.',
    icon: 'add_home',
  },
  {
    title: 'Editor 2D',
    description:
      'Arrastra, posiciona y redimensiona recintos en la grilla. Desplaza la vista con clic derecho más arrastre.',
    icon: 'grid_view',
  },
  {
    title: 'Vista 3D',
    description:
      'Visualiza el modelo 3D con texturas según materialidad. Puedes mover, escalar y revisar la distribución.',
    icon: 'view_in_ar',
  },
  {
    title: 'Materialidad',
    description:
      'Madera, Metalcon, Albañilería y Ferrocemento actualizan muros y pisos sin alterar tus recintos.',
    icon: 'construction',
  },
  {
    title: 'Presupuesto y PDF',
    description:
      'Activa el icono de precio para incluir recintos en el presupuesto y exporta el resultado como PDF profesional.',
    icon: 'payments',
  },
];

const shortcuts = [
  { keys: ['Delete'], description: 'Eliminar recinto' },
  { keys: ['Ctrl', 'Z'], description: 'Deshacer acción' },
  { keys: ['Ctrl', 'Y'], description: 'Rehacer acción' },
  { keys: ['Scroll'], description: 'Zoom 2D / 3D' },
  { keys: ['Clic der.', 'Arrastrar'], description: 'Desplazar vista 2D' },
  { keys: ['Clic izq.', 'Arrastrar'], description: 'Rotar cámara 3D' },
];

let scrollY = 0;
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';
let previousBodyOverflow = '';

const lockBodyScroll = () => {
  scrollY = window.scrollY || document.documentElement.scrollTop;

  previousBodyPosition = document.body.style.position;
  previousBodyTop = document.body.style.top;
  previousBodyWidth = document.body.style.width;
  previousBodyOverflow = document.body.style.overflow;

  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.position = previousBodyPosition;
  document.body.style.top = previousBodyTop;
  document.body.style.width = previousBodyWidth;
  document.body.style.overflow = previousBodyOverflow;

  window.scrollTo(0, scrollY);
};

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
  },
  { immediate: true }
);

onMounted(() => document.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown);
  if (props.show) {
    unlockBodyScroll();
  }
});

const closeManual = () => {
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <transition name="manual-overlay">
      <div
        v-if="props.show"
        class="manual-overlay fixed inset-0 z-[120] flex items-center justify-center p-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-manual-title"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-md dark:bg-black/70"
          @click="closeManual"
        ></div>

        <div class="manual-stage relative z-10 flex w-full items-center justify-center">
          <transition name="manual-card" appear>
            <section
              class="manual-modal relative flex w-full max-w-6xl flex-col overflow-hidden rounded-[1.65rem] border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/25 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/50"
            >
              <!-- Accent -->
              <div
                class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300"
              ></div>

              <!-- Header -->
              <header
                class="manual-header flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/85 px-5 py-3 dark:border-slate-800/80 dark:bg-slate-900/70 sm:px-6"
              >
                <div class="flex min-w-0 items-start gap-3.5">
                  <div
                    class="manual-main-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                  >
                    <span class="material-symbols-outlined text-[24px]">
                      menu_book
                    </span>
                  </div>

                  <div class="min-w-0">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
                    >
                      Guía de uso
                    </p>

                    <h2
                      id="user-manual-title"
                      class="mt-0.5 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                    >
                      Manual de Usuario SIEC
                    </h2>

                    <p
                      class="manual-subtitle mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
                    >
                      Configura, edita, visualiza y presupuesta un proyecto dentro del workspace.
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
              <div class="manual-content px-5 py-3.5 sm:px-6">
                <div class="grid gap-4 lg:grid-cols-[1fr_18rem]">
                  <!-- Steps -->
                  <section class="grid gap-3 md:grid-cols-2">
                    <article
                      v-for="(step, index) in steps"
                      :key="step.title"
                      class="manual-step-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-orange-500/30 dark:hover:shadow-black/20"
                    >
                      <div
                        class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      ></div>

                      <div class="flex items-start gap-3">
                        <div
                          class="manual-step-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-orange-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-orange-300"
                        >
                          <span class="material-symbols-outlined text-[20px]">
                            {{ step.icon }}
                          </span>
                        </div>

                        <div class="min-w-0">
                          <div class="flex flex-wrap items-center gap-2">
                            <span
                              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-1.5 text-[10px] font-black text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                            >
                              {{ index + 1 }}
                            </span>

                            <h3
                              class="manual-step-title text-sm font-black tracking-tight text-slate-950 dark:text-slate-100"
                            >
                              {{ step.title }}
                            </h3>
                          </div>

                          <p
                            class="manual-description mt-1.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300"
                          >
                            {{ step.description }}
                          </p>
                        </div>
                      </div>
                    </article>
                  </section>

                  <!-- Shortcuts -->
                  <aside
                    class="manual-shortcuts rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div class="mb-3 flex items-start gap-3">
                      <div
                        class="manual-keyboard-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                      >
                        <span class="material-symbols-outlined text-[20px]">
                          keyboard
                        </span>
                      </div>

                      <div>
                        <h3
                          class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100"
                        >
                          Atajos de teclado
                        </h3>

                        <p
                          class="manual-shortcut-subtitle mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400"
                        >
                          Comandos rápidos del editor.
                        </p>
                      </div>
                    </div>

                    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <div
                        v-for="shortcut in shortcuts"
                        :key="shortcut.description"
                        class="manual-shortcut-card rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950/70"
                      >
                        <div class="mb-1.5 flex flex-wrap gap-1.5">
                          <kbd
                            v-for="key in shortcut.keys"
                            :key="key"
                            class="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[8.5px] font-black uppercase leading-none tracking-tight text-slate-700 shadow-[0_1px_0_0_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)]"
                          >
                            {{ key }}
                          </kbd>
                        </div>

                        <p
                          class="text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400"
                        >
                          {{ shortcut.description }}
                        </p>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              <!-- Footer -->
              <footer
                class="manual-footer flex shrink-0 flex-col gap-3 border-t border-slate-200/80 bg-slate-50/85 px-5 py-3 dark:border-slate-800/80 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <p
                  class="manual-footer-text text-xs font-medium text-slate-500 dark:text-slate-400"
                >
                  Recomendación: completa el flujo en orden para evitar inconsistencias entre diseño, presupuesto y exportación.
                </p>

                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-2xl border border-orange-400/70 bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-950 shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-orange-400 hover:to-amber-300 hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] dark:border-orange-300/50 dark:from-orange-400 dark:to-amber-300 dark:text-slate-950"
                  @click="closeManual"
                >
                  Entendido
                </button>
              </footer>
            </section>
          </transition>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.manual-overlay {
  overflow: hidden;
}

.manual-stage {
  max-width: calc(100vw - 1.5rem);
  max-height: calc(100dvh - 1.5rem);
}

.manual-modal {
  max-height: calc(100dvh - 1.5rem);
}

.manual-content {
  min-height: 0;
  overflow: visible;
}

.manual-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* Pantallas bajas: reduce densidad antes de cortar */
@media (max-height: 820px) {
  .manual-stage {
    transform: scale(0.94);
  }
}

@media (max-height: 760px) {
  .manual-stage {
    transform: scale(0.88);
  }

  .manual-header {
    padding-top: 0.7rem;
    padding-bottom: 0.7rem;
  }

  .manual-content {
    padding-top: 0.7rem;
    padding-bottom: 0.7rem;
  }

  .manual-footer {
    padding-top: 0.7rem;
    padding-bottom: 0.7rem;
  }

  .manual-main-icon {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: 0.9rem;
  }

  .manual-subtitle {
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .manual-step-card {
    padding: 0.65rem;
  }

  .manual-step-icon {
    width: 2rem;
    height: 2rem;
  }

  .manual-step-title {
    font-size: 0.78rem;
  }

  .manual-description {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .manual-shortcuts {
    padding: 0.65rem;
  }

  .manual-keyboard-icon {
    width: 2rem;
    height: 2rem;
  }

  .manual-shortcut-subtitle {
    display: none;
  }

  .manual-shortcut-card {
    padding: 0.45rem;
  }

  .manual-footer-text {
    font-size: 0.7rem;
  }
}

@media (max-height: 680px) {
  .manual-stage {
    transform: scale(0.8);
  }

  .manual-subtitle,
  .manual-footer-text {
    display: none;
  }

  .manual-description {
    -webkit-line-clamp: 1;
  }

  .manual-content {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .manual-step-card {
    padding: 0.55rem;
  }

  .manual-shortcut-card {
    padding: 0.4rem;
  }
}

/* Mobile: aquí sí se prioriza legibilidad.
   En pantallas muy pequeñas, pretender cero scroll es mala UX. */
@media (max-width: 767px) {
  .manual-overlay {
    align-items: center;
    padding: 0.75rem;
  }

  .manual-stage {
    transform: none;
  }

  .manual-modal {
    max-height: calc(100dvh - 1.5rem);
  }

  .manual-content {
    overflow-y: auto;
  }

  .manual-description {
    -webkit-line-clamp: 1;
  }
}

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