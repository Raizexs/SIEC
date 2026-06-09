<script setup>
import { ref, computed, onMounted, watch, defineAsyncComponent, provide } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import { useLayoutManager } from '../composables/useLayoutManager';
import { useBilling } from '../composables/useBilling';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  usePreferencesDraft,
  PREFERENCES_DRAFT_KEY,
} from '../composables/usePreferencesDraft';
import ConfirmDialog from '../components/settings/ConfirmDialog.vue';
import {
  ArrowLeft,
  User2,
  ShieldCheck,
  SlidersHorizontal,
  Plug2,
  CreditCard,
  CheckCircle2,
} from 'lucide-vue-next';
import AppRail from '../components/shell/AppRail.vue';
import BillingPlansSection from '../components/billing/BillingPlansSection.vue';
import { useI18n } from '../composables/useI18n';

const SettingsProfileCard = defineAsyncComponent(() =>
  import('../components/settings/SettingsProfileCard.vue'),
);
const SettingsSecuritySection = defineAsyncComponent(() =>
  import('../components/settings/SettingsSecuritySection.vue'),
);
const SettingsAppearancePanel = defineAsyncComponent(() =>
  import('../components/settings/SettingsAppearancePanel.vue'),
);
const SettingsPreferencesPanel = defineAsyncComponent(() =>
  import('../components/settings/SettingsPreferencesPanel.vue'),
);
const SettingsExportSection = defineAsyncComponent(() =>
  import('../components/settings/SettingsExportSection.vue'),
);
const SettingsPreferencesSaveBar = defineAsyncComponent(() =>
  import('../components/settings/SettingsPreferencesSaveBar.vue'),
);
const SettingsIntegrationsCards = defineAsyncComponent(() =>
  import('../components/settings/SettingsIntegrationsCards.vue'),
);

const preferencesDraft = usePreferencesDraft();
provide(PREFERENCES_DRAFT_KEY, preferencesDraft);

const router = useRouter();
const route = useRoute();
const { t, currentLanguage } = useI18n();
const auth = useAuthStore();
const { savedLayouts } = useLayoutManager();
const { fetchBilling } = useBilling();

const tab = ref('profile');
const motionRoot = ref(null);
const pendingTab = ref(null);
const pendingNavigation = ref(null);
const showUnsavedDialog = ref(false);

const tabs = computed(() => {
  void currentLanguage.value;
  return [
    {
      id: 'profile',
      label: t('settingsTabProfile'),
      description: t('settingsTabProfileSub'),
      icon: User2,
    },
    {
      id: 'security',
      label: t('settingsTabSecurity'),
      description: t('settingsTabSecuritySub'),
      icon: ShieldCheck,
    },
    {
      id: 'preferences',
      label: t('settingsTabPreferences'),
      description: t('settingsTabPreferencesSub'),
      icon: SlidersHorizontal,
    },
    {
      id: 'integrations',
      label: t('settingsTabIntegrations'),
      description: t('settingsTabIntegrationsSub'),
      icon: Plug2,
    },
    {
      id: 'billing',
      label: t('settingsTabPlan'),
      description: t('settingsTabPlanSub'),
      icon: CreditCard,
    },
  ];
});

const activeTabMeta = computed(() => {
  return tabs.value.find((item) => item.id === tab.value) || tabs.value[0];
});

const tabHeroDescription = computed(() => {
  void currentLanguage.value;
  if (tab.value === 'profile') return t('settingsTabProfileDesc');
  if (tab.value === 'security') return t('settingsTabSecurityHero');
  if (tab.value === 'preferences') return t('settingsTabPreferencesDesc');
  if (tab.value === 'integrations') return t('settingsTabIntegrationsDesc');
  return t('settingsTabBillingDesc');
});

const planModeBadges = computed(() => {
  void currentLanguage.value;
  const badges = [{ id: 'free', label: t('settingsPlanBadgeFree') }];

  if (!isSupabaseConfigured || !auth.session) {
    badges.push({ id: 'local', label: t('settingsLocalMode') });
  }

  badges.push({ id: 'beta', label: t('settingsPlanBadgeBeta') });

  return badges;
});

const savedLayoutsCount = computed(() => savedLayouts.value?.length ?? 0);

useProMotion(motionRoot, { skipIntro: true });

const requestTab = (nextTab) => {
  if (
    tab.value === 'preferences' &&
    nextTab !== 'preferences' &&
    preferencesDraft.isDirty.value
  ) {
    pendingTab.value = nextTab;
    showUnsavedDialog.value = true;
    return;
  }
  tab.value = nextTab;
};

const finishUnsavedNavigation = () => {
  if (pendingNavigation.value) {
    const nav = pendingNavigation.value;
    pendingNavigation.value = null;
    nav();
    return;
  }
  if (pendingTab.value) {
    tab.value = pendingTab.value;
    pendingTab.value = null;
  }
};

const confirmUnsavedSave = () => {
  try {
    preferencesDraft.commit();
    showUnsavedDialog.value = false;
    finishUnsavedNavigation();
  } catch (error) {
    preferencesDraft.markErrorMessage(
      t('settingsSaveFailed', { message: error.message }),
    );
    showUnsavedDialog.value = false;
  }
};

const confirmUnsavedDiscard = () => {
  preferencesDraft.revert();
  showUnsavedDialog.value = false;
  finishUnsavedNavigation();
};

const cancelUnsavedDialog = () => {
  pendingTab.value = null;
  pendingNavigation.value = null;
  showUnsavedDialog.value = false;
};

onMounted(async () => {
  preferencesDraft.syncFromSaved();
  await auth.refreshFactors();
});

onBeforeRouteLeave((_to, _from, next) => {
  if (tab.value !== 'preferences' || !preferencesDraft.isDirty.value) {
    next();
    return;
  }
  pendingNavigation.value = () => next();
  showUnsavedDialog.value = true;
  next(false);
});

watch(
  () => route.query.tab,
  (incoming) => {
    if (typeof incoming === 'string' && tabs.value.some((item) => item.id === incoming)) {
      tab.value = incoming;
    }
  },
  { immediate: true },
);

watch(
  tab,
  (value) => {
    if (value === 'billing') {
      fetchBilling();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    ref="motionRoot"
    class="flex min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
  >
    <AppRail active="settings" />

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Header -->
      <header
        class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-black/20"
        data-motion="hero"
      >
        <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-colors duration-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-900/70 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
            @click="router.back()"
          >
            <ArrowLeft class="h-4 w-4" :stroke-width="2.2" />
            {{ t('settingsBack') }}
          </button>

          <div class="min-w-0">
            <p
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              {{ t('settingsControlCenter') }}
            </p>

            <h1 class="mt-0.5 truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
              {{ t('settingsTitle') }}
            </h1>
          </div>
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto">
        <div
          class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px,1fr] lg:px-8 lg:py-10"
          data-motion="section"
        >
          <!-- Tabs sidebar -->
          <aside
            data-motion="card"
            class="self-start"
          >
            <nav
              class="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/85 p-4 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              :aria-label="t('settingsSectionsAria')"
            >
              <div class="space-y-2">
                <button
                  v-for="item in tabs"
                  :key="item.id"
                  type="button"
                  class="group flex min-h-[68px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors duration-200"
                  :class="
                    tab === item.id
                      ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm shadow-orange-500/10 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-900/70 dark:hover:text-slate-100'
                  "
                  @click="requestTab(item.id)"
                >
                  <span
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-colors duration-200"
                    :class="
                      tab === item.id
                        ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-300'
                        : 'border-slate-200 bg-white text-slate-500 group-hover:border-orange-200 group-hover:text-orange-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:group-hover:border-orange-900/60 dark:group-hover:text-orange-300'
                    "
                  >
                    <component
                      :is="item.icon"
                      class="h-[18px] w-[18px]"
                      :stroke-width="2.2"
                    />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-black tracking-tight">
                      {{ item.label }}
                    </span>
                    <span
                      class="mt-0.5 block truncate text-xs font-medium"
                      :class="
                        tab === item.id
                          ? 'text-orange-700/75 dark:text-orange-300/75'
                          : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      {{ item.description }}
                    </span>
                  </span>
                </button>
              </div>
            </nav>
          </aside>

          <!-- Content -->
          <section data-motion="section" class="min-w-0 space-y-6">
            <!-- Section hero -->
            <header
              class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
            >
              <div
                class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
              ></div>

              <div class="relative z-10 flex items-start gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <component :is="activeTabMeta.icon" class="h-5 w-5" :stroke-width="2.3" />
                </div>

                <div>
                  <p
                    class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                  >
                    {{ t('settingsSectionPanel') }}
                  </p>

                  <h2 class="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                    {{ activeTabMeta.label }}
                  </h2>

                  <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {{ tabHeroDescription }}
                  </p>
                </div>
              </div>
            </header>

            <!-- Lazy-loaded tab components -->
            <SettingsProfileCard v-if="tab === 'profile'" />
            <SettingsSecuritySection v-if="tab === 'security'" />
            <div v-if="tab === 'preferences'" class="space-y-4">
              <SettingsAppearancePanel />
              <SettingsPreferencesPanel />
              <SettingsExportSection />
              <SettingsPreferencesSaveBar />
            </div>
            <SettingsIntegrationsCards v-if="tab === 'integrations'" />

            <!-- Billing / Plan (inline) -->
            <div v-if="tab === 'billing'" class="space-y-6">
              <article
                class="relative overflow-hidden rounded-3xl border border-orange-200/90 bg-orange-50/80 p-6 shadow-xl shadow-orange-500/10 backdrop-blur-xl dark:border-orange-900/50 dark:bg-orange-950/25 dark:shadow-black/30"
              >
                <div
                  class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-400/25 blur-3xl"
                ></div>
                <div class="relative z-10">
                  <div class="flex flex-wrap items-center gap-2">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.16em] text-orange-800 dark:text-orange-200"
                    >
                      {{ t('settingsUsageSystem') }}
                    </p>
                    <span
                      v-for="b in planModeBadges"
                      :key="b.id"
                      class="inline-flex items-center rounded-full border border-orange-300/80 bg-white/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight text-orange-800 shadow-sm dark:border-orange-800/80 dark:bg-orange-950/50 dark:text-orange-200"
                    >
                      {{ b.label }}
                    </span>
                  </div>
                  <h2 class="mt-2 text-3xl font-black tracking-tight text-orange-950 dark:text-orange-50">
                    {{ t('settingsPlanFree') }}
                  </h2>
                  <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-orange-900/85 dark:text-orange-100/85">
                    {{ t('settingsPlanLocal') }}
                  </p>

                  <dl class="mt-6 grid gap-3 sm:grid-cols-2">
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        {{ t('settingsLocalProjects') }}
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        {{ t('settingsPlanLocalSession') }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        {{ t('settingsSavedLayouts') }}
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        {{ t('settingsPlanLayouts', { count: savedLayoutsCount }) }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        {{ t('settingsExports') }}
                      </dt>
                      <dd class="mt-1 text-sm font-bold leading-snug text-orange-950 dark:text-orange-50">
                        {{ t('settingsPlanExports') }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        {{ t('settingsCollaborators') }}
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        {{ t('settingsNotAvailableFree') }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 sm:col-span-2 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        {{ t('settingsLastSync') }}
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        {{
                          auth.session
                            ? t('settingsSessionSupabase')
                            : t('settingsSessionLocal')
                        }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>

              <BillingPlansSection />

              <article
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <header
                  class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
                >
                  <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                    {{ t('settingsProLimits') }}
                  </h3>
                  <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ t('settingsProRoadmap') }}
                  </p>
                </header>
                <ul class="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  <li
                    v-for="item in [
                      t('settingsProUnlimited'),
                      t('settingsProHistory'),
                      t('settingsProBim'),
                      t('settingsProCollab'),
                      t('settingsProSupport'),
                    ]"
                    :key="item"
                    class="flex items-start gap-3 px-5 py-3.5"
                  >
                    <CheckCircle2
                      class="mt-0.5 h-4 w-4 shrink-0 text-orange-500 dark:text-orange-300"
                      :stroke-width="2.2"
                    />
                    <span class="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                      {{ item }}
                    </span>
                  </li>
                </ul>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>

  <ConfirmDialog
    :open="showUnsavedDialog"
    :title="t('settingsUnsavedTitle')"
    :message="t('settingsPendingChanges')"
    :confirm-label="t('settingsSavePreferences')"
    :cancel-label="t('settingsDiscardChanges')"
    variant="primary"
    @confirm="confirmUnsavedSave"
    @cancel="confirmUnsavedDiscard"
    @dismiss="cancelUnsavedDialog"
  />
</template>
