<script setup>
import { computed, ref } from 'vue';
import { ImageOff } from 'lucide-vue-next';
import { EXPOSMART } from '../../constants/exposmartContent.js';

const failedImages = ref(new Set());

const topRow = computed(() => EXPOSMART.gallery.items.slice(0, 3));
const bottomRow = computed(() => EXPOSMART.gallery.items.slice(3));

const bottomRowLgClass = (index) =>
  index === 0 ? 'lg:col-span-2 lg:col-start-2' : 'lg:col-span-2 lg:col-start-4';

const onImageError = (src) => {
  failedImages.value.add(src);
};
</script>

<template>
  <div>
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Mockups</p>
      <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
        {{ EXPOSMART.gallery.title }}
      </h2>
      <p class="mt-4 text-sm font-medium leading-6 text-slate-400">
        {{ EXPOSMART.gallery.subtitle }}
      </p>
    </div>

    <div class="mt-12 flex flex-col gap-5">
      <ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in topRow"
          :key="item.src"
          class="exposmart-gallery-card group overflow-hidden rounded-[1.6rem]"
          data-landing-hover="feature"
          data-landing-reveal
        >
          <div class="relative aspect-[16/10] overflow-hidden bg-[#0a1525]">
            <img
              v-if="!failedImages.has(item.src)"
              :src="item.src"
              :alt="item.title"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              @error="onImageError(item.src)"
            />
            <div
              v-else
              class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
            >
              <ImageOff class="h-8 w-8 text-slate-600" :stroke-width="1.8" />
              <p class="text-xs font-bold text-slate-500">Captura pendiente</p>
              <p class="text-[10px] font-medium text-slate-600">{{ item.title }}</p>
            </div>
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#040a14]/90 to-transparent"
              aria-hidden="true"
            />
          </div>
          <div class="border-t border-white/5 p-5">
            <h3 class="text-base font-black text-white">{{ item.title }}</h3>
            <p class="mt-2 text-sm font-medium leading-6 text-slate-400">
              {{ item.description }}
            </p>
          </div>
        </li>
      </ul>

      <ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <li
          v-for="(item, index) in bottomRow"
          :key="item.src"
          class="exposmart-gallery-card group overflow-hidden rounded-[1.6rem]"
          :class="bottomRowLgClass(index)"
          data-landing-hover="feature"
          data-landing-reveal
        >
          <div class="relative aspect-[16/10] overflow-hidden bg-[#0a1525]">
            <img
              v-if="!failedImages.has(item.src)"
              :src="item.src"
              :alt="item.title"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              @error="onImageError(item.src)"
            />
            <div
              v-else
              class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
            >
              <ImageOff class="h-8 w-8 text-slate-600" :stroke-width="1.8" />
              <p class="text-xs font-bold text-slate-500">Captura pendiente</p>
              <p class="text-[10px] font-medium text-slate-600">{{ item.title }}</p>
            </div>
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#040a14]/90 to-transparent"
              aria-hidden="true"
            />
          </div>
          <div class="border-t border-white/5 p-5">
            <h3 class="text-base font-black text-white">{{ item.title }}</h3>
            <p class="mt-2 text-sm font-medium leading-6 text-slate-400">
              {{ item.description }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.exposmart-gallery-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.72) 0%, rgba(7, 16, 29, 0.55) 100%);
  box-shadow: 0 22px 54px -30px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px) saturate(1.15);
  -webkit-backdrop-filter: blur(20px) saturate(1.15);
}
</style>
