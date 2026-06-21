<script setup>
import { defineProps, defineEmits, watch, onBeforeUnmount, onMounted, computed } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t, currentLanguage } = useI18n();

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);

const steps = computed(() => {
  void currentLanguage.value;
  return [
    {
      title: t('manualStep1Title'),
      description: t('manualStep1Desc'),
      icon: 'terrain',
    },
    {
      title: t('manualStep2Title'),
      description: t('manualStep2Desc'),
      icon: 'dashboard_customize',
    },
    {
      title: t('manualStep3Title'),
      description: t('manualStep3Desc'),
      icon: 'grid_view',
    },
    {
      title: t('manualStep4Title'),
      description: t('manualStep4Desc'),
      icon: 'view_in_ar',
    },
    {
      title: t('manualStep5Title'),
      description: t('manualStep5Desc'),
      icon: 'paid',
    },
    {
      title: t('manualStep6Title'),
      description: t('manualStep6Desc'),
      icon: 'picture_as_pdf',
    },
  ];
});

const shortcuts = [
  { keys: ['Delete'], description: 'Eliminar recinto' },
  { keys: ['Ctrl', 'Z'], description: 'Deshacer acción' },
  { keys: ['Ctrl', 'Y'], description: 'Rehacer acción' },
  { keys: ['Scroll'], description: 'Zoom 2D / 3D' },
  { keys: ['Clic der.', 'Arrastrar'], description: 'Desplazar vista 2D' },
  { keys: ['Clic izq.', 'Arrastrar'], description: 'Rotar cámara 3D' },
];

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
    <transition name="manual-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-title"
        @click.self="emit('close')"
      >
        <div
          class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        >
          <header
            class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
          >
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                SIEC
              </p>
              <h2 id="manual-title" class="text-lg font-black text-slate-950 dark:text-slate-100">
                Manual de usuario
              </h2>
            </div>
            <button
              type="button"
              class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </header>

          <div class="space-y-6 p-6">
            <ol class="space-y-4">
              <li
                v-for="(step, index) in steps"
                :key="index"
                class="flex gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300"
                >
                  <span class="material-symbols-outlined">{{ step.icon }}</span>
                </span>
                <div>
                  <p class="text-xs font-black uppercase tracking-wide text-slate-400">
                    Paso {{ index + 1 }}
                  </p>
                  <h3 class="font-bold text-slate-900 dark:text-slate-100">{{ step.title }}</h3>
                  <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ step.description }}</p>
                </div>
              </li>
            </ol>

            <section>
              <h3 class="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                Atajos de teclado
              </h3>
              <ul class="grid gap-2 sm:grid-cols-2">
                <li
                  v-for="(shortcut, idx) in shortcuts"
                  :key="idx"
                  class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"
                >
                  <span class="text-slate-600 dark:text-slate-400">{{ shortcut.description }}</span>
                  <span class="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {{ shortcut.keys.join(' + ') }}
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.manual-fade-enter-active,
.manual-fade-leave-active {
  transition: opacity 0.2s ease;
}
.manual-fade-enter-from,
.manual-fade-leave-to {
  opacity: 0;
}
</style>
