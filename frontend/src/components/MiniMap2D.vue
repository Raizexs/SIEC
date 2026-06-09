<script setup>
/**
 * MiniMap2D — top-down 2D radar of the current scene.
 * Renders rooms as colored rectangles, the camera as a triangle, and a north
 * indicator. Used in the 3D view bottom-right corner.
 *
 * Premium language:
 * - Soft floating card.
 * - Canvas-aware light/dark rendering.
 * - Refined grid, room outlines, camera marker and north indicator.
 */

import { onMounted, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  recintos: {
    type: Array,
    default: () => [],
  },
  cameraPos: {
    type: Object,
    default: () => ({ x: 0, z: 0, yaw: 0 }),
  },
  size: {
    type: Number,
    default: 100,
  },
  /** Si es false, no se monta el minimapa (preferencia de producto). */
  visible: {
    type: Boolean,
    default: true,
  },
});

const canvasRef = ref(null);

let rafId = null;

const COLORS = {
  habitacion: '#22d3ee',
  banio: '#0ea5e9',
  comun: '#10b981',
  areaComun: '#10b981',
  pasillo: '#64748b',
};

const isDarkMode = () => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const hexToRgba = (hex, alpha = 1) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawEmptyState = (ctx, width, dark) => {
  ctx.fillStyle = dark ? '#94a3b8' : '#64748b';
  ctx.font = `700 ${Math.max(8, Math.round(props.size * 0.1))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sin recintos', width / 2, width / 2);
};

const draw = () => {
  const canvas = canvasRef.value;

  if (!canvas) return;

  const ratio = window.devicePixelRatio || 2;
  const width = props.size;
  const height = props.size;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const dark = isDarkMode();

  const backgroundColor = dark ? '#0f172a' : '#f8fafc';
  const gridColor = dark ? 'rgba(51, 65, 85, 0.55)' : 'rgba(203, 213, 225, 0.75)';
  const borderColor = dark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.18)';
  const textColor = dark ? '#e2e8f0' : '#334155';
  const mutedTextColor = dark ? '#94a3b8' : '#64748b';

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Inner border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Compute bounds
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const room of props.recintos) {
    minX = Math.min(minX, room.coords.x);
    minZ = Math.min(minZ, room.coords.z);
    maxX = Math.max(maxX, room.coords.x + room.dimensions.w);
    maxZ = Math.max(maxZ, room.coords.z + room.dimensions.l);
  }

  if (!Number.isFinite(minX)) {
    minX = -10;
    minZ = -10;
    maxX = 10;
    maxZ = 10;
  }

  const margin = 1.5;

  minX -= margin;
  minZ -= margin;
  maxX += margin;
  maxZ += margin;

  const dx = maxX - minX;
  const dz = maxZ - minZ;

  const padding = Math.max(6, Math.round(props.size * 0.1));
  const scale = (width - padding * 2) / Math.max(dx, dz);
  const offsetX = padding + (width - padding * 2 - dx * scale) / 2;
  const offsetY = padding + (height - padding * 2 - dz * scale) / 2;

  // Grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.6;

  for (let x = Math.ceil(minX); x <= maxX; x += 1) {
    const px = offsetX + (x - minX) * scale;

    ctx.beginPath();
    ctx.moveTo(px, padding);
    ctx.lineTo(px, height - padding);
    ctx.stroke();
  }

  for (let z = Math.ceil(minZ); z <= maxZ; z += 1) {
    const py = offsetY + (z - minZ) * scale;

    ctx.beginPath();
    ctx.moveTo(padding, py);
    ctx.lineTo(width - padding, py);
    ctx.stroke();
  }

  if (props.recintos.length === 0) {
    drawEmptyState(ctx, width, dark);
  }

  // Rooms
  for (const room of props.recintos) {
    const color = COLORS[room.tipo] || '#334155';

    const x = offsetX + (room.coords.x - minX) * scale;
    const y = offsetY + (room.coords.z - minZ) * scale;
    const w = Math.max(room.dimensions.w * scale, 2);
    const h = Math.max(room.dimensions.l * scale, 2);

    drawRoundedRect(ctx, x, y, w, h, 3);

    ctx.fillStyle = hexToRgba(color, dark ? 0.32 : 0.22);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(color, dark ? 0.92 : 0.85);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // Camera marker
  const cx = offsetX + (props.cameraPos.x - minX) * scale;
  const cy = offsetY + (props.cameraPos.z - minZ) * scale;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(props.cameraPos.yaw || 0);

  // Camera glow
  ctx.fillStyle = dark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(245, 158, 11, 0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(8, props.size * 0.1), 0, Math.PI * 2);
  ctx.fill();

  // Camera triangle
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = dark ? '#fef3c7' : '#78350f';
  ctx.lineWidth = 1;

  ctx.beginPath();
  const cam = Math.max(4, props.size * 0.06);
  ctx.moveTo(0, -cam);
  ctx.lineTo(cam * 0.75, cam * 0.6);
  ctx.lineTo(0, cam * 0.25);
  ctx.lineTo(-cam * 0.75, cam * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // North indicator
  ctx.fillStyle = textColor;
  const northX = width - padding - 2;
  const northY = padding + 4;
  ctx.font = `900 ${Math.max(7, Math.round(props.size * 0.09))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', northX, northY);

  ctx.strokeStyle = mutedTextColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(northX, northY + 6);
  ctx.lineTo(northX, northY + 12);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(northX, northY + 6);
  ctx.lineTo(northX - 2, northY + 9);
  ctx.moveTo(northX, northY + 6);
  ctx.lineTo(northX + 2, northY + 9);
  ctx.stroke();
};

const tick = () => {
  draw();
  rafId = requestAnimationFrame(tick);
};

onMounted(() => {
  tick();
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
});

watch(
  () => [props.recintos, props.cameraPos, props.size, props.visible],
  () => draw(),
  { deep: true },
);
</script>

<template>
  <aside
    v-if="visible"
    data-siec-minimap
    class="absolute bottom-3 right-3 z-20 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 shadow-xl shadow-slate-950/12 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/85 dark:shadow-black/30"
    :style="{ width: `${size + 10}px` }"
    aria-label="Mini mapa 2D"
  >
    <!-- Header -->
    <div class="mb-1.5 flex items-center justify-between gap-1.5 px-0.5">
      <div class="flex items-center gap-1.5">
        <span
          class="flex h-5 w-5 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[12px]">
            radar
          </span>
        </span>

        <span
          class="text-[9px] font-black uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400"
        >
          Mini-map
        </span>
      </div>

      <span
        class="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-black text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
      >
        {{ recintos.length }}
      </span>
    </div>

    <!-- Canvas shell -->
    <div
      class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-800 dark:bg-slate-900"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <canvas
        ref="canvasRef"
        class="block h-full w-full"
        :style="{ width: `${size}px`, height: `${size}px` }"
        aria-label="Vista superior del plano"
      />
    </div>
  </aside>
</template>