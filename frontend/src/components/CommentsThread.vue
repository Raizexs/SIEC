<script setup>
/**
 * CommentsThread — anchored comments panel with threads.
 * Comments may be anchored to a 3D coord (recinto + xyz) or be project-level.
 *
 * Premium language:
 * - Slate/orange visual system.
 * - Audit-friendly comment cards.
 * - Clear resolved / unresolved state.
 * - Refined composer and anchored context.
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useProjectsApi } from '../composables/useProjectsApi';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
  activeRecintoId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['focus-anchor']);

const api = useProjectsApi();
const auth = useAuthStore();

const comments = ref([]);
const isLoading = ref(false);
const newBody = ref('');
const replyingTo = ref(null);
const error = ref(null);

const load = async () => {
  if (!props.projectId) return;

  isLoading.value = true;
  error.value = null;

  try {
    comments.value = await api.listComments(props.projectId);
  } catch (e) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
};

const threads = computed(() => {
  const map = new Map();

  for (const comment of comments.value) {
    if (!comment.parent_id) {
      map.set(comment.id, {
        ...comment,
        replies: [],
      });
    }
  }

  for (const comment of comments.value) {
    if (comment.parent_id && map.has(comment.parent_id)) {
      map.get(comment.parent_id).replies.push(comment);
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
});

const unresolvedCount = computed(() =>
  threads.value.filter((thread) => !thread.resolved).length,
);

const replyingThread = computed(() =>
  replyingTo.value
    ? threads.value.find((thread) => thread.id === replyingTo.value)
    : null,
);

const composerPlaceholder = computed(() =>
  props.activeRecintoId
    ? 'Comentar sobre el recinto activo…'
    : 'Comentar sobre el proyecto…',
);

const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const authorLabel = (authorId) => {
  if (!authorId) return 'Usuario';

  return `${String(authorId).slice(0, 8)}…`;
};

const submit = async () => {
  const content = newBody.value.trim();

  if (!content) return;

  const body = {
    body: content,
    parent_id: replyingTo.value,
    anchor: props.activeRecintoId
      ? {
          recinto_id: props.activeRecintoId,
        }
      : null,
  };

  try {
    error.value = null;

    const created = await api.createComment(props.projectId, body);

    comments.value.push(created);
    newBody.value = '';
    replyingTo.value = null;
  } catch (e) {
    error.value = e.message;
  }
};

const toggleResolve = async (commentId) => {
  try {
    error.value = null;

    const updated = await api.resolveComment(props.projectId, commentId);
    const index = comments.value.findIndex((comment) => comment.id === commentId);

    if (index >= 0) {
      comments.value[index] = updated;
    }
  } catch (e) {
    error.value = e.message;
  }
};

onMounted(load);

watch(() => props.projectId, load);
</script>

<template>
  <section
    class="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
  >
    <!-- Header -->
    <header
      class="shrink-0 border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <span class="material-symbols-outlined text-[21px]">
              forum
            </span>
          </div>

          <div class="min-w-0">
            <p
              class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              Revisión colaborativa
            </p>

            <h3 class="mt-0.5 text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
              Comentarios
            </h3>

            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ comments.length }} total · {{ unresolvedCount }} pendientes
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
          title="Actualizar comentarios"
          @click="load"
        >
          <span
            class="material-symbols-outlined text-[19px]"
            :class="isLoading ? 'animate-spin' : ''"
          >
            refresh
          </span>
        </button>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
          {{ threads.length }} hilos
        </span>

        <span
          v-if="activeRecintoId"
          class="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-orange-700 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[14px]">
            location_on
          </span>
          Recinto activo
        </span>
      </div>
    </header>

    <!-- Error -->
    <transition name="comments-alert">
      <div
        v-if="error"
        class="mx-4 mt-3 flex shrink-0 items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-600 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span class="material-symbols-outlined text-[18px]">
            warning
          </span>
        </div>

        <p class="text-xs font-semibold leading-relaxed">
          {{ error }}
        </p>
      </div>
    </transition>

    <!-- Threads -->
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <!-- Loading empty -->
      <div
        v-if="isLoading && threads.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900/60"
      >
        <div
          class="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div
            class="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500 dark:border-slate-700 dark:border-t-orange-300"
          ></div>
        </div>

        <p class="text-xs font-bold text-slate-600 dark:text-slate-300">
          Cargando comentarios…
        </p>
      </div>

      <!-- Empty -->
      <div
        v-else-if="!isLoading && threads.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/50"
      >
        <div
          class="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
        >
          <span class="material-symbols-outlined text-[23px]">
            chat_bubble
          </span>
        </div>

        <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
          Sin comentarios aún
        </p>

        <p class="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500">
          Deja una observación del proyecto o selecciona un recinto para anclar el comentario.
        </p>
      </div>

      <!-- Thread list -->
      <div v-else class="space-y-3">
        <article
          v-for="thread in threads"
          :key="thread.id"
          class="overflow-hidden rounded-3xl border shadow-sm transition-all duration-200"
          :class="
            thread.resolved
              ? 'border-slate-200 bg-slate-50/70 opacity-75 dark:border-slate-800 dark:bg-slate-900/40'
              : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
          "
        >
          <!-- Thread header -->
          <header
            class="flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800/80"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-[10px] font-black uppercase text-orange-700 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  {{ authorLabel(thread.author_id).slice(0, 2) }}
                </span>

                <span class="text-xs font-black text-slate-800 dark:text-slate-200">
                  {{ authorLabel(thread.author_id) }}
                </span>

                <span class="text-slate-300 dark:text-slate-700">·</span>

                <span class="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                  {{ formatDate(thread.created_at) }}
                </span>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <button
                v-if="thread.anchor?.recinto_id"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-100 active:scale-[0.98] dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/45"
                title="Ir al recinto"
                @click="emit('focus-anchor', thread.anchor)"
              >
                <span class="material-symbols-outlined text-[17px]">
                  location_on
                </span>
              </button>

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                :class="
                  thread.resolved
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500 dark:hover:border-emerald-900/70 dark:hover:bg-emerald-950/25 dark:hover:text-emerald-300'
                "
                :title="thread.resolved ? 'Marcar como pendiente' : 'Resolver comentario'"
                @click="toggleResolve(thread.id)"
              >
                <span class="material-symbols-outlined text-[17px]">
                  {{ thread.resolved ? 'task_alt' : 'check_circle' }}
                </span>
              </button>
            </div>
          </header>

          <!-- Body -->
          <div class="px-4 py-3 select-text">
            <p class="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
              {{ thread.body }}
            </p>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                @click="replyingTo = thread.id"
              >
                <span class="material-symbols-outlined text-[14px]">
                  reply
                </span>
                Responder
              </button>

              <span
                v-if="thread.resolved"
                class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Resuelto
              </span>
            </div>

            <!-- Replies -->
            <div
              v-if="thread.replies.length"
              class="mt-4 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-800"
            >
              <div
                v-for="reply in thread.replies"
                :key="reply.id"
                class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div class="mb-1.5 flex flex-wrap items-center gap-2">
                  <span class="text-[10px] font-black text-orange-700 dark:text-orange-300">
                    {{ authorLabel(reply.author_id) }}
                  </span>

                  <span class="text-slate-300 dark:text-slate-700">·</span>

                  <span class="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                    {{ formatDate(reply.created_at) }}
                  </span>
                </div>

                <p class="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  {{ reply.body }}
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Composer -->
    <form
      class="shrink-0 border-t border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
      @submit.prevent="submit"
    >
      <div
        v-if="replyingTo"
        class="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
      >
        <span class="inline-flex min-w-0 items-center gap-1.5">
          <span class="material-symbols-outlined text-[15px]">
            reply
          </span>
          <span class="truncate">
            Respondiendo a {{ authorLabel(replyingThread?.author_id) }}
          </span>
        </span>

        <button
          type="button"
          class="shrink-0 text-red-500 transition-colors hover:text-red-600 dark:text-red-300 dark:hover:text-red-200"
          @click="replyingTo = null"
        >
          Cancelar
        </button>
      </div>

      <div class="relative">
        <textarea
          v-model="newBody"
          rows="3"
          :placeholder="composerPlaceholder"
          class="max-h-32 min-h-20 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
        ></textarea>
      </div>

      <button
        type="submit"
        class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        :disabled="!newBody.trim()"
      >
        <span class="material-symbols-outlined text-[17px]">
          send
        </span>
        Enviar comentario
      </button>
    </form>
  </section>
</template>

<style scoped>
.comments-alert-enter-active,
.comments-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.comments-alert-enter-from,
.comments-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>