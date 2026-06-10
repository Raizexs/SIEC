<script setup>
import { computed } from 'vue';
import { useRecintosStore } from '../stores/recintos';
import { useBilling } from '../composables/useBilling';
import { useI18n } from '../composables/useI18n';
import { MATERIAL_OPTIONS, materialLabel, resolveRecintoMaterial } from '../utils/materialHelpers.js';
import { MAX_FLOORS } from '../constants/spatial.js';

const props = defineProps({
  projectMaterialId: { type: Number, default: 1 },
  embedded: { type: Boolean, default: false },
});

const recintosStore = useRecintosStore();
const { canUseMaterial } = useBilling();
const { t } = useI18n();

const activeRecinto = computed(() => recintosStore.activeRecinto);

const canCloneToCurrentFloor = computed(() => {
  if (!activeRecinto.value) return false;

  return (
    activeRecinto.value.piso === recintosStore.currentFloor - 1 &&
    recintosStore.currentFloor <= MAX_FLOORS
  );
});

const areaTotal = computed(() => {
  if (!activeRecinto.value) return 0;

  return activeRecinto.value.dimensions.w * activeRecinto.value.dimensions.l;
});

const currentMaterialId = computed(() =>
  resolveRecintoMaterial(activeRecinto.value, props.projectMaterialId),
);

const availableMaterials = computed(() =>
  MATERIAL_OPTIONS.filter((m) => canUseMaterial(m.id)),
);

const setMaterial = (materialId) => {
  if (!activeRecinto.value || !canUseMaterial(materialId)) return;
  recintosStore.setRecintoMaterial(activeRecinto.value.id, materialId);
};

const formatTipo = (tipo) => {
  if (tipo === 'habitacion') return 'Habitación';
  if (tipo === 'banio') return 'Baño';
  if (tipo === 'areaComun') return 'Área común';
  if (tipo === 'pasillo') return 'Pasillo';

  return tipo;
};
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-x-6 opacity-0 scale-[0.98]"
    enter-to-class="translate-x-0 opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100 scale-100"
    leave-to-class="translate-x-6 opacity-0 scale-[0.98]"
  >
    <aside
      v-if="activeRecinto"
      class="z-40 flex w-64 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
      :class="
        embedded
          ? 'pointer-events-auto absolute right-3 top-3 max-h-[min(520px,calc(100%-1.5rem))] overflow-y-auto'
          : 'absolute right-4 top-[70px] z-50'
      "
    >
      <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

      <header
        class="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <div class="flex min-w-0 items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <span class="material-symbols-outlined text-[22px]">straighten</span>
          </div>

          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Inspector 3D
            </p>
            <h3 class="mt-0.5 truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
              Propiedades
            </h3>
            <p class="mt-1 truncate text-[11px] font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
              {{ formatTipo(activeRecinto.tipo) }} · Piso {{ activeRecinto.piso || 1 }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="group flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          aria-label="Cerrar panel de propiedades"
          @click="recintosStore.clearActiveRecinto()"
        >
          <span class="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:rotate-90">close</span>
        </button>
      </header>

      <div class="space-y-4 p-4">
        <section class="grid gap-2" :class="canCloneToCurrentFloor ? 'grid-cols-2' : 'grid-cols-1'">
          <button
            v-if="canCloneToCurrentFloor"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:scale-[0.98] dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-300 dark:hover:bg-blue-950/40"
            @click="recintosStore.cloneToCurrentFloor(activeRecinto.id)"
          >
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
            Piso {{ recintosStore.currentFloor }}
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md active:scale-[0.98] dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300 dark:hover:bg-red-950/40"
            @click="recintosStore.deleteRecinto(activeRecinto.id)"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            Eliminar
          </button>
        </section>

        <section class="space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Material del recinto
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="mat in availableMaterials"
              :key="mat.id"
              type="button"
              class="rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-tight transition-all"
              :class="
                currentMaterialId === mat.id
                  ? 'border-orange-400 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              "
              @click="setMaterial(mat.id)"
            >
              {{ mat.label }}
            </button>
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400">
            Actual: {{ materialLabel(currentMaterialId) }}
          </p>
        </section>

        <section class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Ancho (X)</span>
              <span class="mt-1 block font-mono text-lg font-black text-slate-950 dark:text-slate-100">
                {{ activeRecinto.dimensions.w.toFixed(2) }} m
              </span>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Largo (Z)</span>
              <span class="mt-1 block font-mono text-lg font-black text-slate-950 dark:text-slate-100">
                {{ activeRecinto.dimensions.l.toFixed(2) }} m
              </span>
            </div>
          </div>

          <div class="rounded-3xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
            <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Área</span>
            <span class="mt-1 block font-mono text-2xl font-black text-orange-900 dark:text-orange-100">
              {{ areaTotal.toFixed(2) }} m²
            </span>
          </div>
        </section>

        <section class="rounded-2xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-200">
          {{ t('inspector2dPrecisionHint') }}
        </section>
      </div>
    </aside>
  </transition>
</template>
