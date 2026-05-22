<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Mail,
  Lock,
  Building2,
  Briefcase,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wand2,
  ShieldCheck,
  RefreshCw,
  User2,
  Landmark,
  Sparkles,
} from 'lucide-vue-next';
import AuthScene3D from '../components/auth/AuthScene3D.vue';
import OAuthButtons from '../components/auth/OAuthButtons.vue';
import PasswordStrength from '../components/auth/PasswordStrength.vue';
import { gsap } from 'gsap';
import { useProMotion } from '../composables/useProMotion';
import { prefersReducedMotion, motionTokens } from '../design/motionTokens';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const mode = ref('login'); // login | register | magic | mfa | forgot
const email = ref('');
const password = ref('');
const fullName = ref('');
const company = ref('');
const mfaCode = ref('');
const mfaFactorId = ref('');
const isSubmitting = ref(false);
const localMessage = ref('');
const localError = ref('');
const motionRoot = ref(null);
const authFormRef = ref(null);
const authHeadlineRef = ref(null);
const authTabsRef = ref(null);

const MAX_EMAIL_CHARS = 60;
const MAX_FULL_NAME_CHARS = 60;
const MAX_COMPANY_CHARS = 80;
const MAX_PASSWORD_CHARS = 72;

const emailValid = computed(() => {
  const value = email.value.trim();

  return value.length > 0 && value.length <= MAX_EMAIL_CHARS && value.includes('@');
});

const passwordValidLength = computed(() => {
  return password.value.length <= MAX_PASSWORD_CHARS;
});

const fullNameValid = computed(() => {
  return fullName.value.trim().length > 0 && fullName.value.length <= MAX_FULL_NAME_CHARS;
});

const companyValid = computed(() => {
  return company.value.length <= MAX_COMPANY_CHARS;
});

useProMotion(motionRoot, {
  skipIntro: true,
});

const passwordStrong = computed(() => {
  const value = password.value;

  return (
    value.length >= 8 &&
    value.length <= MAX_PASSWORD_CHARS &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  );
});

const canSubmit = computed(() => {
  if (mode.value === 'login') {
    return emailValid.value && !!password.value && passwordValidLength.value;
  }

  if (mode.value === 'register') {
    return (
      emailValid.value &&
      passwordStrong.value &&
      fullNameValid.value &&
      companyValid.value
    );
  }

  if (mode.value === 'magic') return emailValid.value;

  if (mode.value === 'forgot') return emailValid.value;

  if (mode.value === 'mfa') return mfaCode.value.length === 6;

  return false;
});

const modeTitle = computed(() => {
  if (mode.value === 'login') return 'Bienvenido';
  if (mode.value === 'register') return 'Crea tu cuenta';
  if (mode.value === 'magic') return 'Acceso sin contraseña';
  if (mode.value === 'forgot') return 'Recuperar acceso';
  if (mode.value === 'mfa') return 'Verificación 2FA';

  return 'SIEC';
});

const modeDescription = computed(() => {
  if (mode.value === 'login') return 'Accede a tu workspace de proyectos';
  if (mode.value === 'register') return 'Empieza tu primera estimación en menos de 60 segundos';
  if (mode.value === 'magic') return 'Te enviamos un enlace para entrar sin contraseña';
  if (mode.value === 'forgot') return 'Te enviaremos instrucciones por correo';
  if (mode.value === 'mfa') return 'Ingresa el código de 6 dígitos de tu app autenticadora';

  return '';
});

const submitLabel = computed(() => {
  if (mode.value === 'login') return 'Acceder al workspace';
  if (mode.value === 'register') return 'Crear cuenta';
  if (mode.value === 'magic') return 'Enviar magic link';
  if (mode.value === 'forgot') return 'Enviar instrucciones';
  if (mode.value === 'mfa') return 'Verificar y acceder';

  return 'Continuar';
});

const SubmitIcon = computed(() => {
  if (mode.value === 'login') return ArrowRight;
  if (mode.value === 'register') return Briefcase;
  if (mode.value === 'magic') return Wand2;
  if (mode.value === 'forgot') return RefreshCw;
  if (mode.value === 'mfa') return ShieldCheck;

  return ArrowRight;
});

const switchMode = async (nextMode) => {
  if (mode.value === nextMode) return;

  localMessage.value = '';
  localError.value = '';
  authStore.error = null;

  if (prefersReducedMotion()) {
    mode.value = nextMode;
    return;
  }

  const targets = [
    authHeadlineRef.value,
    authFormRef.value,
  ].filter(Boolean);

  gsap.killTweensOf(targets);

  await new Promise((resolve) => {
    gsap.to(targets, {
      opacity: 0,
      y: 8,
      filter: 'blur(6px)',
      duration: 0.16,
      ease: 'power2.out',
      stagger: 0.025,
      onComplete: resolve,
    });
  });

  mode.value = nextMode;
  await nextTick();

  const nextTargets = [
    authHeadlineRef.value,
    authFormRef.value,
  ].filter(Boolean);

  gsap.fromTo(
    nextTargets,
    {
      opacity: 0,
      y: 10,
      filter: 'blur(6px)',
    },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.26,
      ease: 'power3.out',
      stagger: 0.035,
      clearProps: 'opacity,transform,filter',
    },
  );

  if (authTabsRef.value) {
    gsap.fromTo(
      authTabsRef.value,
      { scale: 0.995 },
      {
        scale: 1,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'transform',
      },
    );
  }
};

const playSignInSuccessCue = () => {
  if (prefersReducedMotion()) return Promise.resolve();

  const card = motionRoot.value?.querySelector('[data-siec-auth-form-stack]');

  if (!card) return Promise.resolve();

  return new Promise((resolve) => {
    gsap.killTweensOf(card);
    gsap.set(card, {
      transformOrigin: '50% 50%',
    });

    const tl = gsap.timeline({
      onComplete: resolve,
    });

    tl.to(card, {
      scale: 1.03,
      boxShadow:
        '0 0 0 2px rgba(245, 158, 11, 0.55), 0 22px 50px rgba(15, 23, 42, 0.18)',
      duration: motionTokens.duration.fast,
      ease: 'power2.out',
    }).to(card, {
      scale: 1,
      boxShadow: '0 20px 60px rgba(15, 23, 42, 0.10)',
      duration: motionTokens.duration.slow,
      ease: 'elastic.out(1, 0.55)',
    });

    tl.call(() => {
      gsap.set(card, {
        clearProps: 'scale,boxShadow,transformOrigin',
      });
    });
  });
};

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return;

  isSubmitting.value = true;
  localMessage.value = '';
  localError.value = '';

  if (mode.value !== 'mfa' && !emailValid.value) {
  localError.value = `Ingresa un correo válido de máximo ${MAX_EMAIL_CHARS} caracteres que incluya @.`;
  isSubmitting.value = false;
  return;
  }

  if (password.value.length > MAX_PASSWORD_CHARS) {
  localError.value = `La contraseña no puede superar los ${MAX_PASSWORD_CHARS} caracteres.`;
  isSubmitting.value = false;
  return;
  }

  if (mode.value === 'register' && !fullNameValid.value) {
  localError.value = `El nombre completo es obligatorio y no puede superar los ${MAX_FULL_NAME_CHARS} caracteres.`;
  isSubmitting.value = false;
  return;
  }

  if (mode.value === 'register' && !companyValid.value) {
  localError.value = `La empresa no puede superar los ${MAX_COMPANY_CHARS} caracteres.`;
  isSubmitting.value = false;
  return;
  }

  try {
    if (mode.value === 'login') {
      const res = await authStore.login(email.value, password.value);

      if (res.success && res.mfaRequired) {
        mfaFactorId.value = res.factorId;
        await switchMode('mfa');
      } else if (res.success) {
        const redirect = route.query.redirect || '/dashboard';
        await playSignInSuccessCue();
        router.push(redirect);
      }
    } else if (mode.value === 'register') {
      const res = await authStore.signUp({
        email: email.value,
        password: password.value,
        fullName: fullName.value,
        company: company.value,
        role: 'user',
      });

      if (res.success) {
        if (res.needsConfirmation) {
          localMessage.value =
            'Te enviamos un correo de confirmación. Revisa tu bandeja de entrada.';
        } else {
          await playSignInSuccessCue();
          router.push('/onboarding');
        }
      }
    } else if (mode.value === 'magic') {
      const res = await authStore.signInWithMagicLink(email.value);

      if (res.success) {
        localMessage.value =
          'Revisa tu correo. Te enviamos un enlace mágico para entrar sin contraseña.';
      }
    } else if (mode.value === 'forgot') {
      const res = await authStore.requestPasswordReset(email.value);

      if (res.success) {
        localMessage.value =
          'Si la cuenta existe, te enviamos instrucciones para recuperar tu contraseña.';
      }
    } else if (mode.value === 'mfa') {
      const res = await authStore.challengeMFA(mfaFactorId.value, mfaCode.value);

      if (res.success) {
        const redirect = route.query.redirect || '/dashboard';
        await playSignInSuccessCue();
        router.push(redirect);
      }
    }
  } catch (error) {
    localError.value = error.message || 'Error inesperado.';
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  if (route.query.error) localError.value = route.query.error;
  if (route.query.message) localMessage.value = route.query.message;
});
</script>

<template>
  <main
    ref="motionRoot"
    class="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100"
    data-siec-bare-route="true"
  >
    <!-- Left: 3D scene + brand pitch -->
    <aside
      class="relative hidden h-screen min-h-0 flex-1 overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between"
    >
      <AuthScene3D />

      <!-- Readability overlay -->
      <div
        class="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-slate-950/20"
      ></div>

      <!-- Top brand bar -->
      <header
        class="pointer-events-none relative z-10 p-10"
        data-motion="hero"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-300/30 bg-orange-500/20 text-orange-200 shadow-lg shadow-orange-500/10 backdrop-blur-xl"
          >
            <Building2 class="h-5 w-5" :stroke-width="2.3" />
          </div>

          <div>
            <h1 class="text-lg font-black tracking-tight text-white">
              SIEC
            </h1>

            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Sistema Inteligente de Estimación
            </p>
          </div>
        </div>
      </header>

      <!-- Bottom pitch -->
      <section
        class="relative z-10 max-w-2xl space-y-6 p-10"
        data-motion="section"
      >
        <div
          class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-200 shadow-sm backdrop-blur-xl"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400"></span>
          Plataforma Cloud · v2.0
        </div>

        <div>
          <h2 class="max-w-xl text-5xl font-black leading-[1.04] tracking-tight text-white">
            Precisión arquitectónica
            <span class="block text-orange-300">
              para presupuestos reales.
            </span>
          </h2>

          <p class="mt-5 max-w-md text-sm font-medium leading-relaxed text-slate-300">
            Diseña en 3D, valida normas constructivas y obtén desgloses de insumos con precios reales del mercado.
          </p>
        </div>

        <div class="grid max-w-xl grid-cols-3 gap-3 pt-2">
          <div
            class="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm backdrop-blur-xl"
          >
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Motor
            </p>
            <p class="mt-1 text-sm font-black text-white">
              Tiempo real
            </p>
          </div>

          <div
            class="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm backdrop-blur-xl"
          >
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Equipo
            </p>
            <p class="mt-1 text-sm font-black text-white">
              Multiusuario
            </p>
          </div>

          <div
            class="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm backdrop-blur-xl"
          >
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Salida
            </p>
            <p class="mt-1 text-sm font-black text-white">
              BIM/PDF
            </p>
          </div>
        </div>
      </section>
    </aside>

    <!-- Right: Auth forms -->
    <section
      class="flex h-screen min-h-0 w-full shrink-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 lg:w-[520px]"
    >
      <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-8 sm:py-5">
        <div
          class="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/35"
          data-motion="section"
          data-siec-auth-form-stack
          >
          <!-- Top accent -->
          <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

          <div class="space-y-4 p-5">
            <!-- Mobile logo -->
            <div class="flex items-center justify-between gap-3 lg:hidden">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <Building2 class="h-5 w-5" :stroke-width="2.2" />
                </div>

                <div>
                  <h1 class="text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                    SIEC
                  </h1>

                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Plataforma Cloud
                  </p>
                </div>
              </div>

              <span
                class="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                v2.0
              </span>
            </div>

            <!-- Headline -->
            <header ref="authHeadlineRef">
              <div
                class="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              >
                <Sparkles class="h-3.5 w-3.5 text-orange-500 dark:text-orange-300" :stroke-width="2.4" />
                Acceso seguro
              </div>

              	<h2 class="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
              		{{ modeTitle }}
              	</h2>

              	<p class="mt-1.5 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              		{{ modeDescription }}
              	</p>
            </header>

            <!-- Tabs -->
            <div
	            v-if="['login', 'register', 'magic'].includes(mode)"
              ref="authTabsRef"
	            class="grid h-11 grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
	            <button
		            v-for="tab in [
			            { id: 'login', label: 'Acceder' },
			            { id: 'register', label: 'Crear' },
			            { id: 'magic', label: 'Magic Link' },
		            ]"
		            :key="tab.id"
		            type="button"
		            class="flex h-full min-w-0 items-center justify-center rounded-xl border px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98]"
		            :class="
			            mode === tab.id
				            ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm shadow-orange-500/10 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300'
				            : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-950 dark:hover:text-slate-100'
		            "
		            @click="switchMode(tab.id)"
	            >
		            <span class="truncate">
			            {{ tab.label }}
		            </span>
	            </button>
            </div>

            <!-- OAuth -->
            <section v-if="['login', 'register'].includes(mode) && isSupabaseConfigured">
              <OAuthButtons />

              <div class="my-5 flex items-center gap-3">
                <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                <span
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  o con email
                </span>
                <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
              </div>
            </section>

            <!-- Form -->
            <form
              ref="authFormRef"
              class="space-y-3"
              @submit.prevent="handleSubmit"
              >
              <!-- Register: name + company -->
              <div v-if="mode === 'register'" class="space-y-2.5">
                <div>
                  <label class="premium-label">
                    Nombre completo
                  </label>

                  <div class="relative">
                    <User2
                      class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      :stroke-width="2"
                    />

                    <input
                      v-model="fullName"
                      type="text"
                      required
                      maxlength="60"
                      class="premium-input premium-input-with-icon"
                      placeholder="Lukas Siecinski"
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
                      v-model="company"
                      type="text"
                      maxlength="80"
                      class="premium-input premium-input-with-icon"
                      placeholder="Estudio de Arquitectura"
                      autocomplete="organization"
                    />
                  </div>
                </div>

              </div>

              <!-- Email -->
              <div v-if="mode !== 'mfa'">
                <label class="premium-label">
                  Correo electrónico
                </label>

                <div class="relative">
                  <Mail
                    class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    :stroke-width="2"
                  />

                  <input
                    v-model="email"
                    type="email"
                    required
                    maxlength="60"
                    autocomplete="email"
                    class="premium-input premium-input-with-icon font-mono"
                    placeholder="arquitecto@estudio.com"
                  />
                </div>
              </div>

              <p
                v-if="email && !emailValid"
                class="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-300"
              >
                <AlertCircle class="h-3.5 w-3.5" :stroke-width="2.3" />
                El correo debe incluir @ y tener máximo {{ MAX_EMAIL_CHARS }} caracteres.
              </p>

              <!-- Password -->
              <div v-if="['login', 'register'].includes(mode)">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <label class="premium-label !mb-0">
                    Contraseña
                  </label>

                  <button
                    v-if="mode === 'login'"
                    type="button"
                    class="text-[10px] font-black uppercase tracking-[0.12em] text-orange-600 transition hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200"
                    @click="switchMode('forgot')"
                  >
                    ¿Olvidaste?
                  </button>
                </div>

                <div class="relative">
                  <Lock
                    class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    :stroke-width="2"
                  />

                  <input
                    v-model="password"
                    type="password"
                    required
                    maxlength="72"
                    :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                    class="premium-input premium-input-with-icon font-mono tracking-widest"
                    placeholder="••••••••"
                  />
                </div>

                <PasswordStrength
                  v-if="mode === 'register'"
                  :password="password"
                />
              </div>

              <!-- MFA -->
              <div v-if="mode === 'mfa'">
                <label class="premium-label">
                  Código de 6 dígitos
                </label>

                <input
                  v-model="mfaCode"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  required
                  class="premium-input text-center font-mono text-2xl tracking-[0.5em]"
                  placeholder="000000"
                />
              </div>

              <!-- Feedback -->
              <transition name="auth-alert">
                <div
                  v-if="authStore.error || localError"
                  class="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
                >
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <AlertCircle class="h-4 w-4" :stroke-width="2.2" />
                  </div>

                  <span class="text-xs font-semibold leading-relaxed">
                    {{ localError || authStore.error }}
                  </span>
                </div>
              </transition>

              <transition name="auth-alert">
                <div
                  v-if="localMessage"
                  class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
                >
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
                  </div>

                  <span class="text-xs font-semibold leading-relaxed">
                    {{ localMessage }}
                  </span>
                </div>
              </transition>

              <div class="mt-auto space-y-3 pt-2">
  <!-- Submit -->
  <button
    type="submit"
    class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-colors duration-200 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"
    :disabled="!canSubmit || isSubmitting"
  >
    <Loader2
      v-if="isSubmitting"
      class="h-4 w-4 animate-spin"
      :stroke-width="2.2"
    />

    <component
      v-else
      :is="SubmitIcon"
      class="h-4 w-4"
      :stroke-width="2.2"
    />

    {{ submitLabel }}
  </button>

	<div v-if="mode === 'forgot'" class="text-center">
		<button
			type="button"
			class="text-xs font-bold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
			@click="switchMode('login')"
		>
			← Volver al inicio de sesión
		</button>
	</div>
</div>
            </form>
          </div>
        </div>
      </div>

      <footer
        class="shrink-0 border-t border-slate-200/80 bg-white/70 px-8 py-3 text-center backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70"
      >
        <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          SIEC v2.0 ·
          <span class="text-slate-500 dark:text-slate-400">
            Hecho con propósito en Chile
          </span>
        </p>
      </footer>
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

.auth-alert-enter-active,
.auth-alert-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.auth-alert-enter-from,
.auth-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.premium-input.premium-input-with-icon {
  padding-left: 3rem !important;
}

</style>