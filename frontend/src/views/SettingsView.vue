<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import { useLayoutManager } from '../composables/useLayoutManager';
import { getMotionPreference, setMotionPreference } from '../design/motionTokens';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  ArrowLeft,
  User2,
  ShieldCheck,
  SlidersHorizontal,
  Plug2,
  CreditCard,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  LogOut,
  Camera,
  Loader2,
  Mail,
  Building2,
  Smartphone,
  KeyRound,
  AlertTriangle,
  ExternalLink,
  BadgeCheck,
  Database,
  Cloud,
  FolderSync,
  Landmark,
  PenLine,
  LayoutGrid,
  Map,
  Tags,
  Box,
  Columns2,
  FileText,
  Coins,
  Info,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-vue-next';
import AppRail from '../components/shell/AppRail.vue';
import { useI18n } from '../composables/useI18n';
import {
  useProductPreferences,
} from '../composables/useProductPreferences';

const { productPreferences, saveProductPreferences: persistProductPreferences } =
  useProductPreferences();

const router = useRouter();
const route = useRoute();
const { t, currentLanguage } = useI18n();
const auth = useAuthStore();
const { savedLayouts } = useLayoutManager();

const tab = ref('profile');
const fullName = ref(auth.fullName);
const company = ref(auth.profile?.company || auth.user?.user_metadata?.company || '');

/** Línea “Rol — Empresa” en la tarjeta de identidad (refleja el input en vivo y datos persistidos). */
const profilePublicRolEmpresa = computed(() => {
  const raw = auth.role || 'usuario';
  const roleLabel = String(raw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const empresa =
    (company.value || '').trim() ||
    auth.profile?.company ||
    auth.user?.user_metadata?.company ||
    '';
  return empresa ? `${roleLabel} — ${empresa}` : roleLabel;
});
const mfaCode = ref('');
const mfaStatus = ref('idle');
const mfaError = ref('');
const isSavingProfile = ref(false);
const profileMessage = ref('');
const profileMessageType = ref('success');
const avatarPreview = ref(auth.avatarUrl);
const motionRoot = ref(null);
const motionPref = ref(getMotionPreference());

const preferenceMessage = ref('');
const preferenceMessageType = ref('success');

const openPreferenceSections = ref({
  experience: true,
  editor: false,
  estimation: false,
  export: false,
});

const togglePreferenceSection = (section) => {
  openPreferenceSections.value[section] = !openPreferenceSections.value[section];
};

const confirmState = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: '',
  variant: 'danger',
  /** @type {null | (() => Promise<void>)} */
  action: null,
});

const factors = computed(() => auth.mfaState.factors);

const savedLayoutsCount = computed(() => savedLayouts.value?.length ?? 0);

const planModeBadges = computed(() => {
  void currentLanguage.value;
  const badges = [{ id: 'free', label: 'Free' }];

  if (!isSupabaseConfigured || !auth.session) {
    badges.push({ id: 'local', label: t('settingsLocalMode') });
  }

  badges.push({ id: 'beta', label: 'Beta' });

  return badges;
});

const apiBaseUrl = computed(
  () => import.meta.env.VITE_API_URL || 'http://localhost:8000',
);

const integrationCards = computed(() => {
  void currentLanguage.value;
  const soon = t('settingsComingSoon');

  return [
    {
      id: 'gdrive',
      name: 'Google Drive',
      icon: FolderSync,
      description: t('settingsIntGdriveDesc'),
      status: soon,
      statusVariant: 'muted',
      cta: soon,
      ctaDisabled: true,
      hint: t('settingsIntGdriveHint'),
    },
    {
      id: 'revit',
      name: 'Revit / IFC',
      icon: Landmark,
      description: t('settingsIntRevitDesc'),
      status: soon,
      statusVariant: 'muted',
      cta: soon,
      ctaDisabled: true,
      hint: t('settingsIntRevitHint'),
    },
    {
      id: 'autocad',
      name: 'AutoCAD',
      icon: PenLine,
      description: t('settingsIntAutocadDesc'),
      status: soon,
      statusVariant: 'muted',
      cta: soon,
      ctaDisabled: true,
      hint: t('settingsIntAutocadHint'),
    },
  ];
});

const closeConfirm = () => {
  confirmState.value = {
    open: false,
    title: '',
    message: '',
    confirmLabel: t('settingsConfirm'),
    variant: 'danger',
    action: null,
  };
};

const runConfirmAction = async () => {
  const fn = confirmState.value.action;
  closeConfirm();
  if (typeof fn === 'function') await fn();
};

/** Reemplazo de `window.confirm` para acciones sensibles de seguridad (modal premium en esta vista). */
const openRemoveMfaConfirm = (factorId) => {
  confirmState.value = {
    open: true,
    title: t('settingsMfaRemoveTitle'),
    message: t('settingsMfaRemoveMessage'),
    confirmLabel: t('settingsMfaRemoveConfirm'),
    variant: 'danger',
    action: async () => {
      await auth.unenrollMFA(factorId);
    },
  };
};

const openLogoutAllConfirm = () => {
  confirmState.value = {
    open: true,
    title: t('settingsLogoutAllTitle'),
    message: t('settingsLogoutAllMessage'),
    confirmLabel: t('settingsLogoutAllConfirm'),
    variant: 'danger',
    action: async () => {
      await auth.logoutAllDevices();
      router.push('/login');
    },
  };
};

const saveProductPreferences = () => {
  preferenceMessage.value = '';

  try {
    persistProductPreferences();
    preferenceMessageType.value = 'success';
    preferenceMessage.value = t('settingsSavedPreferences');
  } catch (error) {
    preferenceMessageType.value = 'error';
    preferenceMessage.value = t('settingsSaveFailed', { message: error.message });
  }
};

const applyPresetRoomHeight = (m) => {
  productPreferences.value.useCustomRoomHeight = false;
  productPreferences.value.defaultRoomHeight = m;
};

const materialOptions = [
  { id: 1, label: 'Wood Frame' },
  { id: 2, label: 'Steel Frame' },
  { id: 3, label: 'Masonry' },
  { id: 4, label: 'Concrete' },
];

const preferenceSummary = computed(() => {
  void currentLanguage.value;
  const gridLabel = productPreferences.value.editor.showGrid
    ? t('settingsPrefGridOn')
    : t('settingsPrefGridOff');

  return {
    experience:
      motionPref.value === 'full'
        ? t('settingsMotionFullSummary')
        : motionPref.value === 'reduced'
          ? t('settingsMotionReducedSummary')
          : t('settingsMotionSystemSummary'),

    editor: `${gridLabel} · ${t('settingsPrefView', {
      view: productPreferences.value.editor.initialView,
    })}`,

    estimation: `${productPreferences.value.currency} · ${
      productPreferences.value.unit === 'metric' ? 'm²' : 'ft²'
    } · ${t('settingsPrefContingency', {
      pct: productPreferences.value.contingency,
    })} · ${
      productPreferences.value.includeTax
        ? t('settingsPrefWithTax')
        : t('settingsPrefNoTax')
    } · ${
      materialOptions.find((m) => m.id === productPreferences.value.defaultMaterial)
        ?.label ?? 'Material'
    }`,

    export: `${productPreferences.value.export.preferredFormat} · ${
      productPreferences.value.export.includeMaterialsBreakdown
        ? t('settingsPrefWithBreakdown')
        : t('settingsPrefNoBreakdown')
    } · ${
      productPreferences.value.export.includeSnapshots
        ? t('settingsPrefWithSnapshots')
        : t('settingsPrefNoSnapshots')
    }`,
  };
});

const motionOptions = computed(() => {
  void currentLanguage.value;
  return [
    {
      id: 'system',
      title: t('settingsMotionSystem'),
      description: t('settingsMotionSystemDesc'),
      tone: 'slate',
    },
    {
      id: 'full',
      title: t('settingsMotionFull'),
      description: t('settingsMotionFullDesc'),
      tone: 'orange',
    },
    {
      id: 'reduced',
      title: t('settingsMotionReduced'),
      description: t('settingsMotionReducedDesc'),
      tone: 'muted',
    },
  ];
});

const exportToggleOptions = computed(() => {
  void currentLanguage.value;
  return [
    {
      key: 'includeLogo',
      label: t('settingsLogoReports'),
      sub: t('settingsLogoReportsSub'),
    },
    {
      key: 'includeMaterialsBreakdown',
      label: t('settingsMaterialsBreakdown'),
      sub: t('settingsMaterialsBreakdownSub'),
    },
    {
      key: 'includeUnitPrices',
      label: t('settingsUnitPrices'),
      sub: t('settingsUnitPricesSub'),
    },
    {
      key: 'includeSnapshots',
      label: t('settingsSnapshots'),
      sub: t('settingsSnapshotsSub'),
    },
  ];
});

const proRoadmapItems = computed(() => {
  void currentLanguage.value;
  return [
    t('settingsProUnlimited'),
    t('settingsProHistory'),
    t('settingsProBim'),
    t('settingsProCollab'),
    t('settingsProSupport'),
  ];
});

useProMotion(motionRoot, {
  skipIntro: true,
});

watch(motionPref, (value) => {
  setMotionPreference(value);
});

onMounted(async () => {
  await auth.refreshFactors();
});

watch(
  () => auth.avatarUrl,
  (url) => {
    if (!avatarPreview.value) avatarPreview.value = url;
  },
);

const saveProfile = async () => {
  isSavingProfile.value = true;
  profileMessage.value = '';

  try {
    if (auth.session) {
      const { supabase, isSupabaseConfigured } = await import('../lib/supabaseClient');

      if (isSupabaseConfigured) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName.value,
            company: company.value,
          },
        });
      }
    }

    profileMessageType.value = 'success';
    profileMessage.value = 'Perfil actualizado.';
  } catch (error) {
    profileMessageType.value = 'error';
    profileMessage.value = `Error: ${error.message}`;
  } finally {
    isSavingProfile.value = false;
  }
};

const onAvatarSelected = async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    profileMessageType.value = 'error';
    profileMessage.value = t('settingsInvalidImage');
    return;
  }

  if (file.size > 4 * 1024 * 1024) {
    profileMessageType.value = 'error';
    profileMessage.value = 'La imagen debe pesar menos de 4MB.';
    return;
  }

  try {
    const reader = new FileReader();

    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });

    avatarPreview.value = dataUrl;

    if (auth.session) {
      const { supabase, isSupabaseConfigured } = await import('../lib/supabaseClient');

      if (isSupabaseConfigured) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: dataUrl,
          },
        });

        await auth.loadProfile();
      }
    }

    profileMessageType.value = 'success';
    profileMessage.value = 'Foto de perfil actualizada.';
  } catch (error) {
    profileMessageType.value = 'error';
    profileMessage.value = `Error: ${error.message}`;
  } finally {
    event.target.value = '';
  }
};

const startMFAEnroll = async () => {
  mfaError.value = '';

  const res = await auth.enrollMFA();

  if (res.success) {
    mfaStatus.value = 'qr';
  } else {
    mfaError.value = res.error || t('settingsMfaInvalidCode');
  }
};

const verifyMFA = async () => {
  mfaStatus.value = 'verifying';
  mfaError.value = '';

  const res = await auth.verifyMFAEnroll(mfaCode.value);

  if (res.success) {
    mfaStatus.value = 'done';
    mfaCode.value = '';
  } else {
    mfaError.value = res.error || t('settingsMfaInvalidCode');
    mfaStatus.value = 'qr';
  }
};

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

const avatarInitial = computed(() => {
  const source = fullName.value || auth.fullName || auth.user?.email || 'U';

  return source.charAt(0).toUpperCase();
});

const integrationVariantClass = (variant) => {
  const map = {
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300',
    neutral:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
    warning:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
    muted:
      'border-slate-200 bg-slate-50/80 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
  };

  return map[variant] || map.muted;
};

watch(
  () => route.query.tab,
  (incoming) => {
    if (typeof incoming === 'string' && tabs.value.some((item) => item.id === incoming)) {
      tab.value = incoming;
    }
  },
  {
    immediate: true,
  },
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
          				@click="tab = item.id"
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

            <!-- Profile -->
            <div v-if="tab === 'profile'" class="space-y-6">
              <!-- Identity card -->
              <article
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <header
                  class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
                >
                  <p
                    class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                  >
                    {{ t('settingsIdentity') }}
                  </p>

                  <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                    {{ t('settingsPublicProfile') }}
                  </h3>
                </header>

                <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                  <div class="relative h-20 w-20 shrink-0">
                    <img
                      v-if="avatarPreview || auth.avatarUrl"
                      :src="avatarPreview || auth.avatarUrl"
                      :alt="auth.fullName"
                      class="h-20 w-20 rounded-3xl border border-slate-200 object-cover shadow-lg shadow-slate-950/10 dark:border-slate-800 dark:shadow-black/30"
                    />

                    <div
                      v-else
                      class="flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-200 bg-orange-50 text-2xl font-black text-orange-700 shadow-lg shadow-slate-950/10 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                    >
                      {{ avatarInitial }}
                    </div>

                    <label
                      class="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-orange-600 shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-orange-300 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/30"
                      :title="t('settingsChangePhoto')"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="onAvatarSelected"
                      />
                      <Camera class="h-4 w-4" :stroke-width="2.4" />
                    </label>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="truncate text-lg font-black text-slate-950 dark:text-slate-100">
                        {{ fullName || auth.fullName || t('settingsNoName') }}
                      </p>

                      <span
                        class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
                      >
                        <BadgeCheck class="h-3.5 w-3.5" :stroke-width="2.4" />
                        {{ t('settingsActive') }}
                      </span>
                    </div>

                    <p class="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <Mail class="h-4 w-4" :stroke-width="2" />
                      {{ auth.user?.email }}
                    </p>

                    <p class="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      <Building2 class="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" :stroke-width="2" />
                      {{ profilePublicRolEmpresa }}
                    </p>
                  </div>
                </div>
              </article>

              <!-- Form card -->
              <article
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <header
                  class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
                >
                  <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                    {{ t('settingsProfessionalData') }}
                  </h3>

                  <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ t('settingsProfileHelp') }}
                  </p>
                </header>

                <div class="space-y-4 p-5">
                  <div>
                    <label class="premium-label">
                      {{ t('settingsFullName') }}
                    </label>

                    <input
                      v-model="fullName"
                      type="text"
                      class="premium-input"
                    />
                  </div>

                  <div>
                    <label class="premium-label">
                      {{ t('settingsCompany') }}
                    </label>

                    <input
                      v-model="company"
                      type="text"
                      class="premium-input"
                    />
                  </div>

                  <div class="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800/80 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"
                      :disabled="isSavingProfile"
                      @click="saveProfile"
                      >
                      <Loader2
                        v-if="isSavingProfile"
                        class="h-4 w-4 animate-spin"
                        :stroke-width="2.2"
                      />

                      <CheckCircle2
                        v-else
                        class="h-4 w-4"
                        :stroke-width="2.2"
                      />

                      {{ isSavingProfile ? t('settingsSaving') : t('settingsSaveChanges') }}
                    </button>

                    <transition name="settings-alert">
                      <p
                        v-if="profileMessage"
                        class="flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold"
                        :class="
                          profileMessageType === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300'
                        "
                      >
                        <CheckCircle2
                          v-if="profileMessageType === 'success'"
                          class="h-3.5 w-3.5"
                          :stroke-width="2.2"
                        />

                        <ShieldAlert
                          v-else
                          class="h-3.5 w-3.5"
                          :stroke-width="2.2"
                        />

                        {{ profileMessage }}
                      </p>
                    </transition>
                  </div>
                </div>
              </article>
            </div>

            <!-- Security -->
            <div v-if="tab === 'security'" class="space-y-6">
              <!-- MFA -->
              <article
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <header
                  class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                    >
                      <ShieldCheck class="h-5 w-5" :stroke-width="2.3" />
                    </div>

                    <div>
                      <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                        {{ t('settingsMfaTitle') }}
                      </h3>

                      <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {{ t('settingsMfaSubtitle') }}
                      </p>
                    </div>
                  </div>
                </header>

                <div class="space-y-4 p-5">
                  <div v-if="factors.length > 0" class="space-y-2">
                    <div
                      v-for="factor in factors"
                      :key="factor.id"
                      class="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/25"
                    >
                      <div class="flex min-w-0 items-center gap-3">
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          <Smartphone class="h-4.5 w-4.5" :stroke-width="2.3" />
                        </div>

                        <div class="min-w-0">
                          <p class="truncate text-sm font-black text-slate-950 dark:text-slate-100">
                            {{ factor.friendly_name || 'TOTP' }}
                          </p>

                          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                            {{ factor.status }}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 active:scale-[0.98] dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                        @click="openRemoveMfaConfirm(factor.id)"
                      >
                        <Trash2 class="h-3.5 w-3.5" :stroke-width="2" />
                        {{ t('settingsMfaRemove') }}
                      </button>
                    </div>
                  </div>

                  <button
                    v-if="mfaStatus === 'idle'"
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"                    
                    @click="startMFAEnroll"
                  >
                    <KeyRound class="h-4 w-4" :stroke-width="2.2" />
                    {{ t('settingsMfaSetup') }}
                  </button>

                  <div
                    v-if="mfaStatus === 'qr' || mfaStatus === 'verifying'"
                    class="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <p class="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                      {{ t('settingsMfaScanQr') }}
                    </p>

                    <div
                      class="inline-block overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700"
                      v-html="auth.mfaState.qrCode"
                    ></div>

                    <p class="break-all rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      Secret: {{ auth.mfaState.secret }}
                    </p>

                    <input
                      v-model="mfaCode"
                      type="text"
                      inputmode="numeric"
                      maxlength="6"
                      class="premium-input text-center font-mono text-xl tracking-[0.4em]"
                      placeholder="000000"
                    />

                    <button
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"                      
                      :disabled="mfaCode.length !== 6 || mfaStatus === 'verifying'"
                      @click="verifyMFA"
                    >
                      <Loader2
                        v-if="mfaStatus === 'verifying'"
                        class="h-4 w-4 animate-spin"
                        :stroke-width="2.2"
                      />

                      <ShieldCheck
                        v-else
                        class="h-4 w-4"
                        :stroke-width="2.2"
                      />

                      {{ t('settingsMfaVerify') }}
                    </button>

                    <p
                      v-if="mfaError"
                      class="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
                    >
                      <ShieldAlert class="h-3.5 w-3.5" :stroke-width="2" />
                      {{ mfaError }}
                    </p>
                  </div>

                  <p
                    v-if="mfaStatus === 'done'"
                    class="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
                  >
                    <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
                    {{ t('settingsMfaDone') }}
                  </p>
                </div>
              </article>

              <!-- Sessions -->
              <article
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
                  >
                    <LogOut class="h-5 w-5" :stroke-width="2.3" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                        {{ t('settingsActiveSessions') }}
                      </h3>

                      <span
                        class="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
                      >
                        {{ t('settingsSensitiveAction') }}
                      </span>
                    </div>

                    <p class="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      {{ t('settingsSensitiveHint') }}
                    </p>

                    <button
                      type="button"
                      class="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-red-700 shadow-sm transition-colors duration-200 hover:border-red-400 hover:bg-red-50 hover:text-red-800 active:scale-[0.98] dark:border-red-900/70 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/25 dark:hover:text-red-200"
                      @click="openLogoutAllConfirm"
                    >
                      <AlertTriangle class="h-4 w-4" :stroke-width="2.2" />
                      {{ t('settingsLogoutAllDevices') }}
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <!-- Preferences -->
            <div v-if="tab === 'preferences'" class="space-y-4">
              <section
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
                  :aria-expanded="openPreferenceSections.experience"
                  @click="togglePreferenceSection('experience')"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                  >
                    <Sparkles class="h-5 w-5" :stroke-width="2.2" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      {{ t('settingsExperience') }}
                    </p>
                    <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                      {{ t('settingsAnimation') }}
                    </h3>
                    <p
                      class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
                      :title="preferenceSummary.experience"
                    >
                      {{ preferenceSummary.experience }}
                    </p>
                  </div>
                  <ChevronDown
                    class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                    :class="{ 'rotate-180': openPreferenceSections.experience }"
                    :stroke-width="2.2"
                  />
                </button>

                <Transition name="pref-accordion">
                  <div v-show="openPreferenceSections.experience">
                  <fieldset class="space-y-3 p-5">
                  <legend class="sr-only">
                    {{ t('settingsAnimationLegend') }}
                  </legend>

                  <label
                    v-for="option in motionOptions"
                    :key="option.id"
                    class="group flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition-all duration-200 active:scale-[0.99]"
                    :class="
                      motionPref === option.id
                        ? option.id === 'full'
                          ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20'
                          : 'border-slate-300 bg-slate-50 shadow-md shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900/70'
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700'
                    "
                  >
                    <input
                      v-model="motionPref"
                      type="radio"
                      :value="option.id"
                      class="mt-1 h-4 w-4 accent-orange-500"
                    />

                    <div class="min-w-0 flex-1">
                      <span class="text-sm font-black text-slate-950 dark:text-slate-100">
                        {{ option.title }}
                      </span>

                      <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {{ option.description }}
                      </p>
                    </div>

                    <CheckCircle2
                      v-if="motionPref === option.id"
                      class="h-5 w-5 shrink-0 text-orange-500 dark:text-orange-300"
                      :stroke-width="2.4"
                    />
                  </label>
                  </fieldset>
                  </div>
                </Transition>
              </section>

              <!-- Editor 2D/3D -->
              <section
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
                  :aria-expanded="openPreferenceSections.editor"
                  @click="togglePreferenceSection('editor')"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <LayoutGrid class="h-5 w-5" :stroke-width="2.2" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      {{ t('settingsScene') }}
                    </p>
                    <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                      {{ t('settingsEditor') }}
                    </h3>
                    <p
                      class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
                      :title="preferenceSummary.editor"
                    >
                      {{ preferenceSummary.editor }}
                    </p>
                  </div>
                  <ChevronDown
                    class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                    :class="{ 'rotate-180': openPreferenceSections.editor }"
                    :stroke-width="2.2"
                  />
                </button>

                <Transition name="pref-accordion">
                  <div v-show="openPreferenceSections.editor">
                  <div class="space-y-5 p-5">
                  <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <div class="flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <div>
                        <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {{ t('settingsGridVisible') }}
                        </p>
                        <p class="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {{ t('settingsGridHint') }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="relative h-8 w-14 rounded-full border transition-colors duration-200"
                        :class="
                          productPreferences.editor.showGrid
                            ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                            : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                        "
                        :aria-pressed="productPreferences.editor.showGrid"
                        @click="productPreferences.editor.showGrid = !productPreferences.editor.showGrid"
                      >
                        <span
                          class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                          :class="productPreferences.editor.showGrid ? 'left-6' : 'left-0.5'"
                        />
                      </button>
                    </div>

                  </div>

                  <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                    <div class="flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <div class="flex items-center gap-2">
                        <Tags class="h-4 w-4 text-slate-400" :stroke-width="2.2" />
                        <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {{ t('settingsRoomLabels') }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="relative h-8 w-14 rounded-full border transition-colors duration-200"
                        :class="
                          productPreferences.editor.showLabels
                            ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                            : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                        "
                        :aria-pressed="productPreferences.editor.showLabels"
                        @click="productPreferences.editor.showLabels = !productPreferences.editor.showLabels"
                      >
                        <span
                          class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                          :class="productPreferences.editor.showLabels ? 'left-6' : 'left-0.5'"
                        />
                      </button>
                    </div>

                    <div class="flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                      <div class="flex items-center gap-2">
                        <Map class="h-4 w-4 text-slate-400" :stroke-width="2.2" />
                        <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          Minimapa
                        </p>
                      </div>
                      <button
                        type="button"
                        class="relative h-8 w-14 rounded-full border transition-colors duration-200"
                        :class="
                          productPreferences.editor.showMinimap
                            ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                            : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                        "
                        :aria-pressed="productPreferences.editor.showMinimap"
                        @click="productPreferences.editor.showMinimap = !productPreferences.editor.showMinimap"
                      >
                        <span
                          class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                          :class="productPreferences.editor.showMinimap ? 'left-6' : 'left-0.5'"
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">{{ t('settingsInitialView') }}</p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="opt in [
                          { id: '2d', label: '2D', icon: LayoutGrid },
                          { id: '3d', label: '3D', icon: Box },
                          { id: 'split', label: 'Split', icon: Columns2 },
                        ]"
                        :key="opt.id"
                        type="button"
                        class="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.editor.initialView === opt.id
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.editor.initialView = opt.id"
                      >
                        <component :is="opt.icon" class="h-3.5 w-3.5" :stroke-width="2.2" />
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">{{ t('settingsQuality3d') }}</p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="q in [
                          { id: 'low', label: t('settingsQualityLow') },
                          { id: 'medium', label: t('settingsQualityMedium') },
                          { id: 'high', label: t('settingsQualityHigh') },
                        ]"
                        :key="q.id"
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.editor.quality3d === q.id
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.editor.quality3d = q.id"
                      >
                        {{ q.label }}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                </Transition>
              </section>

              <!-- Criterios de estimación -->
              <section
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
                  :aria-expanded="openPreferenceSections.estimation"
                  @click="togglePreferenceSection('estimation')"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                  >
                    <Coins class="h-5 w-5" :stroke-width="2.2" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      {{ t('settingsEstimation') }}
                    </p>
                    <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                      {{ t('settingsEstimationCriteria') }}
                    </h3>
                    <p
                      class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
                      :title="preferenceSummary.estimation"
                    >
                      {{ preferenceSummary.estimation }}
                    </p>
                  </div>
                  <ChevronDown
                    class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                    :class="{ 'rotate-180': openPreferenceSections.estimation }"
                    :stroke-width="2.2"
                  />
                </button>

                <Transition name="pref-accordion">
                  <div v-show="openPreferenceSections.estimation">
                  <div class="space-y-5 p-5">
                  <div>
                    <p class="premium-label">Moneda por defecto</p>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Moneda por defecto">
                      <button
                        v-for="c in ['CLP', 'UF', 'USD']"
                        :key="c"
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.currency === c
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-orange-900/50'
                        "
                        @click="productPreferences.currency = c"
                      >
                        {{ c }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">Unidad de superficie</p>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Unidad de superficie">
                      <button
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.unit === 'metric'
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.unit = 'metric'"
                      >
                        m²
                      </button>
                      <button
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.unit === 'imperial'
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.unit = 'imperial'"
                      >
                        ft²
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">Margen de contingencia</p>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Margen de contingencia">
                      <button
                        v-for="pct in [0, 5, 10, 15]"
                        :key="pct"
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.contingency === pct
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.contingency = pct"
                      >
                        {{ pct }}%
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">{{ t('settingsVatIncluded') }}</p>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="IVA incluido">
                      <button
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.includeTax
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.includeTax = true"
                      >
                        {{ t('settingsYes') }}
                      </button>
                      <button
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          !productPreferences.includeTax
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.includeTax = false"
                      >
                        {{ t('settingsNo') }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">Materialidad por defecto</p>
                    <div class="grid gap-2 sm:grid-cols-2">
                      <button
                        v-for="m in materialOptions"
                        :key="m.id"
                        type="button"
                        class="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-black uppercase tracking-[0.08em] transition-all duration-200 active:scale-[0.99]"
                        :class="
                          productPreferences.defaultMaterial === m.id
                            ? 'border-orange-400 bg-orange-50 text-orange-800 shadow-sm dark:border-orange-400/60 dark:bg-orange-950/30 dark:text-orange-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.defaultMaterial = m.id"
                      >
                        <span>{{ m.label }}</span>
                        <CheckCircle2
                          v-if="productPreferences.defaultMaterial === m.id"
                          class="h-4 w-4 shrink-0 text-orange-500 dark:text-orange-300"
                          :stroke-width="2.2"
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="premium-label">{{ t('settingsRoomHeight') }}</p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="h in [2.4, 2.6, 2.8]"
                        :key="h"
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          !productPreferences.useCustomRoomHeight && productPreferences.defaultRoomHeight === h
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="applyPresetRoomHeight(h)"
                      >
                        {{ h }}m
                      </button>
                      <button
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.useCustomRoomHeight
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.useCustomRoomHeight = true"
                      >
                        Personalizada
                      </button>
                    </div>
                    <div v-if="productPreferences.useCustomRoomHeight" class="mt-3 max-w-xs">
                      <label class="premium-label">{{ t('settingsHeightM') }}</label>
                      <input
                        v-model.number="productPreferences.defaultRoomHeight"
                        type="number"
                        min="2.2"
                        max="5"
                        step="0.05"
                        class="premium-input"
                      />
                    </div>
                  </div>
                </div>
                </div>
                </Transition>
              </section>

              <!-- Exportación -->
              <section
                class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-left transition-colors hover:bg-slate-100/70 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/85"
                  :aria-expanded="openPreferenceSections.export"
                  @click="togglePreferenceSection('export')"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <FileText class="h-5 w-5" :stroke-width="2.2" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Entregables
                    </p>
                    <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
                      {{ t('settingsReportsExport') }}
                    </h3>
                    <p
                      class="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"
                      :title="preferenceSummary.export"
                    >
                      {{ preferenceSummary.export }}
                    </p>
                    <p class="mt-1 flex items-start gap-2 text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                      <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" :stroke-width="2.2" />
                      <span>El generador PDF ya consume parte de estas opciones; IFC/GLB siguen en roadmap.</span>
                    </p>
                  </div>
                  <ChevronDown
                    class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
                    :class="{ 'rotate-180': openPreferenceSections.export }"
                    :stroke-width="2.2"
                  />
                </button>

                <Transition name="pref-accordion">
                  <div v-show="openPreferenceSections.export">
                  <div class="space-y-5 p-5">
                  <div>
                    <p class="premium-label">Formato preferido</p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="f in ['PDF', 'IFC', 'GLB']"
                        :key="f"
                        type="button"
                        class="rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]"
                        :class="
                          productPreferences.export.preferredFormat === f
                            ? 'border-orange-400 bg-orange-500 text-white shadow-md shadow-orange-500/20 dark:border-orange-400/70'
                            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                        "
                        @click="productPreferences.export.preferredFormat = f"
                      >
                        {{ f }}
                      </button>
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div
                      v-for="row in exportToggleOptions"
                      :key="row.key"
                      class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div>
                        <p class="text-xs font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                          {{ row.label }}
                        </p>
                        <p class="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {{ row.sub }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200"
                        :class="
                          productPreferences.export[row.key]
                            ? 'border-orange-300 bg-orange-500 dark:border-orange-800'
                            : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
                        "
                        :aria-pressed="productPreferences.export[row.key]"
                        @click="productPreferences.export[row.key] = !productPreferences.export[row.key]"
                      >
                        <span
                          class="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200"
                          :class="productPreferences.export[row.key] ? 'left-6' : 'left-0.5'"
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="premium-label">{{ t('settingsBrandName') }}</label>
                    <input
                      v-model="productPreferences.export.businessName"
                      type="text"
                      class="premium-input"
                      :placeholder="t('settingsBusinessPlaceholder')"
                    />
                  </div>

                  <div>
                    <label class="premium-label">{{ t('settingsLegalFooter') }}</label>
                    <textarea
                      v-model="productPreferences.export.reportFooter"
                      rows="3"
                      class="premium-textarea"
                      :placeholder="t('settingsFooterPlaceholder')"
                    />
                  </div>
                </div>
                </div>
                </Transition>
              </section>

              <div
                class="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:border-orange-300 hover:bg-orange-400 active:scale-[0.98] dark:border-orange-400/60 dark:bg-orange-500 dark:hover:border-orange-300 dark:hover:bg-orange-400"
                  @click="saveProductPreferences"
                >
                  <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
                  {{ t('settingsSavePreferences') }}
                </button>

                <transition name="settings-alert">
                  <p
                    v-if="preferenceMessage"
                    class="flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold"
                    :class="
                      preferenceMessageType === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300'
                    "
                  >
                    <CheckCircle2
                      v-if="preferenceMessageType === 'success'"
                      class="h-3.5 w-3.5"
                      :stroke-width="2.2"
                    />
                    <ShieldAlert v-else class="h-3.5 w-3.5" :stroke-width="2.2" />
                    {{ preferenceMessage }}
                  </p>
                </transition>
              </div>
            </div>

            <!-- Integrations -->
            <div v-if="tab === 'integrations'" class="space-y-6">
              <header
                class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
              >
                <div
                  class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
                ></div>
                <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                  >
                    <Plug2 class="h-5 w-5" :stroke-width="2.3" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Ecosistema
                    </p>
                    <h2 class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                      Integraciones y conectores
                    </h2>
                    <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      {{ t('settingsIntegrationsStatus') }}
                    </p>
                  </div>
                </div>
              </header>

              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <article
                  v-for="card in integrationCards"
                  :key="card.id"
                  class="flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
                >
                  <div class="flex flex-1 flex-col gap-3 p-5">
                    <div class="flex items-start justify-between gap-3">
                      <div
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        <component :is="card.icon" class="h-5 w-5" :stroke-width="2.2" />
                      </div>
                      <span
                        class="inline-flex max-w-[11rem] items-center justify-end rounded-full border px-2.5 py-1 text-right text-[10px] font-black uppercase tracking-tight leading-tight"
                        :class="integrationVariantClass(card.statusVariant)"
                      >
                        {{ card.status }}
                      </span>
                    </div>
                    <div>
                      <h3 class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                        {{ card.name }}
                      </h3>
                      <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {{ card.description }}
                      </p>
                      <p class="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        <Info class="mt-0.5 h-3 w-3 shrink-0" :stroke-width="2" />
                        <span>{{ card.hint }}</span>
                      </p>
                    </div>
                    <div class="mt-auto pt-1">
                      <button
                        type="button"
                        class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        :class="
                          card.ctaDisabled
                            ? 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-orange-900/50 dark:hover:bg-orange-950/20 dark:hover:text-orange-200'
                        "
                        :disabled="card.ctaDisabled"
                      >
                        <ExternalLink v-if="!card.ctaDisabled" class="h-3.5 w-3.5" :stroke-width="2.2" />
                        {{ card.cta }}
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <!-- Billing / Plan -->
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
                      Uso del sistema
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
                    Plan Free
                  </h2>
                  <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-orange-900/85 dark:text-orange-100/85">
                    {{ t('settingsPlanLocal') }}
                  </p>

                  <dl class="mt-6 grid gap-3 sm:grid-cols-2">
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        Proyectos locales
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        {{ t('settingsPlanLocalSession') }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        Layouts guardados
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        {{ t('settingsPlanLayouts', { count: savedLayoutsCount }) }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        Exportaciones
                      </dt>
                      <dd class="mt-1 text-sm font-bold leading-snug text-orange-950 dark:text-orange-50">
                        {{ t('settingsPlanExports') }}
                      </dd>
                    </div>
                    <div
                      class="rounded-2xl border border-orange-200/80 bg-white/90 p-4 dark:border-orange-900/60 dark:bg-slate-950/40"
                    >
                      <dt class="text-[10px] font-black uppercase tracking-[0.14em] text-orange-800/80 dark:text-orange-200/80">
                        Colaboradores
                      </dt>
                      <dd class="mt-1 text-sm font-black text-orange-950 dark:text-orange-50">
                        0 · no disponible en Free
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
                    v-for="item in proRoadmapItems"
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

  <Teleport to="body">
    <div
      v-if="confirmState.open"
      class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-confirm-title"
    >
      <div
        class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm dark:bg-black/60"
        @click.self="closeConfirm"
      ></div>
      <div
        class="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl shadow-slate-950/20 dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              {{ t('settingsConfirmation') }}
            </p>
            <h3
              id="settings-confirm-title"
              class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100"
            >
              {{ confirmState.title }}
            </h3>
          </div>
          <button
            type="button"
            class="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            :title="t('settingsClose')"
            @click="closeConfirm"
          >
            <X class="h-4 w-4" :stroke-width="2.2" />
          </button>
        </div>
        <p class="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          {{ confirmState.message }}
        </p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="closeConfirm"
          >
            {{ t('settingsCancel') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg transition-all active:scale-[0.98]"
            :class="
              confirmState.variant === 'danger'
                ? 'border-red-500/80 bg-red-600 shadow-red-500/20 hover:bg-red-500 dark:border-red-500/60 dark:bg-red-600 dark:hover:bg-red-500'
                : 'border-orange-400/70 bg-orange-500 shadow-orange-500/20 hover:bg-orange-400 dark:border-orange-400/60 dark:bg-orange-500'
            "
            @click="runConfirmAction"
          >
            {{ confirmState.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.premium-label {
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .premium-label {
  color: rgb(148 163 184);
}

.premium-input {
  height: 3rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding-left: 1rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(15 23 42);
  outline: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.premium-input::placeholder {
  color: rgb(148 163 184);
}

.premium-input:focus {
  border-color: rgb(251 146 60);
  background: white;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.dark .premium-input {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
  color: rgb(241 245 249);
}

.dark .premium-input::placeholder {
  color: rgb(100 116 139);
}

.dark .premium-input:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

.premium-textarea {
  width: 100%;
  min-height: 5.5rem;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.45;
  color: rgb(15 23 42);
  outline: none;
  resize: vertical;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.premium-textarea::placeholder {
  color: rgb(148 163 184);
}

.premium-textarea:focus {
  border-color: rgb(251 146 60);
  background: white;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.dark .premium-textarea {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
  color: rgb(241 245 249);
}

.dark .premium-textarea::placeholder {
  color: rgb(100 116 139);
}

.dark .premium-textarea:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

.settings-alert-enter-active,
.settings-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.settings-alert-enter-from,
.settings-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.pref-accordion-enter-active,
.pref-accordion-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.pref-accordion-enter-from,
.pref-accordion-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>