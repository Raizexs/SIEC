<script setup>
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';
import {
  TrendingUp,
  Building2,
  Gauge,
  SquareStack,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();

const props = defineProps({
  formData: { type: Object, required: true },
  tokensUsados: { type: Number, required: true },
  tokensTotales: { type: Number, required: true },
  tokensDisponibles: { type: Number, required: true },
  descripcionEstado: { type: Object, required: true },
  totalAreaUsado: { type: Number, default: 0 },
});

const m2Disponible = computed(() =>
  Math.max(0, (props.formData.m2Totales || 0) - props.totalAreaUsado),
);

const usagePct = computed(() =>
  props.formData.m2Totales > 0
    ? Math.min((props.totalAreaUsado / props.formData.m2Totales) * 100, 100)
    : 0,
);

const materialNames = {
  es: {
    1: 'Estructura de madera',
    2: 'Acero galvanizado',
    3: 'Mampostería',
    4: 'Hormigón armado',
  },
  en: {
    1: 'Wood frame',
    2: 'Galvanized steel',
    3: 'Masonry',
    4: 'Concrete',
  },
};

const getMaterialName = (id) =>
  (currentLanguage.value === 'es' ? materialNames.es : materialNames.en)[id] ||
  'Material no definido';

const COST_PER_M2 = {
  1: 850000,
  2: 1100000,
  3: 950000,
  4: 1200000,
};

const estimatedCost = computed(() =>
  (props.formData.m2Totales || 0) *
  (COST_PER_M2[props.formData.materialEstructuralId] || COST_PER_M2[4]),
);

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  
const cleanStatusLabel = (value, fallback) => {
  const raw = value || fallback;

  return String(raw)
    .replace(/^[\s✅✔️☑️⚠️❌🚨🟢🟡🔴]+/gu, '')
    .trim();
};

const stateMeta = computed(() => {
  switch (props.descripcionEstado.status) {
    case 'safe':
      return {
        label: cleanStatusLabel(props.descripcionEstado.message, 'Dentro del rango'),
        icon: CheckCircle2,
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-900/70',
        bg: 'bg-emerald-50 dark:bg-emerald-950/25',
        bar: 'bg-emerald-500',
        softText: 'text-emerald-700 dark:text-emerald-300',
      };

    case 'warning':
      return {
        label: cleanStatusLabel(props.descripcionEstado.message, 'Revisión recomendada'),
        icon: AlertTriangle,
        dot: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-900/70',
        bg: 'bg-amber-50 dark:bg-amber-950/25',
        bar: 'bg-amber-500',
        softText: 'text-amber-700 dark:text-amber-300',
      };

    case 'danger':
      return {
        label: cleanStatusLabel(props.descripcionEstado.message, 'Límite excedido'),
        icon: AlertTriangle,
        dot: 'bg-orange-500',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-900/70',
        bg: 'bg-orange-50 dark:bg-orange-950/25',
        bar: 'bg-orange-500',
        softText: 'text-orange-700 dark:text-orange-300',
      };

    default:
      return {
        label: cleanStatusLabel(props.descripcionEstado.message, 'Sin estado'),
        icon: Gauge,
        dot: 'bg-slate-400',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-800',
        bg: 'bg-slate-50 dark:bg-slate-900',
        bar: 'bg-slate-500',
        softText: 'text-slate-500 dark:text-slate-400',
      };
  }
});

const StateIcon = computed(() => stateMeta.value.icon);
</script>

<template>
  <section class="col-span-12 animate-fade-in lg:col-span-5">
    <div class="sticky top-24 space-y-4">
      <!-- Step header -->
      <header
        class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-slate-100"></span>
              {{ t('step02') || 'Paso 02' }}
            </span>

            <h3 class="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-slate-100">
              Presupuesto espacial
            </h3>

            <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Espacio disponible y costo estimado en tiempo real.
            </p>
          </div>

          <div
            class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex"
          >
            <Gauge class="h-5 w-5" :stroke-width="2" />
          </div>
        </div>
      </header>

      <!-- Spatial budget card -->
      <article
        class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
      >
        <header
          class="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
        >
          <div>
            <p
              class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              <span class="h-2 w-2 rounded-full" :class="stateMeta.dot"></span>
              {{ t('tokenBudget') }}
            </p>

            <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Uso del terreno respecto al diseño actual.
            </p>
          </div>

          <span
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight"
            :class="[stateMeta.border, stateMeta.bg, stateMeta.softText]"
          >
            <component :is="StateIcon" class="h-3.5 w-3.5" :stroke-width="2.5" />
            {{ stateMeta.label }}
          </span>
        </header>

        <div class="space-y-5 p-5">
          <!-- Hero metric -->
          <section
            class="relative overflow-hidden rounded-3xl border p-5 shadow-sm"
            :class="[stateMeta.border, stateMeta.bg]"
          >
            <div
              class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/45 blur-3xl dark:bg-white/5"
            ></div>

            <div class="relative z-10">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {{ t('available') }}
              </p>

              <p
                class="mt-2 flex items-baseline gap-2 font-mono text-5xl font-black leading-none tracking-tight tabular-nums"
                :class="stateMeta.text"
              >
                {{ m2Disponible.toFixed(1) }}
                <span class="text-lg font-black opacity-70">
                  m²
                </span>
              </p>

              <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Disponible después de restar el área total usada por los recintos.
              </p>
            </div>
          </section>

          <!-- Used / Total metrics -->
          <section class="grid grid-cols-2 gap-3">
            <div
              class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <p
                class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
              >
                <SquareStack class="h-3.5 w-3.5" :stroke-width="2.2" />
                {{ t('used') }}
              </p>

              <p class="mt-2 font-mono text-xl font-black tabular-nums text-slate-950 dark:text-slate-100">
                {{ totalAreaUsado.toFixed(1) }}
                <span class="text-xs font-bold text-slate-400 dark:text-slate-500">
                  m²
                </span>
              </p>
            </div>

            <div
              class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <p
                class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
              >
                <Building2 class="h-3.5 w-3.5" :stroke-width="2.2" />
                {{ t('total') }}
              </p>

              <p class="mt-2 font-mono text-xl font-black tabular-nums text-slate-950 dark:text-slate-100">
                {{ (formData.m2Totales || 0).toFixed(1) }}
                <span class="text-xs font-bold text-slate-400 dark:text-slate-500">
                  m²
                </span>
              </p>
            </div>
          </section>

          <!-- Usage bar -->
          <section>
            <div
              class="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
            >
              <span>Ocupación</span>
              <span class="font-mono tabular-nums">{{ usagePct.toFixed(0) }}%</span>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-slate-800">
              <div
                class="h-full rounded-full transition-all duration-300 ease-out"
                :class="stateMeta.bar"
                :style="{ width: `${usagePct}%` }"
              ></div>
            </div>
          </section>
        </div>
      </article>

      <!-- Cost estimate card -->
      <article
        class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
      >
        <div
          class="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
        ></div>

        <div class="relative z-10 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p
                class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
              >
                <TrendingUp class="h-3.5 w-3.5 text-orange-500 dark:text-orange-300" :stroke-width="2.2" />
                Costo estimado
              </p>

              <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Valor referencial según m² y materialidad.
              </p>
            </div>

            <span
              class="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              CLP
            </span>
          </div>

          <p class="font-mono text-3xl font-black tracking-tight text-orange-700 dark:text-orange-300">
            {{ formatCurrency(estimatedCost) }}
          </p>

          <div
            class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <Building2 class="h-4 w-4 text-slate-400 dark:text-slate-500" :stroke-width="2" />

            <span class="truncate text-xs font-bold text-slate-600 dark:text-slate-300">
              {{ getMaterialName(formData.materialEstructuralId) }}
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>