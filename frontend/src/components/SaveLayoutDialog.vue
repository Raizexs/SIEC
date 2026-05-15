<script setup>
import { ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  layoutName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close', 'save']);

const localName = ref(props.layoutName);

watch(
  () => props.layoutName,
  (newVal) => {
    localName.value = newVal;
  },
);

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      localName.value = props.layoutName;
    }
  },
);

const handleSave = () => {
  const normalizedName = localName.value.trim();

  if (!normalizedName) return;

  emit('save', normalizedName);
  localName.value = '';
};
</script>

<template>
  <Teleport to="body">
    <Transition name="save-overlay">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md dark:bg-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-layout-title"
        @click.self="emit('close')"
      >
        <Transition name="save-card" appear>
          <section
            class="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
          >
            <!-- Top accent -->
            <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

            <!-- Header -->
            <header
              class="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <span class="material-symbols-outlined text-[25px]">
                    save
                  </span>
                </div>

                <div>
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                  >
                    Guardado manual
                  </p>

                  <h3
                    id="save-layout-title"
                    class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                  >
                    {{ t('saveLayoutTitle') }}
                  </h3>

                  <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    Asigna un nombre claro para encontrar esta versión más rápido después.
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                aria-label="Cerrar diálogo de guardado"
                @click="emit('close')"
              >
                <span
                  class="material-symbols-outlined text-[21px] transition-transform duration-200 group-hover:rotate-90"
                >
                  close
                </span>
              </button>
            </header>

            <!-- Body -->
            <div class="space-y-5 px-5 py-5">
              <div class="space-y-2">
                <label
                  for="layout-name"
                  class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                >
                  {{ t('layoutNameLabel') }}
                </label>

                <div class="relative">
                  <div
                    class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500"
                  >
                    <span class="material-symbols-outlined text-[19px]">
                      drive_file_rename_outline
                    </span>
                  </div>

                  <input
                    id="layout-name"
                    v-model="localName"
                    type="text"
                    :placeholder="t('layoutNamePlaceholder')"
                    class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900 dark:focus:ring-orange-500/15"
                    autofocus
                    @keyup.enter="handleSave"
                  />
                </div>

                <p class="text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                  Usa nombres específicos como “Casa 105m² metalcon” o “Versión cliente 01”.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <footer
              class="flex flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                @click="emit('close')"
              >
                {{ t('cancel') }}
              </button>

              <button
                type="button"
                class="save-layout-primary-btn"
                :class="{ 'is-disabled': !localName.trim() }"
                :disabled="!localName.trim()"
                @click="handleSave"
              >
                <span class="material-symbols-outlined text-[17px]">
                  save
                </span>
                {{ t('save') }}
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.save-overlay-enter-active,
.save-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.save-overlay-enter-from,
.save-overlay-leave-to {
  opacity: 0;
}

.save-card-enter-active,
.save-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.save-card-enter-from,
.save-card-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.save-layout-primary-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(251, 146, 60, 0.7);
  background: linear-gradient(135deg, #fb923c, #f97316);
  padding: 0.625rem 1rem;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  box-shadow:
    0 14px 32px rgba(249, 115, 22, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  transition:
    transform 0.18s ease,
    filter 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.save-layout-primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow:
    0 18px 40px rgba(249, 115, 22, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.save-layout-primary-btn:active:not(:disabled) {
  transform: scale(0.98);
}
/* Estado deshabilitado legible, no negro/apagado */
.save-layout-primary-btn:disabled,
.save-layout-primary-btn.is-disabled {
  cursor: not-allowed;
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.72);
  color: rgba(226, 232, 240, 0.42);
  box-shadow: none;
  filter: none;
}

/* Light mode disabled */
:global(html:not(.dark)) .save-layout-primary-btn:disabled,
:global(html:not(.dark)) .save-layout-primary-btn.is-disabled {
  border-color: rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(148 163 184);
}

/* Dark mode enabled: mantener naranja, no blanco */
:global(html.dark) .save-layout-primary-btn:not(:disabled) {
  border-color: rgba(251, 146, 60, 0.7);
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: #ffffff;
}
</style>