<script setup>
/**
 * Ley21725AlertModal.vue
 * Modal de alerta bloqueante/no bloqueante para validaciones de Ley 21.725.
 *
 * Lenguaje visual premium:
 * - Overlay con blur suave.
 * - Card con borde sutil, sombra profunda y dark mode consistente.
 * - Severidad clara sin saturar visualmente.
 * - Umbrales normativos presentados como métricas comparables.
 */

import { computed, ref, toRef } from 'vue';
import {
  AREA_UMBRAL_MIN_M2,
  AREA_UMBRAL_MAX_M2,
  TASACION_LIMITE_UF,
} from '../composables/useLey21725';
import { useMotionModal } from '../composables/useMotionModal';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  /** Objeto ValidacionLeyMonoResponse recibido del backend */
  resultado: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close']);

const backdropRef = ref(null);
const panelRef = ref(null);

useMotionModal(toRef(props, 'show'), { backdropRef, panelRef, emphasis: true });

const codigoInfraccion = computed(() => props.resultado?.codigo_infraccion || '');

const esAreaExcedida = computed(() =>
  codigoInfraccion.value === 'LEY21725-AREA-EXCEDE',
);

const esTasacionExcedida = computed(() =>
  codigoInfraccion.value === 'LEY21725-TASACION-EXCEDE',
);

const esBajoUmbral = computed(() =>
  codigoInfraccion.value === 'LEY21725-AREA-BAJO-UMBRAL',
);

/** Sólo las infracciones de área o tasación son bloqueantes */
const esBloqueante = computed(() => props.resultado?.bloqueante === true);

const severity = computed(() => (esBloqueante.value ? 'critical' : 'warning'));

const modalTitle = computed(() =>
  props.resultado?.mensaje || 'Validación Ley 21.725',
);

const modalDetail = computed(() =>
  props.resultado?.detalle ||
  'El diseño requiere revisión antes de continuar con el flujo del proyecto.',
);

const currentArea = computed(() => props.resultado?.area_m2 ?? 0);

const hasTasacion = computed(
  () =>
    props.resultado?.tasacion_uf !== null &&
    props.resultado?.tasacion_uf !== undefined,
);

const actionLabel = computed(() =>
  esBloqueante.value ? 'Entendido — Ajustar diseño' : 'Cerrar',
);

const severityLabel = computed(() =>
  esBloqueante.value ? 'Infracción bloqueante' : 'Observación normativa',
);

const severityIcon = computed(() =>
  esBloqueante.value ? 'gavel' : 'info',
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="backdropRef"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md dark:bg-black/60"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ley-modal-title"
      aria-describedby="ley-modal-desc"
      @click.self="esBloqueante ? null : emit('close')"
    >
      <section
        ref="panelRef"
        class="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
      >
            <!-- Top severity line -->
            <div
              class="h-1 w-full"
              :class="esBloqueante ? 'bg-red-500' : 'bg-amber-400'"
            ></div>

            <!-- Header -->
            <header
              class="flex items-start gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800/80"
            >
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm"
                :class="
                  esBloqueante
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300'
                    : 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
                "
              >
                <span class="material-symbols-outlined text-[25px]">
                  {{ severityIcon }}
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight"
                    :class="
                      esBloqueante
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
                    "
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="esBloqueante ? 'bg-red-500' : 'bg-amber-400'"
                    ></span>
                    {{ severityLabel }}
                  </span>

                  <span
                    class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  >
                    Ley 21.725 · Ley del Mono
                  </span>
                </div>

                <h3
                  id="ley-modal-title"
                  class="text-xl font-black leading-tight tracking-tight text-slate-950 dark:text-slate-100"
                >
                  {{ modalTitle }}
                </h3>

                <p
                  id="ley-modal-desc"
                  class="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300"
                >
                  {{ modalDetail }}
                </p>
              </div>
            </header>

            <!-- Body -->
            <div class="space-y-4 px-6 py-5">
              <!-- Normative summary -->
              <section
                class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p
                      class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Umbrales normativos
                    </p>
                    <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Comparación del diseño actual frente a los límites configurados.
                    </p>
                  </div>

                  <span
                    v-if="codigoInfraccion"
                    class="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 sm:inline-flex"
                  >
                    {{ codigoInfraccion }}
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <!-- Minimum threshold -->
                  <div
                    class="rounded-2xl border p-3 shadow-sm"
                    :class="
                      esBajoUmbral
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/25'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70'
                    "
                  >
                    <p
                      class="text-[10px] font-bold uppercase tracking-tight"
                      :class="
                        esBajoUmbral
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      Mínimo
                    </p>

                    <p class="mt-1 font-mono text-2xl font-black leading-none text-slate-950 dark:text-slate-100">
                      {{ AREA_UMBRAL_MIN_M2 }}
                    </p>

                    <p class="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      m² requeridos
                    </p>
                  </div>

                  <!-- Current design -->
                  <div
                    class="relative overflow-hidden rounded-2xl border p-3 shadow-sm"
                    :class="
                      esBloqueante
                        ? 'border-red-300 bg-red-50 dark:border-red-800/80 dark:bg-red-950/25'
                        : 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                    "
                  >
                    <div
                      class="absolute inset-x-0 top-0 h-px"
                      :class="esBloqueante ? 'bg-red-400' : 'bg-emerald-400'"
                    ></div>

                    <p
                      class="text-[10px] font-bold uppercase tracking-tight"
                      :class="
                        esBloqueante
                          ? 'text-red-600 dark:text-red-300'
                          : 'text-emerald-600 dark:text-emerald-300'
                      "
                    >
                      Tu diseño
                    </p>

                    <p
                      class="mt-1 font-mono text-2xl font-black leading-none"
                      :class="
                        esBloqueante
                          ? 'text-red-700 dark:text-red-200'
                          : 'text-emerald-700 dark:text-emerald-200'
                      "
                    >
                      {{ currentArea?.toFixed?.(1) ?? '0.0' }}
                    </p>

                    <p
                      class="mt-1 text-[10px] font-semibold"
                      :class="
                        esBloqueante
                          ? 'text-red-500 dark:text-red-300'
                          : 'text-emerald-500 dark:text-emerald-300'
                      "
                    >
                      m² calculados
                    </p>
                  </div>

                  <!-- Maximum threshold -->
                  <div
                    class="rounded-2xl border p-3 shadow-sm"
                    :class="
                      esAreaExcedida
                        ? 'border-red-300 bg-red-50 dark:border-red-800/80 dark:bg-red-950/25'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70'
                    "
                  >
                    <p
                      class="text-[10px] font-bold uppercase tracking-tight"
                      :class="
                        esAreaExcedida
                          ? 'text-red-600 dark:text-red-300'
                          : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      Máximo
                    </p>

                    <p class="mt-1 font-mono text-2xl font-black leading-none text-slate-950 dark:text-slate-100">
                      {{ AREA_UMBRAL_MAX_M2 }}
                    </p>

                    <p class="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      m² permitidos
                    </p>
                  </div>
                </div>

                <!-- Valuation limit -->
                <div
                  v-if="hasTasacion"
                  class="mt-3 grid grid-cols-1 gap-3 rounded-2xl border p-3 sm:grid-cols-[1fr_1fr_auto]"
                  :class="
                    esTasacionExcedida
                      ? 'border-red-300 bg-red-50 dark:border-red-800/80 dark:bg-red-950/25'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70'
                  "
                >
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                      Tasación estimada
                    </p>

                    <p
                      class="mt-1 font-mono text-xl font-black leading-none"
                      :class="
                        esTasacionExcedida
                          ? 'text-red-700 dark:text-red-200'
                          : 'text-slate-950 dark:text-slate-100'
                      "
                    >
                      {{ resultado.tasacion_uf?.toFixed(1) }} UF
                    </p>
                  </div>

                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                      Límite legal
                    </p>

                    <p class="mt-1 font-mono text-xl font-black leading-none text-slate-950 dark:text-slate-100">
                      &lt; {{ TASACION_LIMITE_UF }} UF
                    </p>
                  </div>

                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm"
                    :class="
                      esTasacionExcedida
                        ? 'border-red-200 bg-red-100 text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                    "
                  >
                    <span class="material-symbols-outlined text-[22px]">
                      {{ esTasacionExcedida ? 'cancel' : 'check_circle' }}
                    </span>
                  </div>
                </div>
              </section>

              <!-- Blocking warning -->
              <section
                v-if="esBloqueante"
                class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/70 dark:bg-red-950/25"
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    lock
                  </span>
                </div>

                <div>
                  <p class="text-sm font-bold leading-snug text-red-800 dark:text-red-200">
                    Flujo bloqueado por incumplimiento normativo
                  </p>

                  <p class="mt-1 text-xs font-medium leading-relaxed text-red-700/90 dark:text-red-300/90">
                    La generación del modelo y el cálculo de insumos permanecerán bloqueados hasta que el diseño cumpla con los requisitos configurados para la Ley 21.725. Ajusta los m² del proyecto para continuar.
                  </p>
                </div>
              </section>

              <!-- Non-blocking note -->
              <section
                v-else
                class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/70 dark:bg-amber-950/25"
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    info
                  </span>
                </div>

                <div>
                  <p class="text-sm font-bold leading-snug text-amber-800 dark:text-amber-200">
                    Revisión recomendada
                  </p>

                  <p class="mt-1 text-xs font-medium leading-relaxed text-amber-700/90 dark:text-amber-300/90">
                    Puedes cerrar esta alerta, pero conviene revisar el diseño antes de continuar para evitar inconsistencias posteriores.
                  </p>
                </div>
              </section>
            </div>

            <!-- Footer -->
            <footer
              class="flex flex-col-reverse gap-3 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/50 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold shadow-sm transition-all duration-200 active:scale-[0.98]"
                :class="
                  esBloqueante
                    ? 'border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
                "
                @click="emit('close')"
              >
                {{ actionLabel }}
              </button>
            </footer>
          </section>
    </div>
  </Teleport>
</template>