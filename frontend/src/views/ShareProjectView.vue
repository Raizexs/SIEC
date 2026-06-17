<script setup>

import { ref, onMounted, computed } from 'vue';

import { useRoute } from 'vue-router';

import { useApi } from '../composables/useApi';

import { useProMotion } from '../composables/useProMotion';

import { useMotionPreferenceSync } from '../composables/useMotionPreferenceSync';



const route = useRoute();

const api = useApi();



const project = ref(null);

const loading = ref(true);

const error = ref('');

const motionRoot = ref(null);



useProMotion(motionRoot, { mode: 'auto' });

useMotionPreferenceSync(motionRoot);



const token = computed(() => route.params.token);



onMounted(async () => {

  try {

    project.value = await api.get(`/projects/share/${token.value}`);

  } catch (e) {

    error.value = e.message || 'Enlace no válido o expirado';

  } finally {

    loading.value = false;

  }

});

</script>



<template>

  <main

    ref="motionRoot"

    class="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950"

    data-siec-bare-route="true"

  >

    <section

      data-motion="hero"

      class="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"

    >

      <p class="text-xs font-bold uppercase tracking-widest text-orange-600">Vista pública</p>



      <div v-if="loading" class="mt-6 text-sm text-slate-500" data-motion="item">Cargando proyecto…</div>



      <div v-else-if="error" class="mt-6 text-sm text-red-600" data-motion="item">{{ error }}</div>



      <template v-else-if="project">

        <div data-motion="section">

          <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-slate-100">

            {{ project.name }}

          </h1>

          <p v-if="project.description" class="mt-2 text-sm text-slate-600 dark:text-slate-400">

            {{ project.description }}

          </p>

          <dl class="mt-6 grid gap-3 text-sm">

            <div v-if="project.m2_totales" data-motion="item">

              <dt class="font-bold text-slate-500">Superficie</dt>

              <dd>{{ project.m2_totales }} m²</dd>

            </div>

            <div v-if="project.estimated_cost" data-motion="item">

              <dt class="font-bold text-slate-500">Estimación</dt>

              <dd>

                {{

                  new Intl.NumberFormat('es-CL', {

                    style: 'currency',

                    currency: 'CLP',

                    maximumFractionDigits: 0,

                  }).format(project.estimated_cost)

                }}

              </dd>

            </div>

          </dl>

          <p class="mt-8 text-xs text-slate-400" data-motion="item">

            Vista de solo lectura. No incluye datos de contacto del propietario.

            El enlace expira automáticamente según la configuración del titular.

          </p>

        </div>

      </template>

    </section>

  </main>

</template>


