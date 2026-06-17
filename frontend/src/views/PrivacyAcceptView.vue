<script setup>

import { ref, onMounted } from 'vue';

import { useRouter, useRoute } from 'vue-router';

import { usePrivacy } from '../composables/usePrivacy';

import { useAuthStore } from '../stores/auth';

import { useProMotion } from '../composables/useProMotion';

import { useMotionPreferenceSync } from '../composables/useMotionPreferenceSync';



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



onMounted(async () => {

  try {

    policy.value = await fetchPolicy();

  } catch (e) {

    error.value = e.message || 'No se pudo cargar la política de privacidad.';

  }

});



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

    error.value = e.message || 'Error al registrar consentimiento.';

  } finally {

    loading.value = false;

  }

};

</script>



<template>

  <main

    ref="motionRoot"

    class="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100"

    data-siec-bare-route="true"

  >

    <section

      data-motion="hero"

      class="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-xl"

    >

      <h1 class="text-2xl font-black">Aceptación de política de privacidad</h1>

      <p class="mt-2 text-sm text-slate-300" data-motion="item">

        Hola{{ auth.user?.email ? `, ${auth.user.email}` : '' }}. Para continuar usando SIEC debes

        aceptar la política de privacidad y los términos vigentes.

      </p>



      <p v-if="policy" class="mt-4 text-xs text-slate-400" data-motion="item">

        Versión {{ policy.version }} ·

        <router-link to="/legal/privacidad" class="text-orange-300 underline" target="_blank">

          Leer política completa

        </router-link>

        ·

        <router-link to="/legal/terminos" class="text-orange-300 underline" target="_blank">

          Términos

        </router-link>

      </p>



      <label class="mt-6 flex cursor-pointer items-start gap-3" data-motion="item">

        <input

          v-model="accepted"

          type="checkbox"

          class="mt-1 h-4 w-4 rounded border-slate-500 text-orange-500"

        />

        <span class="text-sm">

          Acepto la política de privacidad y los términos de servicio de SIEC.

        </span>

      </label>



      <p v-if="error" class="mt-4 text-sm text-red-300" data-motion="item">{{ error }}</p>



      <button

        type="button"

        data-motion="item"

        class="mt-6 w-full rounded-2xl bg-orange-500 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"

        :disabled="!accepted || loading || !policy"

        @click="submit"

      >

        {{ loading ? 'Registrando…' : 'Continuar' }}

      </button>

    </section>

  </main>

</template>


