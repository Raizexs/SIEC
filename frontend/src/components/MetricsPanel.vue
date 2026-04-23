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
  totalAreaUsado: {
    type: Number,
    default: 0,
  },
});

const materialNamesES = {
  1: "Estructura de Madera",
  2: "Acero Galvanizado",
  3: "Mampostería",
  4: "Ferrocemento",
};

const materialNamesEN = {
  1: "Wood Frame",
  2: "Galvanized Steel",
  3: "Masonry",
  4: "Ferrocement",
};

const getMaterialName = (id) => {
  return currentLanguage.value === "es"
    ? materialNamesES[id]
    : materialNamesEN[id];
};

// Precios por m2 en pesos chilenos (CLP)
const MATERIAL_COST_PER_M2 = {
  1: 850000, // Wood Frame - $850,000 CLP/m2
  2: 1100000, // Steel Frame - $1,100,000 CLP/m2
  3: 950000, // Masonry - $950,000 CLP/m2
  4: 1200000, // Concrete - $1,200,000 CLP/m2
};

const estimatedCost = computed(() => {
  const costPerM2Val =
    MATERIAL_COST_PER_M2[props.formData.materialEstructuralId] ||
    MATERIAL_COST_PER_M2[4];
  return props.formData.m2Totales * costPerM2Val;
});

const costPerM2 = computed(() => {
  return (
    MATERIAL_COST_PER_M2[props.formData.materialEstructuralId] ||
    MATERIAL_COST_PER_M2[4]
  );
});

const budgetConfidence = computed(() => {
  // Confianza basada en tokens disponibles vs totales
  if (props.tokensTotales === 0) return 0;
  const percentage = (props.tokensDisponibles / props.tokensTotales) * 100;
  return Math.min(Math.max(Math.round(percentage), 0), 100);
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
      <!-- Espacio Disponible Card -->
      <div
        class="bg-white dark:bg-[#161b22] rounded-xl border border-outline-variant/20 dark:border-[#30363d] shadow-sm p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <h4
            class="font-headline font-bold text-primary text-sm uppercase tracking-wide"
          >
            {{ t("tokenBudget") }}
          </h4>
          <span
            v-if="
              descripcionEstado.status !== 'safe'
            "
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
            <span class="text-xs text-slate-500 uppercase font-bold">{{
              t("available")
            }}</span>
            <div
              class="text-3xl font-headline font-black flex items-end gap-1"
              :style="{ color: descripcionEstado.color }"
            >
              <span>{{ (tokensTotales * 10 - tokensUsados * 10).toFixed(1) }}</span>
              <span class="text-base font-semibold mb-1 opacity-70">m²</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-500 uppercase font-bold">{{
              t("used")
            }}</span>
            <div class="text-2xl font-headline font-bold text-slate-600">
              {{ (tokensUsados * 10).toFixed(1) }}
              <span class="text-sm font-medium">m²</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-500 uppercase font-bold">{{
              t("total")
            }}</span>
            <div class="text-2xl font-headline font-bold text-slate-600">
              {{ tokensTotales * 10 }}
              <span class="text-sm font-medium">m²</span>
            </div>
          </div>
        </div>
        <!-- Live usage bar -->
        <div
          class="mt-4 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        >
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width:
                (tokensTotales > 0
                  ? Math.min((tokensUsados / tokensTotales) * 100, 100)
                  : 0) + '%',
              backgroundColor: descripcionEstado.color,
            }"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>
