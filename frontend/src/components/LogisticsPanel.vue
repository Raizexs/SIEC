<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between pb-4 border-b border-outline-variant/10">
      <div>
        <h3 class="text-2xl font-headline font-extrabold text-primary tracking-tight">
          {{ t('logistics') || 'Logística y Despliegue' }}
        </h3>
        <p class="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-1">Análisis de Accesibilidad y Flete</p>
      </div>
    </div>

    <!-- Resumen de Logística según Material -->
    <div 
      class="border-2 rounded-2xl p-6 shadow-sm transition-all duration-500 relative overflow-hidden"
      :class="isHeavyLogistics ? 'bg-amber-50/50 dark:bg-[#3d2c0b]/40 border-amber-200 dark:border-amber-700/50' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30'"
    >
      <div class="absolute inset-0 bg-white/40 dark:bg-black/20 pointer-events-none"></div>
      <div class="flex items-start gap-5 relative z-10">
        <div 
          class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
          :class="isHeavyLogistics ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 animate-pulse-soft' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600'"
        >
          <span class="material-symbols-outlined text-2xl">
            {{ isHeavyLogistics ? 'crane' : 'local_shipping' }}
          </span>
        </div>
        <div>
          <h4 class="font-bold text-slate-800 dark:text-slate-100 mb-1">
            {{ isHeavyLogistics ? 'Logística Compleja (Maquinaria Pesada)' : 'Logística Estándar' }}
          </h4>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            {{ isHeavyLogistics 
              ? 'El material seleccionado (Hormigón/Concreto) requiere grúas de alto tonelaje, camiones mixer y permisos municipales especiales para el corte de calles.' 
              : 'El material seleccionado permite el transporte en camiones estándar y ensamblaje in-situ sin necesidad de maquinaria pesada extraordinaria.' 
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Opciones de Accesibilidad -->
    <div class="space-y-4">
      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">map</span>
        Accesibilidad del Terreno
      </h4>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button 
          v-for="(opcion, index) in accesibilidadOpciones" 
          :key="opcion.id"
          @click="selectedAccess = opcion.id"
          class="p-5 rounded-2xl border-2 text-left transition-all duration-300 group overflow-hidden relative animate-fade-in"
          :class="selectedAccess === opcion.id ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-[0_4px_15px_rgba(var(--color-primary),0.15)] scale-[1.02]' : 'border-slate-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] hover:border-primary/40 hover:shadow-md hover:-translate-y-1'"
          :style="{ animationDelay: `${index * 100}ms` }"
        >
          <div v-if="selectedAccess === opcion.id" class="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
          <span class="material-symbols-outlined mb-3 text-[32px] transition-transform duration-300 group-hover:scale-110" :class="selectedAccess === opcion.id ? 'text-primary' : 'text-slate-400'">
            {{ opcion.icon }}
          </span>
          <p class="font-bold text-base text-slate-800 dark:text-slate-100 mb-1 font-headline">{{ opcion.title }}</p>
          <p class="text-[11px] text-slate-500 leading-relaxed">{{ opcion.desc }}</p>
        </button>
      </div>
    </div>

    <!-- Estimación de Costo de Transporte -->
    <div class="bg-gradient-to-r from-surface-container-highest to-surface-container-low dark:from-[#161b22] dark:to-[#0d1117] rounded-2xl p-6 border border-outline-variant/10 dark:border-[#30363d] shadow-sm relative overflow-hidden">
      <div class="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
      <div class="flex items-center justify-between relative z-10">
        <div>
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-[14px]">local_atm</span>
            Costo Estimado de Flete y Logística
          </p>
          <p class="text-3xl font-black text-primary font-headline">{{ formatCurrency(costoTransporte) }}</p>
        </div>
        <div class="w-16 h-16 rounded-full bg-white dark:bg-[#21262d] shadow-sm flex items-center justify-center border border-slate-100 dark:border-[#30363d]">
          <span class="material-symbols-outlined text-3xl text-primary">payments</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  materialEstructuralId: {
    type: Number,
    required: true
  },
  m2Totales: {
    type: Number,
    required: true
  }
})

// 4 es Hormigón/Concrete (Logística pesada)
const isHeavyLogistics = computed(() => props.materialEstructuralId === 4)

const selectedAccess = ref('urbano')

const accesibilidadOpciones = [
  { id: 'urbano', title: 'Urbano Óptimo', desc: 'Calles pavimentadas, giro amplio.', icon: 'emoji_transportation', multiplier: 1 },
  { id: 'suburbano', title: 'Suburbano', desc: 'Caminos mixtos, acceso moderado.', icon: 'signpost', multiplier: 1.5 },
  { id: 'rural', title: 'Rural Difícil', desc: 'Caminos de tierra, pendiente alta.', icon: 'landscape', multiplier: 2.5 }
]

const costoTransporte = computed(() => {
  const baseTransport = 150000 // 150k CLP flete base
  const materialMultiplier = isHeavyLogistics.value ? 4.5 : 1.2
  const accessMultiplier = accesibilidadOpciones.find(o => o.id === selectedAccess.value)?.multiplier || 1
  const sizeMultiplier = props.m2Totales > 100 ? 1.5 : 1.0

  return baseTransport * materialMultiplier * accessMultiplier * sizeMultiplier
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
};
</script>
