<script setup>
defineOptions({ name: 'PrivacyAcceptView' });

import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  Scale,
} from 'lucide-vue-next';
import { usePrivacy } from '../composables/usePrivacy';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import { useMotionPreferenceSync } from '../composables/useMotionPreferenceSync';
import { LEGAL } from '../constants/legal.js';
import SiecBrandLogo from '../components/brand/SiecBrandLogo.vue';
import '../styles/auth-fields.css';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { fetchPolicy, grantRegistrationConsents } = usePrivacy();

const policy = ref(null);
const accepted = ref(false);
const loading = ref(false);
const error = ref('');
const motionRoot = ref(null);

useProMotion(motionRoot, { mode: 'auto' });
useMotionPreferenceSync(motionRoot);

const greeting = computed(() => {
  const email = auth.user?.email;
  if (!email) return 'Para continuar en SIEC';
  const name = email.split('@')[0];
  return `Hola, ${name}`;
});

onMounted(async () => {
  try {
    policy.value = await fetchPolicy();
  } catch (e) {
    error.value =
      e.message ||
      'No se pudo cargar la política de privacidad. Revisa la conexión con el servidor.';
  }
});

const toggleAccepted = () => {
  accepted.value = !accepted.value;
};

const onCheckboxKeydown = (event) => {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    toggleAccepted();
  }
};

const submit = async () => {
  if (!accepted.value || !policy.value) return;
  loading.value = true;
  error.value = '';
  try {
    await grantRegistrationConsents(policy.value.version);
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    router.replace(redirect);
  } catch (e) {
    const detail =
      typeof e.payload?.detail === 'string'
        ? e.payload.detail
        : e.message || 'Error al registrar consentimiento.';
    error.value = detail;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <main
    ref="motionRoot"
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100"
    data-siec-bare-route="true"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.14),_transparent_55%)]"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(30,58,138,0.32),_transparent_50%)]"
    />

    <section
      data-motion="hero"
      class="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/85 shadow-2xl shadow-black/45 backdrop-blur-xl"
    >
      <div class="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-slate-700" />

      <div class="border-b border-slate-800/80 bg-slate-900/50 px-6 py-6 sm:px-8">
        <SiecBrandLogo
          variant="horizontal"
          :force-dark="true"
          class="mb-5 h-8 w-auto"
        />

        <div class="flex items-start gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-900/60 bg-orange-950/40 text-orange-300 shadow-sm"
          >
            <ShieldCheck class="h-6 w-6" :stroke-width="2.2" />
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/85">
              Protección de datos
            </p>
            <h1 class="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
              {{ greeting }}
            </h1>
            <p class="mt-2 text-sm font-medium leading-relaxed text-slate-400" data-motion="item">
              Antes de entrar al workspace necesitamos tu consentimiento para la política de
              privacidad y los términos vigentes.
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-5 px-6 py-6 sm:px-8 sm:py-7">
        <div class="grid gap-2 sm:grid-cols-2" data-motion="item">
          <router-link
            :to="LEGAL.privacyPolicyPath"
            class="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 transition-colors group-hover:text-orange-300"
            >
              <FileText class="h-4 w-4" :stroke-width="2.2" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Documento
              </p>
              <p class="truncate text-sm font-bold text-slate-200">Política de privacidad</p>
            </div>
          </router-link>

          <router-link
            :to="LEGAL.termsPath"
            class="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 transition-colors group-hover:text-orange-300"
            >
              <Scale class="h-4 w-4" :stroke-width="2.2" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Documento
              </p>
              <p class="truncate text-sm font-bold text-slate-200">Términos de servicio</p>
            </div>
          </router-link>
        </div>

        <div
          class="auth-legal-consent auth-legal-consent--dark flex items-start gap-3"
          data-motion="item"
        >
          <button
            type="button"
            role="checkbox"
            :aria-checked="accepted"
            aria-label="Aceptar política de privacidad y términos de servicio"
            class="siec-premium-checkbox"
            @click="toggleAccepted"
            @keydown="onCheckboxKeydown"
          >
            <Check
              v-show="accepted"
              class="h-3 w-3"
              :stroke-width="3"
              aria-hidden="true"
            />
          </button>
          <p class="auth-legal-consent-copy">
            Acepto la
            <router-link :to="LEGAL.privacyPolicyPath" class="auth-legal-consent-link">
              política de privacidad
            </router-link>
            y los
            <router-link :to="LEGAL.termsPath" class="auth-legal-consent-link">
              términos de servicio.
            </router-link>
          </p>
        </div>

        <div
          v-if="error"
          class="flex items-start gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-red-200"
          data-motion="item"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="2.2" />
          <p class="text-xs font-semibold leading-relaxed">{{ error }}</p>
        </div>

        <button
          type="button"
          data-motion="item"
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-3.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:border-orange-300 hover:bg-orange-400 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          :disabled="!accepted || loading || !policy"
          @click="submit"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" :stroke-width="2.2" />
          <span>{{ loading ? 'Registrando…' : 'Continuar a SIEC' }}</span>
          <ArrowRight v-if="!loading" class="h-4 w-4" :stroke-width="2.4" />
        </button>

        <p class="text-center text-[10px] font-medium leading-relaxed text-slate-500" data-motion="item">
          Ley N° 21.719 · Puedes ejercer tus derechos desde Configuración → Privacidad.
        </p>
      </div>
    </section>
  </main>
</template>
