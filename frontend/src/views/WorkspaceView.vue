<script setup>
import logger from '../utils/logger.js';
/**
 * Workspace — wraps the existing 3D editor experience.
 *
 * Premium language:
 * - Auth-safe workspace shell.
 * - Lightweight loading guard.
 * - Project context normalization.
 * - Smooth visual continuity with the rest of SIEC.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EditorShell from '../components/EditorShell.vue';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import { useI18n } from '../composables/useI18n';
import {
  Loader2,
  ShieldAlert,
  Building2,
  ArrowLeft,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { t } = useI18n();

const motionRoot = ref(null);
const isPreparing = ref(true);
const workspaceError = ref('');

useProMotion(motionRoot, {
  skipIntro: true,
});

const projectId = computed(() => {
  const raw = route.params.projectId;

  if (Array.isArray(raw)) {
    return raw[0] || null;
  }

  return raw || null;
});

const isNewProject = computed(() => {
  return !projectId.value || route.query.new === '1';
});

const workspaceLabel = computed(() => {
  if (isNewProject.value) return t('wsNewEstimate');
  return `Proyecto ${projectId.value}`;
});

const prepareWorkspace = async () => {
  workspaceError.value = '';
  isPreparing.value = true;

  try {
    if (!auth.isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (projectId.value) {
      logger.debug('[workspace] Loading project', projectId.value);
    }

    // Mantiene una micro-pausa visual para evitar flash de layout
    // cuando EditorShell monta muchas piezas pesadas al mismo tiempo.
    await Promise.resolve();
  } catch (error) {
    workspaceError.value =
      error?.message || 'No se pudo preparar el workspace.';
  } finally {
    isPreparing.value = false;
  }
};

const goDashboard = () => {
  router.push('/dashboard');
};

onMounted(prepareWorkspace);

watch(
  () => route.params.projectId,
  () => {
    prepareWorkspace();
  },
);

watch(
  () => auth.isAuthenticated,
  (value) => {
    if (!value && route.name !== 'login') {
      router.replace('/login');
    }
  },
);
</script>

<template>
  <main
    ref="motionRoot"
    class="siec-app-canvas min-h-screen text-slate-950 transition-colors duration-300 dark:text-slate-100"
  >
    <!-- Preparing state -->
    <section
      v-if="isPreparing"
      class="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      data-motion="hero"
    >
      <div
        class="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
      ></div>

      <div
        class="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5"
      ></div>

      <div
        class="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 text-center shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/35"
      >
        <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

        <div class="p-8">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <Loader2 class="h-7 w-7 animate-spin" :stroke-width="2.2" />
          </div>

          <p
            class="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            {{ t('wsPreparing') }}
          </p>

          <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ workspaceLabel }}
          </h1>

          <p class="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {{ t('wsLoadingEditor') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Error state -->
    <section
      v-else-if="workspaceError"
      class="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      data-motion="hero"
    >
      <div
        class="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-red-500/10 blur-3xl dark:bg-red-400/10"
      ></div>

      <div
        class="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white/90 text-center shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-red-900/70 dark:bg-slate-950/90 dark:shadow-black/35"
      >
        <div class="h-1 w-full bg-gradient-to-r from-red-500 via-orange-500 to-slate-900 dark:to-orange-300"></div>

        <div class="p-8">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
          >
            <ShieldAlert class="h-7 w-7" :stroke-width="2.2" />
          </div>

          <p
            class="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-red-500 dark:text-red-300"
          >
            {{ t('wsUnavailable') }}
          </p>

          <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
            {{ t('wsCantOpen') }}
          </h1>

          <p class="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {{ workspaceError }}
          </p>

          <button
            type="button"
            class="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            @click="goDashboard"
          >
            <ArrowLeft class="h-4 w-4" :stroke-width="2.2" />
            {{ t('wsBackDashboard') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Editor -->
    <section
      v-else
      class="relative min-h-screen"
      data-motion="section"
    >
      <EditorShell :project-id="projectId" />
    </section>
  </main>
</template>