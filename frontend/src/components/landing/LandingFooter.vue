<script setup>
import { inject } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Building2 } from 'lucide-vue-next';
import { LEGAL } from '../../constants/legal.js';
import { LANDING } from '../../constants/landingContent.js';

const route = useRoute();
const scrollToTop = inject('landingScrollTop', () => {});

const goInicio = (event) => {
  if (route.path !== '/') return;
  event.preventDefault();
  scrollToTop();
};
</script>

<template>
  <footer
    class="landing-footer relative border-t border-transparent py-10"
    data-landing-reveal
    data-landing-hover="chrome"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      aria-hidden="true"
    />

    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <div data-landing-hover="footer-brand" class="flex items-center gap-3.5">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/30 bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/15 backdrop-blur-sm"
        >
          <Building2 class="h-4 w-4 text-orange-300" :stroke-width="2.2" />
        </div>
        <div>
          <p class="text-sm font-black tracking-tight text-white">{{ LANDING.brand.name }}</p>
          <p class="mt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
            {{ LANDING.footer.tagline }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        <RouterLink
          to="/"
          data-landing-hover="footer-link"
          class="landing-footer-link rounded-md px-1.5 py-1"
          @click="goInicio"
        >
          Inicio
        </RouterLink>
        <RouterLink
          :to="LEGAL.privacyPolicyPath"
          data-landing-hover="footer-link"
          class="landing-footer-link rounded-md px-1.5 py-1"
        >
          Privacidad
        </RouterLink>
        <RouterLink
          :to="LEGAL.termsPath"
          data-landing-hover="footer-link"
          class="landing-footer-link rounded-md px-1.5 py-1"
        >
          Términos
        </RouterLink>
        <span class="hidden h-3 w-px bg-white/10 sm:inline" aria-hidden="true" />
        <span class="text-slate-500">© {{ new Date().getFullYear() }} SIEC</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.landing-footer {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(4, 10, 20, 0.92) 100%);
  backdrop-filter: blur(16px);
}

.landing-footer-link {
  transition: color 0.22s ease;
  color: rgb(100 116 139);
}

.landing-footer-link:hover {
  color: rgb(251 146 60);
}
</style>
