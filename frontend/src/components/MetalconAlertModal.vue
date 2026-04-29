<script setup>
/**
 * MetalconAlertModal.vue
 * Modal de EXCEPCIÓN SEVERA — Validador Metalcon vs Altura
 * SCRUM-98 · HU18: Hard Constraints Regulatorios (MINVU)
 *
 * Criterio de Aceptación:
 *   "Si el usuario levanta modelo Metalcon > 3 pisos, arrojar excepción severa
 *    alertando sobre la inviabilidad sin ingeniero."
 *   "Sistema imposibilitado para tramitar renders constructivos sobre topes
 *    gravitatoriamente peligrosos."
 *
 * Comportamiento:
 *   - El modal es BLOQUEANTE: no puede cerrarse haciendo clic fuera del panel.
 *   - Muestra el indicador de pisos detectados vs máximo normativo.
 *   - Indica claramente la acción requerida para desbloquear.
 */
import { computed } from "vue";
import {
  METALCON_MAX_PISOS,
  METALCON_MATERIAL_ID,
  CODIGO_EXCEPCION_METALCON,
} from "../composables/useMetalconValidator";

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

const emit = defineEmits(["close"]);

const pisosDetectados = computed(() => props.excepcion?.pisos_detectados ?? "?");
const pisosMaximos    = computed(() => props.excepcion?.pisos_maximos ?? METALCON_MAX_PISOS);
const accionRequerida = computed(() => props.excepcion?.accion_requerida ?? "");
const norma           = computed(() => props.excepcion?.norma_referencia ?? "MINVU");

/** Porcentaje de pisos sobre el máximo (para la barra de progreso de peligro) */
const peligroPct = computed(() => {
  const detected = Number(pisosDetectados.value);
  const max      = Number(pisosMaximos.value);
  if (!detected || !max) return 0;
  return Math.min(100, Math.round((detected / max) * 100));
});

/** Color de la barra de peligro según exceso */
const peligroColor = computed(() => {
  if (peligroPct.value > 100) return "bg-red-600";
  if (peligroPct.value === 100) return "bg-orange-500";
  return "bg-yellow-400";
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-scale">
      <div
        v-if="props.show"
        class="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="metalcon-modal-title"
        aria-describedby="metalcon-modal-desc"
        data-testid="metalcon-alert-modal"
      >
        <!-- Panel principal — no se cierra al hacer clic fuera (excepción severa) -->
        <div
          class="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161b22] shadow-2xl overflow-hidden border-2 border-red-600"
        >
          <!-- ── Cabecera ──────────────────────────────────────────────── -->
          <div class="bg-red-600 px-6 pt-5 pb-4 flex items-start gap-4">
            <!-- Ícono de peligro -->
            <div
              class="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-white text-2xl">
                dangerous
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <!-- Badge normativo -->
              <span
                class="inline-block text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded mb-1.5 bg-white/20 text-white"
              >
                MINVU · Alerta Estructural Crítica — SCRUM-98
              </span>

              <h3
                id="metalcon-modal-title"
                class="text-xl font-headline font-black leading-tight text-white"
              >
                {{ excepcion?.mensaje ?? "Configuración Inviable — Peligro Gravitatorio" }}
              </h3>
            </div>
          </div>

          <!-- ── Cuerpo ────────────────────────────────────────────────── -->
          <div class="px-6 py-5 space-y-4">
            <!-- Descripción del problema -->
            <p
              id="metalcon-modal-desc"
              class="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            >
              {{ excepcion?.detalle }}
            </p>

            <!-- Indicador visual de pisos -->
            <div
              class="rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] p-4 space-y-3"
            >
              <p
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Evaluación de Altura — Metalcon
              </p>

              <div class="grid grid-cols-3 gap-3 text-center">
                <!-- Material -->
                <div
                  class="rounded-lg p-2 bg-slate-100 dark:bg-[#161b22]"
                >
                  <p class="text-[10px] font-bold text-slate-400 uppercase">Material</p>
                  <span
                    class="material-symbols-outlined text-red-500 text-2xl block my-1"
                    >view_module</span
                  >
                  <p
                    class="text-[10px] font-bold text-slate-600 dark:text-slate-300"
                  >
                    Metalcon
                  </p>
                </div>

                <!-- Pisos detectados (resaltado en rojo) -->
                <div
                  class="rounded-lg p-2 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500"
                  data-testid="pisos-detectados"
                >
                  <p class="text-[10px] font-bold text-red-500 uppercase">
                    Tu Modelo
                  </p>
                  <p class="text-3xl font-black text-red-600 dark:text-red-400">
                    {{ pisosDetectados }}
                  </p>
                  <p class="text-[10px] text-red-400">pisos</p>
                </div>

                <!-- Máximo permitido -->
                <div
                  class="rounded-lg p-2 bg-white dark:bg-[#161b22]"
                  data-testid="pisos-maximos"
                >
                  <p class="text-[10px] font-bold text-slate-400 uppercase">
                    Máximo
                  </p>
                  <p
                    class="text-3xl font-black text-slate-700 dark:text-slate-200"
                  >
                    {{ pisosMaximos }}
                  </p>
                  <p class="text-[10px] text-slate-400">pisos</p>
                </div>
              </div>

              <!-- Barra de peligro gravitatorio -->
              <div>
                <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                  <span>Carga gravitatoria relativa</span>
                  <span class="text-red-500">
                    {{ pisosDetectados }} / {{ pisosMaximos }} pisos máx.
                  </span>
                </div>
                <div
                  class="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
                >
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="peligroColor"
                    :style="{ width: peligroPct + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Norma de referencia -->
              <p
                class="text-[10px] text-slate-400 italic"
                data-testid="norma-referencia"
              >
                Norma: {{ norma }}
              </p>
            </div>

            <!-- Acción requerida -->
            <div
              class="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3"
              data-testid="accion-requerida"
            >
              <span
                class="material-symbols-outlined text-amber-500 text-lg flex-shrink-0 mt-0.5"
                >engineering</span
              >
              <div>
                <p
                  class="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1"
                >
                  Acción Requerida para Desbloquear
                </p>
                <p
                  class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed"
                >
                  {{ accionRequerida }}
                </p>
              </div>
            </div>

            <!-- Bloqueo de renders -->
            <div
              class="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3"
              data-testid="bloqueo-renders"
            >
              <span
                class="material-symbols-outlined text-red-500 text-lg flex-shrink-0"
                >lock</span
              >
              <p
                class="text-xs font-bold text-red-700 dark:text-red-400 leading-snug"
              >
                La tramitación de <strong>renders constructivos</strong> y la
                generación de modelos están
                <strong>bloqueadas</strong> hasta que el diseño sea estructuralmente
                admisible bajo la normativa MINVU.
              </p>
            </div>
          </div>

          <!-- ── Pie del modal ──────────────────────────────────────────── -->
          <div
            class="px-6 pb-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          >
            <button
              class="rounded-xl border border-outline-variant/30 px-5 py-3 font-bold text-sm text-outline transition-colors hover:bg-surface-container-low"
              data-testid="btn-cerrar-metalcon"
              @click="emit('close')"
            >
              Entendido — Ajustar Modelo
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>