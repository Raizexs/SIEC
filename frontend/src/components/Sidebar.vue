<script setup>
import { useLayoutManager } from '../composables/useLayoutManager'
import { useI18n } from '../composables/useI18n'

const { t, currentLanguage, setLanguage } = useI18n()
const { presets, savedLayouts } = useLayoutManager()

const emit = defineEmits(['loadPreset', 'loadLayout'])

const loadPreset = (preset) => {
  emit('loadPreset', preset)
}

const loadSavedLayout = (layout) => {
  emit('loadLayout', layout)
}

const toggleLanguage = () => {
  setLanguage(currentLanguage.value === 'es' ? 'en' : 'es')
}
</script>

<template>
  <aside class="h-screen w-64 fixed left-0 top-0 bg-surface-container-low dark:bg-slate-950 flex flex-col p-4 space-y-2 z-40">
    <!-- Logo Section -->
    <div class="mb-6 px-2">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-sm">architecture</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-primary-container font-headline tracking-tight">{{ t('siec') }}</h1>
          <p class="text-[10px] text-slate-500 font-medium uppercase tracking-[0.1em]">{{ t('constructionIntelligence') }}</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 overflow-y-auto">
      <a class="flex items-center gap-3 px-3 py-2.5 transition-transform duration-200 hover:translate-x-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 rounded-md font-manrope text-sm font-medium" href="#">
        <span class="material-symbols-outlined">dashboard</span>
        <span>{{ t('dashboard') }}</span>
      </a>
      <a class="flex items-center gap-3 px-3 py-2.5 transition-transform duration-200 hover:translate-x-1 bg-white dark:bg-slate-800 text-primary-container font-bold shadow-sm rounded-md font-manrope text-sm" href="#">
        <span class="material-symbols-outlined">architecture</span>
        <span>{{ t('projects') }}</span>
      </a>
      <a class="flex items-center gap-3 px-3 py-2.5 transition-transform duration-200 hover:translate-x-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 rounded-md font-manrope text-sm font-medium" href="#">
        <span class="material-symbols-outlined">analytics</span>
        <span>{{ t('metrics') }}</span>
      </a>
      <a class="flex items-center gap-3 px-3 py-2.5 transition-transform duration-200 hover:translate-x-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 rounded-md font-manrope text-sm font-medium" href="#">
        <span class="material-symbols-outlined">settings</span>
        <span>{{ t('settings') }}</span>
      </a>

      <!-- Recent Presets Section -->
      <div class="pt-6 pb-2">
        <h4 class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-3">{{ t('recentPresets') }}</h4>
        <div class="space-y-1">
          <button 
            v-for="preset in presets" 
            :key="preset.id"
            @click="loadPreset(preset)"
            class="w-full text-left flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/50 transition-colors group"
          >
            <div class="overflow-hidden">
              <span class="block text-xs font-bold text-slate-700 truncate">{{ preset.name }}</span>
              <span class="block text-[10px] text-slate-500 italic">{{ preset.description }}</span>
            </div>
            <span class="material-symbols-outlined text-slate-400 text-xs opacity-0 group-hover:opacity-100">refresh</span>
          </button>
        </div>
      </div>

      <!-- Saved Layouts Section -->
      <div v-if="savedLayouts.length > 0" class="pt-4 pb-2">
        <h4 class="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest px-3 mb-3">{{ t('savedLayouts') }}</h4>
        <div class="space-y-1">
          <button 
            v-for="layout in savedLayouts" 
            :key="layout.id"
            @click="loadSavedLayout(layout)"
            class="w-full text-left flex items-center justify-between px-3 py-2 rounded-md hover:bg-emerald-50 transition-colors group"
          >
            <div class="overflow-hidden">
              <span class="block text-xs font-bold text-slate-700 truncate">{{ layout.name }}</span>
              <span class="block text-[10px] text-slate-500 italic">{{ layout.m2Totales }} m² • {{ new Date(layout.createdAt).toLocaleDateString() }}</span>
            </div>
            <span class="material-symbols-outlined text-emerald-600 text-xs opacity-0 group-hover:opacity-100">folder_open</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Bottom Section -->
    <div class="mt-auto space-y-4 border-t border-slate-200 pt-4">
      <!-- Language Switch -->
      <div class="px-3 flex items-center justify-between">
        <span class="text-[10px] font-bold text-slate-500 uppercase">ES</span>
        <button 
          @click="toggleLanguage"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          :class="currentLanguage === 'en' ? 'bg-primary' : 'bg-slate-300'"
        >
          <span 
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="currentLanguage === 'en' ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
        <span class="text-[10px] font-bold text-slate-500 uppercase">EN</span>
      </div>

      <!-- Auto-save Status -->
      <div class="px-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        {{ t('autoSaveActive') }}
      </div>
      <button class="w-full bg-gradient-to-br from-primary to-primary-container text-white py-3 rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity">
        {{ t('newEstimate') }}
      </button>
    </div>
  </aside>
</template>
