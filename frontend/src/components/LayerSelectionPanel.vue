<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from '../composables/useI18n';
import { useConstructionLayersStore } from '../stores/constructionLayers';

const { t } = useI18n();
const layersStore = useConstructionLayersStore();

const {
  constructionModeEnabled,
  layerVisibility,
  activeLayerCount,
  selectedLayerId,
} = storeToRefs(layersStore);

const layers = computed(() => layersStore.layers);

const constructionEnabled = computed({
  get: () => constructionModeEnabled.value,
  set: (value) => layersStore.setConstructionMode(value),
});

const layerSummary = computed(() => {
  const count = activeLayerCount.value;

  return count === layers.value.length
    ? t('allLayersVisible')
    : t('layersVisible', { count });
});
</script>

<template>
  <section
    class="animate-fade-in overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
  >
    <!-- Header -->
    <header
      class="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 dark:border-slate-800/80 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[23px]">
            layers
          </span>
        </div>

        <div>
          <span
            class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t('stepLayers') }}
          </span>

          <h3
            class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
          >
            {{ t('layerSelection') }}
          </h3>

          <p class="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {{ t('layerSelectionHelp') }}
          </p>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40"></span>
          {{ layerSummary }}
        </span>

        <button
          type="button"
          class="group inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
          @click="layersStore.toggleConstructionMode"
        >
          <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {{ t('constructionMode') }}
          </span>

          <span
            class="relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-300"
            :class="
              constructionEnabled
                ? 'border-orange-400 bg-orange-500 shadow-sm shadow-orange-500/20'
                : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
            "
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300"
              :class="constructionEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </span>
        </button>
      </div>
    </header>

    <!-- Layers grid -->
    <div class="p-5">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label
          v-for="layer in layers"
          :key="layer.id"
          class="group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99]"
          :class="
            selectedLayerId === layer.id
              ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20 dark:shadow-black/20'
              : layerVisibility[layer.id]
                ? 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
                : 'border-slate-200 bg-slate-50/70 opacity-75 hover:opacity-100 dark:border-slate-800 dark:bg-slate-900/40'
          "
        >
          <input
            :checked="layerVisibility[layer.id]"
            type="checkbox"
            class="sr-only"
            @change="layersStore.toggleLayer(layer.id)"
          />

          <!-- Selected top line -->
          <div
            v-if="selectedLayerId === layer.id"
            class="absolute inset-x-0 top-0 h-px bg-orange-400 dark:bg-orange-700"
          ></div>

          <div class="flex items-start justify-between gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-200"
              :class="
                layerVisibility[layer.id]
                  ? selectedLayerId === layer.id
                    ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600'
              "
            >
              <span class="material-symbols-outlined text-[19px]">
                {{ layer.icon }}
              </span>
            </span>

            <span
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300"
              :class="
                layerVisibility[layer.id]
                  ? 'border-emerald-400 bg-emerald-500 shadow-sm shadow-emerald-500/20'
                  : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
              "
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300"
                :class="layerVisibility[layer.id] ? 'translate-x-6' : 'translate-x-1'"
              />
            </span>
          </div>

          <div class="mt-4">
            <span
              class="block text-sm font-black tracking-tight transition-colors duration-200"
              :class="
                layerVisibility[layer.id]
                  ? 'text-slate-950 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-500'
              "
            >
              {{ t(layer.labelKey) }}
            </span>

            <span
              class="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold"
              :class="
                layerVisibility[layer.id]
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : 'text-slate-400 dark:text-slate-500'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="
                  layerVisibility[layer.id]
                    ? 'bg-emerald-500'
                    : 'bg-slate-300 dark:bg-slate-600'
                "
              ></span>
              {{ layerVisibility[layer.id] ? t('layerVisible') : t('layerHidden') }}
            </span>
          </div>
        </label>
      </div>
    </div>
  </section>
</template>