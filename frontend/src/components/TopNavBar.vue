<script setup>
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  activeTab: {
    type: String,
    default: 'generalSpecs'
  }
})

const emit = defineEmits(['tab-change'])

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
  <header class="sticky top-0 left-0 w-full flex justify-between items-center px-10 h-16 bg-white/80 backdrop-blur-md z-30 border-b border-slate-200/50">
    <div class="flex items-center gap-8">
      <h2 class="text-xl font-black text-primary-container uppercase tracking-wider font-headline">{{ t('estimationConfigurator') }}</h2>
      <div class="hidden md:flex items-center space-x-6 text-sm font-manrope font-semibold tracking-tight">
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

      <div class="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container">
        <div class="w-full h-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm">U</div>
      </div>
    </div>
  </header>
</template>
