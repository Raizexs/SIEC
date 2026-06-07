<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../composables/useI18n';
import {
  Camera,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Mail,
  Building2,
  BadgeCheck,
  User2,
} from 'lucide-vue-next';

const auth = useAuthStore();
const { t } = useI18n();

const fullName = ref(auth.fullName);
const company = ref(auth.profile?.company || auth.user?.user_metadata?.company || '');
const isSavingProfile = ref(false);
const profileMessage = ref('');
const profileMessageType = ref('success');
const avatarPreview = ref(auth.avatarUrl);

const emit = defineEmits(['profile-saved']);

const profilePublicRolEmpresa = computed(() => {
  const raw = auth.role || 'usuario';
  const roleLabel = String(raw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const empresa =
    (company.value || '').trim() ||
    auth.profile?.company ||
    auth.user?.user_metadata?.company ||
    '';
  return empresa ? `${roleLabel} — ${empresa}` : roleLabel;
});

const avatarInitial = computed(() => {
  const source = fullName.value || auth.fullName || auth.user?.email || 'U';
  return source.charAt(0).toUpperCase();
});

const saveProfile = async () => {
  isSavingProfile.value = true;
  profileMessage.value = '';

  try {
    if (auth.session) {
      const { supabase, isSupabaseConfigured } = await import('../../lib/supabaseClient');

      if (isSupabaseConfigured) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName.value,
            company: company.value,
          },
        });
      }
    }

    profileMessageType.value = 'success';
    profileMessage.value = t('settingsProfileUpdated');
    emit('profile-saved');
  } catch (error) {
    profileMessageType.value = 'error';
    profileMessage.value = t('settingsSaveFailed', { message: error.message });
  } finally {
    isSavingProfile.value = false;
  }
};

const onAvatarSelected = async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    profileMessageType.value = 'error';
    profileMessage.value = t('settingsInvalidImage');
    return;
  }

  if (file.size > 4 * 1024 * 1024) {
    profileMessageType.value = 'error';
    profileMessage.value = t('settingsImageTooLarge');
    return;
  }

  try {
    const reader = new FileReader();

    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(t('settingsInvalidImage')));
      reader.readAsDataURL(file);
    });

    avatarPreview.value = dataUrl;

    if (auth.session) {
      const { supabase, isSupabaseConfigured } = await import('../../lib/supabaseClient');

      if (isSupabaseConfigured) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: dataUrl,
          },
        });

        await auth.loadProfile();
      }
    }

    profileMessageType.value = 'success';
    profileMessage.value = t('settingsPhotoUpdated');
  } catch (error) {
    profileMessageType.value = 'error';
    profileMessage.value = t('settingsSaveFailed', { message: error.message });
  } finally {
    event.target.value = '';
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Identity card -->
    <article
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <header
        class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <p
          class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
        >
          {{ t('settingsIdentity') }}
        </p>

        <h3 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
          {{ t('settingsPublicProfile') }}
        </h3>
      </header>

      <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div class="relative h-20 w-20 shrink-0">
          <img
            v-if="avatarPreview || auth.avatarUrl"
            :src="avatarPreview || auth.avatarUrl"
            :alt="auth.fullName"
            class="h-20 w-20 rounded-3xl border border-slate-200 object-cover shadow-lg shadow-slate-950/10 dark:border-slate-800 dark:shadow-black/30"
          />

          <div
            v-else
            class="flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-200 bg-orange-50 text-2xl font-black text-orange-700 shadow-lg shadow-slate-950/10 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            {{ avatarInitial }}
          </div>

          <label
            class="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-orange-600 shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-orange-300 dark:hover:border-orange-900/60 dark:hover:bg-orange-950/30"
            :title="t('settingsChangePhoto')"
          >
            <input
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarSelected"
            />
            <Camera class="h-4 w-4" :stroke-width="2.4" />
          </label>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-lg font-black text-slate-950 dark:text-slate-100">
              {{ fullName || auth.fullName || t('settingsNoName') }}
            </p>

            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
            >
              <BadgeCheck class="h-3.5 w-3.5" :stroke-width="2.4" />
              {{ t('settingsActive') }}
            </span>
          </div>

          <p class="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Mail class="h-4 w-4" :stroke-width="2" />
            {{ auth.user?.email }}
          </p>

          <p class="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Building2 class="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" :stroke-width="2" />
            {{ profilePublicRolEmpresa }}
          </p>
        </div>
      </div>
    </article>

    <!-- Form card -->
    <article
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <header
        class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
          {{ t('settingsProfessionalData') }}
        </h3>

        <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ t('settingsProfileHelp') }}
        </p>
      </header>

      <div class="space-y-4 p-5">
        <div>
          <label class="premium-label">
            {{ t('settingsFullName') }}
          </label>

          <input
            v-model="fullName"
            type="text"
            class="premium-input"
          />
        </div>

        <div>
          <label class="premium-label">
            {{ t('settingsCompany') }}
          </label>

          <input
            v-model="company"
            type="text"
            class="premium-input"
          />
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800/80 sm:flex-row sm:items-center">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"
            :disabled="isSavingProfile"
            @click="saveProfile"
          >
            <Loader2
              v-if="isSavingProfile"
              class="h-4 w-4 animate-spin"
              :stroke-width="2.2"
            />

            <CheckCircle2
              v-else
              class="h-4 w-4"
              :stroke-width="2.2"
            />

            {{ isSavingProfile ? t('settingsSaving') : t('settingsSaveChanges') }}
          </button>

          <transition name="settings-alert">
            <p
              v-if="profileMessage"
              class="flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold"
              :class="
                profileMessageType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300'
              "
            >
              <CheckCircle2
                v-if="profileMessageType === 'success'"
                class="h-3.5 w-3.5"
                :stroke-width="2.2"
              />

              <ShieldAlert
                v-else
                class="h-3.5 w-3.5"
                :stroke-width="2.2"
              />

              {{ profileMessage }}
            </p>
          </transition>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.premium-label {
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.dark .premium-label {
  color: rgb(148 163 184);
}

.premium-input {
  height: 3rem;
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240);
  background: rgba(248, 250, 252, 0.8);
  padding-left: 1rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(15 23 42);
  outline: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.premium-input::placeholder {
  color: rgb(148 163 184);
}

.premium-input:focus {
  border-color: rgb(251 146 60);
  background: white;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.dark .premium-input {
  border-color: rgb(30 41 59);
  background: rgba(15, 23, 42, 0.72);
  color: rgb(241 245 249);
}

.dark .premium-input::placeholder {
  color: rgb(100 116 139);
}

.dark .premium-input:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

.settings-alert-enter-active,
.settings-alert-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.settings-alert-enter-from,
.settings-alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
