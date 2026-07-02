<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { CircleDollarSign, LayoutGrid, Box, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import AuthScene3D from '../auth/AuthScene3D.vue';
import { BASIC_PRESET_ID, useLayoutManager } from '../../composables/useLayoutManager';
import { generateLayoutThumbnail } from '../../utils/thumbnailGenerator';
import { LANDING } from '../../constants/landingContent.js';
import { prefersReducedMotion } from '../../design/motionTokens';

const SLIDES = ['plan', 'scene', 'budget'];
const AUTO_MS = 4200;
const TRANSITION_MS = 520;

const { presets, createPresetLayout } = useLayoutManager();

const planThumbnail = ref('');
const activeIndex = ref(0);
const isTransitioning = ref(false);
const sceneVisited = ref(false);
const touchStartX = ref(0);
const reduceMotion = prefersReducedMotion();

let autoTimer = null;

const basicPreset = computed(() =>
  presets.value.find((preset) => preset.id === BASIC_PRESET_ID) ?? presets.value[0],
);

const budget = computed(() => LANDING.hero.previewBudget);
const activeSlide = computed(() => SLIDES[activeIndex.value]);
const sceneActive = computed(() => activeSlide.value === 'scene');

const slideMeta = {
  plan: { label: 'Plano 2D', icon: LayoutGrid, accent: 'text-cyan-400' },
  scene: { label: 'Casa 3D', icon: Box, accent: 'text-orange-400' },
  budget: { label: 'Presupuesto', icon: CircleDollarSign, accent: 'text-emerald-400' },
};

const scheduleAuto = () => {
  if (reduceMotion) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => goNext(true), AUTO_MS);
};

const goTo = (index, auto = false) => {
  if (isTransitioning.value || index === activeIndex.value) return;
  if (index < 0 || index >= SLIDES.length) return;

  isTransitioning.value = true;
  activeIndex.value = index;

  if (SLIDES[index] === 'scene') {
    sceneVisited.value = true;
  }

  setTimeout(() => {
    isTransitioning.value = false;
    if (auto || !reduceMotion) scheduleAuto();
  }, TRANSITION_MS);
};

const goNext = (auto = false) => {
  goTo((activeIndex.value + 1) % SLIDES.length, auto);
};

const goPrev = () => {
  goTo((activeIndex.value - 1 + SLIDES.length) % SLIDES.length);
};

const onTouchStart = (event) => {
  touchStartX.value = event.touches[0]?.clientX ?? 0;
};

const onTouchEnd = (event) => {
  const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.value;
  if (Math.abs(delta) < 40) return;
  if (delta < 0) goNext();
  else goPrev();
};

onMounted(() => {
  if (basicPreset.value) {
    const layout = createPresetLayout(basicPreset.value);
    planThumbnail.value = generateLayoutThumbnail(layout.recintos, {
      width: 640,
      height: 420,
      bg: '#07101d',
    });
  }
  scheduleAuto();
});

onBeforeUnmount(() => {
  clearTimeout(autoTimer);
});
</script>

<template>
  <div
    class="relative mx-auto w-full max-w-xl lg:max-w-none"
    data-landing-hover="preview"
    role="region"
    aria-roledescription="carousel"
    :aria-label="budget.ariaLabel"
  >
    <div class="landing-preview-float relative">
      <div
        class="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-orange-300/25 via-transparent to-blue-300/25 blur-2xl dark:from-orange-500/10 dark:to-blue-500/10"
      />

      <div
        class="relative rounded-[1.7rem] border border-white/90 bg-white/85 p-2 shadow-[0_35px_90px_-35px_rgba(15,23,42,0.42)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#08111f]/90 dark:shadow-[0_40px_100px_-35px_rgba(0,0,0,0.85)]"
      >
        <div class="overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-[#07101d]">
          <div
            class="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.035]"
          >
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span class="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div
              class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
            >
              Panel SIEC
            </div>
            <div class="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm" />
          </div>

          <div
            class="relative touch-pan-y"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <div
              class="flex items-center justify-between border-b border-slate-200/80 px-4 py-2.5 dark:border-white/10"
            >
              <div
                class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400"
              >
                <component
                  :is="slideMeta[activeSlide].icon"
                  class="h-3 w-3"
                  :class="slideMeta[activeSlide].accent"
                  :stroke-width="2.4"
                />
                {{ slideMeta[activeSlide].label }}
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
                  aria-label="Vista anterior"
                  @click="goPrev"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
                  aria-label="Vista siguiente"
                  @click="goNext()"
                >
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="relative h-[280px] overflow-hidden sm:h-[300px]">
              <Transition name="hero-carousel" mode="out-in">
                <div
                  v-if="activeSlide === 'plan'"
                  key="plan"
                  class="absolute inset-0 flex flex-col bg-[#07101d]"
                >
                  <img
                    v-if="planThumbnail"
                    :src="planThumbnail"
                    alt="Plano 2D de casa básica"
                    class="h-full w-full object-contain p-3"
                    draggable="false"
                  />
                  <div
                    v-else
                    class="flex h-full items-center justify-center text-[10px] font-semibold text-slate-500"
                  >
                    Cargando plano…
                  </div>
                </div>

                <div
                  v-else-if="activeSlide === 'scene'"
                  key="scene"
                  class="absolute inset-0 bg-[#0b1220]"
                >
                  <AuthScene3D
                    v-if="sceneVisited"
                    hero
                    compact
                    embedded
                    auto-start
                    :paused="!sceneActive || reduceMotion"
                  />
                </div>

                <div
                  v-else
                  key="budget"
                  class="absolute inset-0 flex items-center bg-white p-4 dark:bg-[#07101d] sm:p-5"
                >
                  <div
                    class="w-full rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div
                          class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-500"
                        >
                          <CircleDollarSign class="h-3 w-3" :stroke-width="2.5" />
                          Presupuesto estimado
                        </div>
                        <h3 class="mt-1 truncate text-base font-black text-navy dark:text-white">
                          {{ budget.projectName }}
                        </h3>
                        <p class="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {{ budget.rooms }}
                        </p>
                      </div>
                      <span
                        class="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        {{ budget.status }}
                      </span>
                    </div>

                    <div class="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div class="rounded-lg bg-slate-50 px-2 py-2.5 dark:bg-white/5">
                        <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">Subtotal</p>
                        <p class="mt-1 text-xs font-black text-navy dark:text-white">{{ budget.subtotal }}</p>
                      </div>
                      <div class="rounded-lg bg-slate-50 px-2 py-2.5 dark:bg-white/5">
                        <p class="text-[8px] font-black uppercase tracking-wider text-slate-400">Contingencia</p>
                        <p class="mt-1 text-xs font-black text-navy dark:text-white">{{ budget.contingency }}</p>
                      </div>
                      <div class="rounded-lg bg-orange-50 px-2 py-2.5 dark:bg-orange-950/25">
                        <p class="text-[8px] font-black uppercase tracking-wider text-orange-500">Total</p>
                        <p class="mt-1 text-xs font-black text-navy dark:text-white">{{ budget.total }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <div class="flex items-center justify-center gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-white/10">
              <button
                v-for="(slide, index) in SLIDES"
                :key="slide"
                type="button"
                class="h-2 rounded-full transition-all duration-300"
                :class="
                  index === activeIndex
                    ? 'w-6 bg-orange-500'
                    : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                "
                :aria-label="`Ir a ${slideMeta[slide].label}`"
                :aria-current="index === activeIndex ? 'true' : undefined"
                @click="goTo(index)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-carousel-enter-active,
.hero-carousel-leave-active {
  transition:
    opacity 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero-carousel-enter-from {
  opacity: 0;
  transform: translateX(28px);
}

.hero-carousel-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

@media (prefers-reduced-motion: reduce) {
  .hero-carousel-enter-active,
  .hero-carousel-leave-active {
    transition: opacity 0.2s ease;
  }

  .hero-carousel-enter-from,
  .hero-carousel-leave-to {
    transform: none;
  }
}
</style>
