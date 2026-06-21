<script setup>
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';
import {
  Building2,
  Gauge,
  SquareStack,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();

const props = defineProps({
  formData: { type: Object, required: true },
  descripcionEstado: { type: Object, required: true },
  /** Suma real de recintos en el plano (solo para libre y barra de ocupación). */
  areaRecintos: { type: Number, default: 0 },
});

const m2Proyecto = computed(() => Number(props.formData?.m2Totales) || 0);

const areaRecintos = computed(() => Number(props.areaRecintos) || 0);

const m2Disponible = computed(() =>
  Math.max(0, m2Proyecto.value - areaRecintos.value),
);

/** % de ocupación: suma de recintos sobre terreno del proyecto (0–100). */
const usagePct = computed(() => {
  const total = m2Proyecto.value;
  if (total <= 0) return 0;
  return Math.min(100, (areaRecintos.value / total) * 100);
});

const cleanStatusLabel = (value, fallback) => {
  const raw = value || fallback;

  return String(raw)
    .replace(/^[\s✅✔️☑️⚠️❌🚨🟢🟡🔴]+/gu, '')
    .trim();
};

const stateMeta = computed(() => {
  void currentLanguage.value;

  switch (props.descripcionEstado.status) {
    case 'safe':
      return {
        label: t('terrainStatusSafe'),
        icon: CheckCircle2,
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        bar: 'bg-emerald-500',
        softText: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-900/70',
        bg: 'bg-emerald-50 dark:bg-emerald-950/25',
      };

    case 'warning':
      return {
        label: t('terrainStatusWarning'),
        icon: AlertTriangle,
        dot: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        bar: 'bg-amber-500',
        softText: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-900/70',
        bg: 'bg-amber-50 dark:bg-amber-950/25',
      };

    case 'danger':
      return {
        label: t('terrainStatusDanger'),
        icon: AlertTriangle,
        dot: 'bg-orange-500',
        text: 'text-orange-700 dark:text-orange-300',
        bar: 'bg-orange-500',
        softText: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-900/70',
        bg: 'bg-orange-50 dark:bg-orange-950/25',
      };

    default:
      return {
        label: cleanStatusLabel(props.descripcionEstado.message, t('terrainStatusUnknown')),
        icon: Gauge,
        dot: 'bg-slate-400',
        text: 'text-slate-700 dark:text-slate-300',
        bar: 'bg-slate-500',
        softText: 'text-slate-500 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800',
        bg: 'bg-slate-50 dark:bg-slate-900',
      };
  }
});

const StateIcon = computed(() => stateMeta.value.icon);
</script>

<template>
  <section data-motion="card" class="col-span-12 lg:col-span-5">
    <div class="sticky top-24 space-y-4">
      <header
        class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-slate-100"></span>
              {{ t('step02') }}
            </span>

            <h3 class="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-slate-100">
              {{ t('spatialBudgetTitle') }}
            </h3>

            <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ t('metricsPanelSubtitle') }}
            </p>
          </div>

          <div
            class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex"
          >
            <Gauge class="h-5 w-5" :stroke-width="2" />
          </div>
        </div>
      </header>

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
              {{ t('terrainOccupancySubtitle') }}
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
          <section
            class="relative overflow-hidden rounded-3xl border p-5 shadow-sm"
            :class="[stateMeta.border, stateMeta.bg]"
          >
            <div
              class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/45 blur-3xl dark:bg-white/5"
            ></div>

            <div class="relative z-10">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {{ t('freeAreaLabel') }}
              </p>

              <p
                class="mt-2 flex items-baseline gap-2 font-mono text-5xl font-black leading-none tracking-tight tabular-nums"
                :class="stateMeta.text"
              >
                {{ m2Disponible.toFixed(1) }}
                <span class="text-lg font-black text-slate-400 dark:text-slate-500">
                  m²
                </span>
              </p>

              <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {{ t('metricsHeroHint') }}
              </p>
            </div>
          </section>

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
                {{ areaRecintos.toFixed(1) }}
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
                {{ m2Proyecto.toFixed(1) }}
                <span class="text-xs font-bold text-slate-400 dark:text-slate-500">
                  m²
                </span>
              </p>
            </div>
          </section>

          <section>
            <div
              class="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
            >
              <span>{{ t('occupancyLabel') }}</span>
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
    </div>
  </section>
</template>
