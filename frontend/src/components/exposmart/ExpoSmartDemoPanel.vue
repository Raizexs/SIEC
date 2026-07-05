<script setup>
import { onMounted, ref } from 'vue';
import { ArrowRight, QrCode } from 'lucide-vue-next';
import { EXPOSMART } from '../../constants/exposmartContent.js';
import { generateQrDataUrl } from '../../utils/qrCode.js';

const qrDataUrl = ref('');

onMounted(async () => {
  try {
    qrDataUrl.value = await generateQrDataUrl(EXPOSMART.demo.url, 220);
  } catch {
    qrDataUrl.value = '';
  }
});
</script>

<template>
  <div
    class="exposmart-demo-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-10 lg:p-12"
    data-landing-reveal
  >
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_38%)]" />
    <div class="pointer-events-none absolute inset-0 landing-grid-dark opacity-35" aria-hidden="true" />

    <div class="relative grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-14">
      <div class="mx-auto flex flex-col items-center">
        <div
          class="flex h-[240px] w-[240px] items-center justify-center rounded-2xl border border-white/10 bg-white p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]"
          role="img"
          :aria-label="`Código QR para ${EXPOSMART.demo.url}`"
        >
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt=""
            class="h-[208px] w-[208px]"
            width="208"
            height="208"
          />
          <div
            v-else
            class="flex h-[208px] w-[208px] flex-col items-center justify-center gap-3 text-slate-400"
          >
            <QrCode class="h-12 w-12 animate-pulse" :stroke-width="1.5" />
            <span class="text-xs font-bold">Generando QR…</span>
          </div>
        </div>
      </div>

      <div class="text-center lg:text-left">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Demo en vivo</p>
        <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
          {{ EXPOSMART.demo.title }}
        </h2>
        <p class="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
          {{ EXPOSMART.demo.subtitle }}
        </p>

        <a
          :href="EXPOSMART.demo.url"
          target="_blank"
          rel="noopener noreferrer"
          data-landing-hover="nav-action"
          class="btn-accent mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black shadow-[0_10px_24px_-10px_rgba(249,115,22,0.55)]"
        >
          {{ EXPOSMART.demo.cta }}
          <ArrowRight class="h-4 w-4" data-motion-hover="chevron" :stroke-width="2.5" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exposmart-demo-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 38%),
    radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.14), transparent 42%),
    linear-gradient(135deg, rgba(15, 39, 68, 0.82) 0%, rgba(16, 42, 67, 0.72) 48%, rgba(11, 31, 51, 0.78) 100%);
  box-shadow: 0 36px 90px -36px rgba(0, 20, 47, 0.75);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}
</style>
