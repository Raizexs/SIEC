<script setup>
import { ref, watch, computed } from 'vue';
import BudgetBreakdownPanel from './BudgetBreakdownPanel.vue';

const MATERIALES = [
  {
    id: 1,
    label: 'Madera',
    icon: 'forest',
    desc: 'Económica y versátil. Ideal para ampliaciones ligeras.',
  },
  {
    id: 2,
    label: 'Metalcon',
    icon: 'view_in_ar',
    desc: 'Rápida y resistente. Estructura de perfiles de acero.',
  },
  {
    id: 3,
    label: 'Albañilería',
    icon: 'bricks',
    desc: 'Clásica y durable. Ladrillo, cemento y mortero.',
  },
  {
    id: 4,
    label: 'Hormigón armado',
    icon: 'foundation',
    desc: 'La más sólida. Para construcciones de larga duración.',
  },
];

const m2 = ref(20);
const materialId = ref(3);
const calculado = ref(false);

const selectedMaterial = computed(() =>
  MATERIALES.find((material) => material.id === materialId.value),
);

const sliderProgress = computed(() => {
  const min = 5;
  const max = 200;

  return ((m2.value - min) / (max - min)) * 100;
});

const projectScale = computed(() => {
  if (m2.value < 30) return 'Ampliación menor';
  if (m2.value < 90) return 'Proyecto mediano';
  return 'Proyecto mayor';
});

const selectMaterial = (id) => {
  materialId.value = id;
};

const calcular = () => {
  calculado.value = true;
};

watch([m2, materialId], () => {
  if (calculado.value) calculado.value = false;
});
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
    <!-- Hero -->
    <header
      class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-6 text-center shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 sm:p-8"
    >
      <div
        class="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
      ></div>

      <div
        class="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5"
      ></div>

      <div class="relative z-10 mx-auto max-w-3xl">
        <div
          class="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[16px]">
            bolt
          </span>
          Calculadora rápida
        </div>

        <h1 class="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100 md:text-5xl">
          ¿Cuánto cuesta ampliar tu casa?
        </h1>

        <p class="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 md:text-base">
          Ingresa los metros cuadrados y elige el tipo de construcción. El sistema estima un presupuesto con desglose de insumos y precios referenciales.
        </p>
      </div>
    </header>

    <!-- Calculator card -->
    <section
      class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 sm:p-6 lg:p-8"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
      ></div>

      <div class="relative z-10 space-y-8">
        <!-- Summary strip -->
        <div
          class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              <span class="material-symbols-outlined text-[23px]">
                calculate
              </span>
            </div>

            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Parámetros de estimación
              </p>

              <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                {{ projectScale }}
              </h2>

              <p class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {{ selectedMaterial?.label }} · {{ m2 }} m² a presupuestar
              </p>
            </div>
          </div>

          <div
            class="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <p class="font-mono text-3xl font-black leading-none text-slate-950 dark:text-slate-100">
              {{ m2 }}
            </p>
            <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              m²
            </p>
          </div>
        </div>

        <!-- M2 slider -->
        <section class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label
                for="quick-calculator-m2"
                class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"
              >
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <span class="material-symbols-outlined text-[15px]">
                    square_foot
                  </span>
                </span>
                Metros cuadrados a ampliar
              </label>

              <p class="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Ajusta la superficie objetivo para calcular el presupuesto.
              </p>
            </div>

            <span
              class="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              Rango 5–200 m²
            </span>
          </div>

          <div
            class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <input
              id="quick-calculator-m2"
              v-model.number="m2"
              type="range"
              min="5"
              max="200"
              step="1"
              class="quick-range w-full"
              :style="{ '--range-progress': `${sliderProgress}%` }"
            />

            <div class="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
              <span>5 m²</span>
              <span>100 m²</span>
              <span>200 m²</span>
            </div>
          </div>
        </section>

        <!-- Material selector -->
        <section class="space-y-4">
          <div>
            <label
              class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"
            >
              <span
                class="flex h-6 w-6 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[15px]">
                  construction
                </span>
              </span>
              Tipo de construcción
            </label>

            <p class="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Selecciona la materialidad principal para el cálculo de insumos.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              v-for="material in MATERIALES"
              :key="material.id"
              type="button"
              class="group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99]"
              :class="
                materialId === material.id
                  ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20 dark:shadow-black/20'
                  : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
              "
              @click="selectMaterial(material.id)"
            >
              <div
                v-if="materialId === material.id"
                class="absolute inset-x-0 top-0 h-px bg-orange-400 dark:bg-orange-700"
              ></div>

              <div class="flex items-start justify-between gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-200"
                  :class="
                    materialId === material.id
                      ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                      : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500 dark:group-hover:text-slate-200'
                  "
                >
                  <span class="material-symbols-outlined text-[22px]">
                    {{ material.icon }}
                  </span>
                </div>

                <span
                  v-if="materialId === material.id"
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 dark:bg-orange-400 dark:text-orange-950"
                >
                  <span class="material-symbols-outlined text-[15px]">
                    check
                  </span>
                </span>
              </div>

              <div class="mt-4">
                <p
                  class="text-sm font-black tracking-tight"
                  :class="
                    materialId === material.id
                      ? 'text-orange-900 dark:text-orange-100'
                      : 'text-slate-950 dark:text-slate-100'
                  "
                >
                  {{ material.label }}
                </p>

                <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {{ material.desc }}
                </p>
              </div>
            </button>
          </div>
        </section>

        <!-- CTA -->
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          @click="calcular"
        >
          <span class="material-symbols-outlined text-[20px]">
            calculate
          </span>
          Calcular presupuesto
        </button>
      </div>
    </section>

    <!-- Result -->
    <transition name="quick-result">
      <div v-if="calculado">
        <BudgetBreakdownPanel
          :m2Totales="m2"
          :materialEstructuralId="materialId"
        />
      </div>
    </transition>
  </section>
</template>

<style scoped>
.quick-result-enter-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.quick-result-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

/* Premium range input */
.quick-range {
  height: 0.5rem;
  cursor: pointer;
  appearance: none;
  border-radius: 9999px;
  background:
    linear-gradient(
      to right,
      rgb(249 115 22) 0%,
      rgb(249 115 22) var(--range-progress),
      rgb(226 232 240) var(--range-progress),
      rgb(226 232 240) 100%
    );
  outline: none;
}

.dark .quick-range {
  background:
    linear-gradient(
      to right,
      rgb(251 146 60) 0%,
      rgb(251 146 60) var(--range-progress),
      rgb(51 65 85) var(--range-progress),
      rgb(51 65 85) 100%
    );
}

.quick-range::-webkit-slider-thumb {
  height: 1.25rem;
  width: 1.25rem;
  appearance: none;
  border: 3px solid white;
  border-radius: 9999px;
  background: rgb(249 115 22);
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.18),
    0 0 0 4px rgba(249, 115, 22, 0.12);
}

.quick-range::-moz-range-thumb {
  height: 1.25rem;
  width: 1.25rem;
  border: 3px solid white;
  border-radius: 9999px;
  background: rgb(249 115 22);
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.18),
    0 0 0 4px rgba(249, 115, 22, 0.12);
}

.dark .quick-range::-webkit-slider-thumb {
  border-color: rgb(15 23 42);
  background: rgb(251 146 60);
}

.dark .quick-range::-moz-range-thumb {
  border-color: rgb(15 23 42);
  background: rgb(251 146 60);
}
</style>