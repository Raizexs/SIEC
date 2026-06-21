<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();

const props = defineProps({
  materialEstructuralId: {
    type: Number,
    required: true,
  },
  m2Totales: {
    type: Number,
    required: true,
  },
});

// 4 es Hormigón/Concrete: logística pesada
const isHeavyLogistics = computed(() => props.materialEstructuralId === 4);

const selectedAccess = ref('urbano');

const accesibilidadOpciones = [
  {
    id: 'urbano',
    title: 'Urbano óptimo',
    desc: 'Calles pavimentadas, giro amplio y acceso directo.',
    icon: 'emoji_transportation',
    multiplier: 1,
  },
  {
    id: 'suburbano',
    title: 'Suburbano',
    desc: 'Caminos mixtos, acceso moderado y maniobra limitada.',
    icon: 'signpost',
    multiplier: 1.5,
  },
  {
    id: 'rural',
    title: 'Rural difícil',
    desc: 'Caminos de tierra, pendiente alta o ingreso restringido.',
    icon: 'landscape',
    multiplier: 2.5,
  },
];

const selectedAccessOption = computed(() =>
  accesibilidadOpciones.find((option) => option.id === selectedAccess.value),
);

const costoTransporte = computed(() => {
  const baseTransport = 150000;
  const materialMultiplier = isHeavyLogistics.value ? 4.5 : 1.2;
  const accessMultiplier = selectedAccessOption.value?.multiplier || 1;
  const sizeMultiplier = props.m2Totales > 100 ? 1.5 : 1.0;

  return baseTransport * materialMultiplier * accessMultiplier * sizeMultiplier;
});

const logisticsSummary = computed(() => {
  if (isHeavyLogistics.value) {
    return {
      title: 'Logística compleja',
      subtitle: 'Maquinaria pesada y coordinación municipal',
      icon: 'crane',
      tone: 'warning',
      description:
        'El material seleccionado requiere planificación de alto tonelaje, camiones mixer y posible gestión de permisos para maniobras o corte de calles.',
    };
  }

  return {
    title: 'Logística estándar',
    subtitle: 'Transporte convencional y montaje en obra',
    icon: 'local_shipping',
    tone: 'safe',
    description:
      'El material seleccionado permite traslado en camiones estándar y ensamblaje in-situ sin maquinaria pesada extraordinaria.',
  };
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value);
};
</script>

<template>
  <section
    class="animate-fade-in space-y-6 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 sm:p-6"
  >
    <!-- Header -->
    <header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800/80 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[23px]">
            route
          </span>
        </div>

        <div>
          <p
            class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            Análisis operativo
          </p>

          <h3 class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('logistics') || 'Logística y despliegue' }}
          </h3>

          <p class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Evalúa accesibilidad, complejidad de traslado y costo estimado de flete según materialidad y superficie.
          </p>
        </div>
      </div>

      <span
        class="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <span class="material-symbols-outlined text-[15px] text-slate-400">
          square_foot
        </span>
        {{ Math.round(m2Totales) }} m²
      </span>
    </header>

    <!-- Logistics summary -->
    <article
      class="relative overflow-hidden rounded-3xl border p-5 shadow-sm transition-colors duration-300"
      :class="
        isHeavyLogistics
          ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20'
          : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'
      "
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl"
        :class="isHeavyLogistics ? 'bg-amber-400/15' : 'bg-emerald-400/15'"
      ></div>

      <div class="relative z-10 flex items-start gap-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm dark:bg-slate-950/80"
          :class="
            isHeavyLogistics
              ? 'border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-300'
              : 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300'
          "
        >
          <span class="material-symbols-outlined text-[25px]">
            {{ logisticsSummary.icon }}
          </span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h4
              class="font-black tracking-tight"
              :class="
                isHeavyLogistics
                  ? 'text-amber-900 dark:text-amber-100'
                  : 'text-emerald-900 dark:text-emerald-100'
              "
            >
              {{ logisticsSummary.title }}
            </h4>

            <span
              class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight"
              :class="
                isHeavyLogistics
                  ? 'border-amber-300 bg-amber-100/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-emerald-300 bg-emerald-100/70 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              "
            >
              {{ logisticsSummary.subtitle }}
            </span>
          </div>

          <p
            class="mt-2 text-sm font-medium leading-relaxed"
            :class="
              isHeavyLogistics
                ? 'text-amber-800/90 dark:text-amber-200/90'
                : 'text-emerald-800/90 dark:text-emerald-200/90'
            "
          >
            {{ logisticsSummary.description }}
          </p>
        </div>
      </div>
    </article>

    <!-- Accessibility options -->
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p
            class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            <span class="material-symbols-outlined text-[16px]">
              map
            </span>
            Accesibilidad del terreno
          </p>

          <p class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Selecciona el escenario de acceso más cercano al proyecto.
          </p>
        </div>

        <span
          v-if="selectedAccessOption"
          class="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex"
        >
          Factor x{{ selectedAccessOption.multiplier }}
        </span>
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          v-for="opcion in accesibilidadOpciones"
          :key="opcion.id"
          type="button"
          class="group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99]"
          :class="
            selectedAccess === opcion.id
              ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20 dark:shadow-black/20'
              : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
          "
          @click="selectedAccess = opcion.id"
        >
          <div
            v-if="selectedAccess === opcion.id"
            class="absolute inset-x-0 top-0 h-px bg-orange-400 dark:bg-orange-700"
          ></div>

          <div class="flex items-start justify-between gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-200"
              :class="
                selectedAccess === opcion.id
                  ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                  : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500 dark:group-hover:text-slate-200'
              "
            >
              <span class="material-symbols-outlined text-[22px]">
                {{ opcion.icon }}
              </span>
            </div>

            <span
              class="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-tight"
              :class="
                selectedAccess === opcion.id
                  ? 'border-orange-200 bg-white text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500'
              "
            >
              x{{ opcion.multiplier }}
            </span>
          </div>

          <div class="mt-4">
            <p
              class="text-sm font-black tracking-tight"
              :class="
                selectedAccess === opcion.id
                  ? 'text-orange-900 dark:text-orange-100'
                  : 'text-slate-950 dark:text-slate-100'
              "
            >
              {{ opcion.title }}
            </p>

            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ opcion.desc }}
            </p>
          </div>
        </button>
      </div>
    </section>

    <!-- Estimated transport cost -->
    <section
      class="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
      ></div>

      <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            <span class="material-symbols-outlined text-[15px]">
              local_atm
            </span>
            Costo estimado de flete y logística
          </p>

          <p class="mt-2 font-mono text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ formatCurrency(costoTransporte) }}
          </p>

          <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Estimación referencial según materialidad, superficie y accesibilidad seleccionada.
          </p>
        </div>

        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-orange-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[30px]">
            payments
          </span>
        </div>
      </div>
    </section>
  </section>
</template>