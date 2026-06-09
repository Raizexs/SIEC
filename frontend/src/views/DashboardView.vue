<script setup>
/**
 * Dashboard — projects grid with premium SIEC visual language.
 * Layout: AppRail at the left + premium content shell at right.
 */

import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useApi, HttpError } from "../composables/useApi";
import { useLayoutManager } from "../composables/useLayoutManager";
import {
  Plus,
  Search,
  LayoutGrid,
  User2,
  Users2,
  Archive,
  Building2,
  Boxes,
  TrendingUp,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  SquareStack,
} from "lucide-vue-next";

import AppRail from "../components/shell/AppRail.vue";
import AppTopBar from "../components/shell/AppTopBar.vue";
import { useProMotion } from "../composables/useProMotion";
import { materialName } from "../composables/usePortfolioAnalytics";
import { useI18n } from "../composables/useI18n";

const router = useRouter();
const { t, currentLanguage } = useI18n();
const auth = useAuthStore();
const api = useApi();
const { savedLayouts } = useLayoutManager();

const projects = ref([]);
const isLoadingProjects = ref(false);
const fetchError = ref(null);
const search = ref("");
const filter = ref("all"); // all | mine | shared | archived
const motionRoot = ref(null);

/**
 * skipIntro: la transición de RouterView en App.vue ya anima la vista;
 * el stagger GSAP en hijos dejó el panel en autoAlpha 0 en algunos navegadores.
 */
useProMotion(motionRoot, {
  skipIntro: true,
});

const stats = computed(() => {
  const list = projects.value.length ? projects.value : savedLayouts.value;

  const totalM2 = list.reduce(
    (sum, project) => sum + (project.m2_totales || project.m2Totales || 0),
    0,
  );

  const totalCost = list.reduce(
    (sum, project) => sum + (project.estimated_cost || 0),
    0,
  );

  return {
    count: list.length,
    totalM2,
    totalCost,
  };
});

const filtered = computed(() => {
  const list = projects.value.length ? projects.value : savedLayouts.value;
  const q = search.value.toLowerCase();

  return list.filter((project) => {
    const name = project.name || project.nombre || "";
    const matchesSearch = !q || name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filter.value === "archived") return project.archived === true;
    if (filter.value === "shared") return project.shared === true;
    if (filter.value === "mine") return !project.shared;

    return true;
  });
});

const firstName = computed(() => {
  void currentLanguage.value;
  const source = auth.fullName || t("defaultUser");

  return source.split(" ")[0];
});

const dateLocale = computed(() =>
  currentLanguage.value === "en" ? "en-US" : "es-CL",
);

const heroSummary = computed(() => {
  void currentLanguage.value;
  return t("dashActiveProjectsSummary", {
    count: stats.value.count,
    date: new Date().toLocaleDateString(dateLocale.value),
  });
});

const hasRemoteProjects = computed(() => projects.value.length > 0);

const fetchProjects = async () => {
  isLoadingProjects.value = true;
  fetchError.value = null;

  try {
    const data = await api.get("/projects");

    projects.value = data || [];
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      projects.value = [];
    } else {
      fetchError.value = error.message;
    }
  } finally {
    isLoadingProjects.value = false;
  }
};

const newProject = () => {
  router.push("/workspace");
};

const openProject = (project) => {
  if (!project) return;
  router.push(`/workspace/${project.id || ""}`);
};

const projectMaterialName = (id) =>
  materialName(id, currentLanguage.value === "en" ? "en" : "es");

const projectDate = (project) => {
  const rawDate = project.createdAt || project.updated_at || Date.now();

  return new Date(rawDate).toLocaleDateString(dateLocale.value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const projectM2 = (project) => project.m2Totales || project.m2_totales || 0;

const formatCurrencyCompact = (value) => {
  if (!value) return "$0";

  return new Intl.NumberFormat(dateLocale.value, {
    style: "currency",
    currency: "CLP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat(dateLocale.value, {
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const filters = computed(() => {
  void currentLanguage.value;
  return [
    { id: "all", label: t("dashFilterAll"), icon: LayoutGrid },
    { id: "mine", label: t("dashFilterMine"), icon: User2 },
    { id: "shared", label: t("dashFilterShared"), icon: Users2 },
    { id: "archived", label: t("dashFilterArchived"), icon: Archive },
  ];
});

onMounted(fetchProjects);
</script>

<template>
  <div
    ref="motionRoot"
    class="siec-app-canvas flex min-h-screen text-slate-950 transition-colors duration-300 dark:text-slate-100"
  >
    <AppRail active="dashboard" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopBar>
        <template #title>
          <div class="min-w-0">
            <p
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              {{ t('dashWorkspace') }}
            </p>

            <h1
              class="mt-0.5 truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100"
            >
              {{ t('dashProjects') }}
            </h1>
          </div>
        </template>

        <template #actions>
          <button
            type="button"
            class="dashboard-primary-btn"
            @click="newProject"
          >
            <Plus class="h-4 w-4" :stroke-width="2.4" />
            {{ t('dashNewEstimate') }}
          </button>
        </template>
      </AppTopBar>

      <main class="min-h-0 flex-1 overflow-y-auto">
        <div
          class="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <!-- Hero -->
          <section
            data-motion="hero"
            class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 md:p-7"
          >
            <div
              class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
            ></div>

            <div
              class="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5"
            ></div>

            <div
              class="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
            >
              <div>
                <span
                  class="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <Sparkles class="h-3.5 w-3.5" :stroke-width="2.4" />
                  {{ t('dashExecutiveDashboard') }}
                </span>

                <h2
                  class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100 md:text-5xl"
                >
                  {{ t('dashHello', { name: firstName }) }}
                </h2>

                <p
                  class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 md:text-base"
                >
                  {{ heroSummary }}
                </p>
              </div>

              <div
                class="rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:w-auto"
              >
                <div
                  class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <p
                    class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                  >
                    {{ t('dashSource') }}
                  </p>
                  <p
                    class="mt-1 text-sm font-black text-slate-950 dark:text-slate-100"
                  >
                    {{ hasRemoteProjects ? t('dashBackend') : t('dashLocal') }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Stats -->
          <section
            data-motion="section"
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <article
              data-motion="card"
              class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 dark:hover:border-slate-700"
            >
              <div class="flex items-center justify-between gap-3">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('dashProjectsStat') }}
                </span>

                <span
                  class="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  <Boxes class="h-4 w-4" :stroke-width="2" />
                </span>
              </div>

              <p
                class="mt-4 font-mono text-4xl font-black tracking-tight text-slate-950 dark:text-slate-100"
              >
                {{ stats.count }}
              </p>

              <p
                class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500"
              >
                {{ t('dashActiveInWorkspace') }}
              </p>
            </article>

            <article
              data-motion="card"
              class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 dark:hover:border-slate-700"
            >
              <div class="flex items-center justify-between gap-3">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('dashM2Accumulated') }}
                </span>

                <span
                  class="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  <Building2 class="h-4 w-4" :stroke-width="2" />
                </span>
              </div>

              <p
                class="mt-4 font-mono text-4xl font-black tracking-tight text-slate-950 dark:text-slate-100"
              >
                {{ formatNumber(stats.totalM2) }}
              </p>

              <p
                class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500"
              >
                {{ t('dashTotalSurface') }}
              </p>
            </article>

            <article
              data-motion="card"
              class="relative overflow-hidden rounded-3xl border border-orange-200 bg-orange-50/70 p-5 shadow-xl shadow-orange-500/5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg dark:border-orange-900/60 dark:bg-orange-950/20 dark:shadow-black/30"
            >
              <div
                class="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl"
              ></div>

              <div class="relative z-10">
                <div class="flex items-center justify-between gap-3">
                  <span
                    class="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300"
                  >
                    {{ t('dashEstimatedClp') }}
                  </span>

                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-2xl border border-orange-200 bg-white text-orange-600 shadow-sm dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                  >
                    <TrendingUp class="h-4 w-4" :stroke-width="2" />
                  </span>
                </div>

                <p
                  class="mt-4 font-mono text-4xl font-black tracking-tight text-orange-700 dark:text-orange-300"
                >
                  {{ formatCurrencyCompact(stats.totalCost) }}
                </p>

                <p
                  class="mt-1 text-xs font-medium text-orange-700/70 dark:text-orange-300/75"
                >
                  {{ t('dashTotalCost') }}
                </p>
              </div>
            </article>

            <article
              data-motion="card"
              class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 dark:hover:border-slate-700"
            >
              <div class="flex items-center justify-between gap-3">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('dashPlan') }}
                </span>

                <span
                  class="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  <Layers class="h-4 w-4" :stroke-width="2" />
                </span>
              </div>

              <p
                class="mt-4 truncate text-3xl font-black capitalize tracking-tight text-slate-950 dark:text-slate-100"
              >
                {{ auth.role }}
              </p>

              <p
                class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500"
              >
                {{ t('dashActiveRole') }}
              </p>
            </article>
          </section>

          <!-- Toolbar -->
          <section
            data-motion="section"
            class="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white/85 p-4 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 md:flex-row md:items-center"
          >
            <div class="dashboard-filter-shell">
              <button
                v-for="item in filters"
                :key="item.id"
                type="button"
                class="dashboard-filter-btn"
                :class="{ 'is-active': filter === item.id }"
                @click="filter = item.id"
              >
                <component
                  :is="item.icon"
                  class="h-3.5 w-3.5"
                  :stroke-width="2.2"
                />
                {{ item.label }}
              </button>
            </div>

            <div class="relative min-w-0 flex-1">
              <Search
                class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                :stroke-width="2"
              />

              <input
                v-model="search"
                type="search"
                :placeholder="t('dashSearchPlaceholder')"
                class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900 dark:focus:ring-orange-500/15"
              />
            </div>
          </section>

          <!-- Loading -->
          <section
            v-if="isLoadingProjects && filtered.length === 0"
            data-motion="section"
            class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <article
              v-for="i in 6"
              :key="i"
              class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
            >
              <div
                class="skeleton-shimmer aspect-video border-b border-slate-200/80 dark:border-slate-800/80"
              ></div>
              <div class="space-y-3 p-4">
                <div class="skeleton-shimmer h-3.5 w-3/4 rounded-full"></div>
                <div class="skeleton-shimmer h-2.5 w-1/2 rounded-full"></div>
              </div>
            </article>
          </section>

          <!-- Empty state -->
          <section
            v-else-if="filtered.length === 0"
            data-motion="section"
            class="rounded-3xl border border-dashed border-slate-300 bg-white/85 p-10 text-center shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/85 dark:shadow-black/30 sm:p-16"
          >
            <div
              class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
            >
              <Boxes class="h-7 w-7" :stroke-width="1.8" />
            </div>

            <h3
              class="text-xl font-black tracking-tight text-slate-950 dark:text-slate-100"
            >
              {{
                search || filter !== "all"
                  ? t('dashNoResults')
                  : t('dashNoProjects')
              }}
            </h3>

            <p
              class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {{
                search || filter !== "all"
                  ? t('dashEmptySearchHint')
                  : t('dashEmptyProjectsHint')
              }}
            </p>

            <button
              v-if="!search && filter === 'all'"
              type="button"
              class="mt-6 dashboard-secondary-btn"
              @click="newProject"
            >
              <Plus class="h-4 w-4" :stroke-width="2.4" />
              {{ t('dashCreateFirst') }}
            </button>
          </section>

          <!-- Grid -->
          <section
            v-else
            data-motion="section"
            class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <article
              v-for="project in filtered"
              :key="project.id || project.name || project.nombre"
              data-motion="item"
              class="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-950/10 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 dark:hover:border-slate-700"
              @click="openProject(project)"
            >
              <div
                class="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-900"
              >
                <img
                  v-if="project.thumbnail_url"
                  :src="project.thumbnail_url"
                  :alt="project.name || project.nombre || t('dashProjectAlt')"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />

                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300 dark:from-slate-900 dark:to-slate-950 dark:text-slate-700"
                >
                  <Building2 class="h-14 w-14" :stroke-width="1.2" />
                </div>

                <div
                  class="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent opacity-80"
                ></div>

                <span
                  class="absolute right-3 top-3 inline-flex items-center rounded-full border border-white/20 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-slate-700 shadow-sm backdrop-blur-md dark:bg-slate-950/80 dark:text-slate-200"
                >
                  {{
                    projectMaterialName(
                      project.materialEstructuralId || project.material_id,
                    )
                  }}
                </span>

                <span
                  v-if="project.shared"
                  class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/70 dark:text-emerald-300"
                >
                  <Users2 class="h-3 w-3" :stroke-width="2.4" />
                  {{ t('dashShared') }}
                </span>
              </div>

              <div class="space-y-4 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4
                      class="truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100"
                    >
                      {{ project.name || project.nombre || t('dashUntitled') }}
                    </h4>

                    <p
                      class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500"
                    >
                      {{ t('dashProjectType') }}
                    </p>
                  </div>

                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition-all duration-200 group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-orange-900/60 dark:group-hover:bg-orange-950/30 dark:group-hover:text-orange-300"
                  >
                    <ArrowUpRight class="h-4 w-4" :stroke-width="2.4" />
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div
                    class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <p
                      class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500"
                    >
                      <SquareStack class="h-3.5 w-3.5" :stroke-width="2.2" />
                      {{ t('dashArea') }}
                    </p>
                    <p
                      class="mt-1 font-mono text-sm font-black text-slate-950 dark:text-slate-100"
                    >
                      {{ projectM2(project) }} m²
                    </p>
                  </div>

                  <div
                    class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <p
                      class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500"
                    >
                      <Calendar class="h-3.5 w-3.5" :stroke-width="2.2" />
                      {{ t('dashDate') }}
                    </p>
                    <p
                      class="mt-1 font-mono text-sm font-black text-slate-950 dark:text-slate-100"
                    >
                      {{ projectDate(project) }}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <!-- Fetch warning -->
          <transition name="dashboard-alert">
            <p
              v-if="fetchError"
              class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-700 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <AlertTriangle class="h-4 w-4" :stroke-width="2.4" />
              </span>

              <span>
                {{ t('dashLocalProjectsWarning') }}
                <strong class="font-black">{{ fetchError }}</strong>
              </span>
            </p>
          </transition>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
  background: rgb(226 232 240);
}

.dark .skeleton-shimmer {
  background: rgb(30 41 59);
}

.skeleton-shimmer::after {
  position: absolute;
  inset: 0;
  content: "";
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.55),
    transparent
  );
  animation: skeleton-shimmer 1.35s infinite;
}

.dark .skeleton-shimmer::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.08),
    transparent
  );
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.dashboard-alert-enter-active,
.dashboard-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.dashboard-alert-enter-from,
.dashboard-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.dashboard-primary-btn {
  appearance: none;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(251, 146, 60, 0.7) !important;
  background: linear-gradient(135deg, #fb923c, #f97316) !important;
  padding: 0.65rem 1rem;
  color: #ffffff !important;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow:
    0 14px 32px rgba(249, 115, 22, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;
}

.dashboard-primary-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow:
    0 18px 40px rgba(249, 115, 22, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.dashboard-primary-btn:active {
  transform: scale(0.98);
}

.dashboard-filter-shell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.72);
  padding: 0.25rem;
}

.dashboard-filter-btn {
  appearance: none;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border: 0 !important;
  border-radius: 0.75rem;
  background: transparent !important;
  padding: 0.6rem 0.85rem;
  color: #94a3b8 !important;
  font-size: 0.625rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.dashboard-filter-btn:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #e2e8f0 !important;
}

.dashboard-filter-btn:active {
  transform: scale(0.98);
}

.dashboard-filter-btn.is-active {
  background: linear-gradient(135deg, #fb923c, #f97316) !important;
  color: #ffffff !important;
  box-shadow: 0 10px 22px rgba(249, 115, 22, 0.24);
}

.dashboard-secondary-btn {
  appearance: none;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(251, 146, 60, 0.55) !important;
  background: rgba(249, 115, 22, 0.14) !important;
  padding: 0.75rem 1rem;
  color: #fed7aa !important;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  box-shadow: 0 10px 24px rgba(249, 115, 22, 0.14);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.dashboard-secondary-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 146, 60, 0.85) !important;
  background: rgba(249, 115, 22, 0.22) !important;
  color: #ffffff !important;
  box-shadow: 0 14px 30px rgba(249, 115, 22, 0.2);
}

.dashboard-secondary-btn:active {
  transform: scale(0.98);
}

/* Light mode */
:global(html:not(.dark)) .dashboard-filter-shell {
  border-color: rgb(226 232 240);
  background: rgb(248 250 252);
}

:global(html:not(.dark)) .dashboard-filter-btn {
  color: #64748b !important;
}

:global(html:not(.dark)) .dashboard-filter-btn:hover {
  background: #ffffff !important;
  color: #0f172a !important;
}

:global(html:not(.dark)) .dashboard-filter-btn.is-active {
  background: linear-gradient(135deg, #fb923c, #f97316) !important;
  color: #ffffff !important;
}

:global(html:not(.dark)) .dashboard-secondary-btn {
  border-color: rgb(251 146 60) !important;
  background: rgb(255 247 237) !important;
  color: rgb(194 65 12) !important;
  box-shadow: 0 8px 18px rgba(249, 115, 22, 0.1);
}

:global(html:not(.dark)) .dashboard-secondary-btn:hover {
  background: rgb(255 237 213) !important;
  color: rgb(154 52 18) !important;
}
</style>
