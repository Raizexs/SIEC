<script setup>
/**
 * AIAssistant — collapsible chat sidebar with tool-aware suggestions.
 * Backend reads OPENAI / ANTHROPIC API keys; otherwise falls back to a
 * deterministic heuristic helper.
 *
 * Premium language:
 * - Slate/orange visual system.
 * - Floating assistant panel with clean hierarchy.
 * - Better thinking, error and suggestion states.
 */

import { ref, nextTick } from 'vue';
import { useApi } from '../composables/useApi';

const props = defineProps({
  projectContext: {
    type: Object,
    default: () => ({}),
  },
});

const api = useApi();

const open = ref(false);
const draft = ref('');
const isThinking = ref(false);
const listRef = ref(null);

const messages = ref([
  {
    role: 'assistant',
    content:
      '¡Hola! Soy SIEC Copilot. Te ayudo a optimizar tu proyecto, comparar materialidades y revisar precios del scraper. ¿Qué necesitas?',
  },
]);

const suggestions = ref([
  '¿Qué materialidad me conviene si quiero ahorrar?',
  'Mostrar histórico de precios del cemento',
  'Detecta habitaciones sobredimensionadas en mi proyecto',
]);

const scrollDown = async () => {
  await nextTick();

  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
};

const send = async (text) => {
  const content = (text ?? draft.value).trim();

  if (!content || isThinking.value) return;

  messages.value.push({
    role: 'user',
    content,
  });

  draft.value = '';
  isThinking.value = true;

  await scrollDown();

  try {
    const res = await api.post('/ai/chat', {
      messages: messages.value,
      project_context: props.projectContext,
      use_tools: true,
    });

    messages.value.push({
      role: 'assistant',
      content: res.reply,
    });

    if (res.suggestions?.length) {
      suggestions.value = res.suggestions;
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      isError: true,
      content: `No pude completar la consulta: ${error.message}`,
    });
  } finally {
    isThinking.value = false;
    await scrollDown();
  }
};
</script>

<template>
  <div
    class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none sm:bottom-6 sm:right-6"
  >
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-4 scale-[0.98] opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-4 scale-[0.98] opacity-0"
    >
      <section
        v-if="open"
        class="pointer-events-auto flex h-[560px] w-[min(92vw,390px)] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
        role="dialog"
        aria-label="SIEC Copilot"
      >
        <!-- Top accent -->
        <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

        <!-- Header -->
        <header
          class="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            >
              <span class="material-symbols-outlined text-[24px]">
                smart_toy
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
                  SIEC Copilot
                </h3>

                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-tight text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Online
                </span>
              </div>

              <p
                class="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
              >
                Asistente IA de proyecto
              </p>
            </div>
          </div>

          <button
            type="button"
            class="group flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            aria-label="Cerrar asistente"
            @click="open = false"
          >
            <span
              class="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:rotate-90"
            >
              close
            </span>
          </button>
        </header>

        <!-- Messages -->
        <div
          ref="listRef"
          class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4 select-text dark:bg-slate-950"
        >
          <div
            v-for="(message, index) in messages"
            :key="index"
            class="flex"
            :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="flex max-w-[86%] gap-2"
              :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
            >
              <!-- Avatar -->
              <div
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border shadow-sm"
                :class="
                  message.role === 'user'
                    ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    : message.isError
                      ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300'
                      : 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300'
                "
              >
                <span class="material-symbols-outlined text-[16px]">
                  {{ message.role === 'user' ? 'person' : message.isError ? 'warning' : 'smart_toy' }}
                </span>
              </div>

              <!-- Bubble -->
              <div
                class="rounded-2xl px-3.5 py-2.5 text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-sm"
                :class="
                  message.role === 'user'
                    ? 'rounded-tr-md border border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                    : message.isError
                      ? 'rounded-tl-md border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-200'
                      : 'rounded-tl-md border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200'
                "
              >
                {{ message.content }}
              </div>
            </div>
          </div>

          <!-- Thinking -->
          <div v-if="isThinking" class="flex justify-start">
            <div class="flex max-w-[86%] gap-2">
              <div
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[16px]">
                  smart_toy
                </span>
              </div>

              <div
                class="rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-3.5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div class="flex items-center gap-1.5">
                  <span
                    class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 dark:bg-orange-300"
                    style="animation-delay: 0ms"
                  ></span>
                  <span
                    class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 dark:bg-orange-300"
                    style="animation-delay: 100ms"
                  ></span>
                  <span
                    class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 dark:bg-orange-300"
                    style="animation-delay: 200ms"
                  ></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <footer
          class="border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/60"
        >
          <!-- Suggestions -->
          <div class="mb-3 flex flex-wrap gap-1.5">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              type="button"
              class="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold leading-snug text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-orange-900/70 dark:hover:bg-orange-950/25 dark:hover:text-orange-300"
              :disabled="isThinking"
              @click="send(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>

          <!-- Input -->
          <form class="flex items-end gap-2" @submit.prevent="send()">
            <div class="relative min-w-0 flex-1">
              <textarea
                v-model="draft"
                rows="1"
                placeholder="Pregúntame algo…"
                class="max-h-28 min-h-11 w-full resize-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-sm font-semibold text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
                @keydown.enter.exact.prevent="send()"
              ></textarea>
            </div>

            <button
              type="submit"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              :disabled="isThinking || !draft.trim()"
              aria-label="Enviar mensaje"
            >
              <span
                v-if="isThinking"
                class="material-symbols-outlined animate-spin text-[19px]"
              >
                progress_activity
              </span>

              <span
                v-else
                class="material-symbols-outlined text-[19px]"
              >
                send
              </span>
            </button>
          </form>
        </footer>
      </section>
    </transition>

    <!-- Floating trigger -->
    <button
      v-if="!open"
      type="button"
      class="pointer-events-auto group relative flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-orange-600 shadow-2xl shadow-slate-950/15 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:bg-orange-50 hover:shadow-orange-500/15 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-orange-300 dark:hover:border-orange-900/70 dark:hover:bg-orange-950/30"
      title="SIEC Copilot"
      aria-label="Abrir SIEC Copilot"
      @click="open = true"
    >
      <span
        class="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-950"
      ></span>

      <span class="material-symbols-outlined text-[28px] transition-transform duration-200 group-hover:scale-110">
        smart_toy
      </span>
    </button>
  </div>
</template>