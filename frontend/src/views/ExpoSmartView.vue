<script setup>
defineOptions({ name: 'ExpoSmartView' });

import { ref, onMounted, onActivated, provide } from 'vue';
import {
  ArrowRight,
  BarChart3,
  Box,
  Check,
  CircleDollarSign,
  LayoutGrid,
  Sparkles,
  Store,
  Target,
} from 'lucide-vue-next';
import ExpoSmartHeader from '../components/exposmart/ExpoSmartHeader.vue';
import ExpoSmartFooter from '../components/exposmart/ExpoSmartFooter.vue';
import ExpoSmartGallery from '../components/exposmart/ExpoSmartGallery.vue';
import ExpoSmartTeamGrid from '../components/exposmart/ExpoSmartTeamGrid.vue';
import ExpoSmartDemoPanel from '../components/exposmart/ExpoSmartDemoPanel.vue';
import ExpoSmartContactForm from '../components/exposmart/ExpoSmartContactForm.vue';
import SiecBrandLogo from '../components/brand/SiecBrandLogo.vue';
import { useLandingMotion } from '../composables/useLandingMotion';
import { useExpoSmartScroll } from '../composables/useExpoSmartScroll';
import { EXPOSMART } from '../constants/exposmartContent.js';

const motionRoot = ref(null);
const { scrollToSection, scrollToTop, consumeInitialHash, clearHash } = useExpoSmartScroll();

provide('expoSmartScrollTo', scrollToSection);
provide('expoSmartScrollTop', scrollToTop);

const impactIcons = [CircleDollarSign, LayoutGrid, Target, Store, BarChart3, Box];

useLandingMotion(motionRoot);

onMounted(() => {
  document.title = 'SIEC';
  consumeInitialHash();
});

onActivated(() => {
  clearHash();
  document.title = 'SIEC';
});
</script>

<template>
  <div
    ref="motionRoot"
    class="landing-shell dark min-h-screen overflow-x-hidden bg-[#040a14] font-sans antialiased text-slate-100 selection:bg-orange-500/30 selection:text-white"
    data-siec-bare-route="true"
  >
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <img
        :src="EXPOSMART.hero.banner"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
      />
      <div
        class="absolute inset-0 bg-gradient-to-b from-[#040a14]/80 via-[#040a14]/90 to-[#040a14]"
        aria-hidden="true"
      />
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_25%,_#040a14_88%)]"
        aria-hidden="true"
      />
      <div class="absolute inset-0 landing-grid opacity-35" />
    </div>

    <div class="relative z-10">
      <ExpoSmartHeader />

      <main>
        <!-- Hero / Banner -->
        <section id="inicio" class="relative min-h-[32rem] overflow-hidden border-b border-white/5 scroll-mt-28 sm:min-h-[36rem] lg:min-h-[40rem]">
          <div class="pointer-events-none absolute inset-0">
            <img
              :src="EXPOSMART.hero.banner"
              :alt="EXPOSMART.hero.bannerAlt"
              class="h-full w-full object-cover object-center"
              fetchpriority="high"
            />
            <div
              class="absolute inset-0 bg-gradient-to-b from-[#040a14]/25 via-[#040a14]/55 to-[#040a14]"
              aria-hidden="true"
            />
            <div
              class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_#040a14_88%)]"
              aria-hidden="true"
            />
          </div>

          <div class="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

          <div class="relative z-[2] mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
            <div class="mx-auto max-w-4xl text-center">
              <div class="mb-8 flex justify-center">
                <SiecBrandLogo
                  variant="isotipo"
                  :force-dark="true"
                  class="h-14 w-14 sm:h-16 sm:w-16"
                />
              </div>

              <h1
                class="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-black leading-[1.05] tracking-[-0.045em] text-transparent sm:text-5xl lg:text-[3.75rem]"
              >
                {{ EXPOSMART.hero.title }}
              </h1>

              <p class="mx-auto mt-7 max-w-3xl text-lg font-semibold leading-8 text-slate-200 sm:text-xl">
                {{ EXPOSMART.hero.subtitle }}
              </p>

              <p class="mx-auto mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-400 sm:text-base">
                {{ EXPOSMART.hero.description }}
              </p>

              <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  data-landing-hover="nav-action"
                  class="btn-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
                  @click="scrollToSection('demo')"
                >
                  {{ EXPOSMART.hero.ctaDemo }}
                  <ArrowRight class="h-4 w-4" data-motion-hover="chevron" :stroke-width="2.5" />
                </button>

                <button
                  type="button"
                  data-landing-hover="nav-action"
                  class="btn-ghost inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold"
                  @click="scrollToSection('proyecto')"
                >
                  {{ EXPOSMART.hero.ctaProject }}
                </button>
              </div>

              <div class="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-bold text-slate-400">
                <span class="inline-flex items-center gap-2">
                  <Check class="h-4 w-4 text-orange-500" :stroke-width="2.6" />
                  Proyecto académico
                </span>
                <span class="inline-flex items-center gap-2">
                  <Check class="h-4 w-4 text-orange-500" :stroke-width="2.6" />
                  Demo en vivo
                </span>
                <span class="inline-flex items-center gap-2">
                  <Check class="h-4 w-4 text-orange-500" :stroke-width="2.6" />
                  Equipo multidisciplinario
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Descripción y objetivos -->
        <section id="proyecto" class="exposmart-section landing-section relative scroll-mt-28 py-20 sm:py-24" data-landing-reveal>
          <div class="exposmart-section-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative z-[1] mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch lg:px-8">
            <div class="lg:sticky lg:top-28 lg:flex lg:items-center">
              <div class="relative w-full">
                <p
                  class="mb-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 lg:absolute lg:bottom-full lg:left-0 lg:mb-3"
                >
                  <Sparkles class="h-3.5 w-3.5" />
                  El proyecto
                </p>
                <h2 class="max-w-md text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  {{ EXPOSMART.project.title }}
                </h2>
              </div>
            </div>

            <div class="landing-surface-card rounded-[2rem] p-6 sm:p-8 lg:p-10">
              <p class="max-w-3xl text-lg font-semibold leading-8 text-slate-300 sm:text-xl">
                {{ EXPOSMART.project.description }}
              </p>

              <div class="mt-8 rounded-2xl border border-orange-500/20 bg-orange-950/25 p-5 backdrop-blur-md">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">Problema</p>
                <p class="mt-3 text-sm font-medium leading-7 text-slate-300">
                  {{ EXPOSMART.project.problem }}
                </p>
              </div>

              <div class="mt-8">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Objetivos</p>
                <ul class="mt-4 space-y-3">
                  <li
                    v-for="objective in EXPOSMART.project.objectives"
                    :key="objective"
                    class="flex items-start gap-3 text-sm font-medium leading-6 text-slate-300"
                  >
                    <Check class="mt-0.5 h-4 w-4 shrink-0 text-orange-500" :stroke-width="2.6" />
                    {{ objective }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- Solución / Mockups -->
        <section id="solucion" class="exposmart-section exposmart-section-muted landing-section relative scroll-mt-28 border-y border-white/5 py-20 sm:py-24" data-landing-reveal>
          <div class="exposmart-section-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ExpoSmartGallery />
          </div>
        </section>

        <!-- Impacto y valor -->
        <section id="impacto" class="exposmart-section landing-section relative scroll-mt-28 py-20 sm:py-24" data-landing-reveal>
          <div class="exposmart-section-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Impacto</p>
              <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                {{ EXPOSMART.impact.title }}
              </h2>
              <p class="mt-4 text-sm font-medium leading-6 text-slate-400">
                {{ EXPOSMART.impact.subtitle }}
              </p>
            </div>

            <ul class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <li
                v-for="(item, index) in EXPOSMART.impact.items"
                :key="item.title"
                class="landing-benefit-card group relative overflow-hidden rounded-2xl p-5"
                data-landing-hover="benefit-card"
              >
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-900/40 bg-orange-950/30 text-orange-400">
                    <component :is="impactIcons[index % impactIcons.length]" class="h-[18px] w-[18px]" :stroke-width="2.2" />
                  </div>
                  <div class="pt-0.5">
                    <h3 class="text-sm font-black text-white">{{ item.title }}</h3>
                    <p class="mt-2 text-sm font-medium leading-6 text-slate-400">{{ item.body }}</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <!-- Equipo -->
        <section id="equipo" class="exposmart-section exposmart-section-muted landing-section relative scroll-mt-28 border-y border-white/5 py-20 sm:py-24" data-landing-reveal>
          <div class="exposmart-section-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ExpoSmartTeamGrid />
          </div>
        </section>

        <!-- Demo en vivo -->
        <section id="demo" class="exposmart-section landing-section relative scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24 lg:px-8" data-landing-reveal>
          <div class="exposmart-section-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative z-[1] mx-auto max-w-7xl">
            <ExpoSmartDemoPanel />
          </div>
        </section>

        <!-- Contacto -->
        <section id="contacto" class="exposmart-section landing-section relative scroll-mt-28 pb-20 pt-10 sm:pb-24 sm:pt-14" data-landing-reveal>
          <div class="exposmart-section-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Escríbenos</p>
              <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                {{ EXPOSMART.contact.title }}
              </h2>
              <p class="mt-4 text-sm font-medium leading-6 text-slate-400">
                {{ EXPOSMART.contact.subtitle }}
              </p>
            </div>

            <div class="mt-10">
              <ExpoSmartContactForm />
            </div>
          </div>
        </section>
      </main>

      <ExpoSmartFooter />
    </div>
  </div>
</template>

<style scoped>
.landing-shell:not(.landing-shell--ready) [data-landing-reveal] {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .landing-shell:not(.landing-shell--ready) [data-landing-reveal] {
    opacity: 1;
  }
}

.exposmart-section-bg {
  background: linear-gradient(180deg, rgba(4, 10, 20, 0.52) 0%, rgba(4, 10, 20, 0.78) 100%);
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
}

.exposmart-section-muted .exposmart-section-bg {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(4, 10, 20, 0.82) 100%);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}

.landing-surface-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.72) 0%, rgba(7, 16, 29, 0.55) 100%);
  box-shadow: 0 28px 70px -36px rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(20px) saturate(1.15);
  -webkit-backdrop-filter: blur(20px) saturate(1.15);
}

.landing-benefit-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.68) 0%, rgba(7, 16, 29, 0.52) 100%);
  box-shadow: 0 14px 40px -30px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
}

.landing-grid {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
  -webkit-mask-image: linear-gradient(to bottom, black, transparent 86%);
  mask-image: linear-gradient(to bottom, black, transparent 86%);
}

.landing-grid-dark {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
  mask-image: radial-gradient(circle at center, black, transparent 80%);
}
</style>
