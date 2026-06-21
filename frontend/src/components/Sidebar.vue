<script setup>
/**
 * Editor Sidebar — contextual panel next to AppRail in the workspace.
 * Presets (top), saved layouts (bottom). Language/theme live in Settings.
 */

import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useLayoutManager } from '../composables/useLayoutManager';
import { useI18n } from '../composables/useI18n';
import { generateLayoutThumbnail } from '../utils/thumbnailGenerator';
import { formatFloorCountLabel } from '../utils/floorLabels';
import { bindCardHover } from '../composables/useMotionContext';
import { prefersReducedMotion, getMotionProfile } from '../design/motionTokens';
import gsap from 'gsap';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Trash2,
  ExternalLink,
  Plus,
  LayoutTemplate,
} from 'lucide-vue-next';

const { t, currentLanguage } = useI18n();

const { savedLayouts, deleteLayout, presets, createPresetLayout } = useLayoutManager();

const emit = defineEmits([
  'loadLayout',
  'apply-preset',
  'collapse-change',
  'new-estimate',
]);

const collapsed = ref(false);
const isSidebarAnimating = ref(false);
const sidebarRootRef = ref(null);
const sidebarInnerRef = ref(null);
const expandTabRef = ref(null);
let unbindSidebarHover = null;

const SIDEBAR_WIDTH = 224;

const setCollapsedState = (value) => {
  collapsed.value = value;
  emit('collapse-change', value);
};

const animateExpandTabIn = () => {
  const tab = expandTabRef.value;
  if (!tab || prefersReducedMotion()) return;

  const profile = getMotionProfile();
  gsap.killTweensOf(tab);
  gsap.fromTo(
    tab,
    { autoAlpha: 0, x: -8, scale: 0.94 },
    {
      autoAlpha: 1,
      x: 0,
      scale: 1,
      duration: profile.duration.fast,
      ease: profile.ease.entrance,
      clearProps: 'transform,opacity,visibility',
    },
  );
};

const animateCollapse = () => {
  const el = sidebarRootRef.value;
  const inner = sidebarInnerRef.value;
  if (!el) return;

  if (prefersReducedMotion()) {
    setCollapsedState(true);
    return;
  }

  isSidebarAnimating.value = true;
  unbindSidebarHover?.();

  const profile = getMotionProfile();
  const duration = Math.min(0.3, profile.duration.base * 0.88);

  gsap.killTweensOf([el, inner]);
  gsap
    .timeline({
      onComplete: () => {
        gsap.set(el, { pointerEvents: 'none' });
        setCollapsedState(true);
        isSidebarAnimating.value = false;
        nextTick(() => animateExpandTabIn());
      },
    })
    .to(
      inner,
      {
        autoAlpha: 0,
        x: -10,
        duration: duration * 0.72,
        ease: profile.ease.standardOut,
      },
      0,
    )
    .to(
      el,
      {
        width: 0,
        opacity: 0.35,
        x: -8,
        duration,
        ease: profile.ease.standardOut,
      },
      0,
    );
};

const animateExpand = () => {
  const el = sidebarRootRef.value;
  const inner = sidebarInnerRef.value;
  if (!el) return;

  if (prefersReducedMotion()) {
    setCollapsedState(false);
    refreshSidebarHover();
    return;
  }

  isSidebarAnimating.value = true;
  setCollapsedState(false);

  nextTick(() => {
    const profile = getMotionProfile();
    const duration = Math.min(0.34, profile.duration.base * 0.95);

    gsap.killTweensOf([el, inner]);
    gsap.set(el, {
      width: 0,
      opacity: 0.35,
      x: -8,
      pointerEvents: 'none',
    });
    gsap.set(inner, { autoAlpha: 0, x: -10 });

    gsap
      .timeline({
        onComplete: () => {
          gsap.set(el, { clearProps: 'width,opacity,transform,pointerEvents' });
          gsap.set(inner, { clearProps: 'opacity,transform,visibility' });
          isSidebarAnimating.value = false;
          refreshSidebarHover();
        },
      })
      .to(
        el,
        {
          width: SIDEBAR_WIDTH,
          opacity: 1,
          x: 0,
          duration,
          ease: profile.ease.entrance,
        },
        0,
      )
      .to(
        inner,
        {
          autoAlpha: 1,
          x: 0,
          duration: duration * 0.88,
          ease: profile.ease.entrance,
        },
        duration * 0.12,
      );
  });
};

const bindSidebarHover = async () => {
  unbindSidebarHover?.();
  await nextTick();
  const root = sidebarRootRef.value;
  if (!root || prefersReducedMotion()) return;

  const hoverOpts = { iconSelector: 'svg' };
  const cleanups = [
    bindCardHover(root.querySelectorAll('[data-motion="card"]'), { lift: -5, ...hoverOpts }),
    bindCardHover(root.querySelectorAll('[data-motion="item"]'), { lift: -4, ...hoverOpts }),
  ];
  unbindSidebarHover = () => cleanups.forEach((fn) => fn());
};

const refreshSidebarHover = () => {
  void bindSidebarHover();
};

onMounted(() => {
  refreshSidebarHover();
  window.addEventListener('siec:motion-preference', refreshSidebarHover);
});

onBeforeUnmount(() => {
  window.removeEventListener('siec:motion-preference', refreshSidebarHover);
  unbindSidebarHover?.();
  gsap.killTweensOf([sidebarRootRef.value, sidebarInnerRef.value, expandTabRef.value]);
});

watch(
  () => savedLayouts.value.length,
  () => refreshSidebarHover(),
);

const toggleCollapse = () => {
  if (isSidebarAnimating.value) return;
  if (collapsed.value) {
    animateExpand();
    return;
  }
  animateCollapse();
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

const presetCards = computed(() =>
  presets.value.map((preset) => {
    const layout = createPresetLayout(preset);
    const floorCount = preset.floors || 1;

    return {
      preset,
      thumbnail: generateLayoutThumbnail(layout.recintos),
      label: currentLanguage.value === 'en' ? preset.nameEn : preset.name,
      recintoCount: layout.recintos?.length ?? 0,
      floorsLabel: formatFloorCountLabel(floorCount, t),
    };
  }),
);

const loadSavedLayout = (layout) => {
  emit('loadLayout', layout);
};

const applyPreset = (preset) => {
  const layout = createPresetLayout(preset);
  emit('apply-preset', layout);
};

const deleteSavedLayout = (id) => {
  if (!id) return;
  deleteLayout(id);
};
</script>

<template>
  <Teleport to="body">
    <button
      v-if="collapsed"
      ref="expandTabRef"
      type="button"
      class="fixed left-16 top-[4.75rem] z-50 flex h-9 w-6 items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur-xl transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
      :title="t('expandPanel')"
      :aria-label="t('expandPanel')"
      @click="toggleCollapse"
    >
      <ChevronRight class="h-3.5 w-3.5" :stroke-width="2.6" />
    </button>
  </Teleport>

  <aside
    ref="sidebarRootRef"
    class="sticky top-0 z-30 flex h-screen w-56 shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/90 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-black/20"
    :class="{
      'pointer-events-none border-r-0': collapsed,
    }"
  >
    <div ref="sidebarInnerRef" class="flex min-h-0 flex-1 flex-col">
    <div class="siec-accent-bar shrink-0" aria-hidden="true" />

    <header class="shrink-0 border-b border-slate-200/70 px-3.5 pb-3 pt-3.5 dark:border-slate-800/70">
      <div class="mb-2.5 flex items-center justify-between gap-2">
        <p class="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {{ t('sidebarWorkspace') }}
        </p>

        <button
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          :title="t('collapsePanel')"
          :aria-label="t('collapsePanel')"
          @click="toggleCollapse"
        >
          <ChevronLeft class="h-3.5 w-3.5" :stroke-width="2.6" />
        </button>
      </div>

      <h2 class="truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
        {{ t('siec') }}
      </h2>

      <p class="mt-0.5 text-[11px] font-medium leading-snug text-slate-500 dark:text-slate-400">
        {{ t('constructionIntelligence') }}
      </p>
    </header>

    <nav class="min-h-0 flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
      <section class="tour-sidebar-presets">
        <div class="mb-2 flex items-center justify-between px-1">
          <h3
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
          >
            <LayoutTemplate class="h-3 w-3" :stroke-width="2.2" />
            {{ t('presetLayouts') }}
          </h3>
        </div>

        <div class="space-y-1.5">
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

      <section>
        <div class="mb-2 flex items-center justify-between px-1">
          <h3
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
          >
            <Bookmark class="h-3 w-3" :stroke-width="2.2" />
            {{ t('savedLayouts') }}
          </h3>

          <span
            class="rounded-full border border-slate-200/90 bg-slate-50 px-1.5 py-px text-[9px] font-bold tabular-nums text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            {{ savedLayouts.length }}
          </span>
        </div>

        <div
          v-if="savedLayouts.length === 0"
          class="rounded-xl border border-dashed border-slate-300/90 bg-slate-50/60 p-3.5 text-center dark:border-slate-700 dark:bg-slate-900/40"
        >
          <Bookmark class="mx-auto mb-2 h-4 w-4 text-slate-400 dark:text-slate-500" :stroke-width="2" />

          <p class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {{ t('noSavedLayouts') }}
          </p>

          <p class="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            {{ t('saveLayoutEmptyHint') }}
          </p>
        </div>

        <div v-else class="space-y-1.5">
          <article
            v-for="layout in savedLayouts"
            :key="layout.id"
            data-motion="item"
            class="group rounded-xl border border-slate-200/90 bg-white/80 p-2 transition hover:border-orange-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-orange-900/50"
          >
            <div class="flex items-start justify-between gap-1.5">
              <button
                type="button"
                class="min-w-0 flex-1 cursor-pointer text-left"
                @click="loadSavedLayout(layout)"
              >
                <span class="block truncate text-[11px] font-bold text-slate-900 dark:text-slate-100">
                  {{ layout.name || t('layoutUntitled') }}
                </span>

                <span class="mt-0.5 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {{ layout.m2Totales || 0 }} m² · {{ formatDate(layout.createdAt) }}
                </span>
              </button>

              <div class="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded-md text-orange-600 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/30"
                  :title="t('load')"
                  :aria-label="t('loadLayoutAria')"
                  @click="loadSavedLayout(layout)"
                >
                  <ExternalLink class="h-3 w-3" :stroke-width="2.3" />
                </button>

                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                  :title="t('delete')"
                  :aria-label="t('deleteLayoutAria')"
                  @click="deleteSavedLayout(layout.id)"
                >
                  <Trash2 class="h-3 w-3" :stroke-width="2.3" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </nav>

    <footer class="shrink-0 border-t border-slate-200/70 p-2.5 dark:border-slate-800/70">
      <button
        type="button"
        class="btn-accent inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] shadow-sm transition active:scale-[0.98]"
        @click="$emit('new-estimate')"
      >
        <Plus class="h-3.5 w-3.5" :stroke-width="2.5" />
        {{ t('newEstimate') }}
      </button>
    </footer>
    </div>
  </aside>
</template>
