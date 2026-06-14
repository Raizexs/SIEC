<script setup>
/**
 * CommandPalette — Cmd/Ctrl+K launcher inspired by Linear/Raycast/Notion.
 *
 * Built without external deps for tighter control. Supports:
 * - Dynamic command list with categories.
 * - Fuzzy match scoring on title + keywords.
 * - Arrow keys + Enter + Esc navigation.
 * - Recent commands tracking in localStorage.
 *
 * Premium language:
 * - Slate/orange system.
 * - Modal with translucent shell.
 * - Command rows with strong hierarchy.
 * - Better keyboard hints and empty state.
 */

import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '../composables/useTheme';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const theme = useTheme();

const open = ref(false);
const query = ref('');
const inputRef = ref(null);
const selectedIndex = ref(0);

const recentIds = ref(
  JSON.parse(localStorage.getItem('siec.cmd.recent') || '[]'),
);

const allCommands = computed(() => [
  // Navigation
  {
    id: 'nav.dashboard',
    title: 'Ir al Dashboard',
    subtitle: 'Ver todos tus proyectos',
    keywords: 'home inicio proyectos',
    icon: 'dashboard',
    section: 'Navegación',
    run: () => router.push('/dashboard'),
  },
  {
    id: 'nav.workspace',
    title: 'Abrir Workspace',
    subtitle: 'Editor 3D y simulación constructiva',
    keywords: 'editor proyecto 3d workspace',
    icon: 'view_in_ar',
    section: 'Navegación',
    run: () => router.push('/workspace'),
  },
  {
    id: 'nav.settings',
    title: 'Configuración',
    subtitle: 'Perfil, seguridad y MFA',
    keywords: 'profile mfa security ajustes',
    icon: 'settings',
    section: 'Navegación',
    run: () => router.push('/settings'),
  },

  // Project actions
  {
    id: 'project.new',
    title: 'Nuevo proyecto',
    subtitle: 'Crea un proyecto en blanco',
    keywords: 'create new proyecto nuevo',
    icon: 'add_box',
    section: 'Proyecto',
    run: () => router.push('/workspace?new=1'),
  },
  {
    id: 'project.export.gltf',
    title: 'Exportar GLTF/GLB',
    subtitle: 'Modelo 3D portable',
    keywords: 'glb gltf 3d exportar',
    icon: 'view_in_ar',
    section: 'Exportar',
    run: () =>
      window.dispatchEvent(
        new CustomEvent('siec:export', {
          detail: 'gltf',
        }),
      ),
  },
  {
    id: 'project.export.ifc',
    title: 'Exportar IFC (BIM)',
    subtitle: 'Formato BIM para coordinación técnica',
    keywords: 'ifc revit bim arquitectura',
    icon: 'architecture',
    section: 'Exportar',
    run: () =>
      window.dispatchEvent(
        new CustomEvent('siec:export', {
          detail: 'ifc',
        }),
      ),
  },

  // Theme
  {
    id: 'theme.light',
    title: 'Tema claro',
    subtitle: 'Cambiar apariencia a modo claro',
    icon: 'light_mode',
    section: 'Apariencia',
    run: () => theme.setTheme('light'),
  },
  {
    id: 'theme.dark',
    title: 'Tema oscuro',
    subtitle: 'Cambiar apariencia a modo oscuro',
    icon: 'dark_mode',
    section: 'Apariencia',
    run: () => theme.setTheme('dark'),
  },
  {
    id: 'theme.system',
    title: 'Tema del sistema',
    subtitle: 'Usar la configuración del dispositivo',
    icon: 'desktop_windows',
    section: 'Apariencia',
    run: () => theme.setTheme('system'),
  },

  // Auth
  {
    id: 'auth.logout',
    title: 'Cerrar sesión',
    subtitle: 'Salir de la cuenta actual',
    icon: 'logout',
    section: 'Cuenta',
    danger: true,
    run: async () => {
      await auth.logout();
      router.push('/login');
    },
  },
]);

const scoreCommand = (cmd, q) => {
  const text = `${cmd.title} ${cmd.keywords || ''} ${cmd.section || ''}`.toLowerCase();

  if (text.includes(q)) {
    return 100 - text.indexOf(q);
  }

  let score = 0;
  let index = 0;

  for (const char of q) {
    const found = text.indexOf(char, index);

    if (found < 0) return 0;

    score += 1;
    index = found + 1;
  }

  return score;
};

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();

  if (!q) {
    const recent = recentIds.value
      .map((id) => allCommands.value.find((command) => command.id === id))
      .filter(Boolean);

    const rest = allCommands.value.filter(
      (command) => !recentIds.value.includes(command.id),
    );

    return [...recent, ...rest];
  }

  return allCommands.value
    .map((command) => ({
      ...command,
      score: scoreCommand(command, q),
    }))
    .filter((command) => command.score > 0)
    .sort((a, b) => b.score - a.score);
});

const grouped = computed(() => {
  const map = new Map();

  for (const command of filtered.value) {
    const section = query.value ? 'Resultados' : command.section || 'General';

    if (!map.has(section)) {
      map.set(section, []);
    }

    map.get(section).push(command);
  }

  return [...map.entries()];
});

const run = (command) => {
  recentIds.value = [
    command.id,
    ...recentIds.value.filter((id) => id !== command.id),
  ].slice(0, 6);

  localStorage.setItem('siec.cmd.recent', JSON.stringify(recentIds.value));

  open.value = false;
  command.run?.();
};

const onKey = (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    open.value = !open.value;
    return;
  }

  if (!open.value) return;

  if (event.key === 'Escape') {
    open.value = false;
    return;
  }

  const flat = filtered.value;

  if (event.key === 'ArrowDown') {
    event.preventDefault();

    if (flat.length) {
      selectedIndex.value = (selectedIndex.value + 1) % flat.length;
    }
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();

    if (flat.length) {
      selectedIndex.value =
        (selectedIndex.value - 1 + flat.length) % flat.length;
    }
  }

  if (event.key === 'Enter') {
    event.preventDefault();

    const command = flat[selectedIndex.value];

    if (command) {
      run(command);
    }
  }
};

watch(open, async (value) => {
  if (value) {
    await nextTick();

    query.value = '';
    selectedIndex.value = 0;
    inputRef.value?.focus();
  }
});

// Keep selectedIndex in range when the filtered list changes.
watch(filtered, (list) => {
  if (selectedIndex.value >= list.length) {
    selectedIndex.value = Math.max(0, list.length - 1);
  }
});

onMounted(() => {
  document.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <Teleport to="body">
    <transition name="command-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/50 px-4 pt-24 backdrop-blur-md dark:bg-black/60 sm:pt-32"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        @click.self="open = false"
      >
        <transition name="command-card" appear>
          <section
            class="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
          >
            <!-- Top accent -->
            <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

            <!-- Search -->
            <header
              class="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
              >
                <span class="material-symbols-outlined text-[21px]">
                  search
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <p
                  id="command-palette-title"
                  class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  Command center
                </p>

                <input
                  ref="inputRef"
                  v-model="query"
                  type="text"
                  placeholder="Buscar comando, acción o destino…"
                  class="mt-0.5 w-full bg-transparent text-base font-black tracking-tight text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <kbd class="premium-kbd">
                Esc
              </kbd>
            </header>

            <!-- Results -->
            <div class="max-h-[430px] overflow-y-auto px-2 py-2">
              <template
                v-for="[section, commands] in grouped"
                :key="section"
              >
                <div
                  class="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                >
                  {{ section }}
                </div>

                <button
                  v-for="command in commands"
                  :key="command.id"
                  type="button"
                  class="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 active:scale-[0.99]"
                  :class="
                    filtered[selectedIndex]?.id === command.id
                      ? command.danger
                        ? 'bg-red-50 text-red-700 shadow-sm dark:bg-red-950/25 dark:text-red-300'
                        : 'bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950 dark:shadow-black/20'
                      : command.danger
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/25'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/70'
                  "
                  @mouseenter="selectedIndex = filtered.indexOf(command)"
                  @click="run(command)"
                >
                  <!-- Icon -->
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-colors duration-200"
                    :class="
                      filtered[selectedIndex]?.id === command.id
                        ? command.danger
                          ? 'border-red-200 bg-white text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300'
                          : 'border-white/20 bg-white/10 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-950'
                        : command.danger
                          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300'
                          : 'border-slate-200 bg-white text-slate-500 group-hover:text-orange-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:group-hover:text-orange-300'
                    "
                  >
                    <span class="material-symbols-outlined text-[20px]">
                      {{ command.icon || 'arrow_right' }}
                    </span>
                  </span>

                  <!-- Text -->
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-black tracking-tight">
                      {{ command.title }}
                    </span>

                    <span
                      v-if="command.subtitle"
                      class="mt-0.5 block truncate text-xs font-medium"
                      :class="
                        filtered[selectedIndex]?.id === command.id
                          ? command.danger
                            ? 'text-red-500 dark:text-red-300/80'
                            : 'text-slate-300 dark:text-slate-600'
                          : command.danger
                            ? 'text-red-400 dark:text-red-300/70'
                            : 'text-slate-400 dark:text-slate-500'
                      "
                    >
                      {{ command.subtitle }}
                    </span>
                  </span>

                  <!-- Recent badge -->
                  <span
                    v-if="recentIds.includes(command.id) && !query"
                    class="hidden rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-tight sm:inline-flex"
                    :class="
                      filtered[selectedIndex]?.id === command.id
                        ? 'border-white/20 bg-white/10 text-white/80 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-500'
                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                    "
                  >
                    Reciente
                  </span>

                  <span
                    class="hidden text-xs font-black opacity-50 sm:inline"
                  >
                    ↵
                  </span>
                </button>
              </template>

              <!-- Empty -->
              <div
                v-if="filtered.length === 0"
                class="flex flex-col items-center justify-center px-4 py-10 text-center"
              >
                <div
                  class="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500"
                >
                  <span class="material-symbols-outlined text-[24px]">
                    search_off
                  </span>
                </div>

                <p class="text-sm font-black text-slate-700 dark:text-slate-200">
                  Sin resultados
                </p>

                <p class="mt-1 max-w-xs text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                  Prueba con “workspace”, “exportar”, “tema” o “dashboard”.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <footer
              class="flex flex-col gap-2 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="flex flex-wrap items-center gap-1.5">
                <kbd class="premium-kbd">↑↓</kbd>
                navegar
                <span class="text-slate-300 dark:text-slate-700">·</span>
                <kbd class="premium-kbd">↵</kbd>
                ejecutar
              </span>

              <span class="flex flex-wrap items-center gap-1.5">
                <kbd class="premium-kbd">⌘K</kbd>
                abrir
              </span>
            </footer>
          </section>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.premium-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.45rem;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.15rem 0.45rem;
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 1;
  color: rgb(100 116 139);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.08);
}

.dark .premium-kbd {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);
}

.command-overlay-enter-active,
.command-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.command-overlay-enter-from,
.command-overlay-leave-to {
  opacity: 0;
}

.command-card-enter-active,
.command-card-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.command-card-enter-from,
.command-card-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}
</style>