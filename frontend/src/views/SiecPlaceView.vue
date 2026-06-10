<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppRail from '../components/shell/AppRail.vue';
import AppTopBar from '../components/shell/AppTopBar.vue';
import { useSiecPlace } from '../composables/useSiecPlace';
import { useBilling } from '../composables/useBilling';
import { useI18n } from '../composables/useI18n';
import {
  Store,
  MapPin,
  Ruler,
  Layers,
  Lock,
  Unlock,
  Sparkles,
  ArrowLeft,
  Loader2,
  Home,
  HardHat,
  ShieldCheck,
  ArrowRight,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { t, currentLanguage } = useI18n();
const { limits, fetchBilling, startCheckout } = useBilling();
const {
  listings,
  myListings,
  selectedListing,
  loading,
  fetchListings,
  fetchMyListings,
  fetchListing,
  checkoutUnlock,
} = useSiecPlace();

const tab = ref('explore');
const detailId = ref(null);

const hasMarketplaceAccess = computed(() => true);

const moneyLocale = computed(() => (currentLanguage.value === 'en' ? 'en-US' : 'es-CL'));

const formatMoney = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat(moneyLocale.value, {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
};

const loadTab = async () => {
  if (tab.value === 'explore') {
    await fetchListings();
  } else if (hasMarketplaceAccess.value) {
    await fetchMyListings();
  }
};

const openDetail = async (listingId) => {
  detailId.value = listingId;
  await fetchListing(listingId);
};

const closeDetail = () => {
  detailId.value = null;
  selectedListing.value = null;
};

const handleUnlock = async () => {
  if (!selectedListing.value?.id) return;
  await checkoutUnlock(selectedListing.value.id);
};

const goUpgrade = () => {
  router.push('/settings?tab=billing');
};

const goProjects = () => {
  router.push('/dashboard');
};

const clientGuideSteps = [
  'siecplaceGuideClient1',
  'siecplaceGuideClient2',
  'siecplaceGuideClient3',
  'siecplaceGuideClient4',
];

const contractorGuideSteps = [
  'siecplaceGuideContractor1',
  'siecplaceGuideContractor2',
  'siecplaceGuideContractor3',
  'siecplaceGuideContractor4',
];

onMounted(async () => {
  await fetchBilling(true);
  if (route.query.tab === 'mine' && hasMarketplaceAccess.value) {
    tab.value = 'mine';
  }
  if (route.query.listing) {
    tab.value = 'explore';
    await openDetail(String(route.query.listing));
  }
  await loadTab();
});

watch(tab, () => {
  closeDetail();
  loadTab();
});
</script>

<template>
  <div class="siec-app-canvas flex min-h-screen text-slate-950 dark:text-slate-100">
    <AppRail active="siecplace" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopBar>
        <template #title>
          <div class="min-w-0">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              {{ t('siecplaceEyebrow') }}
            </p>
            <h1 class="mt-0.5 truncate text-base font-black tracking-tight">
              {{ t('siecplaceTitle') }}
            </h1>
          </div>
        </template>
      </AppTopBar>

      <main class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section
            class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-lg dark:border-slate-800/90 dark:bg-slate-950/85"
          >
            <div
              class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-400/10 blur-3xl"
            ></div>
            <div class="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span
                  class="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <Store class="h-3.5 w-3.5" />
                  {{ t('siecplaceBadge') }}
                </span>
                <p class="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {{ t('siecplaceHero') }}
                </p>
              </div>
            </div>
          </section>

          <section
            class="rounded-3xl border border-slate-200/90 bg-slate-50/80 p-6 dark:border-slate-800/90 dark:bg-slate-900/40"
          >
            <h2 class="text-lg font-black text-slate-950 dark:text-slate-50">
              {{ t('siecplaceGuideTitle') }}
            </h2>
            <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {{ t('siecplaceGuideIntro') }}
            </p>

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <article
                class="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div class="flex items-center gap-2">
                  <Home class="h-4 w-4 text-orange-500" :stroke-width="2.5" />
                  <h3 class="text-sm font-black text-slate-950 dark:text-slate-50">
                    {{ t('siecplaceGuideClientTitle') }}
                  </h3>
                </div>
                <ol class="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <li
                    v-for="(stepKey, index) in clientGuideSteps"
                    :key="stepKey"
                    class="flex gap-3"
                  >
                    <span
                      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                    >
                      {{ index + 1 }}
                    </span>
                    <span class="pt-0.5 leading-snug">{{ t(stepKey) }}</span>
                  </li>
                </ol>
                <p class="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {{ t('siecplaceGuideClientFee') }}
                </p>
              </article>

              <article
                class="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div class="flex items-center gap-2">
                  <HardHat class="h-4 w-4 text-orange-500" :stroke-width="2.5" />
                  <h3 class="text-sm font-black text-slate-950 dark:text-slate-50">
                    {{ t('siecplaceGuideContractorTitle') }}
                  </h3>
                </div>
                <ol class="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <li
                    v-for="(stepKey, index) in contractorGuideSteps"
                    :key="stepKey"
                    class="flex gap-3"
                  >
                    <span
                      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                    >
                      {{ index + 1 }}
                    </span>
                    <span class="pt-0.5 leading-snug">{{ t(stepKey) }}</span>
                  </li>
                </ol>
                <p class="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {{ t('siecplaceGuideContractorFee') }}
                </p>
              </article>
            </div>

            <div
              class="mt-4 flex flex-col gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/50 dark:bg-emerald-950/20"
            >
              <p class="flex items-start gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="2.5" />
                <span>{{ t('siecplaceGuideGuarantee') }}</span>
              </p>
              <button
                v-if="hasMarketplaceAccess"
                type="button"
                class="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
                @click="goProjects"
              >
                {{ t('siecplaceGuideGoProjects') }}
                <ArrowRight class="h-4 w-4" />
              </button>
            </div>
          </section>

          <div v-if="!detailId" class="space-y-4">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200"
                :class="
                  tab === 'explore'
                    ? 'border border-orange-400/80 bg-orange-500 text-white shadow-md shadow-orange-500/25 dark:border-orange-500/70 dark:bg-orange-500 dark:text-white dark:shadow-orange-950/40'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                "
                @click="tab = 'explore'"
              >
                {{ t('siecplaceTabExplore') }}
              </button>
              <button
                v-if="hasMarketplaceAccess"
                type="button"
                class="rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200"
                :class="
                  tab === 'mine'
                    ? 'border border-orange-400/80 bg-orange-500 text-white shadow-md shadow-orange-500/25 dark:border-orange-500/70 dark:bg-orange-500 dark:text-white dark:shadow-orange-950/40'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                "
                @click="tab = 'mine'"
              >
                {{ t('siecplaceTabMine') }}
              </button>
            </div>

            <div v-if="loading" class="flex items-center justify-center py-16 text-slate-500">
              <Loader2 class="h-6 w-6 animate-spin" />
            </div>

            <div
              v-else-if="(tab === 'explore' ? listings : myListings).length === 0"
              class="rounded-3xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700"
            >
              <p class="text-sm font-medium text-slate-500">
                {{ tab === 'explore' ? t('siecplaceEmptyExplore') : t('siecplaceEmptyMine') }}
              </p>
            </div>

            <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="item in tab === 'explore' ? listings : myListings"
                :key="item.id"
                class="flex flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              >
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-base font-black text-slate-950 dark:text-slate-50">
                    {{ item.title }}
                  </h3>
                  <span
                    v-if="item.status === 'published'"
                    class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {{ t('siecplaceStatusPublished') }}
                  </span>
                  <span
                    v-else
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {{ item.status }}
                  </span>
                </div>

                <ul class="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li v-if="item.region" class="flex items-center gap-2">
                    <MapPin class="h-4 w-4 shrink-0" />
                    {{ item.region }}
                  </li>
                  <li v-if="item.m2" class="flex items-center gap-2">
                    <Ruler class="h-4 w-4 shrink-0" />
                    {{ item.m2 }} m²
                  </li>
                  <li v-if="item.material_label" class="flex items-center gap-2">
                    <Layers class="h-4 w-4 shrink-0" />
                    {{ item.material_label }}
                  </li>
                  <li v-if="item.estimated_total_clp" class="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                    <Sparkles class="h-4 w-4 shrink-0 text-orange-500" />
                    {{ formatMoney(item.estimated_total_clp) }}
                  </li>
                </ul>

                <button
                  type="button"
                  class="mt-5 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  @click="openDetail(item.id)"
                >
                  {{ t('siecplaceViewDetail') }}
                </button>
              </article>
            </div>
          </div>

          <section
            v-else-if="selectedListing"
            class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              class="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
              @click="closeDetail"
            >
              <ArrowLeft class="h-4 w-4" />
              {{ t('siecplaceBack') }}
            </button>

            <h2 class="text-2xl font-black">{{ selectedListing.title }}</h2>
            <p class="mt-2 text-sm text-slate-500">{{ selectedListing.region || '—' }}</p>

            <dl class="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">m²</dt>
                <dd class="mt-1 font-semibold">{{ selectedListing.m2 || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {{ t('siecplaceEstimatedCost') }}
                </dt>
                <dd class="mt-1 font-semibold">
                  {{ formatMoney(selectedListing.estimated_total_clp) }}
                </dd>
              </div>
              <div>
                <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {{ t('siecplaceMaterial') }}
                </dt>
                <dd class="mt-1 font-semibold">{{ selectedListing.material_label || '—' }}</dd>
              </div>
            </dl>

            <div
              v-if="selectedListing.unlocked && selectedListing.contact"
              class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            >
              <p class="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {{ t('siecplaceContactUnlocked') }}
              </p>
              <p class="mt-2 font-semibold">{{ selectedListing.contact.full_name || '—' }}</p>
              <p class="text-sm text-slate-600 dark:text-slate-300">{{ selectedListing.contact.email }}</p>
            </div>

            <div
              v-else-if="hasMarketplaceAccess && selectedListing.status === 'published'"
              class="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p class="text-sm text-slate-600 dark:text-slate-300">
                {{ t('siecplaceUnlockHint') }}
              </p>
              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
                @click="handleUnlock"
              >
                <Unlock class="h-4 w-4" />
                {{ t('siecplaceUnlockCta') }}
              </button>
            </div>

            <div
              v-else-if="!hasMarketplaceAccess"
              class="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
            >
              <Lock class="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p class="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {{ t('siecplaceLockedPlan') }}
                </p>
                <button
                  type="button"
                  class="mt-2 text-sm font-bold text-orange-600 underline underline-offset-2"
                  @click="startCheckout('pro_plus')"
                >
                  {{ t('siecplaceUpgradeCta') }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>
