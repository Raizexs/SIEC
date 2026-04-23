<script setup>
import { ref, onMounted } from 'vue'
import { useLayoutManager } from '../composables/useLayoutManager'
import { useI18n } from '../composables/useI18n'

const { t, currentLanguage, setLanguage } = useI18n()
const { presets, savedLayouts, deleteLayout } = useLayoutManager()

const emit = defineEmits(['loadPreset', 'loadLayout', 'collapse-change', 'open-manual'])

// ── Collapse ──────────────────────────────────────────────────────────
const collapsed = ref(false)
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
  emit('collapse-change', collapsed.value)
}

// ── Dark mode ─────────────────────────────────────────────────────────
const isDark = ref(localStorage.getItem('siec_dark') === 'true')

const applyDark = (value) => {
  if (value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const toggleDark = () => {
  isDark.value = !isDark.value
  localStorage.setItem('siec_dark', String(isDark.value))
  applyDark(isDark.value)
}

onMounted(() => { applyDark(isDark.value) })

// ── Language ──────────────────────────────────────────────────────────
const loadPreset = (preset) => emit('loadPreset', preset)
const loadSavedLayout = (layout) => emit('loadLayout', layout)
const deleteSavedLayout = (id) => deleteLayout(id)

const toggleLanguage = () => {
  setLanguage(currentLanguage.value === 'es' ? 'en' : 'es')
}

</script>

<template>
  <!-- Collapse button — always visible, floats over edge -->
  <button
    @click="toggleCollapse"
    class="fixed top-4 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white shadow-lg transition-all duration-300 hover:scale-110"
    :style="{ left: collapsed ? '0.75rem' : '15rem' }"
    :title="collapsed ? 'Expandir panel' : 'Colapsar panel'"
  >
    <span class="material-symbols-outlined text-sm leading-none">
      {{ collapsed ? 'chevron_right' : 'chevron_left' }}
    </span>
  </button>

  <!-- Sidebar -->
  <aside
    class="h-screen fixed left-0 top-0 bg-surface-container-low dark:bg-[#0d1117] flex flex-col z-40 overflow-hidden transition-all duration-300 ease-in-out border-r border-slate-200/50 dark:border-[#21262d]"
    :class="collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-64 opacity-100 p-4 space-y-2'"
  >
    <!-- Logo -->
    <div class="mb-6 px-2 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-primary rounded-md flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-white text-sm">architecture</span>
        </div>
        <div class="overflow-hidden">
          <h1 class="text-lg font-bold text-primary-container dark:text-white font-headline tracking-tight truncate">{{ t('siec') }}</h1>
          <p class="text-[10px] text-slate-500 dark:text-slate-300 font-medium uppercase tracking-[0.1em] truncate">{{ t('constructionIntelligence') }}</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 overflow-y-auto">


      <!-- Saved Layouts -->
      <div v-if="savedLayouts.length > 0" class="pt-4 pb-2">
        <h4 class="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest px-3 mb-3 flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">save</span>
          {{ t('savedLayouts') }}
        </h4>
        <div class="space-y-2 px-2">
          <div
            v-for="layout in savedLayouts"
            :key="layout.id"
            class="w-full text-left flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:border-emerald-200 dark:hover:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group shadow-sm"
          >
            <button @click="loadSavedLayout(layout)" class="flex-1 overflow-hidden">
              <div class="flex items-center gap-2 mb-1">
                <span class="block text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{{ layout.name }}</span>
                <span v-if="layout.recintos && layout.recintos.length > 0" class="text-[8px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">3D</span>
              </div>
              <span class="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {{ layout.m2Totales }} m² • {{ new Date(layout.createdAt).toLocaleDateString() }}
              </span>
            </button>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button @click="loadSavedLayout(layout)" class="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-colors" title="Cargar">
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              </button>
              <button @click="deleteSavedLayout(layout.id)" class="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar">
                <span class="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Bottom: toggles + CTA -->
    <div class="mt-auto space-y-3 border-t border-slate-200 dark:border-[#21262d] pt-4 shrink-0">

      <!-- Language + Dark mode row -->
      <div class="px-3 flex items-center justify-between gap-3">
        <!-- Language toggle -->
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">ES</span>
          <button
            @click="toggleLanguage"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
            :class="currentLanguage === 'en' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'"
            title="Cambiar idioma"
          >
            <span
              class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              :class="currentLanguage === 'en' ? 'translate-x-5' : 'translate-x-1'"
            />
          </button>
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">EN</span>
        </div>

        <!-- Dark mode toggle -->
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-300">light_mode</span>
          <button
            @click="toggleDark"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
            :class="isDark ? 'bg-[#7aaddb]' : 'bg-slate-300'"
            title="Modo oscuro"
          >
            <span
              class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              :class="isDark ? 'translate-x-5' : 'translate-x-1'"
            />
          </button>
          <span class="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-300">dark_mode</span>
        </div>
      </div>

      <!-- Ayuda y Tutorial -->
      <div class="px-3 pt-2 flex flex-col gap-2">
        <button 
          @click="$emit('start-tutorial')"
          class="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          <span class="material-symbols-outlined text-[16px]">school</span>
          Tutorial Interactivo
        </button>

        <button 
          @click="$emit('open-manual')"
          class="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300"
        >
          <span class="material-symbols-outlined text-[16px]">help</span>
          Ver Guía Manual
        </button>
      </div>

      <!-- Auto-save indicator -->
      <div class="px-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-tight">
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

  <!-- Main offset: se ajusta cuando la sidebar se colapsa -->
  <!-- (el main usa ml-64 en App.vue, lo overrideamos con una clase dinámica via CSS var si se necesita, pero por ahora el collapse es overlay) -->
</template>
