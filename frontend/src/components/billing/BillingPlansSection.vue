<script setup>
import { computed, onMounted, ref } from 'vue';
import { useBilling } from '../../composables/useBilling';
import { useI18n } from '../../composables/useI18n';
import { bindCardHover } from '../../composables/useMotionContext';
import { Check, Sparkles } from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();
const {
  plan,
  limits,
  usage,
  pricing,
  loading,
  billingState,
  fetchBilling,
  startCheckout,
} = useBilling();

onMounted(() => {
  fetchBilling(true);
  bindPlanHover();
});

const motionRoot = ref(null);
let unbindPlanHover = null;

const bindPlanHover = () => {
  unbindPlanHover?.();
  if (!motionRoot.value) return;
  unbindPlanHover = bindCardHover(
    motionRoot.value.querySelectorAll('[data-motion="card"]'),
    { lift: -5 },
  );
};

const plans = computed(() => {
  void currentLanguage.value;
  return [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: [
      '1 proyecto activo · 1 guardado',
      '2 exportaciones / mes',
      'Solo Madera',
      'PDF con marca de agua',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: `$${(pricing.value?.pro_clp_month ?? 4990).toLocaleString('es-CL')}`,
    oneTime: true,
    features: [
      '5 proyectos activos · 10 guardados',
      '20 exportaciones / mes',
      'Madera + Metalcom',
      'PDF sin marca · Propuesta comercial',
    ],
    cta: true,
    target: 'pro',
  },
  {
    id: 'pro_plus',
    name: 'Pro+',
    price: `$${(pricing.value?.pro_plus_clp_month ?? 9990).toLocaleString('es-CL')}`,
    oneTime: true,
    features: [
      'Proyectos y exportaciones ilimitados',
      'Las 4 materialidades',
      'Branding en PDF',
      'Capas 3D y walkthrough',
      t('billingProPlusMarketplace'),
    ],
    cta: true,
    target: 'pro_plus',
    highlight: true,
  },
];
});

const usageSummary = computed(() => {
  const active = usage.value.active_projects ?? 0;
  const activeMax =
    limits.value.max_active_projects != null ? ` / ${limits.value.max_active_projects}` : '';
  const exportsCount = usage.value.exports_this_month ?? 0;
  const exportsMax =
    limits.value.max_exports_per_month != null
      ? ` / ${limits.value.max_exports_per_month}`
      : '';

  return `Proyectos activos: ${active}${activeMax} · Exportaciones este mes: ${exportsCount}${exportsMax}`;
});

const showUsageSkeleton = computed(() => loading.value && !billingState.value);
</script>

<template>
  <div ref="motionRoot" class="space-y-6">
    <header data-motion="section">
      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {{ t('settingsTabPlan') }}
      </p>
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <h2 class="text-2xl font-black text-slate-950 dark:text-slate-50">
          Plan {{ plan === 'pro_plus' ? 'Pro+' : plan === 'pro' ? 'Pro' : 'Free' }}
        </h2>
        <span
          v-if="plan !== 'free'"
          class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800 shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {{ t('billingOneTime') }}
        </span>
      </div>
      <p
        v-if="showUsageSkeleton"
        class="mt-2 h-5 w-full max-w-md animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80"
        aria-hidden="true"
      />
      <p v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ usageSummary }}
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-3">
      <article
        v-for="p in plans"
        :key="p.id"
        data-motion="card"
        class="relative flex flex-col rounded-3xl border p-5 transition-shadow"
        :class="
          plan === p.id
            ? 'border-orange-400 bg-orange-50/50 shadow-lg shadow-orange-500/10 dark:border-orange-800 dark:bg-orange-950/20'
            : p.highlight
              ? 'border-slate-800 bg-slate-950 text-white dark:border-slate-600'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
        "
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-black">{{ p.name }}</h3>
            <span
              v-if="p.oneTime"
              class="inline-flex items-center rounded-lg border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200"
            >
              {{ t('billingOneTime') }}
            </span>
          </div>
          <Sparkles
            v-if="p.highlight"
            class="h-4 w-4 text-orange-400"
            :stroke-width="2"
          />
        </div>
        <p
          class="mt-2 text-2xl font-black tabular-nums"
          :class="p.highlight ? 'text-orange-300' : 'text-slate-900 dark:text-slate-100'"
        >
          {{ p.price }}
        </p>
        <ul class="mt-4 flex-1 space-y-2 text-sm">
          <li
            v-for="(f, i) in p.features"
            :key="i"
            class="flex items-start gap-2"
            :class="p.highlight ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'"
          >
            <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" :stroke-width="2.5" />
            {{ f }}
          </li>
        </ul>
        <button
          v-if="p.cta && plan !== p.id"
          type="button"
          class="mt-5 w-full rounded-2xl py-2.5 text-sm font-bold transition-colors"
          :class="
            p.highlight
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600'
          "
          @click="startCheckout(p.target)"
        >
          {{ t('planUpgradeCta') }}
        </button>
        <p
          v-else-if="plan === p.id"
          class="mt-5 text-center text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300"
        >
          Plan actual
        </p>
      </article>
    </div>
  </div>
</template>
