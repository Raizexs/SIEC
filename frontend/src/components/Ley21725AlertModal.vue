<script setup>
/**
 * Ley21725AlertModal.vue
 * Modal de alerta BLOQUEANTE para infracciones de la Ley 21.725 (Ley del Mono)
 * SCRUM-97
 *
 * Criterio de Aceptación:
 *   "Alerta explícita bloqueante de 'Infracción Ley 21.725' si el usuario
 *    sobrepasa el límite."
 *
 * El modal NO permite cerrarse haciendo clic fuera del panel cuando es
 * bloqueante, obligando al usuario a reducir el área antes de continuar.
 */
import { computed } from "vue";
import {
  AREA_UMBRAL_MIN_M2,
  AREA_UMBRAL_MAX_M2,
  TASACION_LIMITE_UF,
} from "../composables/useLey21725";

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

const emit = defineEmits(["close"]);

const codigoInfraccion = computed(() => props.resultado?.codigo_infraccion || "");
const esAreaExcedida = computed(() =>
  codigoInfraccion.value === "LEY21725-AREA-EXCEDE"
);
const esTasacionExcedida = computed(() =>
  codigoInfraccion.value === "LEY21725-TASACION-EXCEDE"
);
const esBajoUmbral = computed(() =>
  codigoInfraccion.value === "LEY21725-AREA-BAJO-UMBRAL"
);

/** Sólo las infracciones de área o tasación son bloqueantes */
const esBloqueante = computed(() => props.resultado?.bloqueante === true);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-scale">
      <div
        v-if="props.show"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ley-modal-title"
        aria-describedby="ley-modal-desc"
        @click.self="esBloqueante ? null : emit('close')"
      >
        <div
          class="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161b22] shadow-2xl overflow-hidden"
        >
          <!-- Cabecera de alerta con color de severidad -->
          <div
            class="flex items-start gap-4 px-6 pt-6 pb-4"
            :class="esBloqueante
              ? 'border-b-4 border-red-500'
              : 'border-b-4 border-amber-400'"
          >
            <!-- Ícono -->
            <div
              class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white"
              :class="esBloqueante ? 'bg-red-500' : 'bg-amber-400'"
            >
              <span class="material-symbols-outlined text-2xl">
                {{ esBloqueante ? "gavel" : "info" }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <!-- Badge de ley -->
              <span
                class="inline-block text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded mb-1"
                :class="esBloqueante
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'"
              >
                Ley 21.725 · Ley del Mono
              </span>

              <h3
                id="ley-modal-title"
                class="text-xl font-headline font-black leading-tight"
                :class="esBloqueante ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
              >
                {{ resultado?.mensaje || "Infracción Ley 21.725" }}
              </h3>
            </div>
          </div>

          <!-- Cuerpo -->
          <div class="px-6 py-5 space-y-4">
            <!-- Detalle de la infracción -->
            <p
              id="ley-modal-desc"
              class="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            >
              {{ resultado?.detalle }}
            </p>

            <!-- Resumen normativo visual -->
            <div class="rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] p-4 space-y-3">
              <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Umbrales Normativos — Ley 21.725
              </p>
              <div class="grid grid-cols-3 gap-3 text-center">
                <!-- Umbral mínimo -->
                <div
                  class="rounded-lg p-2"
                  :class="resultado?.area_m2 < AREA_UMBRAL_MIN_M2
                    ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-400'
                    : 'bg-white dark:bg-[#161b22]'"
                >
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Mínimo</p>
                  <p class="text-xl font-black text-slate-700 dark:text-slate-200">{{ AREA_UMBRAL_MIN_M2 }}</p>
                  <p class="text-[10px] text-slate-400">m²</p>
                </div>

                <!-- Área actual -->
                <div
                  class="rounded-lg p-2 ring-2"
                  :class="esBloqueante
                    ? 'bg-red-50 dark:bg-red-900/20 ring-red-400'
                    : 'bg-green-50 dark:bg-green-900/20 ring-green-400'"
                >
                  <p class="text-[10px] font-bold uppercase"
                    :class="esBloqueante ? 'text-red-500' : 'text-green-600'"
                  >Tu Diseño</p>
                  <p class="text-xl font-black"
                    :class="esBloqueante ? 'text-red-600' : 'text-green-700 dark:text-green-400'"
                  >{{ resultado?.area_m2?.toFixed(1) }}</p>
                  <p class="text-[10px]" :class="esBloqueante ? 'text-red-400' : 'text-green-500'">m²</p>
                </div>

                <!-- Umbral máximo -->
                <div
                  class="rounded-lg p-2"
                  :class="esAreaExcedida
                    ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-400'
                    : 'bg-white dark:bg-[#161b22]'"
                >
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Máximo</p>
                  <p class="text-xl font-black text-slate-700 dark:text-slate-200">{{ AREA_UMBRAL_MAX_M2 }}</p>
                  <p class="text-[10px] text-slate-400">m²</p>
                </div>
              </div>

              <!-- Límite de tasación (si aplica) -->
              <div
                v-if="resultado?.tasacion_uf !== null && resultado?.tasacion_uf !== undefined"
                class="mt-2 flex items-center justify-between rounded-lg px-3 py-2"
                :class="esTasacionExcedida
                  ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-400'
                  : 'bg-slate-100 dark:bg-[#0d1117]'"
              >
                <div>
                  <p class="text-[10px] font-bold uppercase text-slate-400">Tasación Estimada</p>
                  <p class="font-black text-lg"
                    :class="esTasacionExcedida ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'"
                  >
                    {{ resultado.tasacion_uf?.toFixed(1) }} UF
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] font-bold uppercase text-slate-400">Límite Legal</p>
                  <p class="font-black text-lg text-slate-600 dark:text-slate-300">
                    &lt; {{ TASACION_LIMITE_UF }} UF
                  </p>
                </div>
                <span
                  class="material-symbols-outlined text-2xl"
                  :class="esTasacionExcedida ? 'text-red-500' : 'text-green-500'"
                >
                  {{ esTasacionExcedida ? "cancel" : "check_circle" }}
                </span>
              </div>
            </div>

            <!-- Advertencia de bloqueo -->
            <div
              v-if="esBloqueante"
              class="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3"
            >
              <span class="material-symbols-outlined text-red-500 text-lg flex-shrink-0">lock</span>
              <p class="text-xs font-bold text-red-700 dark:text-red-400 leading-snug">
                La generación del modelo y el cálculo de insumos están
                <strong>bloqueados</strong> hasta que el diseño cumpla con los
                requisitos de la Ley 21.725. Ajusta los m² del proyecto para
                continuar.
              </p>
            </div>
          </div>

          <!-- Pie de modal -->
          <div class="px-6 pb-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <!-- Botón cerrar (siempre disponible — cierra sólo el modal, no desbloquea) -->
            <button
              class="rounded-xl border border-outline-variant/30 px-5 py-3 font-bold text-sm text-outline transition-colors hover:bg-surface-container-low"
              @click="emit('close')"
            >
              {{ esBloqueante ? "Entendido — Ajustar Diseño" : "Cerrar" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>