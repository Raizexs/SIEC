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
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:formData', 'submit'])

const updateFormData = (field, value) => {
  emit('update:formData', { ...props.formData, [field]: value })
}

const handleSubmit = () => {
  emit('submit')
}

// Límites máximos
const maxHabitacionesSimples = computed(() => 
  props.formData.habitacionesSimples + Math.floor(props.tokensDisponibles / props.costs.habitacionSimple)
)

const maxBanios = computed(() => 
  props.formData.banios + Math.floor(props.tokensDisponibles / props.costs.banio)
)
const maxAreasComunes = computed(() => 
  props.formData.areasComunes + Math.floor(props.tokensDisponibles / props.costs.area_comun)
)

const increment = (field, max) => {
  if (props.formData[field] < max) {
    updateFormData(field, props.formData[field] + 1)
  }
}

const decrement = (field) => {
  if (props.formData[field] > 0) {
    updateFormData(field, props.formData[field] - 1)
  }
}

const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const estimatedCost = computed(() => {
  return calculateCost(props.formData.m2Totales, props.formData.materialEstructuralId)
})

const materialName = computed(() => {
  return MATERIAL_COSTS[props.formData.materialEstructuralId]?.name || 'Unknown'
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
        <label class="text-sm font-bold text-on-surface uppercase tracking-wider">{{ t('totalBuiltArea') }}</label>
        <div class="flex items-center gap-2">
          <input 
            :value="formatNumber(formData.m2Totales)" 
            @input="updateFormData('m2Totales', Number($event.target.value.replace(/,/g, '')))"
            class="w-24 text-right font-headline font-bold text-2xl border-none p-0 focus:ring-0 text-primary bg-transparent" 
            type="text"
          />
          <span class="text-slate-400 font-medium">m²</span>
        </div>
      </div>
      <input 
        :value="formData.m2Totales"
        @input="updateFormData('m2Totales', Number($event.target.value))"
        class="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer" 
        max="500" 
        min="10" 
        step="10" 
        type="range"
      />
      <div class="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
        <span>10 m²</span>
        <span>250 m²</span>
        <span>500 m²</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-3">
        <label class="text-[9px] font-bold text-on-surface uppercase tracking-widest text-center block truncate" title="Habitaciones Simples">{{ t('simpleRooms') }}</label>
        <div class="flex items-center gap-1 bg-surface-container-highest/30 p-1.5 rounded-full border border-outline-variant/10">
          <button 
            @click="decrement('habitacionesSimples')"
            type="button"
            class="w-6 h-6 rounded-full bg-white dark:bg-[#21262d] shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#30363d]"
          >
            <span class="material-symbols-outlined text-primary text-[12px]">remove</span>
          </button>
          <span class="flex-1 text-center font-headline font-extrabold text-sm">{{ formData.habitacionesSimples || 0 }}</span>
          <button 
            @click="increment('habitacionesSimples', maxHabitacionesSimples)"
            type="button"
            class="w-6 h-6 rounded-full bg-primary text-white shadow-sm flex items-center justify-center hover:opacity-90"
          >
            <span class="material-symbols-outlined text-[12px]">add</span>
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <label class="text-[9px] font-bold text-on-surface uppercase tracking-widest text-center block truncate" title="Baños">{{ t('bathrooms') }}</label>
        <div class="flex items-center gap-1 bg-surface-container-highest/30 p-1.5 rounded-full border border-outline-variant/10">
          <button 
            @click="decrement('banios')"
            type="button"
            class="w-6 h-6 rounded-full bg-white dark:bg-[#21262d] shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#30363d]"
          >
            <span class="material-symbols-outlined text-primary text-[12px]">remove</span>
          </button>
          <span class="flex-1 text-center font-headline font-extrabold text-sm">{{ formData.banios }}</span>
          <button 
            @click="increment('banios', maxBanios)"
            type="button"
            class="w-6 h-6 rounded-full bg-primary text-white shadow-sm flex items-center justify-center hover:opacity-90"
          >
            <span class="material-symbols-outlined text-[12px]">add</span>
          </button>
        </div>
      </div>
      
      <div class="space-y-3">
        <label class="text-[9px] font-bold text-on-surface uppercase tracking-widest text-center block truncate" title="Áreas Comunes">{{ t('commonAreas') }}</label>
        <div class="flex items-center gap-1 bg-surface-container-highest/30 p-1.5 rounded-full border border-outline-variant/10">
          <button 
            @click="decrement('areasComunes')"
            type="button"
            class="w-6 h-6 rounded-full bg-white dark:bg-[#21262d] shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#30363d]"
          >
            <span class="material-symbols-outlined text-primary text-[12px]">remove</span>
          </button>
          <span class="flex-1 text-center font-headline font-extrabold text-sm">{{ formData.areasComunes }}</span>
          <button 
            @click="increment('areasComunes', maxAreasComunes)"
            type="button"
            class="w-6 h-6 rounded-full bg-primary text-white shadow-sm flex items-center justify-center hover:opacity-90"
          >
            <span class="material-symbols-outlined text-[12px]">add</span>
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <label class="text-xs font-bold text-on-surface uppercase tracking-widest">{{ t('structuralMaterial') }}</label>
      <div class="relative">
        <select 
          :value="formData.materialEstructuralId"
          @change="updateFormData('materialEstructuralId', Number($event.target.value))"
          class="w-full bg-surface-container-highest p-4 rounded-xl border-none text-primary font-manrope font-semibold appearance-none focus:ring-2 focus:ring-primary/20"
          required
        >
          <option value="1">{{ t('woodFrame') }}</option>
          <option value="2">{{ t('steelFramed') }}</option>
          <option value="3">{{ t('masonry') }}</option>
          <option value="4">{{ t('concrete') }}</option>
        </select>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <span class="material-symbols-outlined text-slate-400">unfold_more</span>
        </div>
      </div>
      <p class="text-[11px] text-slate-500 px-1 italic">{{ t('materialNote') }}</p>
    </div>

    <button 
      @click="handleSubmit"
      :disabled="isSubmitting"
      class="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-headline font-extrabold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
    >
      {{ isSubmitting ? t('saving') : t('saveGenerate') }}
    </button>
  </section>
</template>