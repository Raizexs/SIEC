<script setup>
import { inject } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowRight, Building2 } from 'lucide-vue-next';
import { LANDING } from '../../constants/landingContent.js';

const scrollToSection = inject('landingScrollTo', () => {});

const navItems = [
  { id: 'que-es', label: 'Qué es' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'beneficios', label: 'Beneficios' },
];
</script>

<template>
  <header
    class="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
    data-landing-hover="chrome"
  >
    <div
      class="landing-header-glass relative mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 px-3 py-2.5 sm:px-4"
    >
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.12),_transparent_58%)]"
        aria-hidden="true"
      />

      <RouterLink
        to="/"
        data-landing-hover="brand"
        class="group relative z-10 flex min-w-0 items-center gap-3 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101d]"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-navy shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
        >
          <Building2 class="h-5 w-5" :stroke-width="2.25" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-black tracking-[-0.02em] text-white">
            {{ LANDING.brand.name }}
          </p>
          <p class="truncate text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
            {{ LANDING.brand.tagline }}
          </p>
        </div>
      </RouterLink>

      <nav class="relative z-10 hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          data-landing-hover="nav-item"
          class="landing-nav-link rounded-lg px-3.5 py-2 text-xs font-bold text-slate-400"
          @click="scrollToSection(item.id)"
        >
          {{ item.label }}
        </button>
      </nav>

      <nav class="relative z-10 flex shrink-0 items-center gap-2 sm:gap-3">
        <RouterLink
          :to="LANDING.nav.signInHref"
          data-landing-hover="nav-action"
          class="landing-nav-link hidden rounded-lg px-3.5 py-2 text-xs font-bold text-slate-300 sm:inline-flex"
        >
          {{ LANDING.nav.signIn }}
        </RouterLink>
        <RouterLink
          :to="LANDING.nav.ctaHref"
          data-landing-hover="nav-action"
          class="btn-accent inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black shadow-[0_10px_24px_-10px_rgba(249,115,22,0.55)] sm:px-4"
        >
          <span>{{ LANDING.nav.cta }}</span>
          <ArrowRight class="h-3.5 w-3.5" data-motion-hover="chevron" :stroke-width="2.5" />
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.landing-header-glass {
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.94) 0%, rgba(7, 16, 29, 0.82) 100%);
  box-shadow:
    0 16px 44px -24px rgba(0, 0, 0, 0.85),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(1.2);
}

.landing-nav-link {
  position: relative;
  transition:
    color 0.22s ease,
    background-color 0.22s ease;
}

.landing-nav-link:hover {
  color: rgb(248 250 252);
  background-color: rgba(255, 255, 255, 0.06);
}
</style>
