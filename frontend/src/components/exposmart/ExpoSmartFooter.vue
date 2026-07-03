<script setup>
import { RouterLink } from 'vue-router';
import SiecBrandLogo from '../brand/SiecBrandLogo.vue';
import { LEGAL } from '../../constants/legal.js';
import { EXPOSMART } from '../../constants/exposmartContent.js';

</script>

<template>
  <footer class="exposmart-footer relative border-t border-transparent py-10">
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      aria-hidden="true"
    />

    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <div data-landing-hover="footer-brand" class="flex min-w-0 flex-col gap-1.5">
        <SiecBrandLogo
          variant="monochrome"
          :force-dark="true"
          class="h-7 w-auto min-h-[1.75rem] sm:h-8"
        />
        <p class="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
          {{ EXPOSMART.footer.tagline }}
        </p>
      </div>

      <div
        class="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
        data-landing-reveal
      >
        <RouterLink
          to="/"
          data-landing-hover="footer-link"
          class="exposmart-footer-link rounded-md px-1.5 py-1"
        >
          Inicio
        </RouterLink>
        <RouterLink
          :to="LEGAL.privacyPolicyPath"
          data-landing-hover="footer-link"
          class="exposmart-footer-link rounded-md px-1.5 py-1"
        >
          Privacidad
        </RouterLink>
        <RouterLink
          :to="LEGAL.termsPath"
          data-landing-hover="footer-link"
          class="exposmart-footer-link rounded-md px-1.5 py-1"
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
.exposmart-footer {
  background: linear-gradient(180deg, rgba(4, 10, 20, 0.45) 0%, rgba(4, 10, 20, 0.92) 100%);
  backdrop-filter: blur(22px) saturate(1.15);
  -webkit-backdrop-filter: blur(22px) saturate(1.15);
}

.exposmart-footer-link {
  transition: color 0.22s ease;
  color: rgb(100 116 139);
}

.exposmart-footer-link:hover {
  color: rgb(251 146 60);
}
</style>
