<script setup>
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  activeTab: {
    type: String,
    default: 'generalSpecs'
  },
  is3DMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['tab-change', 'save-layout', 'toggle-3d'])

const tabs = [
  { name: 'generalSpecs' },
  { name: 'materials' },
  { name: 'logistics' }
]

const handleTabClick = (tabName) => {
  emit('tab-change', tabName)
}
</script>

<template>
  <header class="sticky top-0 left-0 w-full flex justify-between items-center px-10 h-16 bg-white/80 dark:bg-[#0d1117]/90 backdrop-blur-md z-30 border-b border-slate-200/50 dark:border-[#30363d]">
    <div class="flex items-center gap-8">
      <h2 class="text-xl font-black text-primary-container dark:text-slate-200 uppercase tracking-wider font-headline">{{ t('estimationConfigurator') }}</h2>
      
      <!-- Centro: Toggle 2D / 3D -->
      <div class="hidden md:flex items-center bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-300/50 dark:border-slate-700/50 shadow-inner relative ml-4">
        <button 
          @click="$emit('toggle-3d', false)"
          class="relative z-10 px-4 py-1 rounded-full text-xs font-bold transition-colors duration-300"
          :class="!is3DMode ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
        >
          2D
        </button>
        <button 
          @click="$emit('toggle-3d', true)"
          class="relative z-10 px-4 py-1 rounded-full text-xs font-bold transition-colors duration-300"
          :class="is3DMode ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
        >
          3D
        </button>
        <!-- Pill animado -->
        <div 
          class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full shadow-md transition-transform duration-300 ease-in-out"
          :class="is3DMode ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'"
        ></div>
      </div>

      <div class="hidden md:flex items-center space-x-6 text-sm font-manrope font-semibold tracking-tight ml-4">
        <button 
          v-for="tab in tabs" 
          :key="tab.name"
          :class="['py-5 transition-colors', activeTab === tab.name ? 'text-primary-container border-b-2 border-primary-container' : 'text-slate-500 hover:text-slate-800']"
          @click="handleTabClick(tab.name)"
        >
          {{ t(tab.name) }}
        </button>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <button 
        @click="$emit('save-layout')"
        class="hidden md:flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wide transition-colors"
      >
        <span class="material-symbols-outlined text-[16px]">save</span>
        {{ t('save') }}
      </button>

      <div class="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container">
        <div class="w-full h-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm">U</div>
      </div>
    </div>
  </header>
</template>
