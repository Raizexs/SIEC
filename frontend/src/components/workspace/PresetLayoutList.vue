<script setup>
import { computed } from 'vue';
import { useLayoutManager } from '../../composables/useLayoutManager';
import { useI18n } from '../../composables/useI18n';
import { generateLayoutThumbnail } from '../../utils/thumbnailGenerator';
import { formatFloorCountLabel } from '../../utils/floorLabels';
import { LayoutTemplate } from 'lucide-vue-next';

const props = defineProps({
  showHeading: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(['apply-preset']);

const { t, currentLanguage } = useI18n();
const { presets, createPresetLayout } = useLayoutManager();

const presetCards = computed(() =>
  presets.value.map((preset) => {
    const layout = createPresetLayout(preset);
    const floorCount = preset.floors || 1;

    return {
      preset,
      thumbnail: generateLayoutThumbnail(layout.recintos),
      label: currentLanguage.value === 'en' ? preset.nameEn : preset.name,
      floorsLabel: formatFloorCountLabel(floorCount, t),
    };
  }),
);

const applyPreset = (preset) => {
  const layout = createPresetLayout(preset);
  emit('apply-preset', layout);
};
</script>

<template>
  <section class="tour-sidebar-presets">
    <div v-if="showHeading" class="mb-2 flex items-center justify-between px-1">
      <h3
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
      >
        <LayoutTemplate class="h-3 w-3" :stroke-width="2.2" />
        {{ t('presetLayouts') }}
      </h3>
    </div>

    <div :class="compact ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'space-y-1.5'">
      <button
        v-for="card in presetCards"
        :key="card.preset.id"
        type="button"
        data-motion="card"
        class="group w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white/80 text-left transition hover:border-orange-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-orange-900/50"
        @click="applyPreset(card.preset)"
      >
        <div class="relative aspect-[16/10] overflow-hidden bg-slate-950">
          <img
            :src="card.thumbnail"
            :alt="card.label"
            draggable="false"
            class="pointer-events-none h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
          <span
            class="absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white"
          >
            {{ card.floorsLabel }}
          </span>
        </div>
        <div class="px-2.5 py-2">
          <span class="block truncate text-[11px] font-bold text-slate-900 dark:text-slate-100">
            {{ card.label }}
          </span>
          <span class="mt-0.5 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {{ card.preset.m2Totales }} m²
          </span>
        </div>
      </button>
    </div>
  </section>
</template>
