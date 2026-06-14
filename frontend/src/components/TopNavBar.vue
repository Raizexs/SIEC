<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '../composables/useI18n';
import { useAuthStore } from '../stores/auth';
import { useLayoutManager } from '../composables/useLayoutManager';
import {
  Save,
  ChevronDown,
  History,
  FileText,
  LogOut,
  Building2,
} from 'lucide-vue-next';
const { t, currentLanguage } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const { savedLayouts } = useLayoutManager();

defineProps({
  /** Guardar diseño / layout en el workspace (independiente de compartir proyecto). */
  showSave: { type: Boolean, default: true },
});

defineEmits(['save-layout']);

const showProfileMenu = ref(false);

const roleLabels = {
  engineer: () => t('roleEngineer'),
  contractor: () => t('roleContractor'),
  client_viewer: () => t('roleClient'),
  admin: () => t('roleAdmin'),
  architect: () => t('roleEngineer'),
};

const userProfile = computed(() => ({
  name: authStore.fullName || 'Usuario',
  company: authStore.profile?.company || authStore.user?.user_metadata?.company || '',
  avatarUrl: authStore.avatarUrl || '',
  email: authStore.user?.email || '—',
}));

const userInitials = computed(() => {
  const source = userProfile.value.name || userProfile.value.email || 'U';

  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
});

const firstName = computed(() =>
  userProfile.value.name?.split(' ')[0] || t('defaultUser'),
);

const recentExports = computed(() => authStore.exportHistory.slice(0, 3));

const logout = async () => {
  await authStore.logout();
  showProfileMenu.value = false;
  router.push('/login');
};
</script>

<template>
  <header
    class="siec-header-shell sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-950/85 dark:shadow-black/20 sm:px-6"
  >
    <!-- Left: title -->
    <div class="flex min-w-0 items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        <Building2 class="h-4.5 w-4.5" :stroke-width="2.2" />
      </div>

      <div class="min-w-0">
        <h2 class="truncate text-sm font-black tracking-tight text-slate-950 dark:text-slate-100 sm:text-base">
          {{ t('estimationConfigurator') }}
        </h2>
      </div>
    </div>

    <!-- Right: actions -->
    <div class="flex items-center gap-2">
      <button
        v-if="showSave"
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-tight text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        :title="t('saveCurrentDesign')"
        @click="$emit('save-layout')"
      >
        <Save class="h-4 w-4" :stroke-width="2.2" />
        {{ t('save') }}
      </button>

      <!-- Profile -->
      <div class="relative">
        <button
          type="button"
          class="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 py-1.5 pl-1.5 pr-2.5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          :aria-expanded="showProfileMenu"
          aria-haspopup="menu"
          @click="showProfileMenu = !showProfileMenu"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-[11px] font-black uppercase tracking-tight text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <img
              v-if="userProfile.avatarUrl"
              :src="userProfile.avatarUrl"
              :alt="userProfile.name"
              class="h-full w-full object-cover"
            />

            <span v-else>
              {{ userInitials }}
            </span>
          </div>

          <span
            class="hidden max-w-[110px] truncate text-sm font-bold text-slate-800 dark:text-slate-100 sm:inline"
          >
            {{ firstName }}
          </span>

          <ChevronDown
            class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 dark:text-slate-500"
            :class="showProfileMenu ? 'rotate-180' : ''"
            :stroke-width="2.2"
          />
        </button>

        <Transition name="profile-menu">
          <div
            v-if="showProfileMenu"
            class="absolute right-0 mt-3 w-[22rem] origin-top-right overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
            role="menu"
          >
            <!-- Profile header -->
            <div
              class="border-b border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div class="flex items-center gap-4">
                <div
                  class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-base font-black uppercase tracking-tight text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <img
                    v-if="userProfile.avatarUrl"
                    :src="userProfile.avatarUrl"
                    :alt="userProfile.name"
                    class="h-full w-full object-cover"
                  />

                  <span v-else>
                    {{ userInitials }}
                  </span>
                </div>

                <div class="min-w-0">
                  <p class="truncate text-base font-black leading-tight tracking-tight text-slate-950 dark:text-slate-100">
                    {{ userProfile.name }}
                  </p>

                  <p class="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ userProfile.email }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-px bg-slate-200/80 dark:bg-slate-800">
              <div class="bg-white p-4 text-center dark:bg-slate-950">
                <p class="font-mono text-2xl font-black text-slate-950 dark:text-slate-100">
                  {{ authStore.exportHistory.length }}
                </p>
                <p
                  class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('exportsLabel') }}
                </p>
              </div>

              <div class="bg-white p-4 text-center dark:bg-slate-950">
                <p class="font-mono text-2xl font-black text-orange-600 dark:text-orange-300">
                  {{ savedLayouts?.length || 0 }}
                </p>
                <p
                  class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
                >
                  {{ t('savedCountLabel') }}
                </p>
              </div>
            </div>

            <!-- History -->
            <div class="p-4">
              <h4
                class="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
              >
                <History class="h-3.5 w-3.5" :stroke-width="2.2" />
                {{ t('recentHistory') }}
              </h4>

              <div
                v-if="authStore.exportHistory.length === 0"
                class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/50"
              >
                <div
                  class="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
                >
                  <FileText class="h-5 w-5" :stroke-width="1.8" />
                </div>

                <p class="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {{ t('noRecentExports') }}
                </p>
              </div>

              <ul v-else class="space-y-2">
                <li
                  v-for="(item, idx) in recentExports"
                  :key="item.id || idx"
                  class="flex items-start gap-3 rounded-2xl border border-transparent p-2.5 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/70"
                >
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                  >
                    <FileText class="h-4 w-4" :stroke-width="2.2" />
                  </div>

                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                      {{ item.name || item.project || t('untitledProject') }}
                    </p>
                    <p class="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {{ item.date || t('noDate') }}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Logout -->
            <div
              class="border-t border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-800/80 dark:bg-slate-900/50"
            >
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-red-600 transition-all duration-200 hover:border-red-200 hover:bg-red-50 active:scale-[0.98] dark:text-red-300 dark:hover:border-red-900/70 dark:hover:bg-red-950/30"
                @click="logout"
              >
                <LogOut class="h-4 w-4" :stroke-width="2.2" />
                {{ t('logout') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.profile-menu-enter-active,
.profile-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.profile-menu-enter-from,
.profile-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>