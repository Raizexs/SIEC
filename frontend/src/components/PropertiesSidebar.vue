<script setup>
import { computed } from 'vue';
import { useRecintosStore } from '../stores/recintos';

const recintosStore = useRecintosStore();

const activeRecinto = computed(() => recintosStore.activeRecinto);

const canCloneToCurrentFloor = computed(() => {
  if (!activeRecinto.value) return false;

  return (
    activeRecinto.value.piso === recintosStore.currentFloor - 1 &&
    recintosStore.currentFloor <= 3
  );
});

const areaTotal = computed(() => {
  if (!activeRecinto.value) return 0;

  return activeRecinto.value.dimensions.w * activeRecinto.value.dimensions.l;
});

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
      class="absolute right-4 top-[70px] z-50 flex w-80 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
    >
      <!-- Top accent -->
      <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

      <!-- Header -->
      <header
        class="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <div class="flex min-w-0 items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <span class="material-symbols-outlined text-[22px]">
              straighten
            </span>
          </div>

          <div class="min-w-0">
            <p
              class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              Inspector
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
          <span
            class="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:rotate-90"
          >
            close
          </span>
        </button>
      </header>

      <!-- Body -->
      <div class="space-y-4 p-4">
        <!-- Actions -->
        <section class="grid gap-2" :class="canCloneToCurrentFloor ? 'grid-cols-2' : 'grid-cols-1'">
          <button
            v-if="canCloneToCurrentFloor"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:scale-[0.98] dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-300 dark:hover:bg-blue-950/40"
            title="Clonar a este piso"
            @click="recintosStore.cloneToCurrentFloor(activeRecinto.id)"
          >
            <span class="material-symbols-outlined text-[16px]">
              content_copy
            </span>
            Piso {{ recintosStore.currentFloor }}
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md active:scale-[0.98] dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300 dark:hover:bg-red-950/40"
            title="Eliminar recinto"
            @click="recintosStore.deleteRecinto(activeRecinto.id)"
          >
            <span class="material-symbols-outlined text-[16px]">
              delete
            </span>
            Eliminar
          </button>
        </section>

        <!-- Dimensions -->
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p
                class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
              >
                Dimensiones
              </p>
              <p class="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Medidas actuales del recinto seleccionado.
              </p>
            </div>

            <span
              class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            >
              m
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div
              class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span
                class="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
              >
                Ancho (X)
              </span>

              <span class="mt-1 block font-mono text-lg font-black text-slate-950 dark:text-slate-100">
                {{ activeRecinto.dimensions.w.toFixed(2) }}
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  m
                </span>
              </span>
            </div>

            <div
              class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span
                class="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
              >
                Largo (Z)
              </span>

              <span class="mt-1 block font-mono text-lg font-black text-slate-950 dark:text-slate-100">
                {{ activeRecinto.dimensions.l.toFixed(2) }}
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  m
                </span>
              </span>
            </div>
          </div>

          <!-- Area -->
          <div
            class="relative overflow-hidden rounded-3xl border border-orange-200 bg-orange-50/70 p-4 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/20"
          >
            <div
              class="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-400/20 blur-2xl"
            ></div>

            <div class="relative z-10 flex items-center justify-between gap-3">
              <div>
                <span
                  class="block text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300"
                >
                  Área total
                </span>

                <span class="mt-1 block font-mono text-2xl font-black tracking-tight text-orange-900 dark:text-orange-100">
                  {{ areaTotal.toFixed(2) }}
                  <span class="text-xs font-bold text-orange-600 dark:text-orange-300">
                    m²
                  </span>
                </span>
              </div>

              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-white text-orange-500 shadow-sm dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[27px]">
                  aspect_ratio
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Tip -->
        <section
          class="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900/70 dark:bg-blue-950/25"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 shadow-sm dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <span class="material-symbols-outlined text-[18px]">
              tips_and_updates
            </span>
          </div>

          <p class="text-xs font-medium leading-relaxed text-blue-800 dark:text-blue-200">
            <strong class="font-black">Edición libre 3D:</strong>
            utiliza las flechas rojas y azules directamente sobre la habitación en el plano para estirarla interactivamente.
          </p>
        </section>
      </div>
    </aside>
  </transition>
</template>