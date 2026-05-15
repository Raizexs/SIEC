<script setup>
/**
 * MetalconAlertModal.vue
 * Modal de excepción severa — Validador Metalcon vs Altura.
 *
 * Lenguaje visual premium:
 * - Bloqueante, pero sin saturar todo en rojo.
 * - Métricas comparables: material, pisos detectados y máximo permitido.
 * - Acción requerida clara.
 * - Bloqueo de renders comunicado como estado operativo.
 */

import { computed } from 'vue';
import {
  METALCON_MAX_PISOS,
  METALCON_MATERIAL_ID,
  CODIGO_EXCEPCION_METALCON,
} from '../composables/useMetalconValidator';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  /** Objeto excepcion retornado por validarCruceInsumoAltura() */
  excepcion: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close']);

const pisosDetectados = computed(() => props.excepcion?.pisos_detectados ?? '?');

const pisosMaximos = computed(
  () => props.excepcion?.pisos_maximos ?? METALCON_MAX_PISOS,
);

const accionRequerida = computed(
  () =>
    props.excepcion?.accion_requerida ||
    'Reduce la altura del modelo o solicita validación estructural profesional antes de continuar.',
);

const norma = computed(() => props.excepcion?.norma_referencia ?? 'MINVU');

const titulo = computed(
  () =>
    props.excepcion?.mensaje ||
    'Configuración estructural no admisible',
);

const detalle = computed(
  () =>
    props.excepcion?.detalle ||
    'El modelo supera el límite recomendado para la materialidad Metalcon según la validación estructural configurada.',
);

/** Porcentaje de pisos sobre el máximo */
const peligroPct = computed(() => {
  const detected = Number(pisosDetectados.value);
  const max = Number(pisosMaximos.value);

  if (!detected || !max) return 0;

  return Math.min(100, Math.round((detected / max) * 100));
});

const excesoPisos = computed(() => {
  const detected = Number(pisosDetectados.value);
  const max = Number(pisosMaximos.value);

  if (!detected || !max) return 0;

  return Math.max(0, detected - max);
});

const estadoAltura = computed(() => {
  if (excesoPisos.value > 0) {
    return {
      label: `Excede por ${excesoPisos.value} piso${excesoPisos.value === 1 ? '' : 's'}`,
      tone: 'critical',
    };
  }

  return {
    label: 'En límite crítico',
    tone: 'warning',
  };
});
</script>

<template>
  <Teleport to="body">
    <Transition name="metalcon-overlay">
      <div
        v-if="props.show"
        class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md dark:bg-black/70"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="metalcon-modal-title"
        aria-describedby="metalcon-modal-desc"
        data-testid="metalcon-alert-modal"
      >
        <!-- Bloqueante: no se cierra haciendo clic fuera -->
        <Transition name="metalcon-card" appear>
          <section
            class="w-full max-w-2xl overflow-hidden rounded-3xl border border-red-200/90 bg-white/95 shadow-2xl shadow-slate-950/25 backdrop-blur-xl dark:border-red-900/70 dark:bg-slate-950/95 dark:shadow-black/45"
          >
            <!-- Top severity line -->
            <div class="h-1 w-full bg-gradient-to-r from-red-500 via-orange-500 to-slate-900 dark:to-orange-300"></div>

            <!-- Header -->
            <header
              class="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div class="flex min-w-0 items-start gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
                >
                  <span class="material-symbols-outlined text-[26px]">
                    dangerous
                  </span>
                </div>

                <div class="min-w-0">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      Excepción severa
                    </span>

                    <span
                      class="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                    >
                      SCRUM-98 · MINVU
                    </span>
                  </div>

                  <h3
                    id="metalcon-modal-title"
                    class="text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-slate-100"
                  >
                    {{ titulo }}
                  </h3>

                  <p
                    id="metalcon-modal-desc"
                    class="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300"
                  >
                    {{ detalle }}
                  </p>
                </div>
              </div>
            </header>

            <!-- Body -->
            <div class="space-y-4 px-6 py-5">
              <!-- Critical summary -->
              <section
                class="rounded-3xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/70 dark:bg-red-950/25"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <span class="material-symbols-outlined text-[20px]">
                      report
                    </span>
                  </div>

                  <div>
                    <p class="text-sm font-black leading-snug text-red-800 dark:text-red-200">
                      Restricción estructural activada
                    </p>

                    <p class="mt-1 text-xs font-medium leading-relaxed text-red-700/90 dark:text-red-300/90">
                      El modelo no puede continuar con generación constructiva mientras la altura exceda el límite configurado para Metalcon sin validación técnica especializada.
                    </p>
                  </div>
                </div>
              </section>

              <!-- Height evaluation -->
              <section
                class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div class="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p
                      class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Evaluación de altura
                    </p>

                    <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      Comparación entre el modelo actual y el máximo permitido para Metalcon.
                    </p>
                  </div>

                  <span
                    class="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
                  >
                    {{ estadoAltura.label }}
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <!-- Material -->
                  <div
                    class="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <p
                      class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                    >
                      Material
                    </p>

                    <div
                      class="mx-auto my-2 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <span class="material-symbols-outlined text-[23px]">
                        view_module
                      </span>
                    </div>

                    <p class="text-xs font-black text-slate-800 dark:text-slate-200">
                      Metalcon
                    </p>
                  </div>

                  <!-- Detected floors -->
                  <div
                    class="relative overflow-hidden rounded-2xl border border-red-300 bg-red-50 p-3 text-center shadow-sm dark:border-red-800/80 dark:bg-red-950/25"
                    data-testid="pisos-detectados"
                  >
                    <div class="absolute inset-x-0 top-0 h-px bg-red-400"></div>

                    <p
                      class="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:text-red-300"
                    >
                      Tu modelo
                    </p>

                    <p class="mt-1 font-mono text-4xl font-black leading-none text-red-700 dark:text-red-200">
                      {{ pisosDetectados }}
                    </p>

                    <p class="mt-1 text-[10px] font-bold text-red-500 dark:text-red-300">
                      pisos detectados
                    </p>
                  </div>

                  <!-- Max floors -->
                  <div
                    class="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                    data-testid="pisos-maximos"
                  >
                    <p
                      class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                    >
                      Máximo
                    </p>

                    <p class="mt-1 font-mono text-4xl font-black leading-none text-slate-950 dark:text-slate-100">
                      {{ pisosMaximos }}
                    </p>

                    <p class="mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      pisos permitidos
                    </p>
                  </div>
                </div>

                <!-- Gravity danger bar -->
                <div class="mt-4">
                  <div
                    class="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                  >
                    <span>Carga gravitatoria relativa</span>

                    <span class="font-mono text-red-600 dark:text-red-300">
                      {{ pisosDetectados }} / {{ pisosMaximos }} pisos máx.
                    </span>
                  </div>

                  <div class="h-2.5 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-800">
                    <div
                      class="h-full rounded-full bg-red-500 transition-all duration-500 ease-out"
                      :style="{ width: `${peligroPct}%` }"
                    ></div>
                  </div>
                </div>

                <!-- Norm reference -->
                <div
                  class="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70"
                  data-testid="norma-referencia"
                >
                  <p
                    class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                  >
                    Norma de referencia
                  </p>

                  <p class="font-mono text-xs font-black text-slate-700 dark:text-slate-200">
                    {{ norma }}
                  </p>
                </div>
              </section>

              <!-- Required action -->
              <section
                class="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/70 dark:bg-amber-950/25"
                data-testid="accion-requerida"
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    engineering
                  </span>
                </div>

                <div>
                  <p
                    class="text-[11px] font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300"
                  >
                    Acción requerida para desbloquear
                  </p>

                  <p class="mt-1 text-xs font-medium leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                    {{ accionRequerida }}
                  </p>
                </div>
              </section>

              <!-- Render lock -->
              <section
                class="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/70 dark:bg-red-950/25"
                data-testid="bloqueo-renders"
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    lock
                  </span>
                </div>

                <div>
                  <p class="text-sm font-black leading-snug text-red-800 dark:text-red-200">
                    Renders constructivos bloqueados
                  </p>

                  <p class="mt-1 text-xs font-medium leading-relaxed text-red-700/90 dark:text-red-300/90">
                    La generación de modelos y renders constructivos permanecerá bloqueada hasta que el diseño sea estructuralmente admisible bajo la validación configurada.
                  </p>
                </div>
              </section>
            </div>

            <!-- Footer -->
            <footer
              class="flex flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md active:scale-[0.98] dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                data-testid="btn-cerrar-metalcon"
                @click="emit('close')"
              >
                <span class="material-symbols-outlined text-[17px]">
                  tune
                </span>
                Entendido — ajustar modelo
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.metalcon-overlay-enter-active,
.metalcon-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.metalcon-overlay-enter-from,
.metalcon-overlay-leave-to {
  opacity: 0;
}

.metalcon-card-enter-active,
.metalcon-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.metalcon-card-enter-from,
.metalcon-card-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>