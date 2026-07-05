<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  provide,
  nextTick,
} from "vue";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";
import { gsap } from "gsap";
import { useAuthStore } from "../stores/auth";
import { useProMotion } from "../composables/useProMotion";
import { useMotionPreferenceSync } from "../composables/useMotionPreferenceSync";
import {
  bindCardHover,
  filterMotionTargets,
  setMotionFinalState,
  SETTINGS_TAB_REVEAL,
  introMotionReveal,
} from "../composables/useMotionContext";
import {
  prefersReducedMotion,
  getMotionProfile,
  waitForNextFrame,
} from "../design/motionTokens";
import { useLayoutManager } from "../composables/useLayoutManager";
import { useBilling } from "../composables/useBilling";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import {
  usePreferencesDraft,
  PREFERENCES_DRAFT_KEY,
} from "../composables/usePreferencesDraft";
import ConfirmDialog from "../components/settings/ConfirmDialog.vue";
import SettingsAppearancePanel from "../components/settings/SettingsAppearancePanel.vue";
import SettingsPreferencesPanel from "../components/settings/SettingsPreferencesPanel.vue";
import SettingsExportSection from "../components/settings/SettingsExportSection.vue";
import SettingsPreferencesSaveBar from "../components/settings/SettingsPreferencesSaveBar.vue";
import SettingsIntegrationsCards from "../components/settings/SettingsIntegrationsCards.vue";
import SettingsProfileCard from "../components/settings/SettingsProfileCard.vue";
import SettingsSecuritySection from "../components/settings/SettingsSecuritySection.vue";
import SettingsPrivacySection from "../components/settings/SettingsPrivacySection.vue";
import {
  ArrowLeft,
  User2,
  ShieldCheck,
  SlidersHorizontal,
  Plug2,
  CreditCard,
  CheckCircle2,
} from "lucide-vue-next";
import AppRail from "../components/shell/AppRail.vue";
import BillingPlansSection from "../components/billing/BillingPlansSection.vue";
import { useI18n } from "../composables/useI18n";

const preferencesDraft = usePreferencesDraft();
provide(PREFERENCES_DRAFT_KEY, preferencesDraft);

const router = useRouter();
const route = useRoute();
const { t, currentLanguage } = useI18n();
const auth = useAuthStore();
const { savedLayouts } = useLayoutManager();
const {
  fetchBilling,
  plan,
  limits,
  usage,
  isFree,
  isPro,
  isProPlus,
  hasMarketplaceAccess,
} = useBilling();

const SETTINGS_TAB_IDS = [
  "profile",
  "security",
  "privacy",
  "preferences",
  "integrations",
  "billing",
];

const resolveTab = (value) =>
  typeof value === "string" && SETTINGS_TAB_IDS.includes(value)
    ? value
    : "profile";

const tab = ref(resolveTab(route.query.tab));
const motionRoot = ref(null);
const tabPanelRef = ref(null);
const tabContentRef = ref(null);
const pendingTab = ref(null);
const pendingNavigation = ref(null);
const showUnsavedDialog = ref(false);

const tabs = computed(() => {
  void currentLanguage.value;
  return [
    {
      id: "profile",
      label: t("settingsTabProfile"),
      description: t("settingsTabProfileSub"),
      icon: User2,
    },
    {
      id: "security",
      label: t("settingsTabSecurity"),
      description: t("settingsTabSecuritySub"),
      icon: ShieldCheck,
    },
    {
      id: "privacy",
      label: "Privacidad",
      description: "Datos personales y derechos",
      icon: ShieldCheck,
    },
    {
      id: "preferences",
      label: t("settingsTabPreferences"),
      description: t("settingsTabPreferencesSub"),
      icon: SlidersHorizontal,
    },
    {
      id: "integrations",
      label: t("settingsTabIntegrations"),
      description: t("settingsTabIntegrationsSub"),
      icon: Plug2,
    },
    {
      id: "billing",
      label: t("settingsTabPlan"),
      description: t("settingsTabPlanSub"),
      icon: CreditCard,
    },
  ];
});

const activeTabMeta = computed(() => {
  return tabs.value.find((item) => item.id === tab.value) || tabs.value[0];
});

const tabHeroDescription = computed(() => {
  void currentLanguage.value;
  if (tab.value === "profile") return t("settingsTabProfileDesc");
  if (tab.value === "security") return t("settingsTabSecurityHero");
  if (tab.value === "privacy")
    return "Gestiona consentimientos, exporta tus datos o elimina tu cuenta.";
  if (tab.value === "preferences") return t("settingsTabPreferencesDesc");
  if (tab.value === "integrations") return t("settingsTabIntegrationsDesc");
  return t("settingsTabBillingDesc");
});

const planModeBadges = computed(() => {
  void currentLanguage.value;
  const badges = [];

  if (isProPlus.value) {
    badges.push({ id: "pro_plus", label: t("settingsPlanBadgeProPlus") });
  } else if (isPro.value) {
    badges.push({ id: "pro", label: t("settingsPlanBadgePro") });
  } else {
    badges.push({ id: "free", label: t("settingsPlanBadgeFree") });
  }

  if (!isSupabaseConfigured || !auth.session) {
    badges.push({ id: "local", label: t("settingsLocalMode") });
  }

  badges.push({ id: "beta", label: t("settingsPlanBadgeBeta") });

  return badges;
});

const activePlanTitle = computed(() => {
  void currentLanguage.value;
  if (isProPlus.value) return t("settingsPlanProPlus");
  if (isPro.value) return t("settingsPlanPro");
  return t("settingsPlanFree");
});

const activePlanDescription = computed(() => {
  void currentLanguage.value;
  if (isProPlus.value) return t("settingsPlanProPlusDesc");
  if (isPro.value) return t("settingsPlanProDesc");
  return t("settingsPlanLocal");
});

const formatUsageLimit = (used, max) => {
  if (max == null) return `${used ?? 0} · ${t("settingsPlanUnlimited")}`;
  return `${used ?? 0} / ${max}`;
};

const usageCardRows = computed(() => {
  void currentLanguage.value;
  void plan.value;

  const showLocalFreeCard =
    isFree.value && (!isSupabaseConfigured || !auth.session);

  if (showLocalFreeCard) {
    return [
      {
        label: t("settingsLocalProjects"),
        value: t("settingsPlanLocalSession"),
      },
      {
        label: t("settingsSavedLayouts"),
        value: t("settingsPlanLayouts", { count: savedLayoutsCount.value }),
      },
      {
        label: t("settingsExports"),
        value: t("settingsPlanExports"),
      },
      {
        label: t("settingsCollaborators"),
        value: t("settingsNotAvailableFree"),
      },
      {
        label: t("settingsLastSync"),
        value: auth.session
          ? t("settingsSessionSupabase")
          : t("settingsSessionLocal"),
        span: 2,
      },
    ];
  }

  const rows = [
    {
      label: t("settingsPlanActiveProjects"),
      value: formatUsageLimit(
        usage.value.active_projects,
        limits.value.max_active_projects,
      ),
    },
    {
      label: t("settingsPlanSavedProjects"),
      value: formatUsageLimit(
        usage.value.saved_projects,
        limits.value.max_saved_projects,
      ),
    },
    {
      label: t("settingsPlanExportsMonth"),
      value: formatUsageLimit(
        usage.value.exports_this_month,
        limits.value.max_exports_per_month,
      ),
    },
  ];

  if (hasMarketplaceAccess.value) {
    rows.push({
      label: t("settingsPlanMarketplace"),
      value: t("settingsPlanMarketplaceActive"),
    });
  } else {
    rows.push({
      label: t("settingsCollaborators"),
      value: t("settingsCollabNotAvailable", {
        plan: isPro.value ? "Pro" : "Free",
      }),
    });
  }

  rows.push({
    label: t("settingsLastSync"),
    value: auth.session
      ? t("settingsSessionSupabase")
      : t("settingsSessionLocal"),
    span: 2,
  });

  return rows;
});

const savedLayoutsCount = computed(() => savedLayouts.value?.length ?? 0);

const proPlusRoadmapItems = computed(() => {
  void currentLanguage.value;
  return [
    t("settingsProPlusMarketplace"),
    t("settingsProPlusIntegrations"),
    t("settingsProPlusBim"),
    t("settingsProPlusCollab"),
    t("settingsProPlusPricing"),
  ];
});

useProMotion(motionRoot, {
  delayUntilRoute: true,
  revealOptions: { levels: ["hero"], pace: "snappy" },
});
useMotionPreferenceSync(motionRoot);
useMotionPreferenceSync(tabContentRef);

let tabRevealSeq = 0;
let tabRevealReady = false;
let unbindSectionHover = null;
let unbindCardHover = null;
let unbindItemHover = null;

const bindSettingsHover = () => {
  unbindSectionHover?.();
  unbindCardHover?.();
  unbindItemHover?.();

  const root = tabContentRef.value;
  if (!root) return;

  unbindSectionHover = bindCardHover(
    filterMotionTargets(root.querySelectorAll('[data-motion="section"]'), root),
    { lift: -4 },
  );
  unbindCardHover = bindCardHover(
    filterMotionTargets(root.querySelectorAll('[data-motion="card"]'), root),
    { lift: -5 },
  );
  unbindItemHover = bindCardHover(
    filterMotionTargets(root.querySelectorAll('[data-motion="item"]'), root),
    { lift: -3 },
  );
};

const refreshSettingsHover = () => bindSettingsHover();

const pulseTabHeader = () => {
  if (prefersReducedMotion() || !tabPanelRef.value) return;
  const header = tabPanelRef.value.querySelector("header");
  if (!header) return;
  const profile = getMotionProfile();
  gsap.killTweensOf(header);
  gsap.fromTo(
    header,
    { autoAlpha: 0.98, x: 4 },
    {
      autoAlpha: 1,
      x: 0,
      duration: profile.duration.fast * 0.85,
      ease: profile.ease.emphasizedOut,
      clearProps: "transform,opacity,filter",
    },
  );
};

const revealTabContent = async ({ pulseHeader = false } = {}) => {
  const seq = ++tabRevealSeq;
  await nextTick();
  await waitForNextFrame();
  if (seq !== tabRevealSeq) return;

  const root = tabContentRef.value;
  if (!root) return;

  const targets = filterMotionTargets(
    root.querySelectorAll("[data-motion]"),
    root,
  );

  if (prefersReducedMotion()) {
    setMotionFinalState(targets);
    bindSettingsHover();
    window.dispatchEvent(
      new CustomEvent("siec:settings-tab-revealed", {
        detail: { tab: tab.value },
      }),
    );
    if (pulseHeader) pulseTabHeader();
    return;
  }

  introMotionReveal(root, SETTINGS_TAB_REVEAL);
  bindSettingsHover();

  window.dispatchEvent(
    new CustomEvent("siec:settings-tab-revealed", {
      detail: { tab: tab.value },
    }),
  );

  if (pulseHeader) pulseTabHeader();
};

watch(tab, () => {
  if (!tabRevealReady) return;
  revealTabContent({ pulseHeader: true });
});

const requestTab = (nextTab) => {
  if (
    tab.value === "preferences" &&
    nextTab !== "preferences" &&
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
      t("settingsSaveFailed", { message: error.message }),
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
  void auth.refreshFactors();
  window.addEventListener("siec:settings-hover-refresh", refreshSettingsHover);
  await nextTick();
  await revealTabContent({ pulseHeader: false });
  tabRevealReady = true;
});

onBeforeRouteLeave((_to, _from, next) => {
  if (tab.value !== "preferences" || !preferencesDraft.isDirty.value) {
    next();
    return;
  }
  pendingNavigation.value = () => next();
  showUnsavedDialog.value = true;
  next(false);
});

onBeforeUnmount(() => {
  window.removeEventListener(
    "siec:settings-hover-refresh",
    refreshSettingsHover,
  );
  unbindSectionHover?.();
  unbindCardHover?.();
  unbindItemHover?.();
});

watch(
  () => route.query.tab,
  (incoming) => {
    const next = resolveTab(incoming);
    if (next !== tab.value) tab.value = next;
  },
);

watch(tab, (value) => {
  if (value === "billing") fetchBilling(true);
});
</script>

<template>
  <div
    ref="motionRoot"
    data-siec-app-shell
    class="flex min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
  >
    <AppRail active="settings" />

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Header -->
      <header
        class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-black/20"
        data-motion="hero"
      >
        <div
          class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm transition-colors duration-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-900/70 dark:hover:bg-orange-950/30 dark:hover:text-orange-300"
            @click="router.back()"
          >
            <ArrowLeft class="h-4 w-4" :stroke-width="2.2" />
            {{ t("settingsBack") }}
          </button>

          <div class="min-w-0">
            <p
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              {{ t("settingsControlCenter") }}
            </p>

            <h1
              class="mt-0.5 truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100"
            >
              {{ t("settingsTitle") }}
            </h1>
          </div>
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto">
        <div
          class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px,1fr] lg:px-8 lg:py-10"
        >
          <!-- Tabs sidebar -->
          <aside class="self-start">
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
                    <span
                      class="block truncate text-sm font-black tracking-tight"
                    >
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
          <section ref="tabPanelRef" class="min-w-0 space-y-6">
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
                  <component
                    :is="activeTabMeta.icon"
                    class="h-5 w-5"
                    :stroke-width="2.3"
                  />
                </div>

                <div>
                  <p
                    class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                  >
                    {{ t("settingsSectionPanel") }}
                  </p>

                  <h2
                    class="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                  >
                    {{ activeTabMeta.label }}
                  </h2>

                  <p
                    class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
                  >
                    {{ tabHeroDescription }}
                  </p>
                </div>
              </div>
            </header>

            <!-- Lazy-loaded tab components -->
            <div ref="tabContentRef" data-no-motion class="space-y-6">
              <SettingsProfileCard v-if="tab === 'profile'" />
              <SettingsSecuritySection v-if="tab === 'security'" />
              <SettingsPrivacySection v-else-if="tab === 'privacy'" />
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
                        {{ t("settingsUsageSystem") }}
                      </p>
                      <span
                        v-for="b in planModeBadges"
                        :key="b.id"
                        class="inline-flex items-center rounded-full border border-orange-300/80 bg-white/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight text-orange-800 shadow-sm dark:border-orange-800/80 dark:bg-orange-950/50 dark:text-orange-200"
                      >
                        {{ b.label }}
                      </span>
                    </div>
                    <h2
                      class="mt-2 text-3xl font-black tracking-tight text-orange-950 dark:text-orange-50"
                    >
                      {{ activePlanTitle }}
                    </h2>
                    <p
                      class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-orange-900/85 dark:text-orange-100/85"
                    >
                      {{ activePlanDescription }}
                    </p>

                    <dl class="mt-6 grid gap-3 sm:grid-cols-2">
                      <div
                        v-for="row in usageCardRows"
                        :key="row.label"
                        class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                        :class="row.span === 2 ? 'sm:col-span-2' : ''"
                      >
                        <dt
                          class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80"
                        >
                          {{ row.label }}
                        </dt>
                        <dd
                          class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50"
                        >
                          {{ row.value }}
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
                    <h3
                      class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100"
                    >
                      {{ t("settingsProPlusLimits") }}
                    </h3>
                    <p
                      class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400"
                    >
                      {{ t("settingsProPlusRoadmap") }}
                    </p>
                  </header>
                  <ul
                    class="divide-y divide-slate-200/80 dark:divide-slate-800/80"
                  >
                    <li
                      v-for="item in proPlusRoadmapItems"
                      :key="item"
                      class="flex items-start gap-3 px-5 py-3.5"
                    >
                      <CheckCircle2
                        class="mt-0.5 h-4 w-4 shrink-0 text-orange-500 dark:text-orange-300"
                        :stroke-width="2.2"
                      />
                      <span
                        class="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300"
                      >
                        {{ item }}
                      </span>
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          </section>
        </div>
      </main>
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
  </div>
</template>
