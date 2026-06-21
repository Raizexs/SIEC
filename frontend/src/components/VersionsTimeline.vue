<script setup>
/**
 * VersionsTimeline — Figma-like vertical timeline of project versions.
 *
 * Lets the user list, restore and compare versions. Restore creates a new
 * version; history is never overwritten. Comparison opens a side-by-side diff
 * via a `compare` event handler emitted to the parent.
 */

import { ref, onMounted, watch, computed } from 'vue';
import { useProjectsApi } from '../composables/useProjectsApi';

const props = defineProps({
  projectId: { type: String, required: true },
});

const emit = defineEmits(['restore', 'compare']);

const api = useProjectsApi();

const versions = ref([]);
const isLoading = ref(false);
const compareSelection = ref([]);
const error = ref(null);

const selectedCount = computed(() => compareSelection.value.length);

const canCompare = computed(() => selectedCount.value === 2);

const latestVersion = computed(() => versions.value[0] || null);

const formatVersionDate = (dateValue) => {
  if (!dateValue) return 'Sin fecha';

  return new Date(dateValue).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const load = async () => {
  if (!props.projectId) return;

  isLoading.value = true;
  error.value = null;

  try {
    versions.value = await api.listVersions(props.projectId);
  } catch (e) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
};

const toggleCompare = (id) => {
  const index = compareSelection.value.indexOf(id);

  if (index >= 0) {
    compareSelection.value.splice(index, 1);
    return;
  }

  if (compareSelection.value.length < 2) {
    compareSelection.value.push(id);
    return;
  }

  compareSelection.value = [compareSelection.value[1], id];
};

const triggerCompare = () => {
  if (!canCompare.value) return;

  const [a, b] = compareSelection.value;
  const va = versions.value.find((version) => version.id === a);
  const vb = versions.value.find((version) => version.id === b);

  emit('compare', { a: va, b: vb });
};

const restoreVersion = async (versionId) => {
  if (
    !confirm(
      '¿Restaurar esta versión? El estado actual se guardará como nueva versión antes de aplicar.',
    )
  ) {
    return;
  }

  try {
    await api.restoreVersion(props.projectId, versionId);
    emit('restore', versionId);
    await load();
  } catch (e) {
    alert(`Error: ${e.message}`);
  }
};

onMounted(load);

watch(() => props.projectId, load);

defineExpose({ refresh: load });
</script>

<template>
  <section
    class="rounded-3xl border border-slate-200/90 bg-white/85 p-4 shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
  >
    <!-- Header -->
    <header class="mb-4 flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
        >
          <span class="material-symbols-outlined text-[21px]">
            history
          </span>
        </div>

        <div class="min-w-0">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            Control de versiones
          </p>

          <h3 class="mt-0.5 text-base font-black tracking-tight text-slate-950 dark:text-slate-100">
            Historial
          </h3>

          <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Restaura o compara versiones guardadas del proyecto.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
        title="Actualizar historial"
        @click="load"
      >
        <span
          class="material-symbols-outlined text-[19px]"
          :class="isLoading ? 'animate-spin' : ''"
        >
          refresh
        </span>
      </button>
    </header>

    <!-- Compare toolbar -->
    <div
      class="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          Comparación
        </p>
        <p class="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ selectedCount }}/2 versiones seleccionadas
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm transition-all duration-200 active:scale-[0.98]"
        :class="
          canCompare
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
            : 'cursor-not-allowed border-slate-200 bg-white text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600'
        "
        :disabled="!canCompare"
        @click="triggerCompare"
      >
        <span class="material-symbols-outlined text-[15px]">
          compare_arrows
        </span>
        Comparar
      </button>
    </div>

    <!-- Error -->
    <transition name="timeline-alert">
      <div
        v-if="error"
        class="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300"
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

    <!-- Loading empty -->
    <div
      v-if="isLoading && versions.length === 0"
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
        Cargando historial…
      </p>
    </div>

    <!-- Timeline -->
    <ol
      v-else-if="versions.length > 0"
      class="relative ml-4 space-y-3 border-l border-slate-200 dark:border-slate-800"
    >
      <li
        v-for="(v, index) in versions"
        :key="v.id"
        class="group relative pl-5"
      >
        <!-- Dot -->
        <span
          class="absolute -left-[7px] top-5 h-3.5 w-3.5 rounded-full border-2"
          :class="
            index === 0
              ? 'border-white bg-emerald-500 shadow-sm shadow-emerald-500/40 ring-4 ring-emerald-500/10 dark:border-slate-950'
              : compareSelection.includes(v.id)
                ? 'border-white bg-orange-500 shadow-sm shadow-orange-500/30 ring-4 ring-orange-500/10 dark:border-slate-950'
                : 'border-white bg-slate-300 dark:border-slate-950 dark:bg-slate-700'
          "
        ></span>

        <article
          class="cursor-pointer overflow-hidden rounded-2xl border p-3 transition-all duration-200 active:scale-[0.99]"
          :class="
            compareSelection.includes(v.id)
              ? 'border-orange-300 bg-orange-50/80 shadow-md shadow-orange-500/10 dark:border-orange-800/80 dark:bg-orange-950/20 dark:shadow-black/20'
              : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:shadow-black/20'
          "
          @click="toggleCompare(v.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-sm font-black text-slate-950 dark:text-slate-100">
                  v{{ v.version_number }}
                </span>

                <span
                  v-if="index === 0"
                  class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-tight text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Actual
                </span>

                <span
                  v-if="compareSelection.includes(v.id)"
                  class="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-tight text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                >
                  Seleccionada
                </span>
              </div>

              <p class="mt-1 text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                {{ formatVersionDate(v.created_at) }}
              </p>
            </div>

            <button
              type="button"
              class="shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight text-slate-500 opacity-100 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-blue-900/70 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 sm:opacity-0 sm:group-hover:opacity-100"
              @click.stop="restoreVersion(v.id)"
            >
              <span class="inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">
                  history
                </span>
                Restaurar
              </span>
            </button>
          </div>

          <p
            v-if="v.summary"
            class="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {{ v.summary }}
          </p>

          <p
            v-else
            class="mt-2 text-xs font-medium italic text-slate-400 dark:text-slate-500"
          >
            Sin resumen registrado para esta versión.
          </p>
        </article>
      </li>
    </ol>

    <!-- Empty -->
    <div
      v-else
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/50"
    >
      <div
        class="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
      >
        <span class="material-symbols-outlined text-[23px]">
          history_toggle_off
        </span>
      </div>

      <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
        Sin versiones aún
      </p>

      <p class="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500">
        Cada vez que guardes manualmente se creará una nueva versión del proyecto.
      </p>
    </div>
  </section>
</template>

<style scoped>
.timeline-alert-enter-active,
.timeline-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.timeline-alert-enter-from,
.timeline-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>