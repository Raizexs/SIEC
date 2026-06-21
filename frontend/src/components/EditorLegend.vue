<script setup>
import { ROOM_TYPE_COLORS } from '../utils/roomTypeColors.js';

const entries = Object.entries(ROOM_TYPE_COLORS).filter(
  ([key]) => key !== 'comun',
);
</script>

<template>
  <div
    class="pointer-events-none absolute bottom-3 left-3 z-20 rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-950/90"
    aria-label="Leyenda de recintos"
  >
    <p class="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
      Leyenda
    </p>
    <ul class="flex flex-col gap-1">
      <li
        v-for="[tipo, cfg] in entries"
        :key="tipo"
        class="flex items-center gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
      >
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-sm border"
          :style="{ backgroundColor: cfg.fill, borderColor: cfg.stroke }"
        />
        {{ cfg.label }}
      </li>
    </ul>
  </div>
</template>
