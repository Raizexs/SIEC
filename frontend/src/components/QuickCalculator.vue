<script setup>
import { ref, watch } from 'vue'
import BudgetBreakdownPanel from './BudgetBreakdownPanel.vue'

const MATERIALES = [
  { id: 1, label: 'Madera', icon: 'forest', desc: 'Económica y versátil. Ideal para ampliaciones ligeras.' },
  { id: 2, label: 'Metalcon', icon: 'view_in_ar', desc: 'Rápida y resistente. Estructura de perfiles de acero.' },
  { id: 3, label: 'Albañilería', icon: 'bricks', desc: 'Clásica y durable. Ladrillo, cemento y mortero.' },
  { id: 4, label: 'Hormigón Armado', icon: 'foundation', desc: 'La más sólida. Para construcciones de larga duración.' },
]

const m2 = ref(20)
const materialId = ref(3)
const calculado = ref(false)

const selectMaterial = (id) => {
  materialId.value = id
}

const calcular = () => {
  calculado.value = true
}

// Si cambia m² o material después de calcular, re-lanzar
watch([m2, materialId], () => {
  if (calculado.value) calculado.value = false
})
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-10 py-2">

    <!-- Hero -->
    <div class="text-center space-y-2">
      <div class="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-2">
        <span class="material-symbols-outlined text-sm">bolt</span>
        Calculadora Rápida
      </div>
      <h1 class="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
        ¿Cuánto cuesta ampliar tu casa?
      </h1>
      <p class="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
        Ingresa los metros cuadrados y elige el tipo de construcción. Te mostramos un desglose real basado en precios de Sodimac, Easy y Construmart.
      </p>
    </div>

    <!-- Inputs -->
    <div class="bg-white dark:bg-[#151c27] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-8 shadow-sm space-y-8">

      <!-- M2 Slider -->
      <div class="space-y-3">
        <div class="flex justify-between items-baseline">
          <label class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-lg">square_foot</span>
            Metros cuadrados a ampliar
          </label>
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-black text-primary">{{ m2 }}</span>
            <span class="text-slate-400 font-semibold text-sm">m²</span>
          </div>
        </div>
        <input
          v-model.number="m2"
          type="range"
          min="5"
          max="200"
          step="1"
          class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div class="flex justify-between text-xs text-slate-400 font-medium">
          <span>5 m²</span>
          <span>100 m²</span>
          <span>200 m²</span>
        </div>
      </div>

      <!-- Material Selector -->
      <div class="space-y-3">
        <label class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-lg">construction</span>
          Tipo de construcción
        </label>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            v-for="mat in MATERIALES"
            :key="mat.id"
            @click="selectMaterial(mat.id)"
            :class="[
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all',
              materialId === mat.id
                ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800'
            ]"
          >
            <span class="material-symbols-outlined text-3xl" :class="materialId === mat.id ? 'text-primary' : 'text-slate-400'">
              {{ mat.icon }}
            </span>
            <span class="font-bold text-sm" :class="materialId === mat.id ? 'text-primary' : 'text-slate-700 dark:text-slate-200'">
              {{ mat.label }}
            </span>
            <span class="text-[10px] text-slate-400 leading-tight hidden md:block">{{ mat.desc }}</span>
          </button>
        </div>
      </div>

      <!-- CTA -->
      <button
        @click="calcular"
        class="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
      >
        <span class="material-symbols-outlined">calculate</span>
        Calcular Presupuesto
      </button>
    </div>

    <!-- Resultado -->
    <transition name="fade-up">
      <div v-if="calculado">
        <BudgetBreakdownPanel
          :m2Totales="m2"
          :materialEstructuralId="materialId"
        />
      </div>
    </transition>

  </div>
</template>

<style scoped>
.fade-up-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
</style>
