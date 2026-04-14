<script setup>
import { computed } from "vue";
import { useI18n } from "../composables/useI18n";

const { t, currentLanguage } = useI18n();

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
  tokensUsados: {
    type: Number,
    required: true,
  },
  tokensTotales: {
    type: Number,
    required: true,
  },
  tokensDisponibles: {
    type: Number,
    required: true,
  },
  descripcionEstado: {
    type: Object,
    required: true,
  },
});

const materialNamesES = {
  1: "Estructura de Madera",
  2: "Estructura de Acero",
  3: "Mampostería",
  4: "Hormigón Armado",
};

const materialNamesEN = {
  1: "Wood Frame",
  2: "Steel Structure",
  3: "Masonry",
  4: "Reinforced Concrete",
};

const getMaterialName = (id) => {
  return currentLanguage.value === 'es' ? materialNamesES[id] : materialNamesEN[id];
};

// Precios por m2 en pesos chilenos (CLP)
const MATERIAL_COST_PER_M2 = {
  1: 850000,   // Wood Frame - $850,000 CLP/m2
  2: 1100000,  // Steel Frame - $1,100,000 CLP/m2
  3: 950000,   // Masonry - $950,000 CLP/m2
  4: 1200000   // Concrete - $1,200,000 CLP/m2
};

const estimatedCost = computed(() => {
  const costPerM2Val = MATERIAL_COST_PER_M2[props.formData.materialEstructuralId] || MATERIAL_COST_PER_M2[4];
  return props.formData.m2Totales * costPerM2Val;
});

const costPerM2 = computed(() => {
  return MATERIAL_COST_PER_M2[props.formData.materialEstructuralId] || MATERIAL_COST_PER_M2[4];
});

const budgetConfidence = computed(() => {
  // Confianza basada en tokens disponibles vs totales
  if (props.tokensTotales === 0) return 0;
  const percentage = (props.tokensDisponibles / props.tokensTotales) * 100;
  return Math.min(Math.max(Math.round(percentage), 0), 100);
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value));
};

const materials = computed(() => [
  {
    nameES: "Hierro y Refuerzos",
    nameEN: "Iron & Reinforcements",
    icon: "construction",
    amountES: "242 Toneladas Estimadas",
    amountEN: "242 Tons Estimated",
    cost: 345000000,
    statusES: "Alta Volatilidad",
    statusEN: "High Volatility",
    statusColor: "text-secondary",
  },
  {
    nameES: "Cemento Premezclado",
    nameEN: "Ready-Mix Cement",
    icon: "opacity",
    amountES: "1.840 m³ Requeridos",
    amountEN: "1,840 m³ Required",
    cost: 192000000,
    statusES: "Estable",
    statusEN: "Stable",
    statusColor: "text-primary-container",
  },
  {
    nameES: "Acabados y Vidrio",
    nameEN: "Finishing & Glass",
    icon: "window",
    amountES: "Especificaciones Arquitectónicas",
    amountEN: "Custom Architectural Specs",
    cost: 512000000,
    statusES: "Premium",
    statusEN: "Premium",
    statusColor: "text-primary-container",
  },
]);
</script>

<template>
  <section class="col-span-5 relative">
    <div class="sticky top-24 space-y-6">
      <!-- Metric Hero Card -->
      <div
        class="bg-gradient-to-br from-primary to-primary-container text-white p-8 rounded-2xl shadow-xl overflow-hidden relative"
      >
        <div
          class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"
        ></div>
        <div class="relative z-10">
          <div class="flex justify-between items-start mb-10">
            <div>
              <span
                class="text-[10px] font-bold text-on-primary-container uppercase tracking-[0.2em]"
                >{{ t('estimatedCost') }}</span
              >
              <div
                class="text-4xl font-headline font-black mt-2 tracking-tighter"
              >
                {{ formatCurrency(estimatedCost) }}
              </div>
            </div>
            <div class="bg-secondary p-3 rounded-lg flex flex-col items-center">
              <span class="material-symbols-outlined text-white text-xl"
                >trending_up</span
              >
              <span class="text-[9px] font-bold mt-1 text-white uppercase"
                >+3.2%</span
              >
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="flex-1">
              <div
                class="flex justify-between text-[10px] font-bold uppercase mb-2 opacity-70"
              >
                <span>{{ t('budgetConfidence') }}</span>
                <span>{{ budgetConfidence }}%</span>
              </div>
              <div class="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full bg-secondary-container transition-all duration-500"
                  :style="{ width: budgetConfidence + '%' }"
                ></div>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-bold opacity-50 uppercase block"
                >{{ t('costPerM2') }}</span
              >
              <span class="font-bold text-xl">{{
                formatCurrency(costPerM2)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Espacio Disponible Card -->
      <div
        class="bg-white rounded-xl border border-outline-variant/20 shadow-sm p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <h4
            class="font-headline font-bold text-primary text-sm uppercase tracking-wide"
          >
            {{ t('tokenBudget') }}
          </h4>
          <span
            v-if="descripcionEstado.message !== 'Espacio OK' && descripcionEstado.message !== 'Space OK'"
            class="text-[10px] font-bold px-2 py-1 rounded uppercase"
            :style="{
              backgroundColor: descripcionEstado.color + '20',
              color: descripcionEstado.color,
            }"
          >
            {{ descripcionEstado.message }}
          </span>
        </div>
        <div class="flex justify-between items-end">
          <div>
            <span class="text-xs text-slate-500 uppercase font-bold"
              >{{ t('available') }}</span
            >
            <div
              class="text-3xl font-headline font-black flex items-end gap-1"
              :style="{ color: descripcionEstado.color }"
            >
              <span>{{ tokensDisponibles * 10 }}</span>
              <span class="text-base font-semibold mb-1 opacity-70">m²</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-500 uppercase font-bold">{{ t('used') }}</span>
            <div class="text-2xl font-headline font-bold text-slate-600">
              {{ tokensUsados * 10 }} <span class="text-sm font-medium">m²</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-500 uppercase font-bold"
              >{{ t('total') }}</span
            >
            <div class="text-2xl font-headline font-bold text-slate-600">
              {{ tokensTotales * 10 }} <span class="text-sm font-medium">m²</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Breakdown Summary -->
      <div
        class="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden"
      >
        <div
          class="p-6 border-b border-surface-container-highest flex justify-between items-center"
        >
          <h4
            class="font-headline font-bold text-primary text-sm uppercase tracking-wide"
          >
            {{ t('materialIntelligence') }}
          </h4>
          <span
            class="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-2 py-1 rounded font-bold uppercase"
            >{{ t('liveProjection') }}</span
          >
        </div>
        <div class="p-2">
          <div
            v-for="material in materials"
            :key="material.nameEN"
            class="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors rounded-xl"
          >
            <div
              class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-slate-400">{{
                material.icon
              }}</span>
            </div>
            <div class="flex-1">
              <span class="text-sm font-bold block">{{ currentLanguage === 'es' ? material.nameES : material.nameEN }}</span>
              <span class="text-[11px] text-slate-500">{{
                currentLanguage === 'es' ? material.amountES : material.amountEN
              }}</span>
            </div>
            <div class="text-right">
              <span class="font-headline font-bold text-primary block"
                >{{ formatCurrency(material.cost) }}</span
              >
              <span
                :class="[
                  'text-[10px] font-bold uppercase',
                  material.statusColor,
                ]"
                >{{ currentLanguage === 'es' ? material.statusES : material.statusEN }}</span
              >
            </div>
          </div>
        </div>
        <div class="p-6 bg-surface-container-low/50">
          <button
            class="w-full bg-white border-2 border-primary text-primary py-4 rounded-xl font-headline font-extrabold text-sm uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
          >
            {{ t('exportCSV') }}
          </button>
        </div>
      </div>

    </div>
  </section>
</template>
