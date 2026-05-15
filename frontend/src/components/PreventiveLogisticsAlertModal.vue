<script setup>
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'quote-light-materials']);
</script>

<template>
  <Teleport to="body">
    <Transition name="logistics-overlay">
      <div
        v-if="props.show"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md dark:bg-black/60"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="preventive-logistics-title"
        aria-describedby="preventive-logistics-desc"
        @click.self="emit('close')"
      >
        <Transition name="logistics-card" appear>
          <section
            class="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
          >
            <!-- Top accent -->
            <div class="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

            <!-- Header -->
            <header
              class="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300"
                >
                  <span class="material-symbols-outlined text-[26px]">
                    warning
                  </span>
                </div>

                <div>
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                  >
                    Alerta preventiva
                  </p>

                  <h3
                    id="preventive-logistics-title"
                    class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                  >
                    {{ t('heavyLogisticsTitle') }}
                  </h3>

                  <p
                    id="preventive-logistics-desc"
                    class="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300"
                  >
                    {{ t('heavyLogisticsMessage') }}
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                aria-label="Cerrar alerta preventiva"
                @click="emit('close')"
              >
                <span
                  class="material-symbols-outlined text-[21px] transition-transform duration-200 group-hover:rotate-90"
                >
                  close
                </span>
              </button>
            </header>

            <!-- Body -->
            <div class="space-y-4 px-5 py-5">
              <section
                class="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/70 dark:bg-amber-950/20"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    <span class="material-symbols-outlined text-[20px]">
                      crane
                    </span>
                  </div>

                  <div>
                    <p class="text-sm font-black leading-snug text-amber-900 dark:text-amber-100">
                      Logística pesada detectada
                    </p>

                    <p class="mt-1 text-xs font-medium leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                      Este tipo de material puede requerir coordinación adicional, transporte especializado y mayores costos operativos. Conviene validarlo antes de seguir con el presupuesto.
                    </p>
                  </div>
                </div>
              </section>

              <section
                class="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                <div
                  class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Riesgo
                  </p>
                  <p class="mt-1 text-sm font-black text-slate-950 dark:text-slate-100">
                    Alto
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Impacto
                  </p>
                  <p class="mt-1 text-sm font-black text-slate-950 dark:text-slate-100">
                    Flete
                  </p>
                </div>

                <div
                  class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Acción
                  </p>
                  <p class="mt-1 text-sm font-black text-slate-950 dark:text-slate-100">
                    Cotizar alternativa
                  </p>
                </div>
              </section>
            </div>

            <!-- Footer -->
            <footer
              class="flex flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                @click="emit('close')"
              >
                {{ t('dismissLogisticsAlert') }}
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                @click="emit('quote-light-materials')"
              >
                <span class="material-symbols-outlined text-[17px]">
                  swap_horiz
                </span>
                {{ t('quoteWithLightMaterials') }}
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.logistics-overlay-enter-active,
.logistics-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.logistics-overlay-enter-from,
.logistics-overlay-leave-to {
  opacity: 0;
}

.logistics-card-enter-active,
.logistics-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.logistics-card-enter-from,
.logistics-card-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>