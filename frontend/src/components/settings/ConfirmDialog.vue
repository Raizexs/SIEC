<script setup>
import { computed, watch, nextTick, ref } from 'vue';
import { gsap } from 'gsap';
import { X } from 'lucide-vue-next';
import { useI18n } from '../../composables/useI18n';
import { prefersReducedMotion, getMotionProfile } from '../../design/motionTokens';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  variant: { type: String, default: 'danger' },
});

const emit = defineEmits(['confirm', 'cancel', 'dismiss']);
const { t } = useI18n();

const dialogRef = ref(null);
const backdropRef = ref(null);

const confirmBtnClass = computed(() => {
  return props.variant === 'danger'
    ? 'border-red-500/80 bg-red-600 shadow-red-500/20 hover:bg-red-500 dark:border-red-500/60 dark:bg-red-600 dark:hover:bg-red-500'
    : 'border-orange-400/70 bg-orange-500 shadow-orange-500/20 hover:bg-orange-400 dark:border-orange-400/60 dark:bg-orange-500';
});

watch(
  () => props.open,
  async (value) => {
    if (!value || prefersReducedMotion()) return;
    await nextTick();
    const profile = getMotionProfile();
    if (backdropRef.value) {
      gsap.fromTo(
        backdropRef.value,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: profile.duration.fast,
          ease: profile.ease.standardOut,
        },
      );
    }
    if (dialogRef.value) {
      gsap.fromTo(
        dialogRef.value,
        { autoAlpha: 0, scale: 0.96, y: 14 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: profile.duration.base,
          ease: profile.ease.entrance,
          clearProps: 'transform,opacity',
        },
      );
    }
  },
);

const dismiss = () => emit('dismiss');
const onCancel = () => emit('cancel');
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref="backdropRef"
        class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm dark:bg-black/60"
        @click.self="dismiss"
      ></div>
      <div
        ref="dialogRef"
        class="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl shadow-slate-950/20 dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              {{ t('settingsConfirmation') }}
            </p>
            <h3
              id="confirm-dialog-title"
              class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100"
            >
              {{ title }}
            </h3>
          </div>
          <button
            type="button"
            class="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            :title="t('settingsClose')"
            @click="dismiss"
          >
            <X class="h-4 w-4" :stroke-width="2.2" />
          </button>
        </div>
        <p class="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          {{ message }}
        </p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="onCancel"
          >
            {{ cancelLabel || t('settingsCancel') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg transition-all active:scale-[0.98]"
            :class="confirmBtnClass"
            @click="emit('confirm')"
          >
            {{ confirmLabel || t('settingsConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
