<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useLayoutManager } from '../composables/useLayoutManager'

const { t } = useI18n()
const { MATERIAL_COSTS, calculateCost } = useLayoutManager()

const props = defineProps({
  formData: {
    type: Object,
    required: true
  },
  costs: {
    type: Object,
    required: true
  },
  tokensDisponibles: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:formData'])

const updateFormData = (field, value) => {
  emit('update:formData', { ...props.formData, [field]: value })
}

// Room counters removed — rooms are created via "Añadir Recinto" in RoomEditor2D

const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const estimatedCost = computed(() => {
  return calculateCost(props.formData.m2Totales, props.formData.materialEstructuralId)
})

</script>

<template>
  <section class="col-span-7 space-y-10 transition-all duration-500 ease-in-out">
    <div class="animate-fade-in">
      <span class="text-[11px] font-bold text-secondary uppercase tracking-[0.2em] block mb-2">{{ t('step01') }}</span>
      <h3 class="text-4xl font-headline font-extrabold text-primary tracking-tight leading-none">{{ t('projectGeometry') }}</h3>
    </div>

    <div class="bg-surface-container-lowest dark:bg-[#161b22] p-6 rounded-xl border border-outline-variant/10 dark:border-[#30363d] shadow-sm space-y-6 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
      <div class="flex justify-between items-end">
        <label class="text-sm font-bold text-on-surface uppercase tracking-wider">Medidas del Terreno</label>
        <div class="flex items-center gap-2">
          <span class="text-lg font-headline font-bold text-primary">{{ formData.m2Totales }}</span>
          <span class="text-slate-400 font-medium">m² totales</span>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-xs text-slate-500 font-bold uppercase">Ancho (m)</label>
          <input 
            :value="formData.terrenoAncho"
            @input="updateFormData('terrenoAncho', Number($event.target.value))"
            class="w-full bg-surface-container-highest dark:bg-[#0d1117] border border-outline-variant/20 dark:border-[#30363d] rounded-lg p-2 text-center font-mono font-bold text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            type="number"
            min="2"
            step="0.5"
          />
        </div>
        <div class="space-y-2">
          <label class="text-xs text-slate-500 font-bold uppercase">Largo (m)</label>
          <input 
            :value="formData.terrenoLargo"
            @input="updateFormData('terrenoLargo', Number($event.target.value))"
            class="w-full bg-surface-container-highest dark:bg-[#0d1117] border border-outline-variant/20 dark:border-[#30363d] rounded-lg p-2 text-center font-mono font-bold text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            type="number"
            min="2"
            step="0.5"
          />
        </div>
      </div>
    </div>



    <div class="space-y-4">
      <label class="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-[16px]">foundation</span>
        {{ t('structuralMaterial') }}
      </label>
      
      <!-- Grid de Materiales Premium -->
      <div class="grid grid-cols-2 gap-3">
        <!-- 1: Wood Frame -->
        <button 
          type="button"
          @click="updateFormData('materialEstructuralId', 1)"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group text-center"
          :class="formData.materialEstructuralId === 1 ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-outline-variant/20 dark:border-[#30363d] bg-surface-container-highest dark:bg-[#161b22] hover:border-primary/50'"
        >
          <span class="material-symbols-outlined text-[28px] transition-colors" :class="formData.materialEstructuralId === 1 ? 'text-primary' : 'text-slate-400 group-hover:text-primary'">forest</span>
          <span class="text-xs font-bold" :class="formData.materialEstructuralId === 1 ? 'text-primary' : 'text-slate-600 dark:text-slate-300'">{{ t('woodFrame') }}</span>
          <div v-if="formData.materialEstructuralId === 1" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </button>

        <!-- 2: Steel Framed -->
        <button 
          type="button"
          @click="updateFormData('materialEstructuralId', 2)"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group text-center"
          :class="formData.materialEstructuralId === 2 ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-outline-variant/20 dark:border-[#30363d] bg-surface-container-highest dark:bg-[#161b22] hover:border-primary/50'"
        >
          <span class="material-symbols-outlined text-[28px] transition-colors" :class="formData.materialEstructuralId === 2 ? 'text-primary' : 'text-slate-400 group-hover:text-primary'">view_module</span>
          <span class="text-xs font-bold" :class="formData.materialEstructuralId === 2 ? 'text-primary' : 'text-slate-600 dark:text-slate-300'">{{ t('steelFramed') }}</span>
          <div v-if="formData.materialEstructuralId === 2" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </button>

        <!-- 3: Masonry -->
        <button 
          type="button"
          @click="updateFormData('materialEstructuralId', 3)"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group text-center"
          :class="formData.materialEstructuralId === 3 ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-outline-variant/20 dark:border-[#30363d] bg-surface-container-highest dark:bg-[#161b22] hover:border-primary/50'"
        >
          <span class="material-symbols-outlined text-[28px] transition-colors" :class="formData.materialEstructuralId === 3 ? 'text-primary' : 'text-slate-400 group-hover:text-primary'">grid_view</span>
          <span class="text-xs font-bold" :class="formData.materialEstructuralId === 3 ? 'text-primary' : 'text-slate-600 dark:text-slate-300'">{{ t('masonry') }}</span>
          <div v-if="formData.materialEstructuralId === 3" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </button>

        <!-- 4: Concrete -->
        <button 
          type="button"
          @click="updateFormData('materialEstructuralId', 4)"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group text-center"
          :class="formData.materialEstructuralId === 4 ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-outline-variant/20 dark:border-[#30363d] bg-surface-container-highest dark:bg-[#161b22] hover:border-primary/50'"
        >
          <span class="material-symbols-outlined text-[28px] transition-colors" :class="formData.materialEstructuralId === 4 ? 'text-primary' : 'text-slate-400 group-hover:text-primary'">domain</span>
          <span class="text-xs font-bold" :class="formData.materialEstructuralId === 4 ? 'text-primary' : 'text-slate-600 dark:text-slate-300'">{{ t('concrete') }}</span>
          <div v-if="formData.materialEstructuralId === 4" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </button>
      </div>
      
      <!-- Feedback dinámico del material -->
      <div class="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
        <span class="material-symbols-outlined text-blue-500 dark:text-blue-400 text-[18px] mt-0.5">info</span>
        <div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">{{ t('materialNote') }}</p>
          <p v-if="formData.materialEstructuralId === 4" class="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-widest flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px]">warning</span>
            Requiere logística pesada
          </p>
        </div>
      </div>
    </div>



  </section>
</template>