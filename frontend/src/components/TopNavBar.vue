<script setup>
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const showProfileMenu = ref(false)

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

const emit = defineEmits(['tab-change', 'save-layout', 'toggle-3d', 'export-pdf'])

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

      <button 
        @click="$emit('export-pdf')"
        class="flex items-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:opacity-90 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wide transition-colors shadow-sm"
      >
        <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
        Exportar PDF
      </button>

      <div class="relative">
        <button @click="showProfileMenu = !showProfileMenu" class="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-surface-container hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 relative z-40">
          <div class="w-full h-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm">
            {{ authStore.user?.name?.charAt(0).toUpperCase() || 'U' }}
          </div>
        </button>

        <!-- Dropdown Menu -->
        <transition name="fade-slide">
          <div v-if="showProfileMenu" class="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
            <div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <p class="font-bold text-slate-800 dark:text-white truncate">{{ authStore.user?.name || 'Arquitecto' }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ authStore.user?.email || 'usuario@siec.cloud' }}</p>
            </div>
            
            <div class="p-2 max-h-48 overflow-y-auto">
              <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 mt-1">Historial Exportaciones</h4>
              <div v-if="authStore.exportHistory.length === 0" class="text-xs text-slate-500 italic px-2 py-1">
                No hay PDFs exportados
              </div>
              <div v-for="item in authStore.exportHistory" :key="item.id" class="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors flex justify-between items-center group">
                <span class="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[120px]" :title="item.name">{{ item.name }}</span>
                <span class="text-[10px] text-slate-400 shrink-0">{{ item.date }}</span>
              </div>
            </div>

            <div class="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button @click="authStore.logout(); showProfileMenu = false" class="w-full text-left px-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                <span class="material-symbols-outlined text-[16px]">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>
