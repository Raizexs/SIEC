<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/auth';
import { useProMotion } from '../composables/useProMotion';
import AuthScene3D from '../components/auth/AuthScene3D.vue';
import SiecBrandLogo from '../components/brand/SiecBrandLogo.vue';
import { usePrivacy } from '../composables/usePrivacy';

const router = useRouter();
const authStore = useAuthStore();
const { hasConsent } = usePrivacy();
const motionRoot = ref(null);

useProMotion(motionRoot, { mode: 'auto' });

onMounted(async () => {
  if (!isSupabaseConfigured) {
    router.replace('/login');
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session) {
      authStore.user = data.session.user;
      authStore.session = data.session;

      await authStore.loadProfile();

      const isFirstLogin = !data.session.user.user_metadata?.full_name;
      const privacyOk = await hasConsent('privacy_policy').catch(() => false);

      if (!privacyOk) {
        router.replace({
          path: '/privacy/accept',
          query: { redirect: isFirstLogin ? '/onboarding' : '/dashboard' },
        });
        return;
      }

      router.replace(isFirstLogin ? '/onboarding' : '/dashboard');
    } else {
      router.replace('/login?error=Sesi%C3%B3n+no+v%C3%A1lida');
    }
  } catch (error) {
    router.replace(`/login?error=${encodeURIComponent(error.message)}`);
  }
});
</script>

<template>
  <main
    ref="motionRoot"
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100"
    data-siec-bare-route="true"
  >
    <!-- Background scene -->
    <AuthScene3D />

    <!-- Readability overlay -->
    <div class="pointer-events-none absolute inset-0 z-10 bg-slate-950/55 backdrop-blur-[1px]"></div>

    <section
      class="relative z-20 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
      data-motion="hero"
      aria-live="polite"
    >
      <!-- Top accent -->
      <div
        class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-white/70"
      ></div>

      <SiecBrandLogo
        variant="horizontal"
        :force-dark="true"
        class="mx-auto mb-5 h-9 w-auto"
        data-motion="item"
      />

      <p
        class="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/80"
        data-motion="item"
      >
        SIEC Cloud
      </p>

      <h1
        class="mt-2 text-2xl font-black tracking-tight text-white"
        data-motion="item"
      >
        Verificando sesión
      </h1>

      <p
        class="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-300"
        data-motion="item"
      >
        Estamos validando tu acceso y preparando tu workspace.
      </p>

      <!-- Loader -->
      <div
        class="mx-auto mt-6 flex w-full max-w-xs items-center gap-2"
        data-motion="item"
      >
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div class="auth-progress h-full rounded-full bg-orange-400"></div>
        </div>

        <span class="material-symbols-outlined animate-spin text-[18px] text-orange-300">
          progress_activity
        </span>
      </div>

      <footer
        class="mt-6 border-t border-white/10 pt-4"
        data-motion="item"
      >
        <p class="text-xs font-medium text-slate-400">
          No cierres esta ventana mientras se completa la autenticación.
        </p>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.auth-progress {
  width: 42%;
  animation: auth-progress 1.35s ease-in-out infinite;
}

@keyframes auth-progress {
  0% {
    transform: translateX(-110%);
  }

  50% {
    transform: translateX(80%);
  }

  100% {
    transform: translateX(260%);
  }
}
</style>