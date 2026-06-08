<script setup>
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';

const props = defineProps({
  formData: { type: Object, required: true },
  descripcionEstado: { type: Object, required: true },
  areaRecintos: { type: Number, default: 0 },
  expanded: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle-expand']);

const { t } = useI18n();

const m2Proyecto = computed(() => Number(props.formData?.m2Totales) || 0);
const m2Libre = computed(() => Math.max(0, m2Proyecto.value - props.areaRecintos));
const usagePct = computed(() => {
  if (m2Proyecto.value <= 0) return 0;
  return Math.min(100, (props.areaRecintos / m2Proyecto.value) * 100);
});

const statusColor = computed(() => {
  switch (props.descripcionEstado?.status) {
    case 'danger':
      return 'bg-red-500';
    case 'warning':
      return 'bg-amber-500';
    default:
      return 'bg-emerald-500';
  }
});
</script>

<template>
  <div
    class="tour-metrics-bar sticky top-0 z-20 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-950/90"
  >
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
        <span>
          <span class="text-slate-400 dark:text-slate-500">{{ t('metricsBarUsed') }}:</span>
          {{ areaRecintos.toFixed(1) }} m²
        </span>
        <span>
          <span class="text-slate-400 dark:text-slate-500">{{ t('metricsBarFree') }}:</span>
          {{ m2Libre.toFixed(1) }} m²
        </span>
      </div>

      <div class="flex items-center gap-2">
        <div class="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="statusColor"
            :style="{ width: `${usagePct}%` }"
          />
        </div>
        <span class="text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
          {{ usagePct.toFixed(0) }}%
        </span>
        <button
          type="button"
          class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          :aria-expanded="expanded"
          @click="emit('toggle-expand')"
        >
          <ChevronUp v-if="expanded" class="h-4 w-4" />
          <ChevronDown v-else class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
