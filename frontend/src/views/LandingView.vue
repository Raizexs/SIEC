<script setup>
defineOptions({ name: 'LandingView' });

import { ref, onMounted, onActivated, provide } from 'vue';
import { RouterLink } from 'vue-router';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileSearch,
  Gauge,
  HardHat,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next';
import LandingHeader from '../components/landing/LandingHeader.vue';
import LandingFooter from '../components/landing/LandingFooter.vue';
import { useLandingMotion } from '../composables/useLandingMotion';
import { useLandingScroll } from '../composables/useLandingScroll';
import { LANDING } from '../constants/landingContent.js';

const motionRoot = ref(null);
const { scrollToSection, scrollToTop, consumeInitialHash, clearHash } = useLandingScroll();

provide('landingScrollTo', scrollToSection);
provide('landingScrollTop', scrollToTop);

const stepIcons = [FileSearch, CircleDollarSign, ClipboardCheck, HardHat];
const benefitIcons = [ShieldCheck, Gauge, BadgeCheck, LockKeyhole, BarChart3, LayoutDashboard];

useLandingMotion(motionRoot);

onMounted(() => {
  consumeInitialHash();
});

onActivated(() => {
  clearHash();
});
</script>

<template>
  <div
    ref="motionRoot"
    class="landing-shell dark min-h-screen overflow-x-hidden bg-[#040a14] text-slate-100 selection:bg-orange-500/30 selection:text-white"
    data-siec-bare-route="true"
  >
    <div class="pointer-events-none fixed inset-0 z-0 opacity-55">
      <div class="absolute inset-0 landing-grid" />
      <div class="absolute -left-24 top-20 h-80 w-80 rounded-full bg-orange-500/12 blur-3xl" />
      <div class="absolute -right-24 top-80 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
    </div>

    <div class="relative z-10">
      <LandingHeader />

      <main>
        <!-- Hero -->
        <section class="relative overflow-hidden border-b border-white/5">
          <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

          <div class="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
            <div class="relative z-10 max-w-3xl">
              <p
                class="landing-hero-badge mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.65)] backdrop-blur-xl"
              >
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                {{ LANDING.brand.tagline }}
              </p>

              <h1
                class="max-w-4xl bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-black leading-[1.02] tracking-[-0.045em] text-transparent sm:text-5xl lg:text-[4.35rem]"
              >
                {{ LANDING.hero.title }}
              </h1>

              <p class="mt-7 max-w-2xl text-lg font-semibold leading-8 text-slate-200 sm:text-xl">
                {{ LANDING.hero.subtitle }}
              </p>

              <p class="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-400 sm:text-base">
                {{ LANDING.hero.description }}
              </p>

              <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <RouterLink
                  :to="LANDING.hero.ctaPrimaryHref"
                  data-landing-hover="nav-action"
                  class="btn-accent inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
                >
                  {{ LANDING.hero.ctaPrimary }}
                  <ArrowRight class="h-4 w-4" data-motion-hover="chevron" :stroke-width="2.5" />
                </RouterLink>

                <RouterLink
                  :to="LANDING.nav.signInHref"
                  data-landing-hover="nav-action"
                  class="btn-ghost inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold"
                >
                  {{ LANDING.nav.signIn }}
                </RouterLink>
              </div>

              <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-slate-400">
                <span class="inline-flex items-center gap-2">
                  <Check class="h-4 w-4 text-orange-500" :stroke-width="2.6" />
                  Proceso guiado
                </span>
                <span class="inline-flex items-center gap-2">
                  <Check class="h-4 w-4 text-orange-500" :stroke-width="2.6" />
                  Información centralizada
                </span>
                <span class="inline-flex items-center gap-2">
                  <Check class="h-4 w-4 text-orange-500" :stroke-width="2.6" />
                  Decisiones más claras
                </span>
              </div>
            </div>

            <!-- Product preview -->
            <div
              class="relative mx-auto w-full max-w-xl lg:max-w-none"
              data-landing-hover="preview"
              aria-hidden="true"
            >
              <div class="landing-preview-float relative">
              <div class="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-orange-300/25 via-transparent to-blue-300/25 blur-2xl dark:from-orange-500/10 dark:to-blue-500/10" />

              <div class="relative rounded-[1.7rem] border border-white/90 bg-white/85 p-2 shadow-[0_35px_90px_-35px_rgba(15,23,42,0.42)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#08111f]/90 dark:shadow-[0_40px_100px_-35px_rgba(0,0,0,0.85)]">
                <div class="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-[#07101d]">
                  <div class="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.035]">
                    <div class="flex items-center gap-2">
                      <span class="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span class="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span class="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                      Panel SIEC
                    </div>
                    <div class="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm" />
                  </div>

                  <div class="grid min-h-[430px] grid-cols-[68px_1fr] sm:grid-cols-[82px_1fr]">
                    <aside class="border-r border-slate-200/80 bg-navy px-3 py-5 dark:border-white/10 dark:bg-[#040b15]">
                      <div class="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-950/20">
                        <HardHat class="h-4 w-4" :stroke-width="2.3" />
                      </div>
                      <div class="mt-8 space-y-3">
                        <div class="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                          <LayoutDashboard class="h-4 w-4" />
                        </div>
                        <div class="mx-auto h-9 w-9 rounded-xl border border-white/10 bg-white/5" />
                        <div class="mx-auto h-9 w-9 rounded-xl border border-white/10 bg-white/5" />
                        <div class="mx-auto h-9 w-9 rounded-xl border border-white/10 bg-white/5" />
                      </div>
                    </aside>

                    <div class="min-w-0 p-4 sm:p-6">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <p class="text-[9px] font-black uppercase tracking-[0.18em] text-orange-500">Resumen del proyecto</p>
                          <h2 class="mt-1 text-lg font-black tracking-tight text-navy dark:text-white sm:text-xl">Ampliación de vivienda</h2>
                        </div>
                        <span class="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                          En evaluación
                        </span>
                      </div>

                      <div class="mt-6 grid gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                          <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">Estimación</p>
                          <p class="mt-2 text-base font-black text-navy dark:text-white">Inicial</p>
                          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div class="h-full w-3/4 rounded-full bg-orange-500" />
                          </div>
                        </div>
                        <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                          <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">Etapas</p>
                          <p class="mt-2 text-base font-black text-navy dark:text-white">4 definidas</p>
                          <div class="mt-3 flex gap-1">
                            <span v-for="n in 4" :key="n" class="h-1.5 flex-1 rounded-full" :class="n < 3 ? 'bg-orange-500' : 'bg-slate-100 dark:bg-white/10'" />
                          </div>
                        </div>
                        <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                          <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">Estado</p>
                          <p class="mt-2 text-base font-black text-navy dark:text-white">Ordenado</p>
                          <div class="mt-3 inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 class="h-3.5 w-3.5" />
                            Sin pendientes
                          </div>
                        </div>
                      </div>

                      <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                        <div class="flex items-center justify-between">
                          <div>
                            <p class="text-[9px] font-black uppercase tracking-wider text-slate-400">Progreso del análisis</p>
                            <p class="mt-1 text-sm font-black text-navy dark:text-white">Información del proyecto</p>
                          </div>
                          <span class="text-sm font-black text-orange-500">72%</span>
                        </div>
                        <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div class="h-full w-[72%] rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
                        </div>
                        <div class="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-white/5">
                            <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">Datos</p>
                            <p class="mt-1 text-xs font-black text-navy dark:text-white">Listos</p>
                          </div>
                          <div class="rounded-xl bg-orange-50 px-2 py-2 dark:bg-orange-950/25">
                            <p class="text-[8px] font-black uppercase tracking-wider text-orange-500">Costos</p>
                            <p class="mt-1 text-xs font-black text-navy dark:text-white">En curso</p>
                          </div>
                          <div class="rounded-xl bg-slate-50 px-2 py-2 dark:bg-white/5">
                            <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">Informe</p>
                            <p class="mt-1 text-xs font-black text-navy dark:text-white">Siguiente</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1524]/90 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-xl sm:flex"
              >
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400">
                  <ShieldCheck class="h-4 w-4" />
                </div>
                <div>
                  <p class="text-[9px] font-black uppercase tracking-wider text-slate-500">Experiencia guiada</p>
                  <p class="text-xs font-black text-white">Información bajo control</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Qué es SIEC -->
        <section id="que-es" class="landing-section relative scroll-mt-28 py-20 sm:py-24" data-landing-reveal>
          <div class="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch lg:px-8">
            <div class="lg:sticky lg:top-28 lg:flex lg:items-center">
              <div class="relative w-full">
                <p
                  class="mb-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 lg:absolute lg:bottom-full lg:left-0 lg:mb-3"
                >
                  <Sparkles class="h-3.5 w-3.5" />
                  Plataforma centralizada
                </p>
                <h2 class="max-w-md text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  {{ LANDING.whatIs.title }}
                </h2>
              </div>
            </div>

            <div class="landing-surface-card rounded-[2rem] p-6 sm:p-8 lg:p-10">
              <p class="max-w-3xl text-lg font-semibold leading-8 text-slate-300 sm:text-xl">
                {{ LANDING.whatIs.body }}
              </p>

              <div class="mt-8 grid gap-4 sm:grid-cols-3">
                <div
                  data-landing-hover="feature"
                  class="landing-feature-card rounded-2xl p-4"
                >
                  <FileSearch class="h-5 w-5 text-orange-500" :stroke-width="2.2" />
                  <p class="mt-4 text-sm font-black text-white">Información comprensible</p>
                  <p class="mt-2 text-xs font-medium leading-5 text-slate-400">Lo importante del proyecto, organizado en un solo lugar.</p>
                </div>
                <div
                  data-landing-hover="feature"
                  class="landing-feature-card rounded-2xl p-4"
                >
                  <CircleDollarSign class="h-5 w-5 text-orange-500" :stroke-width="2.2" />
                  <p class="mt-4 text-sm font-black text-white">Mayor control</p>
                  <p class="mt-2 text-xs font-medium leading-5 text-slate-400">Una base más clara para evaluar alcance y costos.</p>
                </div>
                <div
                  data-landing-hover="feature"
                  class="landing-feature-card rounded-2xl p-4"
                >
                  <ShieldCheck class="h-5 w-5 text-orange-500" :stroke-width="2.2" />
                  <p class="mt-4 text-sm font-black text-white">Decisiones informadas</p>
                  <p class="mt-2 text-xs font-medium leading-5 text-slate-400">Menos improvisación antes de avanzar con la obra.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Cómo funciona -->
        <section id="como-funciona" class="landing-section landing-section-muted relative scroll-mt-28 border-y border-white/5 py-20 sm:py-24" data-landing-reveal>
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Flujo simple y guiado</p>
                <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                  {{ LANDING.howItWorks.title }}
                </h2>
              </div>
              <p class="max-w-md text-sm font-medium leading-6 text-slate-400">
                Cada etapa entrega contexto y reduce la incertidumbre antes de tomar una decisión importante.
              </p>
            </div>

            <ol class="relative mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <li
                v-for="(step, index) in LANDING.howItWorks.steps"
                :key="step.title"
                class="landing-step-card group relative overflow-hidden rounded-[1.6rem] p-5"
                data-landing-hover="step-card"
              >
                <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div class="flex items-center justify-between">
                  <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-950/40 text-orange-400">
                    <component :is="stepIcons[index % stepIcons.length]" class="h-5 w-5" :stroke-width="2.15" />
                  </div>
                  <span class="text-3xl font-black tracking-[-0.06em] text-white/[0.06]">0{{ index + 1 }}</span>
                </div>
                <h3 class="mt-6 text-base font-black text-white">
                  {{ step.title }}
                </h3>
                <p class="mt-3 text-sm font-medium leading-6 text-slate-400">
                  {{ step.body }}
                </p>
              </li>
            </ol>
          </div>
        </section>

        <!-- Beneficios -->
        <section id="beneficios" class="landing-section relative scroll-mt-28 py-20 sm:py-24" data-landing-reveal>
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Valor para el usuario</p>
              <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                {{ LANDING.benefits.title }}
              </h2>
            </div>

            <ul class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <li
                v-for="(item, index) in LANDING.benefits.items"
                :key="item"
                class="landing-benefit-card group relative overflow-hidden rounded-2xl p-5"
                data-landing-hover="benefit-card"
              >
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-900/40 bg-orange-950/30 text-orange-400">
                    <component :is="benefitIcons[index % benefitIcons.length]" class="h-[18px] w-[18px]" :stroke-width="2.2" />
                  </div>
                  <div class="pt-0.5">
                    <span class="text-sm font-bold leading-6 text-slate-200">{{ item }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <!-- CTA final -->
        <section class="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8" data-landing-reveal>
          <div
            data-landing-hover="cta-panel"
            class="landing-cta-panel relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-16 lg:px-16"
          >
            <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_38%)]" />
            <div class="pointer-events-none absolute inset-0 landing-grid-dark opacity-35" />

            <div class="relative mx-auto max-w-3xl">
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-orange-400 backdrop-blur-xl">
                <Sparkles class="h-5 w-5" :stroke-width="2.2" />
              </div>
              <h2 class="mt-6 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                {{ LANDING.finalCta.title }}
              </h2>
              <p class="mx-auto mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
                {{ LANDING.finalCta.body }}
              </p>
              <RouterLink
                :to="LANDING.finalCta.ctaHref"
                data-landing-hover="nav-action"
                class="btn-accent mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                {{ LANDING.finalCta.cta }}
                <ArrowRight class="h-4 w-4" data-motion-hover="chevron" :stroke-width="2.5" />
              </RouterLink>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
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

  .landing-preview-float {
    animation: none !important;
  }
}

.landing-section-muted {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  backdrop-filter: blur(10px);
}

.landing-surface-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0 28px 70px -36px rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(14px);
}

.landing-feature-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
}

.landing-step-card {
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: linear-gradient(180deg, rgba(8, 17, 31, 0.92) 0%, rgba(8, 17, 31, 0.78) 100%);
  box-shadow: 0 22px 54px -30px rgba(0, 0, 0, 0.8);
}

.landing-benefit-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0 14px 40px -30px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
}

.landing-cta-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.22), transparent 38%),
    radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.16), transparent 42%),
    linear-gradient(135deg, #0f2744 0%, #102a43 48%, #0b1f33 100%);
  box-shadow: 0 36px 90px -36px rgba(0, 20, 47, 0.75);
}

.landing-preview-float {
  animation: landing-float 7s ease-in-out infinite;
}

@keyframes landing-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
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
@media (prefers-reduced-motion: reduce) {
  .landing-shell *,
  .landing-shell *::before,
  .landing-shell *::after {
    scroll-behavior: auto !important;
  }
}
</style>
