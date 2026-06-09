<script setup>
import { inject } from 'vue';
import { useI18n } from '../../composables/useI18n';
import {
  PREFERENCES_DRAFT_KEY,
} from '../../composables/usePreferencesDraft';
import { CheckCircle2, ShieldAlert, RotateCcw } from 'lucide-vue-next';

const { t } = useI18n();
const draftCtx = inject(PREFERENCES_DRAFT_KEY);

if (!draftCtx) {
  throw new Error('SettingsPreferencesSaveBar requires preferences draft context');
}

const {
  isDirty,
  commit,
  revert,
  saveMessage,
  saveMessageType,
  markSavedMessage,
  markErrorMessage,
} = draftCtx;

const handleSave = () => {
  try {
    commit();
    markSavedMessage(t('settingsSavedPreferences'));
  } catch (error) {
    markErrorMessage(t('settingsSaveFailed', { message: error.message }));
  }
};

const handleDiscard = () => {
  revert();
};
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-3xl border p-5 shadow-xl backdrop-blur-xl transition-colors duration-200"
    :class="
      isDirty
        ? 'border-amber-300/80 bg-amber-50/90 shadow-amber-500/10 dark:border-amber-800/60 dark:bg-amber-950/25 dark:shadow-black/30'
        : 'border-slate-200/90 bg-white/85 shadow-slate-950/5 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30'
    "
  >
    <p
      v-if="isDirty"
      class="text-sm font-semibold leading-relaxed text-amber-900 dark:text-amber-100"
    >
      {{ t('settingsPendingChanges') }}
    </p>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:border-orange-300 hover:bg-orange-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 dark:border-orange-400/60 dark:bg-orange-500 dark:hover:border-orange-300 dark:hover:bg-orange-400"
        :disabled="!isDirty"
        @click="handleSave"
      >
        <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
        {{ t('settingsSavePreferences') }}
      </button>

      <button
        v-if="isDirty"
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        @click="handleDiscard"
      >
        <RotateCcw class="h-4 w-4" :stroke-width="2.2" />
        {{ t('settingsDiscardChanges') }}
      </button>

      <transition name="settings-alert">
        <p
          v-if="saveMessage"
          class="flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold"
          :class="
            saveMessageType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300'
          "
        >
          <CheckCircle2
            v-if="saveMessageType === 'success'"
            class="h-3.5 w-3.5"
            :stroke-width="2.2"
          />
          <ShieldAlert v-else class="h-3.5 w-3.5" :stroke-width="2.2" />
          {{ saveMessage }}
        </p>
      </transition>
    </div>
  </div>
</template>

<style scoped>
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
</style>
