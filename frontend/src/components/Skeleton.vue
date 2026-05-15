<script setup>
defineProps({
  variant: {
    type: String,
    default: 'card', // card | line | avatar | thumb
  },
  count: {
    type: Number,
    default: 1,
  },
});

const widthForLine = (index) => {
  const widths = ['72%', '54%', '86%', '64%'];
  return widths[(index - 1) % widths.length];
};
</script>

<template>
  <!-- Card skeleton -->
  <div v-if="variant === 'card'" class="space-y-3">
    <article
      v-for="i in count"
      :key="i"
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
      aria-hidden="true"
    >
      <div class="skeleton-shimmer aspect-video border-b border-slate-200/80 dark:border-slate-800/80"></div>

      <div class="space-y-3 p-4">
        <div class="skeleton-shimmer h-3.5 w-3/4 rounded-full"></div>
        <div class="skeleton-shimmer h-2.5 w-1/2 rounded-full"></div>

        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="skeleton-shimmer h-8 rounded-2xl"></div>
          <div class="skeleton-shimmer h-8 rounded-2xl"></div>
          <div class="skeleton-shimmer h-8 rounded-2xl"></div>
        </div>
      </div>
    </article>
  </div>

  <!-- Line skeleton -->
  <div v-else-if="variant === 'line'" class="space-y-2" aria-hidden="true">
    <div
      v-for="i in count"
      :key="i"
      class="skeleton-shimmer h-3 rounded-full"
      :style="{ width: widthForLine(i) }"
    ></div>
  </div>

  <!-- Avatar skeleton -->
  <div
    v-else-if="variant === 'avatar'"
    class="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70"
    aria-hidden="true"
  >
    <div class="skeleton-shimmer h-10 w-10 shrink-0 rounded-2xl"></div>

    <div class="min-w-0 flex-1 space-y-2">
      <div class="skeleton-shimmer h-3.5 w-32 rounded-full"></div>
      <div class="skeleton-shimmer h-2.5 w-20 rounded-full"></div>
    </div>
  </div>

  <!-- Thumbnail skeleton -->
  <div
    v-else-if="variant === 'thumb'"
    class="skeleton-shimmer aspect-video rounded-3xl border border-slate-200/90 shadow-sm dark:border-slate-800/90"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
  background: rgb(226 232 240);
}

.dark .skeleton-shimmer {
  background: rgb(30 41 59);
}

.skeleton-shimmer::after {
  position: absolute;
  inset: 0;
  content: '';
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.55),
    transparent
  );
  animation: skeleton-shimmer 1.35s infinite;
}

.dark .skeleton-shimmer::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.08),
    transparent
  );
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>