<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { X, Compass } from 'lucide-vue-next';

const props = defineProps({
  currentStep: { type: String, required: true },
  dismissed: { type: Boolean, default: false },
});

const emit = defineEmits(['dismiss']);

const { t } = useI18n();
const visible = ref(!props.dismissed);

onMounted(() => {
  visible.value = !props.dismissed;
});

const stepHints = {
  configure: 'flowHintConfigure',
  design: 'flowHintDesign',
  budget: 'flowHintBudget',
  export: 'flowHintExport',
};

const hintText = computed(() => t(stepHints[props.currentStep] || 'flowHintConfigure'));

const toneBorder = computed(() => {
  switch (props.currentStep) {
    case 'design':
      return 'border-amber-200/90 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/20';
    case 'budget':
      return 'border-emerald-200/90 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/20';
    case 'export':
      return 'border-violet-200/90 bg-violet-50/90 dark:border-violet-900/50 dark:bg-violet-950/20';
    default:
      return 'border-sky-200/90 bg-sky-50/90 dark:border-sky-900/50 dark:bg-sky-950/20';
  }
});
</script>

<template>
  <aside
    v-if="visible"
    data-motion-hover="flow-guide"
    class="mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3"
    :class="toneBorder"
  >
    <Compass class="mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" :stroke-width="2.2" />
    <div class="min-w-0 flex-1">
      <p class="text-xs font-semibold text-slate-800 dark:text-slate-100">
        {{ t('flowGuideTitle') }}
      </p>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {{ hintText }}
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
      :aria-label="t('flowGuideDismiss')"
      @click="visible = false; emit('dismiss')"
    >
      <X class="h-4 w-4" />
    </button>
  </aside>
</template>
