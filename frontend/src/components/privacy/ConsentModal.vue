<script setup>
import { ref, computed, watch, toRef } from 'vue';
import { useMotionModal } from '../../composables/useMotionModal';

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  consentType: { type: String, required: true },
  policyVersion: { type: String, default: '1.0' },
  confirmLabel: { type: String, default: 'Acepto y continuar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm', 'cancel', 'close']);

const accepted = ref(false);
const backdropRef = ref(null);
const panelRef = ref(null);

useMotionModal(toRef(props, 'show'), { backdropRef, panelRef });

watch(
  () => props.show,
  (visible) => {
    if (visible) accepted.value = false;
  },
);

const canConfirm = computed(() => accepted.value && !props.loading);

const onConfirm = () => {
  if (!canConfirm.value) return;
  emit('confirm', {
    consent_type: props.consentType,
    policy_version: props.policyVersion,
  });
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="backdropRef"
      class="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <section
        ref="panelRef"
        class="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div class="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900"></div>

        <header class="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <h2 class="text-xl font-black text-slate-950 dark:text-slate-100">
            {{ title }}
          </h2>
          <p
            v-if="description"
            class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
          >
            {{ description }}
          </p>
        </header>

        <div class="space-y-4 px-6 py-5">
          <slot />
          <label class="flex cursor-pointer items-start gap-3">
            <input
              v-model="accepted"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span class="text-sm text-slate-700 dark:text-slate-300">
              He leído y acepto el tratamiento indicado (versión {{ policyVersion }}).
              Consulta la
              <router-link
                to="/legal/privacidad"
                class="font-semibold text-orange-600 underline dark:text-orange-400"
                target="_blank"
              >
                política de privacidad
              </router-link>.
            </span>
          </label>
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            class="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-300"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            :disabled="!canConfirm"
            @click="onConfirm"
          >
            {{ confirmLabel }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
