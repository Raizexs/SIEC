<script setup>
import { useI18n } from '../../composables/useI18n';
import { Check, Map, PenTool, Receipt, FileOutput } from 'lucide-vue-next';

const props = defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: String, required: true },
  suggestedStep: { type: String, default: '' },
});

const emit = defineEmits(['go']);

const { t } = useI18n();

const stepIndex = (id) => props.steps.findIndex((s) => s.id === id);
const isComplete = (id) => stepIndex(id) < stepIndex(props.currentStep);
const isActive = (id) => id === props.currentStep;
const isPending = (id) => stepIndex(id) > stepIndex(props.currentStep);

const iconMap = {
  terrain: Map,
  design: PenTool,
  budget: Receipt,
  export: FileOutput,
};

const toneAccent = {
  sky: {
    active:
      'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400/30',
    complete: 'text-sky-700 dark:text-sky-300',
    idle: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50',
  },
  amber: {
    active:
      'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400/30',
    complete: 'text-amber-800 dark:text-amber-200',
    idle: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50',
  },
  emerald: {
    active:
      'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/30',
    complete: 'text-emerald-800 dark:text-emerald-200',
    idle: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50',
  },
  violet: {
    active:
      'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400/30',
    complete: 'text-violet-800 dark:text-violet-200',
    idle: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50',
  },
};

const tone = (step) => toneAccent[step.tone] || toneAccent.sky;

const stepClass = (step) => {
  const a = tone(step);
  if (isActive(step.id)) return a.active;
  if (isComplete(step.id)) return a.complete;
  if (isPending(step.id)) return 'text-slate-400 dark:text-slate-500';
  return a.idle;
};

const iconWrapClass = (step) => {
  if (isActive(step.id)) return 'bg-white/20 text-white';
  if (isComplete(step.id)) return `bg-slate-100 ${tone(step).complete} dark:bg-slate-800`;
  if (isPending(step.id)) return 'bg-slate-100 text-slate-400 dark:bg-slate-800/90 dark:text-slate-500';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800/90 dark:text-slate-400';
};

const StepIcon = (step) => iconMap[step.icon] || Map;

</script>

<template>
  <nav class="tour-workspace-stepper mb-5" aria-label="Flujo del proyecto">
    <div
      class="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-1 shadow-md shadow-slate-950/[0.06] backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/25"
    >
      <div class="grid grid-cols-2 gap-1 sm:grid-cols-3">
        <button
          v-for="step in steps"
          :key="step.id"
          type="button"
          class="relative flex min-w-0 items-center justify-center gap-2 rounded-xl px-2.5 py-2.5 text-center transition-all duration-200 sm:justify-start sm:px-3 sm:py-3"
          :class="stepClass(step)"
          @click="emit('go', step.id)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
            :class="iconWrapClass(step)"
          >
            <Check v-if="isComplete(step.id)" class="h-3.5 w-3.5" :stroke-width="3" />
            <component
              :is="StepIcon(step)"
              v-else-if="isActive(step.id)"
              class="h-3.5 w-3.5"
              :stroke-width="2.4"
            />
            <span v-else class="font-mono text-[10px] tabular-nums">{{ step.order }}</span>
          </span>

          <span class="hidden truncate text-xs font-semibold leading-none tracking-tight sm:inline">
            {{ t(step.labelKey) }}
          </span>
        </button>
      </div>
    </div>
  </nav>
</template>
