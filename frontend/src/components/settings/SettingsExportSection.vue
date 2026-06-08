<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { useProductPreferences } from '../../composables/useProductPreferences';
import {
  FileText,
  Info,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
} from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();
const { productPreferences, saveProductPreferences: persistProductPreferences } =
  useProductPreferences();

const openExport = ref(false);
const preferenceMessage = ref('');
const preferenceMessageType = ref('success');

const toggleExport = () => {
  openExport.value = !openExport.value;
};

const exportToggleOptions = computed(() => {
  void currentLanguage.value;
  return [
    {
      key: 'includeLogo',
      label: t('settingsLogoReports'),
      sub: t('settingsLogoReportsSub'),
    },
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
  ];
});

const preferenceSummary = computed(() => {
  void currentLanguage.value;
  return `${productPreferences.value.export.preferredFormat} · ${
    productPreferences.value.export.includeMaterialsBreakdown
      ? t('settingsPrefWithBreakdown')
      : t('settingsPrefNoBreakdown')
  } · ${
    productPreferences.value.export.includeSnapshots
      ? t('settingsPrefWithSnapshots')
      : t('settingsPrefNoSnapshots')
  }`;
});

const saveExportPreferences = () => {
  preferenceMessage.value = '';
  try {
    persistProductPreferences();
    preferenceMessageType.value = 'success';
    preferenceMessage.value = t('settingsSavedPreferences');
  } catch (error) {
    preferenceMessageType.value = 'error';
    preferenceMessage.value = t('settingsSaveFailed', { message: error.message });
  }
};
</script>

<template>
  <section
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
      <div v-show="openExport">
        <div class="space-y-5 p-5">
          <div>
            <p class="premium-label">{{ t('settingsFormatPreferred') }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="f in ['PDF', 'IFC', 'GLB']"
                :key="f"
                type="button"
                class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                :class="
                  productPreferences.export.preferredFormat === f
                    ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                "
                @click="productPreferences.export.preferredFormat = f"
              >
                {{ f }}
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="row in exportToggleOptions"
              :key="row.key"
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

          <div>
            <label class="premium-label">{{ t('settingsBrandName') }}</label>
            <input
              v-model="productPreferences.export.businessName"
              type="text"
              class="premium-input"
              :placeholder="t('settingsBusinessPlaceholder')"
            />
          </div>

          <div>
            <label class="premium-label">{{ t('settingsLegalFooter') }}</label>
            <textarea
              v-model="productPreferences.export.reportFooter"
              rows="3"
              class="premium-textarea"
              :placeholder="t('settingsFooterPlaceholder')"
            />
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:border-orange-300 hover:bg-orange-400 active:scale-[0.98] dark:border-orange-400/60 dark:bg-orange-500 dark:hover:border-orange-300 dark:hover:bg-orange-400"
              @click="saveExportPreferences"
            >
              <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
              {{ t('settingsSavePreferences') }}
            </button>

            <transition name="settings-alert">
              <p
                v-if="preferenceMessage"
                class="flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold"
                :class="
                  preferenceMessageType === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300'
                "
              >
                <CheckCircle2
                  v-if="preferenceMessageType === 'success'"
                  class="h-3.5 w-3.5"
                  :stroke-width="2.2"
                />
                <ShieldAlert v-else class="h-3.5 w-3.5" :stroke-width="2.2" />
                {{ preferenceMessage }}
              </p>
            </transition>
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
