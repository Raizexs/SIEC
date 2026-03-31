<script setup>
import { ref, watch } from "vue";
import { useI18n } from "../composables/useI18n";

const { t } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  layoutName: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["close", "save"]);

const localName = ref(props.layoutName);

watch(
  () => props.layoutName,
  (newVal) => {
    localName.value = newVal;
  },
);

const handleSave = () => {
  if (localName.value.trim()) {
    emit("save", localName.value.trim());
    localName.value = "";
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="emit('close')"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-3xl"
              >save</span
            >
            <h3 class="text-2xl font-headline font-bold text-primary">
              {{ t('saveLayoutTitle') }}
            </h3>
          </div>

          <div class="space-y-2">
            <label
              for="layout-name"
              class="block text-sm font-bold text-slate-700 uppercase tracking-wide"
            >
              {{ t('layoutNameLabel') }}
            </label>
            <input
              id="layout-name"
              v-model="localName"
              type="text"
              :placeholder="t('layoutNamePlaceholder')"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              @keyup.enter="handleSave"
              autofocus
            />
          </div>

          <div class="flex gap-3">
            <button
              @click="emit('close')"
              class="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              {{ t('cancel') }}
            </button>
            <button
              @click="handleSave"
              :disabled="!localName.trim()"
              class="flex-1 px-4 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ t('save') }}
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
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.9);
}
</style>
