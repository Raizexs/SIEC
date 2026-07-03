<script setup>
import { Mail } from 'lucide-vue-next';
import { EXPOSMART } from '../../constants/exposmartContent.js';
</script>

<template>
  <div>
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Equipo</p>
      <h2 class="mt-4 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
        {{ EXPOSMART.team.title }}
      </h2>
      <p class="mt-4 text-sm font-medium leading-6 text-slate-400">
        {{ EXPOSMART.team.subtitle }}
      </p>
    </div>

    <ul class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <li
        v-for="member in EXPOSMART.team.members"
        :key="member.email"
        class="exposmart-team-card flex flex-col items-center rounded-[1.6rem] p-6 text-center"
        data-landing-hover="feature"
        data-landing-reveal
      >
        <img
          :src="member.avatar"
          :alt="`Foto de ${member.name}`"
          class="h-20 w-20 rounded-full border-2 border-white/10 object-cover shadow-lg"
          loading="lazy"
          width="80"
          height="80"
        />
        <h3 class="mt-5 text-base font-black text-white">{{ member.name }}</h3>
        <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-orange-400">
          {{ member.role }}
        </p>
        <a
          :href="`mailto:${member.email}`"
          data-landing-hover="nav-action"
          class="mt-5 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-orange-500/30 hover:text-orange-400"
        >
          <Mail class="h-3.5 w-3.5" :stroke-width="2.2" />
          Contactar
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.exposmart-team-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(7, 16, 29, 0.72) 0%, rgba(7, 16, 29, 0.55) 100%);
  box-shadow: 0 14px 40px -30px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(20px) saturate(1.15);
  -webkit-backdrop-filter: blur(20px) saturate(1.15);
}
</style>
