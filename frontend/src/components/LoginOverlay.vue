<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import SiecBrandLogo from './brand/SiecBrandLogo.vue';

const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) return;

  isSubmitting.value = true;

  try {
    await authStore.login(email.value, password.value);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <transition name="login-overlay">
      <div
        v-if="!authStore.isAuthenticated"
        class="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
      >
        <!-- Ambient background -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            class="absolute -left-40 top-10 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
          ></div>

          <div
            class="absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-slate-900/10 blur-3xl dark:bg-white/5"
          ></div>

          <div
            class="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
            style="
              background-image:
                linear-gradient(to right, rgba(100, 116, 139, 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(100, 116, 139, 0.12) 1px, transparent 1px);
              background-size: 32px 32px;
            "
          ></div>
        </div>

        <!-- Login card -->
        <section
          class="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/40 sm:p-8"
          aria-label="Inicio de sesión"
        >
          <!-- Subtle top accent -->
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

          <!-- Brand -->
          <header class="mb-8 flex flex-col items-center text-center">
            <SiecBrandLogo
              variant="horizontal"
              class="mb-5 h-10 w-auto"
            />

            <p
              class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            >
              Inteligencia constructiva
            </p>

            <p class="mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Accede a tu workspace para simular, diseñar y presupuestar proyectos constructivos.
            </p>
          </header>

          <form class="space-y-5" @submit.prevent="handleLogin">
            <!-- Email -->
            <div class="space-y-2">
              <label
                for="login-email"
                class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
              >
                Correo electrónico
              </label>

              <div class="relative">
                <div
                  class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500"
                >
                  <span class="material-symbols-outlined text-[19px]">
                    alternate_email
                  </span>
                </div>

                <input
                  id="login-email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="arquitecto@estudio.com"
                  class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900 dark:focus:ring-orange-500/15"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="space-y-2">
              <label
                for="login-password"
                class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
              >
                Contraseña
              </label>

              <div class="relative">
                <div
                  class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500"
                >
                  <span class="material-symbols-outlined text-[19px]">
                    lock
                  </span>
                </div>

                <input
                  id="login-password"
                  v-model="password"
                  type="password"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm font-semibold tracking-wide text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:bg-slate-900 dark:focus:ring-orange-500/15"
                />
              </div>
            </div>

            <!-- Error feedback -->
            <transition name="login-alert">
              <div
                v-if="authStore.error"
                class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
                role="alert"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                >
                  <span class="material-symbols-outlined text-[18px]">
                    error
                  </span>
                </div>

                <div>
                  <p class="text-xs font-black leading-snug">
                    No se pudo iniciar sesión
                  </p>
                  <p class="mt-0.5 text-xs font-medium leading-relaxed">
                    {{ authStore.error }}
                  </p>
                </div>
              </div>
            </transition>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="isSubmitting || !email || !password"
              class="group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-950 bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <span
                class="pointer-events-none absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0 dark:bg-slate-950/5"
              ></span>

              <span class="relative flex items-center justify-center gap-2 uppercase tracking-[0.14em]">
                <span
                  v-if="isSubmitting"
                  class="material-symbols-outlined animate-spin text-[18px]"
                >
                  progress_activity
                </span>

                <span
                  v-else
                  class="material-symbols-outlined text-[18px]"
                >
                  login
                </span>

                {{ isSubmitting ? 'Verificando...' : 'Acceder al workspace' }}
              </span>
            </button>
          </form>

          <!-- Footer -->
          <footer class="mt-8 border-t border-slate-200/80 pt-5 text-center dark:border-slate-800/80">
            <p class="text-xs font-medium text-slate-400 dark:text-slate-500">
              Plataforma privada · Acceso autorizado
            </p>
          </footer>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.login-overlay-enter-active,
.login-overlay-leave-active {
  transition: opacity 0.28s ease;
}

.login-overlay-enter-from,
.login-overlay-leave-to {
  opacity: 0;
}

.login-alert-enter-active,
.login-alert-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.login-alert-enter-from,
.login-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>