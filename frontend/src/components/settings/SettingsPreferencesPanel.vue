<script setup>
import { ref, computed, inject } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { PREFERENCES_DRAFT_KEY } from '../../composables/usePreferencesDraft';
import { useBilling } from '../../composables/useBilling';
import {
  Sparkles,
  ChevronDown,
  LayoutGrid,
  Tags,
  Map,
  Box,
  Columns2,
  Coins,
  CheckCircle2,
  Lock,
} from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();
const draftCtx = inject(PREFERENCES_DRAFT_KEY);
const { canUseMaterial } = useBilling();

if (!draftCtx) {
  throw new Error('SettingsPreferencesPanel requires preferences draft context');
}

const { draft: productPreferences, motionDraft: motionPref } = draftCtx;

const openSections = ref({
  experience: true,
  editor: false,
  estimation: false,
});

const toggleSection = (section) => {
  openSections.value[section] = !openSections.value[section];
};

const materialOptions = computed(() => {
  void currentLanguage.value;
  return [
    { id: 1, label: t('settingsMaterialWood') },
    { id: 2, label: t('settingsMaterialSteel') },
    { id: 3, label: t('settingsMaterialMasonry') },
    { id: 4, label: t('settingsMaterialConcrete') },
  ];
});

const selectMaterial = (id) => {
  if (!canUseMaterial(id)) return;
  productPreferences.value.defaultMaterial = id;
};

const motionOptions = computed(() => {
  void currentLanguage.value;
  return [
    {
      id: 'system',
      title: t('settingsMotionSystem'),
      description: t('settingsMotionSystemDesc'),
      tone: 'slate',
    },
    {
      id: 'full',
      title: t('settingsMotionFull'),
      description: t('settingsMotionFullDesc'),
      tone: 'orange',
    },
    {
      id: 'reduced',
      title: t('settingsMotionReduced'),
      description: t('settingsMotionReducedDesc'),
      tone: 'muted',
    },
  ];
});

const preferenceSummary = computed(() => {
  void currentLanguage.value;
  const gridLabel = productPreferences.value.editor.showGrid
    ? t('settingsPrefGridOn')
    : t('settingsPrefGridOff');

  return {
    experience:
      motionPref.value === 'full'
        ? t('settingsMotionFullSummary')
        : motionPref.value === 'reduced'
          ? t('settingsMotionReducedSummary')
          : t('settingsMotionSystemSummary'),

    editor: `${gridLabel} · ${t('settingsPrefView', {
      view: productPreferences.value.editor.initialView,
    })}`,

    estimation: `${t('settingsPrefContingency', {
      pct: productPreferences.value.contingency,
    })} · ${
      productPreferences.value.includeTax
        ? t('settingsPrefWithTax')
        : t('settingsPrefNoTax')
    } · ${
      materialOptions.value.find((m) => m.id === productPreferences.value.defaultMaterial)
        ?.label ?? 'Material'
    } · ${productPreferences.value.defaultRoomHeight}m`,
  };
});

const applyPresetRoomHeight = (m) => {
  productPreferences.value.useCustomRoomHeight = false;
  productPreferences.value.defaultRoomHeight = m;
};
</script>

<template>
  <div class="space-y-4">
    <!-- Experience -->
    <section
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <button
        type="button"
        class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
        :aria-expanded="openSections.experience"
        @click="toggleSection('experience')"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <Sparkles class="h-5 w-5" :stroke-width="2.2" />
        </div>
        <div class="min-w-0 flex-1">
          <p
            class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t('settingsExperience') }}
          </p>
          <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('settingsAnimation') }}
          </h3>
          <p
            class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
            :title="preferenceSummary.experience"
          >
            {{ preferenceSummary.experience }}
          </p>
        </div>
        <ChevronDown
          class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
          :class="{ 'rotate-180': openSections.experience }"
          :stroke-width="2.2"
        />
      </button>

      <Transition name="pref-accordion">
        <div v-show="openSections.experience">
          <fieldset class="space-y-3 p-5">
            <legend class="sr-only">
              {{ t('settingsAnimationLegend') }}
            </legend>

            <label
              v-for="option in motionOptions"
              :key="option.id"
              class="group flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition-all duration-200 active:scale-[0.99]"
              :class="
                motionPref === option.id
                  ? option.id === 'full'
                    ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20'
                    : 'border-slate-300 bg-slate-50 shadow-md shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/70'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700'
              "
            >
              <input
                v-model="motionPref"
                type="radio"
                :value="option.id"
                class="mt-1 h-4 w-4 accent-orange-500"
              />

              <div class="min-w-0 flex-1">
                <span class="text-sm font-black text-slate-950 dark:text-slate-100">
                  {{ option.title }}
                </span>

                <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {{ option.description }}
                </p>
              </div>

              <CheckCircle2
                v-if="motionPref === option.id"
                class="h-5 w-5 shrink-0 text-orange-500 dark:text-orange-300"
                :stroke-width="2.4"
              />
            </label>
          </fieldset>
        </div>
      </Transition>
    </section>

    <!-- Editor 2D/3D -->
    <section
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <button
        type="button"
        class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
        :aria-expanded="openSections.editor"
        @click="toggleSection('editor')"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
        >
          <LayoutGrid class="h-5 w-5" :stroke-width="2.2" />
        </div>
        <div class="min-w-0 flex-1">
          <p
            class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t('settingsScene') }}
          </p>
          <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('settingsEditor') }}
          </h3>
          <p
            class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
            :title="preferenceSummary.editor"
          >
            {{ preferenceSummary.editor }}
          </p>
        </div>
        <ChevronDown
          class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
          :class="{ 'rotate-180': openSections.editor }"
          :stroke-width="2.2"
        />
      </button>

      <Transition name="pref-accordion">
        <div v-show="openSections.editor">
          <div class="space-y-5 p-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <div class="flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div>
                  <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {{ t('settingsGridVisible') }}
                  </p>
                  <p class="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {{ t('settingsGridHint') }}
                  </p>
                </div>
                <button
                  type="button"
                  class="relative h-8 w-14 rounded-full border transition-colors duration-200"
                  :class="
                    productPreferences.editor.showGrid
                      ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                      : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                  "
                  :aria-pressed="productPreferences.editor.showGrid"
                  @click="productPreferences.editor.showGrid = !productPreferences.editor.showGrid"
                >
                  <span
                    class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                    :class="productPreferences.editor.showGrid ? 'left-6' : 'left-0.5'"
                  />
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <div class="flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div class="flex items-center gap-2">
                  <Tags class="h-4 w-4 text-slate-400" :stroke-width="2.2" />
                  <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {{ t('settingsRoomLabels') }}
                  </p>
                </div>
                <button
                  type="button"
                  class="relative h-8 w-14 rounded-full border transition-colors duration-200"
                  :class="
                    productPreferences.editor.showLabels
                      ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                      : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                  "
                  :aria-pressed="productPreferences.editor.showLabels"
                  @click="productPreferences.editor.showLabels = !productPreferences.editor.showLabels"
                >
                  <span
                    class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                    :class="productPreferences.editor.showLabels ? 'left-6' : 'left-0.5'"
                  />
                </button>
              </div>

              <div class="flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div class="flex items-center gap-2">
                  <Map class="h-4 w-4 text-slate-400" :stroke-width="2.2" />
                  <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {{ t('settingsMinimap') }}
                  </p>
                </div>
                <button
                  type="button"
                  class="relative h-8 w-14 rounded-full border transition-colors duration-200"
                  :class="
                    productPreferences.editor.showMinimap
                      ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                      : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                  "
                  :aria-pressed="productPreferences.editor.showMinimap"
                  @click="productPreferences.editor.showMinimap = !productPreferences.editor.showMinimap"
                >
                  <span
                    class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                    :class="productPreferences.editor.showMinimap ? 'left-6' : 'left-0.5'"
                  />
                </button>
              </div>
            </div>

            <div>
              <p class="premium-label">{{ t('settingsInitialView') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in [
                    { id: '2d', label: '2D', icon: LayoutGrid },
                    { id: '3d', label: '3D', icon: Box },
                    { id: 'split', label: t('settingsViewSplit'), icon: Columns2 },
                  ]"
                  :key="opt.id"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    productPreferences.editor.initialView === opt.id
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="productPreferences.editor.initialView = opt.id"
                >
                  <component :is="opt.icon" class="h-3.5 w-3.5" :stroke-width="2.2" />
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div>
              <p class="premium-label">{{ t('settingsQuality3d') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="q in [
                    { id: 'low', label: t('settingsQualityLow') },
                    { id: 'medium', label: t('settingsQualityMedium') },
                    { id: 'high', label: t('settingsQualityHigh') },
                  ]"
                  :key="q.id"
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    productPreferences.editor.quality3d === q.id
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="productPreferences.editor.quality3d = q.id"
                >
                  {{ q.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Estimation criteria -->
    <section
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <button
        type="button"
        class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
        :aria-expanded="openSections.estimation"
        @click="toggleSection('estimation')"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <Coins class="h-5 w-5" :stroke-width="2.2" />
        </div>
        <div class="min-w-0 flex-1">
          <p
            class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t('settingsEstimation') }}
          </p>
          <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('settingsEstimationCriteria') }}
          </h3>
          <p
            class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
            :title="preferenceSummary.estimation"
          >
            {{ preferenceSummary.estimation }}
          </p>
        </div>
        <ChevronDown
          class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
          :class="{ 'rotate-180': openSections.estimation }"
          :stroke-width="2.2"
        />
      </button>

      <Transition name="pref-accordion">
        <div v-show="openSections.estimation">
          <div class="space-y-5 p-5">
            <div>
              <p class="premium-label">{{ t('settingsContingencyMargin') }}</p>
              <div class="flex flex-wrap gap-2" :aria-label="t('settingsContingencyMargin')">
                <button
                  v-for="pct in [0, 5, 10, 15]"
                  :key="pct"
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    productPreferences.contingency === pct
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="productPreferences.contingency = pct"
                >
                  {{ pct }}%
                </button>
              </div>
            </div>

            <div>
              <p class="premium-label">{{ t('settingsVatIncluded') }}</p>
              <div class="flex flex-wrap gap-2" :aria-label="t('settingsVatIncluded')">
                <button
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    productPreferences.includeTax
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="productPreferences.includeTax = true"
                >
                  {{ t('settingsYes') }}
                </button>
                <button
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    !productPreferences.includeTax
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="productPreferences.includeTax = false"
                >
                  {{ t('settingsNo') }}
                </button>
              </div>
            </div>

            <div>
              <p class="premium-label">{{ t('settingsMaterialDefault') }}</p>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  v-for="m in materialOptions"
                  :key="m.id"
                  type="button"
                  class="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-black uppercase tracking-[0.08em] transition-all duration-200 active:scale-[0.99]"
                  :class="
                    !canUseMaterial(m.id)
                      ? 'cursor-not-allowed border-slate-200/80 bg-slate-50/80 text-slate-400 opacity-80 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-500'
                      : productPreferences.defaultMaterial === m.id
                        ? 'border-orange-400 bg-orange-50 text-orange-800 shadow-sm dark:border-orange-400/60 dark:bg-orange-950/30 dark:text-orange-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  :disabled="!canUseMaterial(m.id)"
                  :aria-disabled="!canUseMaterial(m.id)"
                  @click="selectMaterial(m.id)"
                >
                  <span class="flex items-center gap-2">
                    <Lock
                      v-if="!canUseMaterial(m.id)"
                      class="h-3.5 w-3.5 shrink-0"
                      :stroke-width="2.2"
                    />
                    {{ m.label }}
                  </span>
                  <CheckCircle2
                    v-if="productPreferences.defaultMaterial === m.id && canUseMaterial(m.id)"
                    class="h-4 w-4 shrink-0 text-orange-500 dark:text-orange-300"
                    :stroke-width="2.2"
                  />
                </button>
              </div>
              <p
                v-if="materialOptions.some((m) => !canUseMaterial(m.id))"
                class="mt-2 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500"
              >
                {{ t('planMaterialLocked') }}
              </p>
            </div>

            <div>
              <p class="premium-label">{{ t('settingsRoomHeight') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="h in [2.4, 2.6, 2.8]"
                  :key="h"
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    !productPreferences.useCustomRoomHeight && productPreferences.defaultRoomHeight === h
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="applyPresetRoomHeight(h)"
                >
                  {{ h }}m
                </button>
                <button
                  type="button"
                  class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                  :class="
                    productPreferences.useCustomRoomHeight
                      ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  "
                  @click="productPreferences.useCustomRoomHeight = true"
                >
                  {{ t('settingsCustomHeight') }}
                </button>
              </div>
              <div v-if="productPreferences.useCustomRoomHeight" class="mt-3 max-w-xs">
                <label class="premium-label">{{ t('settingsHeightM') }}</label>
                <input
                  v-model.number="productPreferences.defaultRoomHeight"
                  type="number"
                  min="2.2"
                  max="5"
                  step="0.05"
                  class="premium-input"
                />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </section>
  </div>
</template>

<style scoped>
.premium-label {
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .premium-label {
  color: rgb(148 163 184);
}

.premium-input {
  height: 3rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding-left: 1rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(15 23 42);
  outline: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.premium-input:focus {
  border-color: rgb(251 146 60);
  background: white;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.dark .premium-input {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
  color: rgb(241 245 249);
}

.dark .premium-input:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

.settings-alert-enter-active,
.settings-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.settings-alert-enter-from,
.settings-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.pref-accordion-enter-active,
.pref-accordion-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.pref-accordion-enter-from,
.pref-accordion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
