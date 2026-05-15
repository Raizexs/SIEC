<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Building2,
  Settings2,
  Rocket,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User2,
  Landmark,
  Ruler,
  Bell,
  Sparkles,
  Loader2,
} from 'lucide-vue-next';
import { useProMotion } from '../composables/useProMotion';

const router = useRouter();
const auth = useAuthStore();

const step = ref(1);
const isSaving = ref(false);
const motionRoot = ref(null);

useProMotion(motionRoot, {
  skipIntro: true,
});

const formData = ref({
  fullName: auth.user?.user_metadata?.full_name || '',
  company: auth.user?.user_metadata?.company || '',
  role: auth.user?.user_metadata?.role || 'architect',
  units: 'metric',
  currency: 'CLP',
  enableNotifications: true,
});

const progressPct = computed(() => `${(step.value / 3) * 100}%`);

const firstName = computed(() => {
  const name = formData.value.fullName?.trim();

  if (!name) return 'Arquitecto';

  return name.split(' ')[0];
});

const stepMeta = computed(() => {
  if (step.value === 1) {
    return {
      eyebrow: 'Identidad profesional',
      title: 'Hola',
      description: 'Cuéntanos quién eres para personalizar tu workspace.',
      icon: Building2,
    };
  }

  if (step.value === 2) {
    return {
      eyebrow: 'Preferencias operativas',
      title: 'Preferencias',
      description: 'Adapta unidades, moneda y alertas a tu flujo de trabajo.',
      icon: Settings2,
    };
  }

  return {
    eyebrow: 'Workspace preparado',
    title: `¡Todo listo, ${firstName.value}!`,
    description:
      'Tu workspace está preparado. Te llevaremos a un breve tour para que veas cómo SIEC puede ahorrarte horas en cada estimación.',
    icon: Rocket,
  };
});

const StepIcon = computed(() => stepMeta.value.icon);

const next = async () => {
  if (step.value < 3) {
    step.value += 1;
    return;
  }

  isSaving.value = true;

  if (isSupabaseConfigured) {
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: formData.value.fullName,
          company: formData.value.company,
          role: formData.value.role,
          units: formData.value.units,
          currency: formData.value.currency,
          notifications: formData.value.enableNotifications,
          onboarded: true,
        },
      });
    } catch (error) {
      console.warn('No se pudo guardar onboarding:', error);
    }
  }

  isSaving.value = false;
  router.push('/dashboard?tour=1');
};

const back = () => {
  if (step.value > 1) {
    step.value -= 1;
  }
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
      class="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/35"
      data-motion="hero"
    >
      <!-- Top accent -->
      <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

      <!-- Stepper header -->
      <header class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60 sm:px-8">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              <Sparkles class="h-5 w-5" :stroke-width="2.3" />
            </div>

            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Configuración inicial
              </p>

              <h1 class="mt-0.5 text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                Onboarding SIEC
              </h1>
            </div>
          </div>

          <span
            class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            Paso {{ step }} de 3
          </span>
        </div>

        <div class="h-2 overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-800">
          <div
            class="h-full rounded-full bg-orange-500 transition-all duration-300 ease-out dark:bg-orange-400"
            :style="{ width: progressPct }"
          ></div>
        </div>
      </header>

      <div class="space-y-7 p-5 sm:p-8" data-motion="section">
        <!-- Current step heading -->
        <section
          class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-start"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            :class="step === 3 ? 'bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950' : ''"
          >
            <component :is="StepIcon" class="h-5 w-5" :stroke-width="2.3" />
          </div>

          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {{ stepMeta.eyebrow }}
            </p>

            <h2 class="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100">
              {{ stepMeta.title }}
            </h2>

            <p class="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ stepMeta.description }}
            </p>
          </div>
        </section>

        <!-- Step 1: Identity -->
        <section v-if="step === 1" class="space-y-5">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="premium-label">
                Nombre completo
              </label>

              <div class="relative">
                <User2
                  class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  :stroke-width="2"
                />

                <input
                  v-model="formData.fullName"
                  type="text"
                  class="premium-input pl-11"
                  placeholder="Tu nombre completo"
                  autocomplete="name"
                />
              </div>
            </div>

            <div>
              <label class="premium-label">
                Empresa
              </label>

              <div class="relative">
                <Landmark
                  class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  :stroke-width="2"
                />

                <input
                  v-model="formData.company"
                  type="text"
                  class="premium-input pl-11"
                  placeholder="Estudio / Empresa"
                  autocomplete="organization"
                />
              </div>
            </div>

            <div>
              <label class="premium-label">
                Rol
              </label>

              <select
                v-model="formData.role"
                class="premium-input"
              >
                <option value="architect">Arquitecto</option>
                <option value="engineer">Ingeniero Civil</option>
                <option value="contractor">Constructor</option>
                <option value="client_viewer">Cliente</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Step 2: Preferences -->
        <section v-if="step === 2" class="space-y-5">
          <div>
            <label class="premium-label">
              Unidades
            </label>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                v-for="unit in [
                  { id: 'metric', label: 'Métrico', detail: 'm², metros lineales' },
                  { id: 'imperial', label: 'Imperial', detail: 'ft², pies lineales' },
                ]"
                :key="unit.id"
                type="button"
                class="group rounded-3xl border p-4 text-left transition-all duration-200 active:scale-[0.99]"
                :class="
                  formData.units === unit.id
                    ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20'
                    : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700'
                "
                @click="formData.units = unit.id"
              >
                <div class="flex items-start justify-between gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm"
                    :class="
                      formData.units === unit.id
                        ? 'border-orange-200 bg-white text-orange-600 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                    "
                  >
                    <Ruler class="h-4.5 w-4.5" :stroke-width="2.2" />
                  </div>

                  <span
                    v-if="formData.units === unit.id"
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 dark:bg-orange-400 dark:text-orange-950"
                  >
                    <CheckCircle2 class="h-3.5 w-3.5" :stroke-width="2.5" />
                  </span>
                </div>

                <p class="mt-4 text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                  {{ unit.label }}
                </p>

                <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {{ unit.detail }}
                </p>
              </button>
            </div>
          </div>

          <div>
            <label class="premium-label">
              Moneda
            </label>

            <select
              v-model="formData.currency"
              class="premium-input"
            >
              <option value="CLP">Peso chileno (CLP)</option>
              <option value="UF">UF (Unidad de Fomento)</option>
              <option value="USD">Dólar estadounidense (USD)</option>
            </select>
          </div>

          <label
            class="flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition-all duration-200 active:scale-[0.99]"
            :class="
              formData.enableNotifications
                ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/25'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700'
            "
          >
            <input
              v-model="formData.enableNotifications"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-slate-300 accent-orange-500"
            />

            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Bell
                  class="h-4 w-4"
                  :class="
                    formData.enableNotifications
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-400 dark:text-slate-500'
                  "
                  :stroke-width="2.2"
                />

                <p class="text-sm font-black text-slate-950 dark:text-slate-100">
                  Notificaciones inteligentes
                </p>
              </div>

              <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Te avisamos cuando los precios de materiales clave cambian más de 10%.
              </p>
            </div>
          </label>
        </section>

        <!-- Step 3: Done -->
        <section v-if="step === 3" class="py-2 text-center">
          <div
            class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-200 bg-orange-500 text-white shadow-xl shadow-orange-500/20 dark:border-orange-800 dark:bg-orange-400 dark:text-orange-950"
          >
            <Rocket class="h-8 w-8" :stroke-width="2.3" />
          </div>

          <div class="mx-auto mt-6 max-w-md">
            <h2 class="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100">
              ¡Todo listo, {{ firstName }}!
            </h2>

            <p class="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Tu workspace está preparado. El tour inicial te mostrará cómo crear una estimación, editar en 3D y exportar resultados.
            </p>
          </div>

          <div class="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p class="text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500">
                Perfil
              </p>
              <p class="mt-1 truncate text-xs font-black text-slate-950 dark:text-slate-100">
                {{ formData.role }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p class="text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500">
                Unidad
              </p>
              <p class="mt-1 truncate text-xs font-black text-slate-950 dark:text-slate-100">
                {{ formData.units === 'metric' ? 'Métrico' : 'Imperial' }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p class="text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500">
                Moneda
              </p>
              <p class="mt-1 truncate text-xs font-black text-slate-950 dark:text-slate-100">
                {{ formData.currency }}
              </p>
            </div>
          </div>
        </section>

        <!-- Footer controls -->
        <footer class="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-5 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
            :disabled="step === 1"
            @click="back"
          >
            <ArrowLeft class="h-4 w-4" :stroke-width="2.2" />
            Atrás
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            :disabled="isSaving"
            @click="next"
          >
            <Loader2
              v-if="isSaving"
              class="h-4 w-4 animate-spin"
              :stroke-width="2.2"
            />

            <CheckCircle2
              v-else-if="step === 3"
              class="h-4 w-4"
              :stroke-width="2.2"
            />

            <span>
              {{ step === 3 ? 'Empezar el tour' : 'Continuar' }}
            </span>

            <ArrowRight
              v-if="step !== 3 && !isSaving"
              class="h-4 w-4"
              :stroke-width="2.2"
            />
          </button>
        </footer>
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
</style>