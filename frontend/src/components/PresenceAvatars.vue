<script setup>
/**
 * PresenceAvatars — shows the avatars of users currently editing the project.
 * Renders a premium stacked group with hover tooltip + active recinto badge.
 */

import { computed } from 'vue';

const props = defineProps({
  peers: {
    type: Array,
    default: () => [],
  },
  myColor: {
    type: String,
    default: '#22d3ee',
  },
});

const visiblePeers = computed(() => props.peers.slice(0, 5));

const overflowCount = computed(() => Math.max(props.peers.length - 5, 0));

const getInitials = (name) => {
  if (!name) return '?';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};
</script>

<template>
  <div
    v-if="peers.length"
    class="inline-flex items-center rounded-2xl border border-slate-200 bg-white/85 px-2 py-1.5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85"
    aria-label="Usuarios activos"
  >
    <div class="flex items-center -space-x-2">
      <div
        v-for="peer in visiblePeers"
        :key="peer.user_id"
        class="group relative"
      >
        <div
          class="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-white bg-slate-100 text-[10px] font-black uppercase tracking-tight text-white shadow-sm ring-2 ring-white transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:scale-105 dark:border-slate-900 dark:bg-slate-800 dark:ring-slate-950"
          :style="{ backgroundColor: !peer.avatar_url ? peer.color || myColor : undefined }"
        >
          <img
            v-if="peer.avatar_url"
            :src="peer.avatar_url"
            :alt="peer.name || 'Usuario activo'"
            class="h-full w-full object-cover"
          />

          <span v-else>
            {{ getInitials(peer.name) }}
          </span>

          <span
            v-if="peer.active_recinto"
            class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white shadow-sm dark:border-slate-950"
            :style="{ backgroundColor: peer.color || myColor }"
          >
            <span
              class="absolute inset-0 rounded-full animate-ping"
              :style="{ backgroundColor: peer.color || myColor }"
            ></span>
          </span>
        </div>

        <!-- Tooltip -->
        <div
          class="pointer-events-none absolute right-1/2 top-full z-50 mt-2 translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-left opacity-0 shadow-xl shadow-slate-950/10 transition-all duration-200 group-hover:translate-y-0.5 group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30"
        >
          <p class="text-xs font-black text-slate-950 dark:text-slate-100">
            {{ peer.name || 'Usuario activo' }}
          </p>

          <p
            class="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight"
            :class="
              peer.active_recinto
                ? 'text-emerald-600 dark:text-emerald-300'
                : 'text-slate-400 dark:text-slate-500'
            "
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="peer.active_recinto ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"
            ></span>
            {{ peer.active_recinto ? 'Editando ahora' : 'Conectado' }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="overflowCount > 0"
      class="ml-3 inline-flex h-7 min-w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      :title="`${overflowCount} usuarios adicionales`"
    >
      +{{ overflowCount }}
    </div>
  </div>
</template>