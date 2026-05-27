<script setup>
/**
 * Editor Sidebar — contextual panel sitting next to AppRail in the workspace.
 * Houses: presets, saved layouts, language + dark mode toggles, help, new-estimate CTA.
 *
 * Premium language:
 * - Slate/orange visual system.
 * - Soft borders, controlled shadows, rounded-2xl/3xl.
 * - Clear hierarchy between templates, saved layouts and utility actions.
 * - Dark mode consistency.
 */

import { ref, computed, onMounted } from 'vue';
import { useLayoutManager } from '../composables/useLayoutManager';
import { useI18n } from '../composables/useI18n';
import { useTheme } from '../composables/useTheme';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Trash2,
  ExternalLink,
  Sun,
  Moon,
  Languages,
  Plus,
  CircleDot,
  CheckCircle2,
} from 'lucide-vue-next';

const { t, currentLanguage, setLanguage } = useI18n();
const theme = useTheme();

const { savedLayouts, deleteLayout } = useLayoutManager();

const emit = defineEmits([
  'loadLayout',
  'collapse-change',
  'new-estimate',
]);

const collapsed = ref(false);

onMounted(() => {
  if (theme.userPref.value === 'system') {
    theme.setTheme(theme.isDark.value ? 'dark' : 'light');
  }
});

const themeLabel = computed(() =>
  theme.isDark.value ? t('themeDark') : t('themeLight'),
);

const themeTitle = computed(() =>
  theme.isDark.value ? t('themeSwitchToLight') : t('themeSwitchToDark'),
);

const ThemeIcon = computed(() => {
  return theme.isDark.value ? Moon : Sun;
});

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
  emit('collapse-change', collapsed.value);
};

const cycleTheme = () => {
  const switchTheme = () => {
    const next = theme.isDark.value ? 'light' : 'dark';
    theme.setTheme(next);
  };

  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(switchTheme);
  } else {
    switchTheme();
  }
};

const toggleLanguage = () => {
  setLanguage(currentLanguage.value === 'es' ? 'en' : 'es');
};

const loadSavedLayout = (layout) => {
  emit('loadLayout', layout);
};

const deleteSavedLayout = (id) => {
  if (!id) return;
  deleteLayout(id);
};

const formatDate = (value) => {
  if (!value) return t('noDate');

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const locale = currentLanguage.value === 'en' ? 'en-US' : 'es-CL';

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
</script>

<template>
  <!-- Colapsado: pestaña sobre el rail (no sobre el contenido principal) -->
  <Teleport to="body">
    <button
      v-if="collapsed"
      type="button"
      class="fixed left-16 top-[4.75rem] z-50 flex h-10 w-6 items-center justify-center rounded-r-xl border border-l-0 border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur-xl transition-all hover:border-slate-300 hover:text-slate-950 active:scale-95 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
      :title="t('expandPanel')"
      :aria-label="t('expandPanel')"
      @click="toggleCollapse"
    >
      <ChevronRight class="h-3.5 w-3.5" :stroke-width="2.6" />
    </button>
  </Teleport>

  <aside
    class="sticky top-0 z-30 flex h-screen shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/85 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl transition-[width,opacity] duration-300 dark:border-slate-800/80 dark:bg-slate-950/85 dark:shadow-black/20"
    :class="collapsed ? 'w-0 border-r-0 opacity-0 pointer-events-none' : 'w-60 opacity-100'"
  >
    <!-- Header -->
    <header class="shrink-0 border-b border-slate-200/80 px-4 pb-4 pt-5 dark:border-slate-800/80">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <CircleDot class="h-3.5 w-3.5" :stroke-width="2.6" />
          </span>

          <p class="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {{ t('sidebarWorkspace') }}
          </p>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-100"
          :title="t('collapsePanel')"
          :aria-label="t('collapsePanel')"
          @click="toggleCollapse"
        >
          <ChevronLeft class="h-3.5 w-3.5" :stroke-width="2.6" />
        </button>
      </div>

      <h2 class="truncate text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
        {{ t('siec') }}
      </h2>

      <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        {{ t('constructionIntelligence') }}
      </p>
    </header>

    <!-- Content -->
    <nav class="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
      <!-- Saved Layouts -->
      <section>
        <div class="mb-2 flex items-center justify-between px-1">
          <h3
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            <Bookmark class="h-3.5 w-3.5" :stroke-width="2.2" />
            {{ t('savedLayouts') }}
          </h3>

          <span
            class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
          >
            {{ savedLayouts.length }}
          </span>
        </div>

        <div
          v-if="savedLayouts.length === 0"
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50"
        >
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
          >
            <Bookmark class="h-4.5 w-4.5" :stroke-width="2" />
          </div>

          <p class="text-xs font-bold text-slate-600 dark:text-slate-300">
            {{ t('noSavedLayouts') }}
          </p>

          <p class="mt-1 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
            {{ t('saveLayoutEmptyHint') }}
          </p>
        </div>

        <div v-else class="space-y-2">
          <article
            v-for="layout in savedLayouts"
            :key="layout.id"
            class="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-orange-900/70 dark:hover:bg-slate-900 dark:hover:shadow-black/20"
          >
            <div class="flex items-start justify-between gap-2">
              <button
                type="button"
                class="min-w-0 flex-1 cursor-pointer text-left"
                @click="loadSavedLayout(layout)"
              >
                <div class="flex items-center gap-1.5">
                  <span class="truncate text-xs font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {{ layout.name || t('layoutUntitled') }}
                  </span>

                  <span
                    v-if="layout.recintos?.length"
                    class="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                  >
                    3D
                  </span>
                </div>

                <span class="mt-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {{ layout.m2Totales || 0 }} m² · {{ formatDate(layout.createdAt) }}
                </span>
              </button>

              <div class="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-xl text-orange-600 transition-colors duration-200 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/30"
                  :title="t('load')"
                  :aria-label="t('loadLayoutAria')"
                  @click="loadSavedLayout(layout)"
                >
                  <ExternalLink class="h-3.5 w-3.5" :stroke-width="2.3" />
                </button>

                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-xl text-red-500 transition-colors duration-200 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                  :title="t('delete')"
                  :aria-label="t('deleteLayoutAria')"
                  @click="deleteSavedLayout(layout.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" :stroke-width="2.3" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </nav>

    <!-- Footer: toggles + CTA -->
    <footer
      class="shrink-0 space-y-3 border-t border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-900/50"
    >
      <!-- Toggles row -->
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
          :title="t('changeLanguage')"
          @click="toggleLanguage"
        >
          <Languages class="h-3.5 w-3.5" :stroke-width="2.2" />
          {{ currentLanguage.toUpperCase() }}
        </button>

        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
          :title="themeTitle"
          @click="cycleTheme"
        >
          <component :is="ThemeIcon" class="h-3.5 w-3.5" :stroke-width="2.2" />
          {{ themeLabel }}
        </button>
      </div>

      <!-- Auto-save chip -->
      <div
        class="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
      >
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>

        <span class="truncate">
          {{ t('autoSaveActive') }}
        </span>

        <CheckCircle2 class="ml-auto h-3.5 w-3.5" :stroke-width="2.4" />
      </div>

      <!-- Primary CTA -->
      <button
      type="button"
      class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-md active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-orange-400 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
      @click="$emit('new-estimate')"
      >
      <Plus class="h-4 w-4" :stroke-width="2.5" />
      {{ t('newEstimate') }}
      </button>
    </footer>
  </aside>
</template>