<script setup>
/**
 * AppRail — fixed 64px-wide side navigation.
 *
 * Diseño premium:
 * - Rail minimalista con fondo adaptable claro/oscuro.
 * - Estados activos con contraste elegante.
 * - Avatar separado de logout para mayor claridad UX.
 * - Bordes grises suaves según el tema.
 * - Tooltips refinados.
 */

import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../composables/useI18n';
import { useBilling } from '../../composables/useBilling';
import { computed, onMounted } from 'vue';
import {
  LayoutDashboard,
  Building2,
  Store,
  Settings,
  LogOut,
  HelpCircle,
  Lock,
} from 'lucide-vue-next';

defineProps({
  active: { type: String, default: '' },
});

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const { currentLanguage, t } = useI18n();
const { hasMarketplaceAccess, fetchBilling } = useBilling();

onMounted(() => {
  fetchBilling(true);
});

const isSiecPlaceLocked = computed(() => !hasMarketplaceAccess.value);

const workspaceTarget = computed(() => {
  if (route.name === 'workspace') return route.fullPath;

  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('siec.lastWorkspacePath') || '/workspace';
  }

  return '/workspace';
});

const links = [
  {
    id: 'dashboard',
    labelEs: 'Proyectos',
    labelEn: 'Projects',
    icon: LayoutDashboard,
    to: '/dashboard',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: Building2,
    to: workspaceTarget,
  },
  {
    id: 'siecplace',
    labelEs: 'SIEC Place',
    labelEn: 'SIEC Place',
    icon: Store,
    to: '/siecplace',
  },
];

const linkLabel = (link) =>
  currentLanguage.value === 'es'
    ? link.labelEs || link.label
    : link.labelEn || link.label;

const userInitials = computed(() => {
  const name = auth.fullName || auth.user?.name || auth.user?.email || 'U';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
});

const handleLogout = async () => {
  await auth.logout();
  router.push('/login');
};

const showShortcuts = () => {
  window.dispatchEvent(new CustomEvent('siec:show-shortcuts'));
};

const isLinkLocked = (link) => link.id === 'siecplace' && isSiecPlaceLocked.value;

const handleNavClick = (link, event) => {
  if (!isLinkLocked(link)) return;
  event.preventDefault();
  router.push('/settings?tab=billing');
};

const lockedLinkTitle = (link) =>
  isLinkLocked(link) ? t('siecplaceRailLocked') : linkLabel(link);

const isActive = (link) => {
  const target = typeof link.to === 'string' ? link.to : link.to.value;

  if (!target) return false;

  if (target.startsWith('/siecplace')) {
    return route.path.startsWith('/siecplace');
  }

  if (target.startsWith('/dashboard')) {
    return route.path === '/dashboard';
  }

  if (target.startsWith('/workspace')) {
    return route.path.startsWith('/workspace');
  }

  if (route.path.startsWith(target.split('?')[0])) return true;

  return link.id === route.name;
};
</script>

<template>
  <aside
    class="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col items-center border-r border-slate-200/80 bg-slate-50/90 px-2 py-4 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-950/90"
  >
    <!-- Logo -->
    <router-link
      to="/dashboard"
      title="Inicio"
      aria-label="Ir al inicio"
      class="group mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div
        class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-navy-800 to-navy-950 shadow-sm transition-transform duration-200 group-hover:scale-105"
      >
        <Building2 class="h-4.5 w-4.5 text-white" :stroke-width="2.2" />
      </div>
    </router-link>

    <!-- Primary navigation -->
    <nav class="flex flex-1 flex-col items-center gap-2">
      <router-link
        v-for="link in links"
        :key="link.id"
        :to="typeof link.to === 'string' ? link.to : link.to.value"
        :title="lockedLinkTitle(link)"
        class="rail-link group"
        :class="{
          'rail-link-active': isActive(link) && !isLinkLocked(link),
          'rail-link-locked': isLinkLocked(link),
        }"
        :aria-disabled="isLinkLocked(link) ? 'true' : undefined"
        @click="handleNavClick(link, $event)"
      >
        <component
          :is="link.icon"
          class="h-5 w-5"
          :class="{ 'opacity-50': isLinkLocked(link) }"
          :stroke-width="2"
        />
        <Lock
          v-if="isLinkLocked(link)"
          class="pointer-events-none absolute bottom-1 right-1 h-3 w-3 text-slate-400 dark:text-slate-500"
          :stroke-width="2.5"
        />

        <span class="rail-tooltip">
          {{ lockedLinkTitle(link) }}
        </span>
      </router-link>
    </nav>

    <!-- Footer: shortcuts + settings + user actions -->
    <div
      class="mt-auto flex w-full flex-col items-center gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800/80"
    >
      <button
        title="Atajos de teclado"
        class="rail-link group"
        aria-label="Mostrar atajos de teclado"
        @click="showShortcuts"
      >
        <HelpCircle class="h-5 w-5" :stroke-width="2" />

        <span class="rail-tooltip">
          Atajos
        </span>
      </button>

      <router-link
        to="/settings"
        title="Configuración"
        class="rail-link group"
        :class="{ 'rail-link-active': active === 'settings' || route.path.startsWith('/settings') }"
      >
        <Settings class="h-5 w-5" :stroke-width="2" />

        <span class="rail-tooltip">
          Configuración
        </span>
      </router-link>

      <!-- User profile + logout -->
      <div
        class="mt-3 flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/70 p-1.5 shadow-sm backdrop-blur-md transition-colors duration-300 dark:border-slate-800/90 dark:bg-slate-900/70"
      >
        <!-- Avatar -->
        <div
          class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-[11px] font-semibold uppercase tracking-tight text-slate-600 shadow-inner dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          :title="auth.fullName || auth.user?.email || 'Usuario'"
          aria-label="Usuario actual"
        >
          <img
            v-if="auth.avatarUrl"
            :src="auth.avatarUrl"
            :alt="auth.fullName || 'Usuario'"
            class="h-full w-full object-cover"
          />

          <span v-else>
            {{ userInitials }}
          </span>
        </div>

        <!-- Logout -->
        <button
          title="Cerrar sesión"
          class="group/logout flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 active:scale-95 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Cerrar sesión"
          @click="handleLogout"
        >
          <LogOut
            class="h-4.5 w-4.5 transition-transform duration-200 group-hover/logout:translate-x-0.5"
            :stroke-width="2"
          />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.rail-link {
  @apply relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-950 hover:shadow-sm active:translate-y-0 active:scale-95 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100;
}

.rail-link-active {
  @apply border-slate-900 bg-slate-950 text-white shadow-md hover:border-slate-900 hover:bg-slate-950 hover:text-white dark:border-slate-200 dark:bg-white dark:text-slate-950 dark:hover:border-slate-200 dark:hover:bg-white dark:hover:text-slate-950;
}

.rail-link-locked {
  @apply cursor-not-allowed opacity-45 hover:translate-y-0 hover:border-transparent hover:bg-transparent hover:text-slate-500 hover:shadow-none dark:hover:text-slate-500;
}

.rail-tooltip {
  @apply pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-tight text-slate-700 opacity-0 shadow-lg shadow-slate-900/5 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:shadow-black/20;
}
</style>