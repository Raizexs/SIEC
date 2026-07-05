<script setup>
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { useIsCompactStepper } from '../../composables/useViewport';
import { Check, Map, PenTool, Receipt, FileOutput } from 'lucide-vue-next';

const props = defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: String, required: true },
  suggestedStep: { type: String, default: '' },
});

const emit = defineEmits(['go']);

const { t } = useI18n();
const isCompactStepper = useIsCompactStepper();

const stepIndex = (id) => props.steps.findIndex((s) => s.id === id);
const isComplete = (id) => stepIndex(id) < stepIndex(props.currentStep);
const isActive = (id) => id === props.currentStep;
const isPending = (id) => stepIndex(id) > stepIndex(props.currentStep);

const activeStepMeta = computed(
  () => props.steps.find((s) => s.id === props.currentStep) || props.steps[0],
);

const activeStepIndex = computed(() => Math.max(0, stepIndex(props.currentStep)));

const indicatorStyle = computed(() => {
  const idx = activeStepIndex.value;

  if (isCompactStepper.value) {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    return {
      width: 'calc(50% - 4px)',
      height: 'calc(50% - 4px)',
      top: '4px',
      bottom: 'auto',
      transform: `translate(calc(${col * 100}% + 2px), calc(${row * 100}% + 2px))`,
    };
  }

  const count = Math.max(props.steps.length, 1);
  const widthPct = 100 / count;
  return {
    width: `calc(${widthPct}% - 4px)`,
    height: 'auto',
    top: '4px',
    bottom: '4px',
    transform: `translateX(calc(${idx * 100}% + 2px))`,
  };
});

const indicatorToneClass = computed(() => {
  const map = {
    sky: 'bg-sky-600 shadow-sky-600/30 ring-sky-400/25',
    amber: 'bg-amber-600 shadow-amber-600/30 ring-amber-400/25',
    emerald: 'bg-emerald-600 shadow-emerald-600/30 ring-emerald-400/25',
    violet: 'bg-violet-600 shadow-violet-600/30 ring-violet-400/25',
  };
  return map[activeStepMeta.value?.tone] || map.sky;
});

const iconMap = {
  terrain: Map,
  design: PenTool,
  budget: Receipt,
  export: FileOutput,
};

const toneAccent = {
  sky: {
    complete: 'text-sky-700 dark:text-sky-300',
    idle: 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
  },
  amber: {
    complete: 'text-amber-800 dark:text-amber-200',
    idle: 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
  },
  emerald: {
    complete: 'text-emerald-800 dark:text-emerald-200',
    idle: 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
  },
  violet: {
    complete: 'text-violet-800 dark:text-violet-200',
    idle: 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100',
  },
};

const tone = (step) => toneAccent[step.tone] || toneAccent.sky;

const stepClass = (step) => {
  if (isActive(step.id)) return 'text-white';
  if (isComplete(step.id)) return tone(step).complete;
  if (isPending(step.id)) return 'text-slate-400 dark:text-slate-500';
  return tone(step).idle;
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
      <div
        aria-hidden="true"
        class="pointer-events-none absolute left-1 rounded-xl shadow-md ring-1 transition-[transform,width,height,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        :class="indicatorToneClass"
        :style="indicatorStyle"
      />
      <div class="relative grid grid-cols-3 gap-1">
        <button
          v-for="step in steps"
          :key="step.id"
          type="button"
          data-motion-hover="step"
          class="relative z-[1] flex min-w-0 items-center justify-center gap-2 rounded-xl px-2.5 py-2.5 text-center transition-[color,opacity] duration-300 sm:justify-start sm:px-3 sm:py-3"
          :class="stepClass(step)"
          @click="emit('go', step.id)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors duration-300"
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
