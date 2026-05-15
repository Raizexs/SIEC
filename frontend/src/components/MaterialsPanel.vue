<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t, currentLanguage } = useI18n();

const props = defineProps({
  selectedMaterialId: {
    type: Number,
    default: 4,
  },
  totalM2: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['material-selected']);

const materialsData = ref([
  {
    id: 1,
    nameKey: 'woodFrame',
    description:
      'Estructura de madera tratada con pino radiata, resistente a humedad y termitas. Ideal para construcción rápida.',
    descriptionEn:
      'Treated wood structure with radiata pine, resistant to moisture and termites. Ideal for fast construction.',
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    costPerM2: 850000,
    durability: 3,
    constructionSpeed: 5,
    costEfficiency: 4,
    supplier: 'Sodimac Chile',
    availability: 'Disponible',
    availabilityEn: 'Available',
    marketTrend: 'stable',
  },
  {
    id: 2,
    nameKey: 'steelFramed',
    description:
      'Sistema de acero galvanizado, rápido de montar y eficiente para obras menores.',
    descriptionEn:
      'Galvanized steel system, fast to install and efficient for small-scale projects.',
    image:
      'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop',
    costPerM2: 1100000,
    durability: 5,
    constructionSpeed: 4,
    costEfficiency: 3,
    supplier: 'Easy Chile',
    availability: 'Disponible',
    availabilityEn: 'Available',
    marketTrend: 'rising',
  },
  {
    id: 3,
    nameKey: 'masonry',
    description:
      'Albañilería armada con bloques de hormigón, excelente aislación térmica y acústica. Tradicional chileno.',
    descriptionEn:
      'Reinforced masonry with concrete blocks, excellent thermal and acoustic insulation. Chilean traditional.',
    image:
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop',
    costPerM2: 950000,
    durability: 4,
    constructionSpeed: 3,
    costEfficiency: 5,
    supplier: 'Construmart',
    availability: 'Disponible',
    availabilityEn: 'Available',
    marketTrend: 'stable',
  },
  {
    id: 4,
    nameKey: 'concrete',
    description:
      'Ferrocemento estructural de alta inercia, requiere logística de maquinaria pesada para manejo y montaje.',
    descriptionEn:
      'High-inertia ferrocement system that requires heavy machinery logistics for handling and assembly.',
    image:
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop',
    costPerM2: 1200000,
    durability: 5,
    constructionSpeed: 2,
    costEfficiency: 2,
    supplier: 'Cemento Melón',
    availability: 'Disponible',
    availabilityEn: 'Available',
    marketTrend: 'rising',
  },
]);

const selectMaterial = (materialId) => {
  emit('material-selected', materialId);
};

const currentMaterialInfo = computed(() => {
  const material =
    materialsData.value.find((item) => item.id === props.selectedMaterialId) ||
    materialsData.value[3];

  return {
    ...material,
    name: t(material.nameKey),
  };
});

const totalMaterialCost = computed(() => {
  return props.totalM2 * currentMaterialInfo.value.costPerM2;
});

const averagePrice = computed(() => {
  const total = materialsData.value.reduce(
    (sum, material) => sum + material.costPerM2,
    0,
  );

  return Math.round(total / materialsData.value.length);
});

const risingMaterialsCount = computed(() =>
  materialsData.value.filter((material) => material.marketTrend === 'rising').length,
);

const stableMaterialsCount = computed(() =>
  materialsData.value.filter((material) => material.marketTrend === 'stable').length,
);

const lastUpdate = computed(() => {
  return new Date().toLocaleDateString(
    currentLanguage.value === 'en' ? 'en-US' : 'es-CL',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  );
});

const getMaterialDescription = (material) =>
  currentLanguage.value === 'en' ? material.descriptionEn : material.description;

const getAvailability = (material) =>
  currentLanguage.value === 'en' ? material.availabilityEn : material.availability;

const getTrendLabel = (trend) => {
  if (trend === 'rising') return currentLanguage.value === 'en' ? 'Rising' : 'Al alza';
  if (trend === 'stable') return currentLanguage.value === 'en' ? 'Stable' : 'Estable';

  return currentLanguage.value === 'en' ? 'Unknown' : 'Sin dato';
};

const getTrendClasses = (trend) => {
  if (trend === 'rising') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300';
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
</script>

<template>
  <section
    class="animate-fade-in space-y-6 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 sm:p-6"
  >
    <!-- Header -->
    <header
      class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800/80 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[23px]">
            construction
          </span>
        </div>

        <div>
          <p
            class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            Análisis de mercado
          </p>

          <h3 class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('materialIntelligence') }}
          </h3>

          <p class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Compara materialidad, costo referencial, disponibilidad y desempeño constructivo antes de presupuestar.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <span class="material-symbols-outlined text-[16px]">
            sync
          </span>
          {{ t('updatePrices') }}
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-3.5 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <span class="material-symbols-outlined text-[16px]">
            download
          </span>
          {{ t('exportSpecs') }}
        </button>
      </div>
    </header>

    <!-- Current material summary -->
    <article
      class="relative overflow-hidden rounded-3xl border border-orange-200 bg-orange-50/70 p-4 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/20 sm:p-5"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl"
      ></div>

      <div class="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div
          class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm dark:border-orange-800 dark:bg-orange-950/40"
        >
          <img
            :src="currentMaterialInfo.image"
            :alt="currentMaterialInfo.name"
            class="h-full w-full object-cover"
          />
        </div>

        <div class="min-w-0 flex-1">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
            >
              <span class="material-symbols-outlined text-[14px]">
                verified
              </span>
              {{ t('selectedMaterial') }}
            </span>

            <span
              class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight"
              :class="getTrendClasses(currentMaterialInfo.marketTrend)"
            >
              {{ getTrendLabel(currentMaterialInfo.marketTrend) }}
            </span>
          </div>

          <h4 class="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ currentMaterialInfo.name }}
          </h4>

          <p class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            {{ getMaterialDescription(currentMaterialInfo) }}
          </p>

          <p
            class="mt-3 inline-flex rounded-full border border-orange-200 bg-white px-3 py-1.5 font-mono text-xs font-black text-orange-700 shadow-sm dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
          >
            {{ formatCurrency(currentMaterialInfo.costPerM2) }} / m²
          </p>
        </div>

        <div
          class="rounded-2xl border border-orange-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur-md dark:border-orange-800 dark:bg-orange-950/30 lg:min-w-[13rem] lg:text-right"
        >
          <p
            class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t('estimatedTotal') }}
          </p>

          <p class="mt-1 font-mono text-2xl font-black tracking-tight text-orange-700 dark:text-orange-300">
            {{ formatCurrency(totalMaterialCost) }}
          </p>

          <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {{ totalM2 || 0 }} m² calculados
          </p>
        </div>
      </div>
    </article>

    <!-- Materials grid -->
    <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <article
        v-for="material in materialsData"
        :key="material.id"
        class="group relative cursor-pointer overflow-hidden rounded-3xl border p-4 transition-all duration-200 active:scale-[0.99]"
        :class="
          selectedMaterialId === material.id
            ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20 dark:shadow-black/20'
            : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
        "
        @click="selectMaterial(material.id)"
      >
        <div
          v-if="selectedMaterialId === material.id"
          class="absolute inset-x-0 top-0 h-px bg-orange-400 dark:bg-orange-700"
        ></div>

        <div class="flex gap-4">
          <!-- Image -->
          <div
            class="h-24 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <img
              :src="material.image"
              :alt="t(material.nameKey)"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4
                  class="truncate text-base font-black tracking-tight"
                  :class="
                    selectedMaterialId === material.id
                      ? 'text-orange-900 dark:text-orange-100'
                      : 'text-slate-950 dark:text-slate-100'
                  "
                >
                  {{ t(material.nameKey) }}
                </h4>

                <p class="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {{ getMaterialDescription(material) }}
                </p>
              </div>

              <span
                v-if="selectedMaterialId === material.id"
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 dark:bg-orange-400 dark:text-orange-950"
              >
                <span class="material-symbols-outlined text-[15px]">
                  check
                </span>
              </span>
            </div>

            <!-- Properties -->
            <div class="mt-4 grid grid-cols-3 gap-2">
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                <p class="text-[9px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                  {{ t('durability') }}
                </p>
                <div class="mt-1 flex gap-0.5">
                  <span
                    v-for="i in 5"
                    :key="`durability-${material.id}-${i}`"
                    class="material-symbols-outlined text-[13px]"
                    :class="i <= material.durability ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'"
                  >
                    star
                  </span>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                <p class="text-[9px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                  {{ t('speed') }}
                </p>
                <div class="mt-1 flex gap-0.5">
                  <span
                    v-for="i in 5"
                    :key="`speed-${material.id}-${i}`"
                    class="material-symbols-outlined text-[13px]"
                    :class="i <= material.constructionSpeed ? 'text-emerald-400' : 'text-slate-300 dark:text-slate-700'"
                  >
                    bolt
                  </span>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/50">
                <p class="text-[9px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                  {{ t('costEfficiency') }}
                </p>
                <div class="mt-1 flex gap-0.5">
                  <span
                    v-for="i in 5"
                    :key="`efficiency-${material.id}-${i}`"
                    class="material-symbols-outlined text-[13px]"
                    :class="i <= material.costEfficiency ? 'text-blue-400' : 'text-slate-300 dark:text-slate-700'"
                  >
                    trending_up
                  </span>
                </div>
              </div>
            </div>

            <!-- Price + supplier -->
            <div class="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {{ t('pricePerM2') }}
                </p>

                <p class="mt-0.5 font-mono text-sm font-black text-slate-950 dark:text-slate-100">
                  {{ formatCurrency(material.costPerM2) }}
                </p>
              </div>

              <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span class="material-symbols-outlined text-[15px] text-emerald-500">
                  store
                </span>

                <span class="truncate">
                  {{ material.supplier }}
                </span>

                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300">
                  {{ getAvailability(material) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- Market insights -->
    <section
      class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div class="mb-4 flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-orange-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[22px]">
            insights
          </span>
        </div>

        <div>
          <h4 class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('marketInsights') }}
          </h4>

          <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Resumen referencial de precios y estado de mercado de las materialidades disponibles.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {{ t('averagePrice') }}
          </p>

          <p class="mt-2 font-mono text-lg font-black text-slate-950 dark:text-slate-100">
            {{ formatCurrency(averagePrice) }}
          </p>

          <p class="mt-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            CLP/m²
          </p>
        </div>

        <div
          class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center shadow-sm dark:border-amber-900/70 dark:bg-amber-950/25"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Materiales al alza
          </p>

          <p class="mt-2 font-mono text-lg font-black text-amber-800 dark:text-amber-200">
            {{ risingMaterialsCount }}
          </p>

          <p class="mt-1 text-[10px] font-semibold text-amber-700/80 dark:text-amber-300/80">
            de {{ materialsData.length }} materiales
          </p>
        </div>

        <div
          class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/25"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
            {{ t('lastUpdate') }}
          </p>

          <p class="mt-2 font-mono text-lg font-black text-emerald-800 dark:text-emerald-200">
            {{ lastUpdate }}
          </p>

          <p class="mt-1 text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-300/80">
            {{ stableMaterialsCount }} estables
          </p>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>