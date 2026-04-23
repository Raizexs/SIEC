<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Materials Header -->
    <div class="flex items-center justify-between pb-4 border-b border-outline-variant/10">
      <div>
        <h3 class="text-2xl font-headline font-extrabold text-primary tracking-tight">
          {{ t("materialIntelligence") }}
        </h3>
        <p class="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-1">Análisis de Mercado & Desempeño</p>
      </div>
      <div class="flex gap-3">
        <button
          class="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-[#161b22] text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#21262d] hover:scale-[1.02] transition-all duration-300 shadow-sm"
        >
          <span class="material-symbols-outlined text-[14px]">sync</span>
          {{ t("updatePrices") }}
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 hover:scale-[1.02] transition-all duration-300 shadow-sm"
        >
          <span class="material-symbols-outlined text-[14px]">download</span>
          {{ t("exportSpecs") }}
        </button>
      </div>
    </div>

    <!-- Current Material Selection -->
    <div
      class="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-2xl p-5 shadow-lg relative overflow-hidden group"
    >
      <div class="absolute inset-0 bg-white/20 dark:bg-black/20 pointer-events-none"></div>
      <div class="flex items-center gap-5 relative z-10">
        <div class="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-md border-2 border-white dark:border-[#21262d]">
          <img
            :src="currentMaterialInfo.image"
            :alt="currentMaterialInfo.name"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div>
          <h4 class="font-bold text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            {{ t("selectedMaterial") }}
          </h4>
          <p class="text-xl font-headline font-black text-slate-800 dark:text-slate-100">{{ currentMaterialInfo.name }}</p>
          <p class="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full inline-block mt-1">
            {{ formatCurrency(currentMaterialInfo.costPerM2) }} / m²
          </p>
        </div>
        <div class="ml-auto text-right bg-white/60 dark:bg-[#0d1117]/60 p-3 rounded-xl border border-white/50 dark:border-[#30363d] backdrop-blur-sm">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {{ t("estimatedTotal") }}
          </p>
          <p class="text-2xl font-black text-primary font-headline">
            {{ formatCurrency(totalMaterialCost) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Materials Grid -->
    <div class="grid grid-cols-2 gap-5">
      <div
        v-for="(material, index) in materialsData"
        :key="material.id"
        class="bg-white dark:bg-[#161b22] border-2 rounded-2xl p-5 cursor-pointer group transition-all duration-300 relative overflow-hidden animate-fade-in"
        :class="selectedMaterialId === material.id ? 'border-primary shadow-[0_4px_20px_rgba(var(--color-primary),0.2)] bg-primary/[0.02] dark:bg-primary/[0.05] scale-[1.02]' : 'border-slate-100 dark:border-[#30363d] hover:border-primary/50 hover:shadow-lg'"
        @click="selectMaterial(material.id)"
        :style="{ animationDelay: `${index * 100}ms` }"
      >
        <div
          class="aspect-video bg-surface-container rounded-lg overflow-hidden mb-3"
        >
          <img
            :src="material.image"
            :alt="t(material.nameKey)"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        <h4 class="font-semibold text-outline-variant mb-1 text-sm">
          {{ t(material.nameKey) }}
        </h4>
        <p class="text-xs text-outline mb-2 line-clamp-2">
          {{
            currentLanguage === "en"
              ? material.descriptionEn
              : material.description
          }}
        </p>

        <!-- Material Properties -->
        <div class="space-y-1 mb-3">
          <div class="flex justify-between items-center">
            <span class="text-xs text-outline">{{ t("durability") }}:</span>
            <div class="flex">
              <span
                v-for="i in 5"
                :key="i"
                class="material-symbols-outlined text-xs"
                :class="
                  i <= material.durability
                    ? 'text-amber-400'
                    : 'text-outline-variant'
                "
              >
                star
              </span>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-outline">{{ t("speed") }}:</span>
            <div class="flex">
              <span
                v-for="i in 5"
                :key="i"
                class="material-symbols-outlined text-xs"
                :class="
                  i <= material.constructionSpeed
                    ? 'text-emerald-400'
                    : 'text-outline-variant'
                "
              >
                bolt
              </span>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-outline">{{ t("costEfficiency") }}:</span>
            <div class="flex">
              <span
                v-for="i in 5"
                :key="i"
                class="material-symbols-outlined text-xs"
                :class="
                  i <= material.costEfficiency
                    ? 'text-blue-400'
                    : 'text-outline-variant'
                "
              >
                trending_up
              </span>
            </div>
          </div>
        </div>

        <!-- Price -->
        <div class="flex justify-between items-center bg-slate-50 dark:bg-[#0d1117] p-2 rounded-lg">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ t("pricePerM2") }}</span>
          <span class="text-sm font-black text-primary">{{ formatCurrency(material.costPerM2) }}</span>
        </div>

        <!-- Chilean Supplier Info -->
        <div class="mt-2 pt-2 border-t border-outline-variant/10">
          <div class="flex items-center gap-1">
            <span class="material-symbols-outlined text-xs text-emerald-500"
              >store</span
            >
            <span class="text-xs text-outline">{{ material.supplier }}</span>
            <span class="text-xs text-emerald-500 font-medium">{{
              currentLanguage === "en"
                ? material.availabilityEn
                : material.availability
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Market Insights -->
    <div class="bg-surface-container-low rounded-xl p-4">
      <h4
        class="font-semibold text-outline-variant mb-3 flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-primary">insights</span>
        {{ t("marketInsights") }}
      </h4>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-xs text-outline mb-1">{{ t("averagePrice") }}</p>
          <p class="text-sm font-bold text-outline-variant">
            {{ averagePrice }} CLP/m²
          </p>
        </div>
        <div>
          <p class="text-xs text-outline mb-1">{{ t("priceVariation") }}</p>
          <p
            class="text-sm font-bold"
            :class="priceVariation > 0 ? 'text-red-500' : 'text-emerald-500'"
          >
            {{ priceVariation > 0 ? "+" : "" }}{{ priceVariation }}%
          </p>
        </div>
        <div>
          <p class="text-xs text-outline mb-1">{{ t("lastUpdate") }}</p>
          <p class="text-sm font-bold text-outline-variant">{{ lastUpdate }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "../composables/useI18n";

const { t, currentLanguage } = useI18n();

// Props para recibir la selección actual
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

const emit = defineEmits(["material-selected"]);

// Datos de materiales con información real de Chile (precios actualizados Nov 2024)
// Precios en miles de CLP por m² de construcción
const materialsData = ref([
  {
    id: 1,
    nameKey: "woodFrame",
    description:
      "Estructura de madera tratada con pino radiata, resistente a humedad y termitas. Ideal para construcción rápida.",
    descriptionEn:
      "Treated wood structure with radiata pine, resistant to moisture and termites. Ideal for fast construction.",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    costPerM2: 850000,
    durability: 3,
    constructionSpeed: 5,
    costEfficiency: 4,
    supplier: "Sodimac Chile",
    availability: "Disponible",
    availabilityEn: "Available",
    marketTrend: "stable",
  },
  {
    id: 2,
    nameKey: "steelFramed",
    description:
      "Sistema de acero galvanizado, rápido de montar y eficiente para obras menores.",
    descriptionEn:
      "Galvanized steel system, fast to install and efficient for small-scale projects.",
    image:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop",
    costPerM2: 1100000,
    durability: 5,
    constructionSpeed: 4,
    costEfficiency: 3,
    supplier: "Easy Chile",
    availability: "Disponible",
    availabilityEn: "Available",
    marketTrend: "rising",
  },
  {
    id: 3,
    nameKey: "masonry",
    description:
      "Albañilería armada con bloques de hormigón, excelente aislación térmica y acústica. Tradicional chileno.",
    descriptionEn:
      "Reinforced masonry with concrete blocks, excellent thermal and acoustic insulation. Chilean traditional.",
    image:
      "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop",
    costPerM2: 950000,
    durability: 4,
    constructionSpeed: 3,
    costEfficiency: 5,
    supplier: "Construmart",
    availability: "Disponible",
    availabilityEn: "Available",
    marketTrend: "stable",
  },
  {
    id: 4,
    nameKey: "concrete",
    description:
      "Ferrocemento estructural de alta inercia, requiere logística de maquinaria pesada para manejo y montaje.",
    descriptionEn:
      "High-inertia ferrocement system that requires heavy machinery logistics for handling and assembly.",
    image:
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop",
    costPerM2: 1200000,
    durability: 5,
    constructionSpeed: 2,
    costEfficiency: 2,
    supplier: "Cemento Melón",
    availability: "Disponible",
    availabilityEn: "Available",
    marketTrend: "rising",
  },
]);

const selectMaterial = (materialId) => {
  emit("material-selected", materialId);
};

// Computed properties
const currentMaterialInfo = computed(() => {
  const material =
    materialsData.value.find((m) => m.id === props.selectedMaterialId) ||
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
  const total = materialsData.value.reduce((sum, m) => sum + m.costPerM2, 0);
  return Math.round(total / materialsData.value.length);
});

const priceVariation = computed(() => {
  // Simulamos variación de precios (en una app real vendría de API)
  return Math.round((Math.random() - 0.5) * 10);
});

const lastUpdate = computed(() => {
  return new Date().toLocaleDateString(
    currentLanguage.value === "en" ? "en-US" : "es-CL",
  );
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
