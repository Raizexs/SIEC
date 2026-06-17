<script setup>

import { ref, computed, inject, nextTick } from 'vue';

import { useI18n } from '../../composables/useI18n';

import { PREFERENCES_DRAFT_KEY } from '../../composables/usePreferencesDraft';

import { useBilling } from '../../composables/useBilling';

import { getMotionTier, prefersReducedMotion } from '../../design/motionTokens';

import { introMotionReveal, SETTINGS_PANEL_REVEAL } from '../../composables/useMotionContext';

import {

  FileText,

  Info,

  ChevronDown,

  Lock,

} from 'lucide-vue-next';



const { t, currentLanguage } = useI18n();

const draftCtx = inject(PREFERENCES_DRAFT_KEY);

const { limits } = useBilling();



if (!draftCtx) {

  throw new Error('SettingsExportSection requires preferences draft context');

}



const { draft: productPreferences } = draftCtx;



const openExport = ref(false);
const panelRef = ref(null);

const motionEnabled = () => !prefersReducedMotion() && getMotionTier() !== 'off';

const refreshPanelHover = () => {
  window.dispatchEvent(new CustomEvent('siec:settings-hover-refresh'));
};

const toggleExport = async () => {
  openExport.value = !openExport.value;
  await nextTick();
  if (!openExport.value || !panelRef.value) return;
  if (motionEnabled()) {
    introMotionReveal(panelRef.value, SETTINGS_PANEL_REVEAL);
  }
  refreshPanelHover();
};



const canCustomBranding = computed(() => limits.value.custom_export_branding === true);



const exportToggleOptions = computed(() => {

  void currentLanguage.value;

  const options = [

    {

      key: 'includeMaterialsBreakdown',

      label: t('settingsMaterialsBreakdown'),

      sub: t('settingsMaterialsBreakdownSub'),

    },

    {

      key: 'includeUnitPrices',

      label: t('settingsUnitPrices'),

      sub: t('settingsUnitPricesSub'),

    },

    {

      key: 'includeSnapshots',

      label: t('settingsSnapshots'),

      sub: t('settingsSnapshotsSub'),

    },

    {

      key: 'includePrintReviewBlock',

      label: t('settingsPrintReviewBlock'),

      sub: t('settingsPrintReviewBlockSub'),

    },

  ];

  if (canCustomBranding.value) {
    options.unshift({
      key: 'includeLogo',
      label: t('settingsLogoReports'),
      sub: t('settingsLogoReportsSub'),
    });
  }

  return options;
});



const preferenceSummary = computed(() => {

  void currentLanguage.value;

  const parts = [

    productPreferences.value.export.includeMaterialsBreakdown

      ? t('settingsPrefWithBreakdown')

      : t('settingsPrefNoBreakdown'),

    productPreferences.value.export.includeSnapshots

      ? t('settingsPrefWithSnapshots')

      : t('settingsPrefNoSnapshots'),

    productPreferences.value.export.includePrintReviewBlock

      ? t('settingsPrefWithPrintBlock')

      : t('settingsPrefNoPrintBlock'),

  ];

  if (canCustomBranding.value && productPreferences.value.export.businessName?.trim()) {
    parts.push(productPreferences.value.export.businessName.trim());
  }

  return parts.join(' · ');

});

</script>



<template>

  <section
    data-motion="section"
    class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
  >

    <button

      type="button"

      class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"

      :aria-expanded="openExport"

      @click="toggleExport"

    >

      <div

        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"

      >

        <FileText class="h-5 w-5" :stroke-width="2.2" />

      </div>

      <div class="min-w-0 flex-1">

        <p

          class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"

        >

          {{ t('settingsDeliverables') }}

        </p>

        <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">

          {{ t('settingsReportsExport') }}

        </h3>

        <p

          class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"

          :title="preferenceSummary"

        >

          {{ preferenceSummary }}

        </p>

        <p class="mt-1 flex items-start gap-2 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">

          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" :stroke-width="2.2" />

          <span>{{ t('settingsExportHint') }}</span>

        </p>

      </div>

      <ChevronDown

        class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"

        :class="{ 'rotate-180': openExport }"

        :stroke-width="2.2"

      />

    </button>



    <Transition name="pref-accordion">

      <div v-show="openExport" ref="panelRef">

        <div class="space-y-5 p-5">

          <div class="grid gap-3 sm:grid-cols-2">

            <div
              v-for="row in exportToggleOptions"
              :key="row.key"
              data-motion="item"
              class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
            >

              <div>

                <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">

                  {{ row.label }}

                </p>

                <p class="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">

                  {{ row.sub }}

                </p>

              </div>

              <button

                type="button"

                class="relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200"

                :class="

                  productPreferences.export[row.key]

                    ? 'border-orange-300 bg-orange-500 dark:border-orange-800'

                    : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'

                "

                :aria-pressed="productPreferences.export[row.key]"

                @click="productPreferences.export[row.key] = !productPreferences.export[row.key]"

              >

                <span

                  class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"

                  :class="productPreferences.export[row.key] ? 'left-6' : 'left-0.5'"

                />

              </button>

            </div>

          </div>



          <div

            v-if="!productPreferences.export.includePrintReviewBlock"

            class="flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/80 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/25"

          >

            <Info class="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" :stroke-width="2.2" />

            <p class="text-[11px] font-medium leading-relaxed text-sky-900 dark:text-sky-100">

              {{ t('settingsPrintReviewAlert') }}

            </p>

          </div>



          <div

            v-if="canCustomBranding"

            class="space-y-5"

          >

            <div>

              <label class="premium-label">{{ t('settingsBrandName') }}</label>

              <input

                v-model="productPreferences.export.businessName"

                type="text"

                class="premium-input"

                :placeholder="t('settingsBusinessPlaceholder')"

              />

              <p class="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">

                {{ t('settingsBrandNameHint') }}

              </p>

            </div>



            <div>

              <label class="premium-label">{{ t('settingsLegalFooter') }}</label>

              <textarea

                v-model="productPreferences.export.reportFooter"

                rows="3"

                class="premium-textarea"

                :placeholder="t('settingsFooterPlaceholder')"

              />

              <p class="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">

                {{ t('settingsLegalFooterHint') }}

              </p>

            </div>

          </div>



          <div

            v-else

            class="flex items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"

          >

            <Lock class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" :stroke-width="2.2" />

            <div>

              <p class="text-xs font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">

                {{ t('settingsExportBrandingLocked') }}

              </p>

              <p class="mt-1 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">

                {{ t('settingsExportBrandingLockedHint') }}

              </p>

            </div>

          </div>

        </div>

      </div>

    </Transition>

  </section>

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



.premium-textarea {

  width: 100%;

  min-height: 5.5rem;

  border-radius: 1rem;

  border: 1px solid rgb(226 232 240);

  background: rgba(248, 250, 252, 0.8);

  padding: 0.75rem 1rem;

  font-size: 0.875rem;

  font-weight: 600;

  line-height: 1.45;

  color: rgb(15 23 42);

  outline: none;

  resize: vertical;

  transition:

    border-color 0.18s ease,

    background-color 0.18s ease,

    box-shadow 0.18s ease;

}



.premium-textarea:focus {

  border-color: rgb(251 146 60);

  background: white;

  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);

}



.dark .premium-textarea {

  border-color: rgb(30 41 59);

  background: rgba(15, 23, 42, 0.72);

  color: rgb(241 245 249);

}



.dark .premium-textarea:focus {

  border-color: rgb(249 115 22);

  background: rgb(15 23 42);

  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);

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

