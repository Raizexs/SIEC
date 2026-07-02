<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  LockKeyhole,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-vue-next';
import PasswordStrength from '../components/auth/PasswordStrength.vue';
import SiecBrandLogo from '../components/brand/SiecBrandLogo.vue';
import { useProMotion } from '../composables/useProMotion';

const router = useRouter();

const password = ref('');
const confirm = ref('');
const isSubmitting = ref(false);
const message = ref('');
const error = ref('');
const motionRoot = ref(null);

useProMotion(motionRoot, { mode: 'auto' });

const passwordsMatch = computed(() => {
  return password.value && confirm.value && password.value === confirm.value;
});

const passwordStrong = computed(() => {
  const value = password.value;

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
});

const canSubmit = computed(() => {
  return passwordStrong.value && passwordsMatch.value && !isSubmitting.value;
});

const handleSubmit = async () => {
  error.value = '';
  message.value = '';

  if (!isSupabaseConfigured) {
    error.value = 'Supabase no está configurado correctamente.';
    return;
  }

  if (!passwordStrong.value) {
    error.value =
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';
    return;
  }

  if (!passwordsMatch.value) {
    error.value = 'Las contraseñas no coinciden.';
    return;
  }

  isSubmitting.value = true;

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.value,
    });

    if (updateError) {
      throw updateError;
    }

    message.value = 'Contraseña actualizada correctamente. Redirigiendo…';

    setTimeout(() => {
      router.push('/login');
    }, 1200);
  } catch (e) {
    error.value = e?.message || 'No se pudo actualizar la contraseña.';
  } finally {
    isSubmitting.value = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <main
    ref="motionRoot"
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 sm:p-6"
    data-siec-bare-route="true"
  >
    <!-- Background atmosphere -->
    <div
      class="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-400/10"
    ></div>

    <div
      class="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-slate-900/5 blur-3xl dark:bg-white/5"
    ></div>

    <section
      class="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/35"
      data-motion="hero"
    >
      <!-- Top accent -->
      <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

      <div class="space-y-6 p-5 sm:p-8">
        <SiecBrandLogo variant="horizontal" class="h-8 w-auto" />

        <!-- Header -->
        <header class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <LockKeyhole class="h-5 w-5" :stroke-width="2.3" />
              </div>

              <div>
                <p
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  Recuperación de acceso
                </p>

                <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                  Nueva contraseña
                </h1>
              </div>
            </div>

            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              title="Volver al inicio de sesión"
              aria-label="Volver al inicio de sesión"
              @click="goToLogin"
            >
              <ArrowLeft class="h-4 w-4" :stroke-width="2.4" />
            </button>
          </div>

          <p class="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Define una contraseña segura. La usarás para acceder a SIEC desde cualquier dispositivo.
          </p>
        </header>

        <!-- Form -->
        <form
          class="space-y-4"
          data-motion="section"
          @submit.prevent="handleSubmit"
        >
          <div>
            <label class="premium-label">
              Nueva contraseña
            </label>

            <input
              v-model="password"
              type="password"
              required
              autocomplete="new-password"
              class="premium-input font-mono tracking-widest"
              placeholder="••••••••"
            />

            <PasswordStrength :password="password" />
          </div>

          <div>
            <label class="premium-label">
              Confirmar contraseña
            </label>

            <input
              v-model="confirm"
              type="password"
              required
              autocomplete="new-password"
              class="premium-input font-mono tracking-widest"
              placeholder="••••••••"
            />

            <transition name="reset-alert">
              <p
                v-if="confirm && !passwordsMatch"
                class="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-300"
              >
                <AlertCircle class="h-3.5 w-3.5" :stroke-width="2.3" />
                Las contraseñas no coinciden.
              </p>
            </transition>
          </div>

          <!-- Error -->
          <transition name="reset-alert">
            <div
              v-if="error"
              class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle class="h-4 w-4" :stroke-width="2.2" />
              </div>

              <p class="text-xs font-semibold leading-relaxed">
                {{ error }}
              </p>
            </div>
          </transition>

          <!-- Success -->
          <transition name="reset-alert">
            <div
              v-if="message"
              class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
              </div>

              <p class="text-xs font-semibold leading-relaxed">
                {{ message }}
              </p>
            </div>
          </transition>

          <!-- Submit -->
          <button
            type="submit"
            class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            :disabled="!canSubmit"
          >
            <Loader2
              v-if="isSubmitting"
              class="h-4 w-4 animate-spin"
              :stroke-width="2.2"
            />

            <ShieldCheck
              v-else
              class="h-4 w-4"
              :stroke-width="2.2"
            />

            <span>
              {{ isSubmitting ? 'Actualizando…' : 'Actualizar contraseña' }}
            </span>
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.premium-label {
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .premium-label {
  color: rgb(148 163 184);
}

.premium-input {
  height: 3rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding-left: 1rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(15 23 42);
  outline: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.premium-input::placeholder {
  color: rgb(148 163 184);
}

.premium-input:focus {
  border-color: rgb(251 146 60);
  background: white;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.dark .premium-input {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
  color: rgb(241 245 249);
}

.dark .premium-input::placeholder {
  color: rgb(100 116 139);
}

.dark .premium-input:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

.reset-alert-enter-active,
.reset-alert-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.reset-alert-enter-from,
.reset-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>