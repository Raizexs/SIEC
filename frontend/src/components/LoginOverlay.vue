<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const isSubmitting = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) return;
  isSubmitting.value = true;
  await authStore.login(email.value, password.value);
  isSubmitting.value = false;
};
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="!authStore.isAuthenticated" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
        <!-- Fondos Ambientales Minimalistas -->
        <div class="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
          <div class="absolute top-0 right-0 w-[50vw] h-[100vh] bg-gradient-to-l from-slate-200 to-transparent dark:from-slate-800"></div>
        </div>

        <!-- Malla arquitectónica (Grid) -->
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LDE2MywxODQsMC4yKSIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] pointer-events-none"></div>

        <!-- Panel de Login (Glassmorphism Minimalista) -->
        <div class="relative w-full max-w-md p-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transform transition-all">
          <div class="flex flex-col items-center mb-8">
            <div class="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-emerald-400 dark:to-primary rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-primary/20 mb-6 rotate-3">
              <span class="material-symbols-outlined text-white text-3xl -rotate-3">architecture</span>
            </div>
            <h1 class="text-3xl font-headline font-black text-slate-800 dark:text-white tracking-wide">SIEC <span class="font-light">Cloud</span></h1>
            <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium tracking-wide">Inteligencia Constructiva</p>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-6">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Correo Electrónico</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">alternate_email</span>
                </div>
                <input 
                  v-model="email" 
                  type="email" 
                  required
                  placeholder="arquitecto@estudio.com"
                  class="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-emerald-500/50 focus:ring-1 focus:ring-slate-400 dark:focus:ring-emerald-500/50 transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">lock</span>
                </div>
                <input 
                  v-model="password" 
                  type="password" 
                  required
                  placeholder="••••••••"
                  class="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-emerald-500/50 focus:ring-1 focus:ring-slate-400 dark:focus:ring-emerald-500/50 transition-all font-mono text-sm tracking-widest"
                />
              </div>
            </div>

            <!-- Error Feedback -->
            <transition name="fade-slide">
              <div v-if="authStore.error" class="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                <span class="material-symbols-outlined text-sm">error</span>
                <span class="text-xs font-bold">{{ authStore.error }}</span>
              </div>
            </transition>

            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="relative w-full py-4 bg-slate-800 hover:bg-slate-700 dark:bg-gradient-to-r dark:from-emerald-500 dark:to-primary text-white font-bold rounded-xl overflow-hidden shadow-lg transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span class="relative flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span v-else class="material-symbols-outlined text-[18px]">login</span>
                {{ isSubmitting ? 'Verificando...' : 'Acceder al Workspace' }}
              </span>
            </button>
          </form>

          <div class="mt-8 text-center">
            <p class="text-slate-500 text-xs">Raizexs@world</p>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
