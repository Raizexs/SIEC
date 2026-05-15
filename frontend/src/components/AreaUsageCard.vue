<script setup>
import { computed } from 'vue';
import { useRecintosStore } from '../stores/recintos';
import { Ruler, AlertTriangle, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps({
  m2Totales: { type: Number, required: true },
  descripcionEstado: { type: Object, required: true },
});

const store = useRecintosStore();

const totalArea = computed(() => store.totalArea);
const budgetArea = computed(() => props.m2Totales);

const usedPct = computed(() =>
  budgetArea.value > 0
    ? Math.min((totalArea.value / budgetArea.value) * 100, 100)
    : 0,
);

const freeArea = computed(() => Math.max(budgetArea.value - totalArea.value, 0));

const isSafe = computed(() => props.descripcionEstado.status === 'safe');

const legendItems = [
  { label: 'Hab.', color: '#3b82f6' },
  { label: 'Baño', color: '#14b8a6' },
  { label: 'Común', color: '#f59e0b' },
];
</script>

<template>
  <aside class="sticky top-24 shrink-0 self-start">
    <div
      class="flex gap-2 rounded-2xl border border-slate-200/90 bg-white/85 p-2 shadow-lg shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/25"
    >
      <!-- Data card -->
      <section class="w-[156px] rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <!-- Header -->
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <p class="text-[9px] font-bold uppercase leading-tight tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Espacio<br />
              disponible
            </p>
          </div>

          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <Ruler class="h-4 w-4" :stroke-width="2" />
          </div>
        </div>

        <!-- Free area -->
        <div
          class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
        >
          <div
            class="font-headline text-3xl font-black leading-none tracking-tight tabular-nums"
            :style="{ color: descripcionEstado.color }"
          >
            {{ freeArea.toFixed(1) }}
          </div>

          <p class="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            m² libres
          </p>
        </div>

        <!-- Metrics -->
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div
            class="rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/70"
          >
            <span class="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Usado
            </span>

            <div class="mt-1 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
              {{ totalArea.toFixed(1) }}
              <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                m²
              </span>
            </div>
          </div>

          <div
            class="rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/70"
          >
            <span class="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Total
            </span>

            <div class="mt-1 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
              {{ budgetArea }}
              <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                m²
              </span>
            </div>
          </div>
        </div>

        <!-- Status -->
        <div
          class="mt-3 flex items-center gap-2 rounded-xl border px-2.5 py-2"
          :class="
            isSafe
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-300'
          "
        >
          <CheckCircle2
            v-if="isSafe"
            class="h-3.5 w-3.5 shrink-0"
            :stroke-width="2.5"
          />

          <AlertTriangle
            v-else
            class="h-3.5 w-3.5 shrink-0"
            :stroke-width="2.5"
          />

          <span class="text-[9px] font-bold uppercase leading-tight tracking-tight">
            {{ descripcionEstado.message }}
          </span>
        </div>

        <!-- Legend -->
        <div class="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p class="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Leyenda
          </p>

          <div class="space-y-1.5">
            <div
              v-for="item in legendItems"
              :key="item.label"
              class="flex items-center justify-between rounded-lg px-1.5 py-1 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <div class="flex items-center gap-2">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-md shadow-sm"
                  :style="{ backgroundColor: item.color }"
                ></span>

                <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  {{ item.label }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Vertical progress -->
      <section class="flex flex-col items-center gap-2 py-1 pr-0.5">
        <div
          class="relative min-h-[230px] w-3 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-700 dark:bg-slate-900"
        >
          <div
            class="absolute bottom-0 left-0 w-full rounded-full transition-all duration-500 ease-out"
            :style="{
              height: `${usedPct}%`,
              backgroundColor: descripcionEstado.color,
            }"
          ></div>

          <div
            class="absolute inset-x-0 top-1/2 h-px bg-white/50 dark:bg-white/10"
          ></div>
        </div>

        <div
          class="rounded-full border px-2 py-1 text-[9px] font-black tabular-nums shadow-sm"
          :style="{
            color: descripcionEstado.color,
            borderColor: `${descripcionEstado.color}55`,
            backgroundColor: `${descripcionEstado.color}12`,
          }"
        >
          {{ Math.round(usedPct) }}%
        </div>
      </section>
    </div>
  </aside>
</template>