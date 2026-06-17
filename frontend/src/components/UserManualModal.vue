<script setup>
import { computed, watch, onBeforeUnmount, toRef, ref } from 'vue';
import {
  X,
  BookOpen,
  Mountain,
  LayoutTemplate,
  Grid2x2,
  Box,
  CircleDollarSign,
  FileText,
  Keyboard,
} from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useMotionModal } from '../composables/useMotionModal';

const { t, currentLanguage } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const backdropRef = ref(null);
const dialogRef = ref(null);

useMotionModal(toRef(props, 'show'), {
  backdropRef,
  panelRef: dialogRef,
  staggerItems: true,
});

const steps = computed(() => {
  void currentLanguage.value;
  return [
    {
      title: t('manualStep1Title'),
      description: t('manualStep1Desc'),
      icon: Mountain,
    },
    {
      title: t('manualStep2Title'),
      description: t('manualStep2Desc'),
      icon: LayoutTemplate,
    },
    {
      title: t('manualStep3Title'),
      description: t('manualStep3Desc'),
      icon: Grid2x2,
    },
    {
      title: t('manualStep4Title'),
      description: t('manualStep4Desc'),
      icon: Box,
    },
    {
      title: t('manualStep5Title'),
      description: t('manualStep5Desc'),
      icon: CircleDollarSign,
    },
    {
      title: t('manualStep6Title'),
      description: t('manualStep6Desc'),
      icon: FileText,
    },
  ];
});

const shortcuts = computed(() => {
  void currentLanguage.value;
  return [
    { keys: ['Delete'], description: t('manualShortcutDelete') },
    { keys: ['Ctrl', 'Z'], description: t('manualShortcutUndo') },
    { keys: ['Ctrl', 'Y'], description: t('manualShortcutRedo') },
    { keys: ['Scroll'], description: t('manualShortcutZoom') },
    { keys: [t('manualKeyRightClick'), t('manualKeyDrag')], description: t('manualShortcutPan') },
    { keys: [t('manualKeyLeftClick'), t('manualKeyDrag')], description: t('manualShortcutRotate') },
  ];
});

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

let scrollY = 0;
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';
let previousBodyOverflow = '';

const lockBodyScroll = () => {
  scrollY = window.scrollY || document.documentElement.scrollTop;

  previousBodyPosition = document.body.style.position;
  previousBodyTop = document.body.style.top;
  previousBodyWidth = document.body.style.width;
  previousBodyOverflow = document.body.style.overflow;

  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
};

const unlockBodyScroll = () => {
  document.body.style.position = previousBodyPosition;
  document.body.style.top = previousBodyTop;
  document.body.style.width = previousBodyWidth;
  document.body.style.overflow = previousBodyOverflow;

  window.scrollTo(0, scrollY);
};

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      lockBodyScroll();
      window.addEventListener('keydown', onKeyDown);
    } else {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKeyDown);
    }
  },
);

onBeforeUnmount(() => {
  unlockBodyScroll();
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-title"
    >
      <div
        ref="backdropRef"
        class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm dark:bg-black/60"
        @click.self="emit('close')"
      />

      <div
        ref="dialogRef"
        class="relative z-10 flex max-h-[min(90vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
      >
        <div class="h-1 shrink-0 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-400 dark:to-slate-700" />

        <header
          class="shrink-0 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60 sm:px-6"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-start gap-4">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200/90 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <BookOpen class="h-5 w-5" :stroke-width="2.2" />
              </div>

              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600/90 dark:text-orange-300/80">
                  {{ t('manualEyebrow') }}
                </p>
                <h2
                  id="manual-title"
                  class="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                >
                  {{ t('manualTitle') }}
                </h2>
                <p class="mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {{ t('manualSubtitle') }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              :title="t('manualClose')"
              @click="emit('close')"
            >
              <X class="h-4 w-4" :stroke-width="2.2" />
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <ol class="space-y-3">
            <li
              v-for="(step, index) in steps"
              :key="index"
              data-motion="item"
              class="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-orange-300/60 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/50 dark:hover:border-orange-900/45"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-orange-500/[0.06]"
              />

              <div class="relative flex gap-4 p-4 sm:p-5">
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200/90 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
                >
                  <component :is="step.icon" class="h-5 w-5" :stroke-width="2.2" />
                </div>

                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600/90 dark:text-orange-300/80">
                    {{ t('manualStepLabel', { n: index + 1 }) }}
                  </p>
                  <h3 class="mt-1 text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                    {{ step.title }}
                  </h3>
                  <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {{ step.description }}
                  </p>
                </div>
              </div>
            </li>
          </ol>

          <section
            class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-900/35"
          >
            <div class="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800/80 sm:px-5">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
              >
                <Keyboard class="h-4 w-4" :stroke-width="2.2" />
              </div>
              <h3 class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {{ t('manualShortcutsTitle') }}
              </h3>
            </div>

            <ul class="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
              <li
                v-for="(shortcut, idx) in shortcuts"
                :key="idx"
                data-motion="item"
                class="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-sm dark:border-slate-800/90 dark:bg-slate-950/80"
              >
                <span class="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ shortcut.description }}
                </span>
                <span class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <kbd
                    v-for="(key, keyIdx) in shortcut.keys"
                    :key="keyIdx"
                    class="inline-flex min-h-[1.375rem] items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {{ key }}
                  </kbd>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>
