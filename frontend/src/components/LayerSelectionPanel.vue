<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../composables/useI18n";
import { useConstructionLayersStore } from "../stores/constructionLayers";

const { t } = useI18n();
const layersStore = useConstructionLayersStore();
const { constructionModeEnabled, layerVisibility, activeLayerCount } =
  storeToRefs(layersStore);
const layers = computed(() => layersStore.layers);

const constructionEnabled = computed({
  get: () => constructionModeEnabled.value,
  set: (value) => layersStore.setConstructionMode(value),
});

const layerSummary = computed(() => {
  const count = activeLayerCount.value;
  return count === layers.value.length
    ? t("allLayersVisible")
    : t("layersVisible", { count });
});
</script>

<template>
  <section
    class="glass-panel rounded-2xl border border-white/50 dark:border-[#30363d] shadow-sm p-6 space-y-5 animate-fade-in transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <span
          class="text-[11px] font-bold text-secondary uppercase tracking-[0.2em] block"
        >
          {{ t("stepLayers") }}
        </span>
        <h3
          class="text-2xl font-headline font-extrabold text-primary tracking-tight"
        >
          {{ t("layerSelection") }}
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-300">
          {{ t("layerSelectionHelp") }}
        </p>
      </div>

      <div class="flex flex-col items-end gap-2">
        <span
          class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-outline-variant/20 bg-white/70 dark:bg-[#161b22]/80 text-slate-600 dark:text-slate-300"
        >
          {{ layerSummary }}
        </span>

        <button
          type="button"
          class="inline-flex items-center gap-3 rounded-full border border-outline-variant/20 bg-white/80 dark:bg-[#161b22] px-4 py-2 text-sm font-bold text-on-surface transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
          @click="layersStore.toggleConstructionMode"
        >
          <span class="text-xs uppercase tracking-widest">{{
            t("constructionMode")
          }}</span>
          <span
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            :class="
              constructionEnabled
                ? 'bg-primary'
                : 'bg-slate-300 dark:bg-slate-600'
            "
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300"
              :class="constructionEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <label
        v-for="layer in layers"
        :key="layer.id"
        class="group relative flex items-start gap-3 rounded-xl border border-outline-variant/10 bg-white/60 dark:bg-[#161b22]/80 p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
        :class="
          layerVisibility[layer.id] ? 'ring-1 ring-primary/15' : 'opacity-75'
        "
      >
        <input
          :checked="layerVisibility[layer.id]"
          type="checkbox"
          class="sr-only"
          @change="layersStore.toggleLayer(layer.id)"
        />
        <span
          class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300"
          :class="
            layerVisibility[layer.id]
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
          "
        >
          <span class="material-symbols-outlined text-[18px]">
            {{ layer.icon }}
          </span>
        </span>

        <span class="flex-1 min-w-0">
          <span class="block text-sm font-bold text-on-surface">
            {{ t(layer.labelKey) }}
          </span>
          <span class="block text-[11px] text-slate-500 dark:text-slate-400">
            {{
              layerVisibility[layer.id] ? t("layerVisible") : t("layerHidden")
            }}
          </span>
        </span>

        <span
          class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-outline-variant/20 transition-colors duration-300"
          :class="
            layerVisibility[layer.id]
              ? 'bg-emerald-500/90 border-emerald-500/30'
              : 'bg-slate-300 dark:bg-slate-600'
          "
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300"
            :class="
              layerVisibility[layer.id] ? 'translate-x-6' : 'translate-x-1'
            "
          />
        </span>
      </label>
    </div>
  </section>
</template>
