<script setup>
import logger from '../utils/logger.js';
import { ref, computed, watch, nextTick } from 'vue';
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
  Sparkles,
  Coins,
  Loader2,
} from 'lucide-vue-next';
import { useProMotion, replayMotionReveal } from '../composables/useProMotion';
import { useMotionPreferenceSync } from '../composables/useMotionPreferenceSync';
import { getMotionProfile, prefersReducedMotion } from '../design/motionTokens';
import { runCrossfade } from '../composables/useMotionContext';
import { gsap } from 'gsap';
import { useProductPreferences } from '../composables/useProductPreferences';
import '../styles/auth-fields.css';

const router = useRouter();
const auth = useAuthStore();
const { updateProductPreferences, saveProductPreferences } = useProductPreferences();

const step = ref(1);
const isSaving = ref(false);
const motionRoot = ref(null);
const stepContentRef = ref(null);

useProMotion(motionRoot, { mode: 'auto' });
useMotionPreferenceSync(motionRoot);

const formData = ref({
  fullName: auth.user?.user_metadata?.full_name || '',
  company: auth.user?.user_metadata?.company || '',
  role: auth.user?.user_metadata?.role || 'user',
  currency: 'CLP',
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
      title: 'Estándares SIEC',
      description: 'Medición en m y m². Elige la moneda de referencia para presupuestos.',
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

const changeStep = async (nextStep) => {
  if (step.value === nextStep) return;
  const el = stepContentRef.value;
  if (!prefersReducedMotion() && el) {
    const profile = getMotionProfile();
    await gsap.to(el, {
      autoAlpha: 0,
      x: -12,
      duration: profile.duration.fast,
      ease: profile.ease.standardOut,
    });
  }
  step.value = nextStep;
  await nextTick();
  const incoming = stepContentRef.value;
  if (!prefersReducedMotion() && incoming) {
    await runCrossfade(incoming, incoming, { axis: 'x', slide: 12 });
  } else {
    replayMotionReveal(incoming);
  }
};

const next = async () => {
  if (step.value < 3) {
    await changeStep(step.value + 1);
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
          units: 'metric',
          currency: formData.value.currency,
          onboarded: true,
        },
      });
    } catch (error) {
      logger.warn('No se pudo guardar onboarding:', error);
    }
  }

  updateProductPreferences({
    currency: formData.value.currency,
    unit: 'metric',
  });
  saveProductPreferences();

  isSaving.value = false;
  router.push('/workspace?tour=1');
};

const back = async () => {
  if (step.value > 1) {
    await changeStep(step.value - 1);
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

      <div ref="stepContentRef" class="space-y-7 p-5 sm:p-8" data-motion="section">
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

              <div class="auth-field">
                <span class="auth-field-icon" aria-hidden="true">
                  <User2 class="h-4 w-4" :stroke-width="2" />
                </span>
                <input
                  v-model="formData.fullName"
                  type="text"
                  class="auth-field-input"
                  placeholder="Tu nombre completo"
                  autocomplete="name"
                />
              </div>
            </div>

            <div>
              <label class="premium-label">
                Empresa
              </label>

              <div class="auth-field">
                <span class="auth-field-icon" aria-hidden="true">
                  <Landmark class="h-4 w-4" :stroke-width="2" />
                </span>
                <input
                  v-model="formData.company"
                  type="text"
                  class="auth-field-input"
                  placeholder="Estudio / Empresa"
                  autocomplete="organization"
                />
              </div>
            </div>

          </div>
        </section>

        <!-- Step 2: SIEC standards -->
        <section v-if="step === 2" class="space-y-5">
          <div
            class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                <Ruler class="h-4.5 w-4.5" :stroke-width="2.2" />
              </div>
              <div>
                <p class="text-sm font-black text-slate-950 dark:text-slate-100">
                  Medición SIEC
                </p>
                <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  Metros (m), metros cuadrados (m²) y alturas en m. El editor 2D/3D y los presupuestos usan el sistema métrico chileno.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label class="premium-label">
              Moneda de presupuesto
            </label>

            <div class="auth-field">
              <span class="auth-field-icon" aria-hidden="true">
                <Coins class="h-4 w-4" :stroke-width="2" />
              </span>
              <select
                v-model="formData.currency"
                class="auth-field-input appearance-none bg-transparent"
              >
                <option value="CLP">Peso chileno (CLP)</option>
                <option value="UF">UF (referencia)</option>
              </select>
            </div>

            <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Define cómo se muestran totales en presupuesto y exportación PDF.
            </p>
          </div>
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