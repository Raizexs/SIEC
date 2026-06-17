<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { useTheme } from '../../composables/useTheme';
import { Sun, Moon, Languages, ChevronDown } from 'lucide-vue-next';

const { t, currentLanguage, setLanguage } = useI18n();
const theme = useTheme();

const open = ref(true);

const themeLabel = computed(() =>
  theme.isDark.value ? t('themeDark') : t('themeLight'),
);

const appearanceSummary = computed(() => {
  void currentLanguage.value;
  const lang = currentLanguage.value === 'es' ? 'Español' : 'English';
  return `${lang} · ${themeLabel.value}`;
});

const toggleLanguage = () => {
  setLanguage(currentLanguage.value === 'es' ? 'en' : 'es');
};

const cycleTheme = () => {
  const switchTheme = () => {
    theme.setTheme(theme.isDark.value ? 'light' : 'dark');
  };
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(switchTheme);
  } else {
    switchTheme();
  }
};
</script>

<template>
  <section
    data-motion="section"
    class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
  >
    <button
      type="button"
      class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
      :aria-expanded="open"
      @click="open = !open"
    >
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-600 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300"
      >
        <Sun class="h-5 w-5" :stroke-width="2.2" />
      </div>
      <div class="min-w-0 flex-1">
        <p
          class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
        >
          {{ t('settingsAppearance') }}
        </p>
        <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
          {{ t('settingsAppearanceSub') }}
        </h3>
        <p
          class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
          :title="appearanceSummary"
        >
          {{ appearanceSummary }}
        </p>
      </div>
      <ChevronDown
        class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
        :class="{ 'rotate-180': open }"
        :stroke-width="2.2"
      />
    </button>

    <Transition name="pref-accordion">
      <div v-show="open" class="grid gap-3 p-5 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
            {{ t('settingsLanguageLabel') }}
          </p>
          <button
            type="button"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
            @click="toggleLanguage"
          >
            <Languages class="h-4 w-4" :stroke-width="2.2" />
            {{ currentLanguage === 'es' ? 'Español' : 'English' }}
          </button>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
            {{ t('settingsThemeLabel') }}
          </p>
          <button
            type="button"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
            @click="cycleTheme"
          >
            <Moon v-if="theme.isDark.value" class="h-4 w-4" :stroke-width="2.2" />
            <Sun v-else class="h-4 w-4" :stroke-width="2.2" />
            {{ themeLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.pref-accordion-enter-active,
.pref-accordion-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pref-accordion-enter-from,
.pref-accordion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
