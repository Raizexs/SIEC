<script setup>
import { computed } from 'vue'
import { useRecintosStore } from '../stores/recintos'

const props = defineProps({
  m2Totales: { type: Number, required: true },
  descripcionEstado: { type: Object, required: true },
})

const store = useRecintosStore()

const totalArea  = computed(() => store.totalArea)
const budgetArea = computed(() => props.m2Totales)
const usedPct    = computed(() =>
  budgetArea.value > 0
    ? Math.min((totalArea.value / budgetArea.value) * 100, 100)
    : 0
)
const freeArea = computed(() => Math.max(budgetArea.value - totalArea.value, 0))
</script>

<template>
  <!--
    Layout: columna estrecha fija (w-[52px]) que contiene:
      - Info stacked (labels + números)
      - Barra vertical de progreso a la derecha de todo el panel
  -->
  <div class="sticky top-24 shrink-0 flex gap-1.5 self-start">

    <!-- Columna de datos -->
    <div class="bg-slate-900 rounded-xl border border-primary/30 p-3 flex flex-col gap-4 w-[148px]">

      <!-- Label principal -->
      <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
        Espacio<br>Disponible
      </p>

      <!-- Libre (grande) -->
      <div>
        <div
          class="text-2xl font-black font-headline leading-none"
          :style="{ color: descripcionEstado.color }"
        >{{ freeArea.toFixed(1) }}</div>
        <span class="text-[10px] text-slate-400 font-semibold">m² libres</span>
      </div>

      <!-- Separador -->
      <div class="h-px bg-slate-700/60 w-full"></div>

      <!-- Usado -->
      <div>
        <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Usado</span>
        <div class="text-sm font-bold text-slate-200 leading-tight">{{ totalArea.toFixed(1) }} <span class="text-[10px] font-normal text-slate-400">m²</span></div>
      </div>

      <!-- Total -->
      <div>
        <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total</span>
        <div class="text-sm font-bold text-slate-200 leading-tight">{{ budgetArea }} <span class="text-[10px] font-normal text-slate-400">m²</span></div>
      </div>

      <!-- Badge de estado (solo si hay problema) -->
      <span
        v-if="descripcionEstado.status !== 'safe'"
        class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase text-center"
        :style="{
          backgroundColor: descripcionEstado.color + '22',
          color: descripcionEstado.color,
        }"
      >
        {{ descripcionEstado.message }}
      </span>

      <!-- Mini leyenda -->
      <div class="space-y-1.5">
        <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Leyenda</p>
        <div class="flex items-center gap-1.5 text-[10px] text-slate-300">
          <span class="w-2.5 h-2.5 rounded-sm bg-[#3b82f6] shrink-0"></span>Hab.
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-slate-300">
          <span class="w-2.5 h-2.5 rounded-sm bg-[#14b8a6] shrink-0"></span>Baño
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-slate-300">
          <span class="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] shrink-0"></span>Común
        </div>
      </div>
    </div>

    <!-- Barra vertical de progreso -->
    <div class="flex flex-col items-center gap-1.5 py-1">
      <!-- Track vertical -->
      <div class="relative w-3 flex-1 min-h-[180px] bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <!-- Fill: crece desde abajo -->
        <div
          class="absolute bottom-0 left-0 w-full rounded-full transition-all duration-300"
          :style="{
            height: usedPct + '%',
            backgroundColor: descripcionEstado.color,
          }"
        />
      </div>
      <!-- Porcentaje debajo -->
      <span
        class="text-[9px] font-bold"
        :style="{ color: descripcionEstado.color }"
      >{{ Math.round(usedPct) }}%</span>
    </div>

  </div>
</template>
