<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  LayoutTemplate,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  LogOut,
  SlidersHorizontal,
  PencilRuler,
  CircleDollarSign,
  FileDown,
} from 'lucide-vue-next';
import PresetLayoutList from './PresetLayoutList.vue';
import { useI18n } from '../../composables/useI18n';
import { useAuthStore } from '../../stores/auth';
import { useBodyScrollLock } from '../../composables/useBodyScrollLock';

const props = defineProps({
  currentStep: { type: String, default: 'configure' },
  drawer: { type: String, default: null },
});

const emit = defineEmits(['apply-preset', 'go-step', 'update:drawer']);

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const internalDrawer = ref(null);
const drawerOpen = computed({
  get: () => props.drawer ?? internalDrawer.value,
  set: (value) => {
    internalDrawer.value = value;
    emit('update:drawer', value);
  },
});

useBodyScrollLock(computed(() => Boolean(drawerOpen.value)));

const stepItems = computed(() => [
  { id: 'configure', label: t('wsStepConfigure'), icon: SlidersHorizontal },
  { id: 'design', label: t('wsStepDesign'), icon: PencilRuler },
  { id: 'budget', label: t('wsStepBudget'), icon: CircleDollarSign },
  { id: 'export', label: t('wsStepExport'), icon: FileDown },
]);

const currentStepLabel = computed(
  () => stepItems.value.find((step) => step.id === props.currentStep)?.label ?? '',
);

const openDrawer = (panel) => {
  drawerOpen.value = panel;
};

const closeDrawer = () => {
  drawerOpen.value = null;
};

const applyPreset = (layout) => {
  emit('apply-preset', layout);
  closeDrawer();
};

const goToStep = (stepId) => {
  emit('go-step', stepId);
  closeDrawer();
};

const navTo = (path) => {
  closeDrawer();
  router.push(path);
};

const logout = async () => {
  closeDrawer();
  await authStore.logout();
  router.push('/login');
};

defineExpose({ openDrawer, closeDrawer });
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 lg:hidden"
    aria-label="Navegación móvil del workspace"
  >
    <div class="mx-auto flex max-w-lg items-stretch justify-between gap-1">
      <button
        type="button"
        class="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition"
        :class="
          drawerOpen === 'layouts'
            ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
        "
        @click="openDrawer(drawerOpen === 'layouts' ? null : 'layouts')"
      >
        <LayoutTemplate class="h-4 w-4" :stroke-width="2.2" />
        <span class="truncate">{{ t('mobileNavLayouts') }}</span>
      </button>

      <div
        class="flex min-w-0 flex-[1.2] flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <span class="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Paso</span>
        <span class="truncate text-[10px] font-black text-slate-800 dark:text-slate-100">
          {{ currentStepLabel }}
        </span>
      </div>

      <button
        type="button"
        class="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition"
        :class="
          drawerOpen === 'menu'
            ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
        "
        @click="openDrawer(drawerOpen === 'menu' ? null : 'menu')"
      >
        <Menu class="h-4 w-4" :stroke-width="2.2" />
        <span class="truncate">{{ t('mobileNavMenu') }}</span>
      </button>
    </div>
  </nav>

  <Teleport to="body">
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-[60] lg:hidden"
      role="dialog"
      aria-modal="true"
      :aria-label="drawerOpen === 'layouts' ? t('presetLayouts') : t('mobileNavMenu')"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Cerrar"
        @click="closeDrawer"
      />

      <div
        class="absolute inset-x-0 bottom-0 max-h-[min(82vh,640px)] overflow-hidden rounded-t-[1.35rem] border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        data-scroll-lock-scroll
      >
        <div class="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
          <h2 class="text-sm font-black text-slate-900 dark:text-slate-100">
            {{ drawerOpen === 'layouts' ? t('presetLayouts') : t('mobileNavMenu') }}
          </h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300"
            @click="closeDrawer"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="overflow-y-auto px-4 py-4" style="max-height: calc(min(82vh, 640px) - 56px)">
          <PresetLayoutList
            v-if="drawerOpen === 'layouts'"
            :show-heading="false"
            compact
            @apply-preset="applyPreset"
          />

          <div v-else class="space-y-4">
            <section>
              <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Flujo
              </p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="step in stepItems"
                  :key="step.id"
                  type="button"
                  class="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-bold transition"
                  :class="
                    currentStep === step.id
                      ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                  "
                  @click="goToStep(step.id)"
                >
                  <component :is="step.icon" class="h-4 w-4 shrink-0" :stroke-width="2.2" />
                  {{ step.label }}
                </button>
              </div>
            </section>

            <section>
              <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Aplicación
              </p>
              <div class="space-y-1.5">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  @click="navTo('/dashboard')"
                >
                  <LayoutDashboard class="h-4 w-4" :stroke-width="2.2" />
                  Dashboard
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  @click="navTo('/settings')"
                >
                  <Settings class="h-4 w-4" :stroke-width="2.2" />
                  {{ t('settings') }}
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-[11px] font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                  @click="logout"
                >
                  <LogOut class="h-4 w-4" :stroke-width="2.2" />
                  {{ t('logout') }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
