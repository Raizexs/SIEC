<script setup>
import { computed, onMounted, onBeforeUnmount, toRef, ref } from 'vue';
import { Keyboard as KeyboardIcon } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';
import { useBodyScrollLock } from '../composables/useBodyScrollLock';
import { useMotionModal } from '../composables/useMotionModal';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const backdropRef = ref(null);
const panelRef = ref(null);

useBodyScrollLock(toRef(props, 'show'));
useMotionModal(toRef(props, 'show'), { backdropRef, panelRef, staggerItems: true });

const modKey = computed(() =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
    ? 'Cmd'
    : 'Ctrl',
);

const shortcuts = computed(() => [
  { keys: [modKey.value, 'K'], desc: t('shortcutPalette') },
  { keys: [modKey.value, '/'], desc: t('shortcutHelp') },
  { keys: ['?'], desc: t('shortcutTerms') },
  { keys: ['G', 'D'], desc: t('shortcutDashboard') },
  { keys: ['G', 'W'], desc: t('shortcutWorkspace') },
  { keys: ['G', 'S'], desc: t('shortcutSettings') },
  { keys: [modKey.value, 'S'], desc: t('shortcutSave') },
  { keys: ['Esc'], desc: t('shortcutEsc') },
  { keys: ['Suprimir'], desc: t('shortcutDelete') },
  { keys: ['F'], desc: t('shortcutFullscreen') },
  { keys: ['M'], desc: t('shortcutMeasure') },
  { keys: ['V'], desc: t('shortcutWalkthrough') },
]);

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => document.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="backdropRef"
      class="shortcut-overlay fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/35 p-4 backdrop-blur-md dark:bg-black/50"
      data-scroll-lock-root
      @click.self="emit('close')"
    >
      <section
        ref="panelRef"
        class="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
      >
        <!-- Header -->
        <header
          class="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <KeyboardIcon class="h-5 w-5" :stroke-width="2" />
            </div>

            <div>
              <h2
                id="keyboard-shortcuts-title"
                class="text-sm font-semibold tracking-tight text-slate-950 dark:text-slate-100"
              >
                {{ t('shortcutsTitle') }}
              </h2>

              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {{ t('shortcutsSubtitle') }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            :aria-label="t('shortcutsClose')"
            @click="emit('close')"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <!-- List -->
        <div class="p-3">
          <ul
            class="max-h-[min(70vh,28rem)] space-y-1 overflow-y-auto overscroll-contain"
            data-scroll-lock-scroll
          >
            <li
              v-for="s in shortcuts"
              :key="s.desc"
              data-motion="item"
              class="group flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/70"
            >
              <span
                class="font-medium text-slate-700 transition-colors duration-200 group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-slate-100"
              >
                {{ s.desc }}
              </span>

              <span class="flex shrink-0 items-center gap-1.5">
                <kbd
                  v-for="k in s.keys"
                  :key="k"
                  class="min-w-7 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-[10px] font-semibold uppercase leading-none tracking-tight text-slate-700 shadow-[0_1px_0_0_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {{ k }}
                </kbd>
              </span>
            </li>
          </ul>
        </div>

        <footer
          class="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/70 px-5 py-3 dark:border-slate-800/80 dark:bg-slate-900/50"
        >
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Presiona
            <kbd
              class="mx-1 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              Esc
            </kbd>
            {{ t('shortcutsEscHint') }}
          </p>

          <button
            type="button"
            data-motion-hover="modal-action"
            class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            @click="emit('close')"
          >
            {{ t('shortcutsGotIt') }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
