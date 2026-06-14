<script setup>
/**
 * PriceHistoryChart — line chart of insumo prices over time, scoped to a
 * single insumo or aggregated. Dependency-free: drawn on Canvas2D.
 *
 * Premium language:
 * - Slate/orange system.
 * - Light/dark canvas-aware drawing.
 * - Refined legend, loading, empty and error states.
 */

import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useApi } from '../composables/useApi';

const props = defineProps({
  insumoId: { type: Number, default: null },
  days: { type: Number, default: 60 },
});

const api = useApi();

const data = ref([]);
const isLoading = ref(false);
const canvasRef = ref(null);
const error = ref(null);

const COLORS = {
  sodimac: '#f59e0b',
  easy: '#22c55e',
  construmart: '#3b82f6',
};

const storeLabels = {
  sodimac: 'Sodimac',
  easy: 'Easy',
  construmart: 'Construmart',
};

const legendItems = computed(() =>
  Object.entries(COLORS).map(([store, color]) => ({
    store,
    label: storeLabels[store] || store,
    color,
  })),
);

const seriesByStore = computed(() => {
  const buckets = new Map();

  for (const row of data.value) {
    if (row.precio == null) continue;

    if (!buckets.has(row.tienda)) {
      buckets.set(row.tienda, []);
    }

    buckets.get(row.tienda).push({
      t: new Date(row.fecha).getTime(),
      p: row.precio,
    });
  }

  for (const arr of buckets.values()) {
    arr.sort((a, b) => a.t - b.t);
  }

  return buckets;
});

const totalPoints = computed(() =>
  data.value.filter((item) => item.precio != null).length,
);

const latestPrice = computed(() => {
  const valid = data.value
    .filter((item) => item.precio != null)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return valid[0]?.precio ?? null;
});

const formatCurrency = (value) => {
  if (value == null) return 'N/D';

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
};

const isDarkMode = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const query = { days: props.days };

    if (props.insumoId) {
      query.insumo_id = props.insumoId;
    }

    data.value = await api.get('/ai/price-history', { query });
  } catch (e) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
    await nextTick();
    draw();
  }
};

const drawEmptyState = (ctx, width, height, textColor) => {
  ctx.fillStyle = textColor;
  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sin datos en el rango seleccionado', width / 2, height / 2);
};

const draw = () => {
  const canvas = canvasRef.value;

  if (!canvas) return;

  if (!canvas.clientWidth || !canvas.clientHeight) {
    requestAnimationFrame(draw);
    return;
  }

  const ratio = window.devicePixelRatio || 2;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const dark = isDarkMode();

  const gridColor = dark ? 'rgba(51, 65, 85, 0.75)' : 'rgba(203, 213, 225, 0.9)';
  const textColor = dark ? '#94a3b8' : '#64748b';
  const axisColor = dark ? 'rgba(100, 116, 139, 0.45)' : 'rgba(148, 163, 184, 0.55)';

  const validData = data.value.filter((item) => item.precio != null);

  if (validData.length === 0) {
    drawEmptyState(ctx, width, height, textColor);
    return;
  }

  const allPrices = validData.map((item) => item.precio);
  const allTimes = validData.map((item) => new Date(item.fecha).getTime());

  const minT = Math.min(...allTimes);
  const maxT = Math.max(...allTimes);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);

  const pricePadding = Math.max((maxP - minP) * 0.08, 1);
  const chartMinP = minP - pricePadding;
  const chartMaxP = maxP + pricePadding;

  const padLeft = 64;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 28;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const xFor = (time) =>
    padLeft + ((time - minT) / Math.max(1, maxT - minT)) * chartWidth;

  const yFor = (price) =>
    padTop +
    chartHeight -
    ((price - chartMinP) / Math.max(1, chartMaxP - chartMinP)) * chartHeight;

  // Background chart area
  ctx.fillStyle = dark ? 'rgba(15, 23, 42, 0.18)' : 'rgba(248, 250, 252, 0.65)';
  ctx.fillRect(padLeft, padTop, chartWidth, chartHeight);

  // Grid + Y labels
  ctx.lineWidth = 1;
  ctx.font = '600 10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i += 1) {
    const y = padTop + (chartHeight * i) / 4;
    const price = chartMaxP - ((chartMaxP - chartMinP) * i) / 4;

    ctx.beginPath();
    ctx.strokeStyle = i === 4 ? axisColor : gridColor;
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillText(formatCurrency(price), padLeft - 8, y);
  }

  // X axis
  ctx.beginPath();
  ctx.strokeStyle = axisColor;
  ctx.moveTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();

  // Lines per store
  for (const [store, points] of seriesByStore.value) {
    if (!points.length) continue;

    const color = COLORS[store] || '#64748b';

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    points.forEach((point, index) => {
      const x = xFor(point.t);
      const y = yFor(point.p);

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    points.forEach((point) => {
      const x = xFor(point.t);
      const y = yFor(point.p);

      ctx.beginPath();
      ctx.fillStyle = dark ? '#0f172a' : '#ffffff';
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
};

let resizeObs;

onMounted(async () => {
  await fetchData();

  resizeObs = new ResizeObserver(() => draw());

  if (canvasRef.value) {
    resizeObs.observe(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObs?.disconnect();
});

watch(() => [props.insumoId, props.days], fetchData);
</script>

<template>
  <section
    class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
  >
    <!-- Header -->
    <header
      class="flex flex-col gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[23px]">
            show_chart
          </span>
        </div>

        <div>
          <p
            class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            Inteligencia de precios
          </p>

          <h3 class="mt-1 flex items-center gap-2 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
            Histórico de precios

            <span
              v-if="isLoading"
              class="material-symbols-outlined animate-spin text-[17px] text-orange-500 dark:text-orange-300"
            >
              progress_activity
            </span>
          </h3>

          <p class="mt-1 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Evolución de precios por tienda durante los últimos {{ days }} días.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
        >
          <span class="material-symbols-outlined text-[15px] text-slate-400">
            timeline
          </span>
          {{ totalPoints }} datos
        </span>

        <span
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
        >
          <span class="material-symbols-outlined text-[15px] text-orange-500 dark:text-orange-300">
            payments
          </span>
          {{ formatCurrency(latestPrice) }}
        </span>
      </div>
    </header>

    <!-- Legend -->
    <div
      class="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-5 py-3 dark:border-slate-800/80"
    >
      <span
        v-for="item in legendItems"
        :key="item.store"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      >
        <span
          class="h-2.5 w-2.5 rounded-full shadow-sm"
          :style="{ backgroundColor: item.color }"
        ></span>
        {{ item.label }}
      </span>
    </div>

    <!-- Chart body -->
    <div class="relative p-4">
      <div
        class="relative h-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <canvas
          ref="canvasRef"
          class="h-full w-full"
          aria-label="Gráfico histórico de precios"
        ></canvas>

        <div
          v-if="isLoading && data.length > 0"
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[1px] dark:bg-slate-950/35"
        >
          <div
            class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <span class="material-symbols-outlined animate-spin text-[16px] text-orange-500 dark:text-orange-300">
              progress_activity
            </span>
            Actualizando
          </div>
        </div>
      </div>

      <transition name="chart-alert">
        <div
          v-if="error"
          class="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <span class="material-symbols-outlined text-[18px]">
              warning
            </span>
          </div>

          <p class="text-xs font-semibold leading-relaxed">
            {{ error }}
          </p>
        </div>
      </transition>
    </div>
  </section>
</template>

<style scoped>
.chart-alert-enter-active,
.chart-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.chart-alert-enter-from,
.chart-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>