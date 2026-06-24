<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ArrowLeft, Shield } from 'lucide-vue-next';
import { prefersReducedMotion, runBriefEntranceReveal } from '../../design/motionTokens';

const router = useRouter();

const goBack = () => {
  if (router.options.history.state?.back != null) {
    router.back();
    return;
  }
  router.push('/');
};

defineProps({
  title: { type: String, required: true },
  version: { type: String, default: '1.0' },
  effectiveDate: { type: String, default: '' },
  badge: { type: String, default: 'Documento legal' },
});

const legalShellRef = ref(null);
const legalCardRef = ref(null);

onMounted(async () => {
  if (prefersReducedMotion() || !legalCardRef.value) return;
  await nextTick();
  runBriefEntranceReveal(legalCardRef.value, {
    root: legalShellRef.value,
    readyClass: 'legal-shell--ready',
  });
});
</script>

<template>
  <main
    ref="legalShellRef"
    class="legal-shell relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
    data-siec-bare-route="true"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.12),_transparent_55%)]"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(30,58,138,0.35),_transparent_50%)]"
    />

    <div class="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header class="mb-10">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:border-slate-700 hover:text-orange-300"
          @click="goBack"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          Volver
        </button>

        <div
          ref="legalCardRef"
          data-siec-legal-card
          class="mt-8 overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/85 shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          <div class="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-700" />

          <div class="border-b border-slate-800/80 bg-slate-900/60 px-6 py-6 sm:px-8">
            <div class="flex items-start gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-900/60 bg-orange-950/30 text-orange-300 shadow-sm"
              >
                <Shield class="h-6 w-6" :stroke-width="2.2" />
              </div>

              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/80">
                  {{ badge }}
                </p>
                <h1 class="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {{ title }}
                </h1>
                <p class="mt-3 text-sm font-medium leading-relaxed text-slate-400">
                  Versión {{ version }}
                  <span v-if="effectiveDate"> · Vigente desde {{ effectiveDate }}</span>
                </p>
              </div>
            </div>
          </div>

          <div class="legal-body space-y-8 px-6 py-8 sm:px-8 sm:py-10">
            <slot />
          </div>
        </div>
      </header>

      <footer
        class="flex flex-wrap items-center justify-center gap-4 border-t border-slate-800/80 pt-8 text-sm font-medium text-slate-500"
      >
        <RouterLink to="/legal/privacidad" class="text-orange-400 transition-colors hover:text-orange-300">
          Política de privacidad
        </RouterLink>
        <span class="text-slate-700">·</span>
        <RouterLink to="/legal/terminos" class="text-orange-400 transition-colors hover:text-orange-300">
          Términos de servicio
        </RouterLink>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.legal-shell:not(.legal-shell--ready) [data-siec-legal-card] {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .legal-shell [data-siec-legal-card] {
    opacity: 1;
  }
}

.legal-body :deep(h3) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: rgb(226 232 240);
}

.legal-body :deep(strong) {
  font-weight: 700;
  color: rgb(203 213 225);
}

.legal-body :deep(ol) {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-left: 1.25rem;
  list-style-type: decimal;
}

.legal-body :deep(h2) {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.125rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: rgb(248 250 252);
}

.legal-body :deep(p) {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.75;
  color: rgb(148 163 184);
}

.legal-body :deep(ul) {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.legal-body :deep(li) {
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.7;
  color: rgb(148 163 184);
}

.legal-body :deep(a) {
  font-weight: 700;
  color: rgb(251 146 60);
  text-decoration: none;
}

.legal-body :deep(a:hover) {
  color: rgb(253 186 116);
  text-decoration: underline;
}

.legal-body :deep(section + section) {
  padding-top: 0.25rem;
}
</style>
