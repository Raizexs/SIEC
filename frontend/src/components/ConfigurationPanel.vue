<script setup>
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useLayoutManager } from '../composables/useLayoutManager';
import {
  Trees,
  Grid2x2,
  Building,
  Hammer,
  Info,
  AlertTriangle,
  Ruler,
  Check,
} from 'lucide-vue-next';

const { t } = useI18n();
const { MATERIAL_COSTS, calculateCost } = useLayoutManager();

const props = defineProps({
  formData: { type: Object, required: true },
  costs: { type: Object, required: true },
  tokensDisponibles: { type: Number, required: true },
});

const emit = defineEmits(['update:formData']);

const updateFormData = (field, value) => {
  emit('update:formData', { ...props.formData, [field]: value });
};

const estimatedCost = computed(() =>
  calculateCost(props.formData.m2Totales, props.formData.materialEstructuralId),
);

const selectedMaterial = computed(() =>
  materials.find((material) => material.id === props.formData.materialEstructuralId),
);

const materials = [
  {
    id: 1,
    label: 'Madera',
    icon: Trees,
    hint: 'Económico · Liviano · Apto sismo',
  },
  {
    id: 2,
    label: 'Metalcom',
    icon: Grid2x2,
    hint: 'Industrial · Rápido montaje',
  },
  {
    id: 3,
    label: 'Albañilería',
    icon: Hammer,
    hint: 'Tradicional · Buena térmica',
  },
  {
    id: 4,
    label: 'Hormigón Armado',
    icon: Building,
    hint: 'Robustez máxima · Logística pesada',
  },
];
</script>

<template>
  <section class="col-span-12 space-y-6 animate-fade-in lg:col-span-7">
    <!-- Step header -->
    <header
      class="rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/70"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-tight text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/40"></span>
            {{ t('step01') }}
          </span>

          <h3
            class="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-slate-100"
          >
            {{ t('projectGeometry') }}
          </h3>

          <p class="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Define las dimensiones del terreno y la materialidad estructural del proyecto.
          </p>
        </div>

        <div
          class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex"
        >
          <Ruler class="h-5 w-5" :stroke-width="2" />
        </div>
      </div>
    </header>

    <!-- Terrain dimensions card -->
    <article
      class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-md transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/80"
    >
      <div class="flex items-end justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80">
        <div>
          <p class="text-sm font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
            Medidas del terreno
          </p>
          <p class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Ajusta ancho y largo en metros
          </p>
        </div>

        <div
          class="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-right dark:border-orange-900/60 dark:bg-orange-950/25"
        >
          <p class="font-mono text-xl font-black tabular-nums text-slate-950 dark:text-slate-100">
            {{ Math.round(formData.m2Totales) }}
          </p>
          <p class="text-[10px] font-bold uppercase tracking-tight text-orange-700 dark:text-orange-300">
            m² totales
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Ancho (m)
          </label>

          <div class="relative">
            <input
              :value="formData.terrenoAncho"
              type="number"
              min="2"
              step="0.5"
              class="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center font-mono text-2xl font-bold tabular-nums text-slate-950 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
              @input="updateFormData('terrenoAncho', Number($event.target.value))"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Largo (m)
          </label>

          <div class="relative">
            <input
              :value="formData.terrenoLargo"
              type="number"
              min="2"
              step="0.5"
              class="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center font-mono text-2xl font-bold tabular-nums text-slate-950 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
              @input="updateFormData('terrenoLargo', Number($event.target.value))"
            />
          </div>
        </div>
      </div>
    </article>

    <!-- Material selector -->
    <article
      class="rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-sm backdrop-blur-md transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/80"
    >
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <label
            class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400"
          >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              <span class="material-symbols-outlined text-[15px]">foundation</span>
            </span>
            {{ t('structuralMaterial') }}
          </label>

          <p class="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            Selecciona la base constructiva para estimar comportamiento y costo.
          </p>
        </div>

        <div
          v-if="selectedMaterial"
          class="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900 sm:block"
        >
          <p class="text-[10px] font-semibold uppercase tracking-tight text-slate-400 dark:text-slate-500">
            Material actual
          </p>
          <p class="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {{ selectedMaterial.label }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          v-for="m in materials"
          :key="m.id"
          type="button"
          class="group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99]"
          :class="
            formData.materialEstructuralId === m.id
              ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20 dark:shadow-black/20'
              : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
          "
          @click="updateFormData('materialEstructuralId', m.id)"
        >
          <div
            class="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            :class="
              formData.materialEstructuralId === m.id
                ? 'bg-orange-300 dark:bg-orange-700'
                : 'bg-slate-200 dark:bg-slate-700'
            "
          ></div>

          <div class="flex items-start justify-between gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-200"
              :class="
                formData.materialEstructuralId === m.id
                  ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                  : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500 dark:group-hover:text-slate-200'
              "
            >
              <component :is="m.icon" class="h-5 w-5" :stroke-width="1.9" />
            </div>

            <div
              v-if="formData.materialEstructuralId === m.id"
              class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 dark:bg-orange-400 dark:text-orange-950"
            >
              <Check class="h-3.5 w-3.5" :stroke-width="3" />
            </div>
          </div>

          <div class="mt-3">
            <p
              class="text-sm font-semibold tracking-tight transition-colors duration-200"
              :class="
                formData.materialEstructuralId === m.id
                  ? 'text-orange-900 dark:text-orange-100'
                  : 'text-slate-950 dark:text-slate-100'
              "
            >
              {{ m.label }}
            </p>

            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ m.hint }}
            </p>
          </div>
        </button>
      </div>

      <!-- Inline feedback -->
      <div
        class="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
        >
          <Info class="h-4 w-4" :stroke-width="2" />
        </div>

        <div>
          <p class="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            {{ t('materialNote') }}
          </p>

          <p
            v-if="formData.materialEstructuralId === 4"
            class="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-tight text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <AlertTriangle class="h-3 w-3" :stroke-width="2.4" />
            Requiere logística pesada
          </p>
        </div>
      </div>
    </article>
  </section>
</template>