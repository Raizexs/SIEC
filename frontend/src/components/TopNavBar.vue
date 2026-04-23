<script setup>
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth'
import { useLayoutManager } from '../composables/useLayoutManager'

const { t } = useI18n()
const authStore = useAuthStore()
const { savedLayouts } = useLayoutManager()

// Mock data para el usuario logueado (en un caso real vendría de authStore.user)
const userProfile = {
  name: "Alexander Ryzek",
  role: "Arquitecto Senior",
  company: "Raizexs Studio",
  avatarUrl: "https://i.pravatar.cc/150?u=ryzek", // Avatar dinámico bonito
  email: "ryzek@raizexs.world"
}

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

const logout = () => {
  authStore.logout()
  showProfileMenu.value = false
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
        <button 
          @click="showProfileMenu = !showProfileMenu"
          class="flex items-center gap-2 p-1 pl-2 pr-3 bg-surface-container-low dark:bg-[#161b22] hover:bg-surface-container-highest dark:hover:bg-[#21262d] rounded-full border border-outline-variant/20 dark:border-[#30363d] transition-all"
        >
          <img :src="userProfile.avatarUrl" alt="Avatar" class="w-8 h-8 rounded-full border-2 border-primary object-cover shadow-sm">
          <span class="text-sm font-bold text-on-surface truncate max-w-[100px]">{{ userProfile.name.split(' ')[0] }}</span>
          <span class="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
        </button>

        <!-- Dropdown Menu -->
        <Transition name="fade-scale">
          <div 
            v-if="showProfileMenu" 
            class="absolute right-0 mt-3 w-80 bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl border border-slate-100 dark:border-[#30363d] overflow-hidden origin-top-right z-50"
          >
            <!-- Header Perfil -->
            <div class="p-5 border-b border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50 relative overflow-hidden">
              <!-- Decoración de fondo -->
              <div class="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div class="flex items-center gap-4 relative z-10">
                <img :src="userProfile.avatarUrl" alt="Avatar" class="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover">
                <div>
                  <p class="text-base font-bold text-slate-800 dark:text-slate-100 font-headline leading-tight">{{ userProfile.name }}</p>
                  <p class="text-[11px] font-bold text-primary tracking-wider uppercase mt-0.5">{{ userProfile.role }}</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{{ userProfile.company }}</p>
                </div>
              </div>
            </div>

            <!-- Stats Rápidas -->
            <div class="grid grid-cols-2 gap-px bg-slate-100 dark:bg-[#30363d]">
              <div class="p-3 bg-white dark:bg-[#161b22] text-center">
                <p class="text-2xl font-headline font-extrabold text-primary">{{ authStore.exportHistory.length }}</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Exportaciones</p>
              </div>
              <div class="p-3 bg-white dark:bg-[#161b22] text-center">
                <p class="text-2xl font-headline font-extrabold text-emerald-500">{{ savedLayouts?.length || 0 }}</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Guardados</p>
              </div>
            </div>

            <!-- Historial de PDFs -->
            <div class="p-4">
              <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[14px]">history</span>
                Historial PDF Reciente
              </h4>
              
              <div v-if="authStore.exportHistory.length === 0" class="text-center py-4">
                <span class="material-symbols-outlined text-slate-200 text-3xl mb-1">description</span>
                <p class="text-[11px] text-slate-400 font-medium">No hay exportaciones recientes</p>
              </div>
              
              <ul v-else class="space-y-2">
                <li v-for="(item, idx) in authStore.exportHistory.slice(0,3)" :key="idx" class="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#21262d] transition-colors border border-transparent hover:border-slate-100 dark:hover:border-[#30363d]">
                  <div class="w-7 h-7 rounded bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                  </div>
                  <div class="overflow-hidden">
                    <p class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{{ item.project }}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">{{ new Date(item.date).toLocaleDateString() }} - {{ new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</p>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Footer Menu -->
            <div class="p-2 border-t border-slate-100 dark:border-[#30363d] bg-slate-50 dark:bg-[#0d1117]">
              <button 
                @click="logout"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <span class="material-symbols-outlined text-[16px]">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
