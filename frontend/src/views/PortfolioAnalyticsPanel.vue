<script setup>
/**
 * Vista Analítica del portafolio — layout distinto al listado de proyectos.
 */

import {
  Sparkles,
  Boxes,
  TrendingUp,
  Layers,
  Users2,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Lightbulb,
  ShieldAlert,
  Plus,
} from "lucide-vue-next";

const props = defineProps({
  snapshot: { type: Object, required: true },
  isLoading: { type: Boolean, default: false },
  fetchError: { type: String, default: null },
  hasRemoteProjects: { type: Boolean, default: false },
});

const emit = defineEmits(["open-project", "new-project"]);

const formatCurrencyCompact = (value) => {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

const formatCurrency = (value) => {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
};

const riskClass = (severity) => {
  if (severity === "danger" || severity === "critical") {
    return "border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100";
  }
  if (severity === "warn" || severity === "warning") {
    return "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100";
  }
  return "border-slate-200 bg-slate-50/80 text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200";
};

const formatNumber = (value) =>
  new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
    value || 0,
  );

const formatDate = (ms) => {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const pct = (ratio) => `${Math.round((ratio || 0) * 100)}%`;
</script>

<template>
  <div class="space-y-8">
    <!-- Hero -->
    <section
      data-motion="hero"
      class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30 md:p-7"
    >
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
      />
      <div
        class="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5"
      />

      <div
        class="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <span
            class="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <Sparkles class="h-3.5 w-3.5" :stroke-width="2.4" />
            Portafolio
          </span>

          <h2
            class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100 md:text-4xl"
          >
            Analítica del portafolio
          </h2>

          <p
            class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 md:text-base"
          >
            Decisiones, riesgos y distribución constructiva.
          </p>

          <p
            class="mt-3 max-w-2xl text-xs font-medium text-slate-400 dark:text-slate-500"
          >
            Lectura consolidada para priorizar costos, materialidad y colaboración.
          </p>
        </div>

        <div
          class="grid w-full grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:w-auto sm:min-w-[18rem]"
        >
          <div
            class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <p
              class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
            >
              Fuente
            </p>
            <p
              class="mt-1 text-sm font-black text-slate-950 dark:text-slate-100"
            >
              {{ hasRemoteProjects ? "Backend" : "Local" }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <p
              class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
            >
              Proyectos
            </p>
            <p
              class="mt-1 text-sm font-black text-slate-950 dark:text-slate-100"
            >
              {{ snapshot.totalProjects }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Loading skeleton -->
    <template v-if="isLoading && snapshot.totalProjects === 0">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="n in 4"
          :key="n"
          class="h-32 animate-pulse rounded-3xl border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
        />
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          v-for="n in 4"
          :key="'g' + n"
          class="h-48 animate-pulse rounded-3xl border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
        />
      </div>
    </template>

    <!-- Empty -->
    <section
      v-else-if="!isLoading && snapshot.totalProjects === 0"
      class="rounded-3xl border border-dashed border-slate-300 bg-white/85 p-10 text-center shadow-xl dark:border-slate-700 dark:bg-slate-950/85 sm:p-16"
    >
      <div
        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900"
      >
        <Boxes class="h-7 w-7" :stroke-width="1.8" />
      </div>
      <h3 class="text-xl font-black text-slate-950 dark:text-slate-100">
        Sin datos de portafolio
      </h3>
      <p
        class="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400"
      >
        Crea un proyecto para ver KPIs, distribución por materialidad y riesgos
        operativos.
      </p>
      <button type="button" class="dashboard-secondary-btn mt-6" @click="emit('new-project')">
        <Plus class="h-4 w-4" :stroke-width="2.4" />
        Crear primer proyecto
      </button>
    </section>

    <template v-else>
      <!-- KPIs analíticos -->
      <section
        data-motion="section"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              Costo promedio / m²
            </span>
            <span
              class="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900"
            >
              <TrendingUp class="h-4 w-4" :stroke-width="2" />
            </span>
          </div>
          <p
            class="mt-3 font-mono text-3xl font-black text-slate-950 dark:text-slate-100"
          >
            {{ formatCurrency(snapshot.avgCostPerM2Qualifying) }}
          </p>
          <p class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
            Sobre {{ snapshot.qualifyingCount }} proyecto(s) con costo y m²
          </p>
        </article>

        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              Material dominante
            </span>
            <span
              class="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900"
            >
              <Layers class="h-4 w-4" :stroke-width="2" />
            </span>
          </div>
          <p
            class="mt-3 truncate text-2xl font-black text-slate-950 dark:text-slate-100"
          >
            {{ snapshot.dominantMaterial.name }}
          </p>
          <p class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
            {{ snapshot.dominantMaterial.count }} proyecto(s) ·
            {{ formatNumber(snapshot.dominantMaterial.m2) }} m²
          </p>
        </article>

        <article
          class="rounded-3xl border border-orange-200/90 bg-orange-50/70 p-5 shadow-xl dark:border-orange-900/50 dark:bg-orange-950/25"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-orange-800 dark:text-orange-300"
            >
              Riesgos detectados
            </span>
            <span
              class="flex h-9 w-9 items-center justify-center rounded-2xl border border-orange-200 bg-white text-orange-600 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-300"
            >
              <ShieldAlert class="h-4 w-4" :stroke-width="2" />
            </span>
          </div>
          <p
            class="mt-3 font-mono text-3xl font-black text-orange-800 dark:text-orange-200"
          >
            {{ snapshot.riskCount }}
          </p>
          <p
            class="mt-1 text-xs font-medium text-orange-800/80 dark:text-orange-300/80"
          >
            Advertencias heurísticas (datos y dispersión)
          </p>
        </article>

        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-5 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              Ratio colaboración
            </span>
            <span
              class="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900"
            >
              <Users2 class="h-4 w-4" :stroke-width="2" />
            </span>
          </div>
          <p
            class="mt-3 font-mono text-3xl font-black text-slate-950 dark:text-slate-100"
          >
            {{ pct(snapshot.collaborationRatio) }}
          </p>
          <p class="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
            {{ snapshot.sharedCount }} compartido(s) de
            {{ snapshot.totalProjects }}
          </p>
        </article>
      </section>

      <!-- Lectura ejecutiva -->
      <section
        class="rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
      >
        <div class="flex items-center gap-2">
          <Lightbulb
            class="h-5 w-5 text-orange-500 dark:text-orange-400"
            :stroke-width="2.2"
          />
          <h3 class="text-sm font-black uppercase tracking-[0.14em] text-slate-950 dark:text-slate-100">
            Lectura ejecutiva
          </h3>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <article
            v-for="(line, idx) in snapshot.insights"
            :key="idx"
            class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div
              class="mb-2 flex h-8 w-8 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              <Lightbulb class="h-4 w-4" :stroke-width="2.2" />
            </div>

            <p
              class="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200"
            >
              {{ line }}
            </p>
          </article>
        </div>
      </section>

      <!-- Grid 2: materialidad + top costo -->
      <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <h3
            class="text-sm font-black uppercase tracking-[0.14em] text-slate-950 dark:text-slate-100"
          >
            Distribución por materialidad
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            % de m² del portafolio por sistema estructural
          </p>
          <div class="mt-6 space-y-4">
            <div
              v-for="row in snapshot.materialDistribution"
              :key="row.materialId + row.name"
            >
              <div class="mb-1 flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{{ row.name }}</span>
                <span>{{ formatNumber(row.m2) }} m² · {{ Math.round(row.m2Pct) }}%</span>
              </div>
              <div
                class="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="row.barClass"
                  :style="{ width: `${Math.min(100, row.m2Pct)}%` }"
                />
              </div>
            </div>
          </div>
          <p
            v-if="!snapshot.materialDistribution.length"
            class="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
          >
            No hay suficientes datos de materialidad para construir una distribución.
          </p>
        </article>

        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <h3
            class="text-sm font-black uppercase tracking-[0.14em] text-slate-950 dark:text-slate-100"
          >
            Top proyectos por costo
          </h3>
          <ul class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <li
              v-for="p in snapshot.topByCost"
              :key="p.id"
              class="flex items-center justify-between gap-3 py-3 first:pt-0"
            >
              <button
                type="button"
                class="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-800 transition hover:text-orange-600 dark:text-slate-200 dark:hover:text-orange-400"
                @click="emit('open-project', p.raw)"
              >
                {{ p.name }}
              </button>
              <span
                class="shrink-0 font-mono text-sm font-black text-orange-700 dark:text-orange-300"
              >
                {{ formatCurrencyCompact(p.estimatedCost) }}
              </span>
              <ArrowUpRight
                class="h-4 w-4 shrink-0 text-slate-400"
                :stroke-width="2.2"
              />
            </li>
          </ul>
          <p
            v-if="!snapshot.topByCost.length"
            class="mt-4 text-sm text-slate-500 dark:text-slate-400"
          >
            Sin costos estimados en el portafolio.
          </p>
        </article>
      </section>

      <!-- Grid 2: costo por material + actividad -->
      <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <h3
            class="text-sm font-black uppercase tracking-[0.14em] text-slate-950 dark:text-slate-100"
          >
            Costo promedio por material
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Solo proyectos con costo y m² informados
          </p>
          <ul class="mt-4 space-y-3">
            <li
              v-for="row in snapshot.avgCostByMaterial"
              :key="row.materialId"
              class="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
                row.name
              }}</span>
              <span class="font-mono text-sm font-black text-slate-950 dark:text-slate-100">{{
                formatCurrency(row.avgCostPerM2)
              }}</span>
              <span class="text-[10px] font-bold uppercase text-slate-400">/m²</span>
            </li>
          </ul>
          <p
            v-if="!snapshot.avgCostByMaterial.length"
            class="mt-4 text-sm text-slate-500 dark:text-slate-400"
          >
            Datos insuficientes para promedios por material.
          </p>
        </article>

        <article
          class="rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
        >
          <h3
            class="text-sm font-black uppercase tracking-[0.14em] text-slate-950 dark:text-slate-100"
          >
            Actividad reciente
          </h3>
          <ul class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <li
              v-for="p in snapshot.recentActivity"
              :key="p.id + '-recent'"
              class="flex items-center justify-between gap-3 py-3 first:pt-0"
            >
              <button
                type="button"
                class="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-800 hover:text-orange-600 dark:text-slate-200 dark:hover:text-orange-400"
                @click="emit('open-project', p.raw)"
              >
                {{ p.name }}
              </button>
              <span
                class="flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                <Calendar class="h-3.5 w-3.5" :stroke-width="2" />
                {{ formatDate(p.updatedAtMs) }}
              </span>
            </li>
          </ul>
          <p
            v-if="!snapshot.recentActivity.length"
            class="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            Sin actividad reciente disponible.
          </p>
        </article>
      </section>

      <!-- Riesgos -->
      <section
        class="rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-xl dark:border-slate-800/90 dark:bg-slate-950/85"
      >
        <div class="flex items-center gap-2">
          <AlertTriangle
            class="h-5 w-5 text-amber-600 dark:text-amber-400"
            :stroke-width="2.2"
          />
          <h3 class="text-sm font-black uppercase tracking-[0.14em] text-slate-950 dark:text-slate-100">
            Riesgos y advertencias operativas
          </h3>
        </div>
        <ul class="mt-4 space-y-3">
          <li
            v-for="(r, idx) in snapshot.risks"
            :key="idx"
            class="flex gap-3 rounded-2xl border px-4 py-3 text-sm"
            :class="riskClass(r.severity)"
          >
            <div class="min-w-0 flex-1">
              <p class="font-black">{{ r.title }}</p>
              <p class="mt-1 text-xs font-medium leading-relaxed opacity-90">
                {{ r.detail }}
              </p>
              <button
                v-if="r.projectId != null"
                type="button"
                class="mt-2 text-xs font-black uppercase tracking-tight text-orange-600 hover:underline dark:text-orange-400"
                @click="
                  emit(
                    'open-project',
                    snapshot.items.find(
                      (x) => String(x.id) === String(r.projectId),
                    )?.raw,
                  )
                "
              >
                Abrir proyecto
              </button>
            </div>
          </li>
        </ul>
        <p
          v-if="!snapshot.risks.length"
          class="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400"
        >
          No se detectaron riesgos heurísticos con los datos actuales.
        </p>
      </section>
    </template>

    <transition name="dashboard-alert">
      <p
        v-if="fetchError"
        class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-200"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <AlertTriangle class="h-4 w-4" :stroke-width="2.4" />
        </span>
        <span>
          Mostrando proyectos locales. El backend respondió:
          <strong class="font-black">{{ fetchError }}</strong>
        </span>
      </p>
    </transition>
  </div>
</template>

<style scoped>
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
    background-color 0.18s ease;
}
.dashboard-secondary-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 146, 60, 0.85) !important;
  background: rgba(249, 115, 22, 0.22) !important;
  color: #ffffff !important;
}
:global(html:not(.dark)) .dashboard-secondary-btn {
  border-color: rgb(251 146 60) !important;
  background: rgb(255 247 237) !important;
  color: rgb(194 65 12) !important;
}
</style>
