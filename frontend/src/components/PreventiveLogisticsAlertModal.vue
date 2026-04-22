<script setup>
import { useI18n } from "../composables/useI18n";

const { t } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "quote-light-materials"]);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="props.show"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        role="alertdialog"
        aria-modal="true"
        @click.self="emit('close')"
      >
        <div
          class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22]"
        >
          <div class="mb-4 flex items-center gap-3">
            <span class="material-symbols-outlined text-3xl text-secondary"
              >warning</span
            >
            <h3 class="text-2xl font-headline font-bold text-primary">
              {{ t("heavyLogisticsTitle") }}
            </h3>
          </div>

          <p class="mb-6 text-sm leading-relaxed text-outline">
            {{ t("heavyLogisticsMessage") }}
          </p>

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              class="rounded-xl border border-outline-variant/30 px-4 py-3 font-bold text-outline transition-colors hover:bg-surface-container-low"
              @click="emit('close')"
            >
              {{ t("dismissLogisticsAlert") }}
            </button>
            <button
              class="rounded-xl bg-gradient-to-br from-primary to-primary-container px-4 py-3 font-bold text-white transition-opacity hover:opacity-90"
              @click="emit('quote-light-materials')"
            >
              {{ t("quoteWithLightMaterials") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
