<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

const activeProvider = ref(null);

const providers = [
  {
    id: 'google',
    label: 'Google',
    icon: `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="#EA4335" d="M12 11v3.18h4.51c-.18 1.16-1.36 3.4-4.51 3.4-2.71 0-4.93-2.25-4.93-5.02s2.22-5.02 4.93-5.02c1.55 0 2.59.66 3.18 1.22l2.17-2.09C15.99 5.31 14.21 4.5 12 4.5 7.86 4.5 4.5 7.86 4.5 12s3.36 7.5 7.5 7.5c4.33 0 7.2-3.04 7.2-7.32 0-.49-.05-.86-.12-1.18H12z"/></svg>`,
  },
];

const handleClick = async (id) => {
  if (activeProvider.value) return;

  activeProvider.value = id;

  try {
    await authStore.signInWithOAuth(id);
  } finally {
    activeProvider.value = null;
  }
};
</script>

<template>
  <div class="grid grid-cols-1 gap-2">
    <button
      v-for="provider in providers"
      :key="provider.id"
      type="button"
      class="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      :disabled="!!activeProvider"
      :aria-label="`Continuar con ${provider.label}`"
      @click="handleClick(provider.id)"
    >
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition-colors duration-200 group-hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:group-hover:bg-slate-900"
        v-html="provider.icon"
      ></span>

      <span class="truncate">
        {{ provider.label }}
      </span>

      <span
        v-if="activeProvider === provider.id"
        class="material-symbols-outlined animate-spin text-[16px] text-orange-500 dark:text-orange-300"
      >
        progress_activity
      </span>
    </button>
  </div>
</template>