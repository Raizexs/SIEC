<script setup>
import { computed } from 'vue'
import { useRecintosStore } from '../stores/recintos'

const recintosStore = useRecintosStore()

const activeRecinto = computed(() => recintosStore.activeRecinto)

const formatTipo = (tipo) => {
  if (tipo === 'habitacion') return 'Habitación'
  if (tipo === 'banio') return 'Baño'
  if (tipo === 'areaComun') return 'Área Común'
  if (tipo === 'pasillo') return 'Pasillo'
  return tipo
}
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div
      v-if="activeRecinto"
      class="absolute right-4 top-[70px] w-80 bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl p-6 z-50 flex flex-col gap-6"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
            <span class="material-symbols-outlined text-sm">straighten</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-headline tracking-tight leading-none">
              Propiedades
            </h3>
            <span class="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1 block">
              {{ formatTipo(activeRecinto.tipo) }} • Piso {{ activeRecinto.piso || 1 }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="activeRecinto.piso === recintosStore.currentFloor - 1 && recintosStore.currentFloor <= 3"
            @click="recintosStore.cloneToCurrentFloor(activeRecinto.id)"
            class="h-8 px-3 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 transition-colors text-xs font-bold gap-1"
            title="Clonar a este piso"
          >
            <span class="material-symbols-outlined text-[14px]">content_copy</span>
            Clonar al Piso {{ recintosStore.currentFloor }}
          </button>
          <button
            @click="recintosStore.deleteRecinto(activeRecinto.id)"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 transition-colors"
            title="Eliminar recinto"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
          <button
            @click="recintosStore.clearActiveRecinto()"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Ancho (X)</span>
          <span class="text-sm font-black text-slate-700 dark:text-slate-200">{{ activeRecinto.dimensions.w.toFixed(2) }} m</span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Largo (Z)</span>
          <span class="text-sm font-black text-slate-700 dark:text-slate-200">{{ activeRecinto.dimensions.l.toFixed(2) }} m</span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 col-span-2 flex justify-between items-center">
          <div>
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Área Total</span>
            <span class="text-lg font-black text-primary">{{ (activeRecinto.dimensions.w * activeRecinto.dimensions.l).toFixed(2) }} m²</span>
          </div>
          <span class="material-symbols-outlined text-primary/20 text-3xl">aspect_ratio</span>
        </div>
      </div>
      
      <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
        <div class="flex items-start gap-2">
          <span class="material-symbols-outlined text-blue-500 text-[16px] mt-0.5">tips_and_updates</span>
          <p class="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
            <strong>Edición Libre 3D:</strong> Utiliza las flechas rojas y azules directamente sobre la habitación en el plano para estirarla interactivamente.
          </p>
        </div>
      </div>
    </div>
  </transition>
</template>
