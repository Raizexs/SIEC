<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { CircleDollarSign, LayoutGrid, Box, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import AuthScene3D from '../auth/AuthScene3D.vue';
import { BASIC_PRESET_ID, useLayoutManager } from '../../composables/useLayoutManager';
import { generateLayoutThumbnail } from '../../utils/thumbnailGenerator';
import { LANDING } from '../../constants/landingContent.js';
import { prefersReducedMotion } from '../../design/motionTokens';

const SLIDES = ['plan', 'scene', 'budget'];
const AUTO_MS = 4500;
const TRANSITION_MS = 820;
const TRANSITION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const { presets, createPresetLayout } = useLayoutManager();

const planThumbnail = ref('');
const activeIndex = ref(0);
const isTransitioning = ref(false);
const sceneVisited = ref(false);
const touchStartX = ref(0);
const reduceMotion = prefersReducedMotion();
const transitionDirection = ref('next');

let autoTimer = null;

const basicPreset = computed(() =>
  presets.value.find((preset) => preset.id === BASIC_PRESET_ID) ?? presets.value[0],
);

const budget = computed(() => LANDING.hero.previewBudget);
const activeSlide = computed(() => SLIDES[activeIndex.value]);
const sceneActive = computed(() => activeSlide.value === 'scene');

const trackStyle = computed(() => ({
  transform: `translate3d(-${activeIndex.value * 100}%, 0, 0)`,
  transition: `transform ${TRANSITION_MS}ms ${TRANSITION_EASE}`,
}));

const viewportClass = computed(() => ({
  'is-transitioning': isTransitioning.value,
  'is-next': transitionDirection.value === 'next',
  'is-prev': transitionDirection.value === 'prev',
}));

const slideMeta = {
  plan: { label: 'Plano 2D', icon: LayoutGrid, accent: 'text-cyan-400' },
  scene: { label: 'Casa 3D', icon: Box, accent: 'text-orange-400' },
  budget: { label: 'Presupuesto', icon: CircleDollarSign, accent: 'text-emerald-400' },
};

const scheduleAuto = () => {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => goNext(true), AUTO_MS);
};

const goTo = (index, auto = false) => {
  if (isTransitioning.value || index === activeIndex.value) return;
  if (index < 0 || index >= SLIDES.length) return;

  const prev = activeIndex.value;
  const wrapsForward = prev === SLIDES.length - 1 && index === 0;
  const wrapsBackward = prev === 0 && index === SLIDES.length - 1;
  transitionDirection.value = wrapsForward || index > prev
    ? 'next'
    : wrapsBackward || index < prev
      ? 'prev'
      : transitionDirection.value;

  isTransitioning.value = true;
  activeIndex.value = index;

  if (SLIDES[index] === 'scene') {
    sceneVisited.value = true;
  }

  clearTimeout(autoTimer);
};

const onTrackTransitionEnd = (event) => {
  if (event.propertyName !== 'transform') return;
  if (!isTransitioning.value) return;
  isTransitioning.value = false;
  scheduleAuto();
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
                class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 transition-opacity duration-500"
                :class="isTransitioning ? 'opacity-70' : 'opacity-100'"
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

            <div
              class="hero-carousel-viewport relative h-[280px] overflow-hidden sm:h-[300px]"
              :class="viewportClass"
            >
              <div
                class="hero-carousel-track flex h-full will-change-transform"
                :style="trackStyle"
                @transitionend="onTrackTransitionEnd"
              >
                <!-- Plano 2D -->
                <div class="hero-carousel-slide flex h-full w-full shrink-0 flex-col bg-[#07101d]">
                  <div class="hero-slide-inner h-full w-full">
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
                </div>

                <!-- Casa 3D -->
                <div class="hero-carousel-slide relative h-full w-full shrink-0 bg-[#0b1220]">
                  <div class="hero-slide-inner h-full w-full">
                    <AuthScene3D
                      v-if="sceneVisited"
                      hero
                      compact
                      embedded
                      auto-start
                      :paused="!sceneActive"
                    />
                  </div>
                </div>

                <!-- Presupuesto -->
                <div class="hero-carousel-slide flex h-full w-full shrink-0 items-center bg-white p-4 dark:bg-[#07101d] sm:p-5">
                  <div class="hero-slide-inner w-full">
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
                </div>
              </div>

              <!-- Fade overlay during slide -->
              <div
                class="hero-carousel-fade pointer-events-none absolute inset-0 z-10"
                aria-hidden="true"
              />
            </div>

            <div class="flex items-center justify-center gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-white/10">
              <button
                v-for="(slide, index) in SLIDES"
                :key="slide"
                type="button"
                class="h-2 rounded-full transition-all duration-500"
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
.hero-carousel-viewport.is-transitioning .hero-carousel-fade {
  animation: hero-fade-pulse 0.82s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.hero-slide-inner {
  height: 100%;
  width: 100%;
  transform: translate3d(0, 0, 0) scale(1);
  filter: saturate(1);
  opacity: 1;
  transition:
    transform 0.82s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.68s ease,
    filter 0.68s ease;
}

.hero-carousel-viewport.is-transitioning.is-next .hero-carousel-slide .hero-slide-inner {
  transform: translate3d(-14px, 0, 0) scale(0.988);
  filter: saturate(0.92);
}

.hero-carousel-viewport.is-transitioning.is-prev .hero-carousel-slide .hero-slide-inner {
  transform: translate3d(14px, 0, 0) scale(0.988);
  filter: saturate(0.92);
}

.hero-carousel-fade {
  opacity: 0;
  background: linear-gradient(
    90deg,
    rgba(2, 6, 23, 0.45) 0%,
    rgba(2, 6, 23, 0.12) 18%,
    rgba(2, 6, 23, 0.12) 82%,
    rgba(2, 6, 23, 0.45) 100%
  );
}

@keyframes hero-fade-pulse {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 0.55;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-carousel-viewport.is-transitioning .hero-carousel-fade {
    animation: hero-fade-pulse 0.42s ease-out forwards;
  }

  .hero-slide-inner {
    transition: opacity 0.32s ease;
  }

  .hero-carousel-viewport.is-transitioning .hero-carousel-slide .hero-slide-inner {
    transform: none;
    filter: none;
    opacity: 0.97;
  }
}
</style>
