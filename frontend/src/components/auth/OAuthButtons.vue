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
  {
    id: 'github',
    label: 'GitHub',
    icon: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.92-.39 2.91-.39s1.99.13 2.91.39c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>`,
  },
  {
    id: 'azure',
    label: 'Microsoft',
    icon: `<svg viewBox="0 0 23 23" width="17" height="17" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>`,
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
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
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