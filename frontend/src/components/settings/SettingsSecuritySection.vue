<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../composables/useI18n';
import ConfirmDialog from './ConfirmDialog.vue';
import {
  ShieldCheck,
  Smartphone,
  Trash2,
  KeyRound,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  LogOut,
  AlertTriangle,
} from 'lucide-vue-next';

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const mfaCode = ref('');
const mfaStatus = ref('idle');
const mfaError = ref('');

const confirmState = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: '',
  variant: 'danger',
  action: null,
});

const factors = computed(() => auth.mfaState.factors);

const startMFAEnroll = async () => {
  mfaError.value = '';
  const res = await auth.enrollMFA();
  if (res.success) {
    mfaStatus.value = 'qr';
  } else {
    mfaError.value = res.error || t('settingsMfaInvalidCode');
  }
};

const verifyMFA = async () => {
  mfaStatus.value = 'verifying';
  mfaError.value = '';
  const res = await auth.verifyMFAEnroll(mfaCode.value);
  if (res.success) {
    mfaStatus.value = 'done';
    mfaCode.value = '';
  } else {
    mfaError.value = res.error || t('settingsMfaInvalidCode');
    mfaStatus.value = 'qr';
  }
};

const closeConfirm = () => {
  confirmState.value = {
    open: false,
    title: '',
    message: '',
    confirmLabel: t('settingsConfirm'),
    variant: 'danger',
    action: null,
  };
};

const openRemoveMfaConfirm = (factorId) => {
  confirmState.value = {
    open: true,
    title: t('settingsMfaRemoveTitle'),
    message: t('settingsMfaRemoveMessage'),
    confirmLabel: t('settingsMfaRemoveConfirm'),
    variant: 'danger',
    action: async () => {
      await auth.unenrollMFA(factorId);
    },
  };
};

const openLogoutAllConfirm = () => {
  confirmState.value = {
    open: true,
    title: t('settingsLogoutAllTitle'),
    message: t('settingsLogoutAllMessage'),
    confirmLabel: t('settingsLogoutAllConfirm'),
    variant: 'danger',
    action: async () => {
      await auth.logoutAllDevices();
      router.push('/login');
    },
  };
};

const runConfirmAction = async () => {
  const fn = confirmState.value.action;
  closeConfirm();
  if (typeof fn === 'function') await fn();
};
</script>

<template>
  <div class="space-y-6">
    <!-- MFA -->
    <article
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <header
        class="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <ShieldCheck class="h-5 w-5" :stroke-width="2.3" />
          </div>

          <div>
            <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
              {{ t('settingsMfaTitle') }}
            </h3>

            <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {{ t('settingsMfaSubtitle') }}
            </p>
          </div>
        </div>
      </header>

      <div class="space-y-4 p-5">
        <div v-if="factors.length > 0" class="space-y-2">
          <div
            v-for="factor in factors"
            :key="factor.id"
            class="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/25"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <Smartphone class="h-4.5 w-4.5" :stroke-width="2.3" />
              </div>

              <div class="min-w-0">
                <p class="truncate text-sm font-black text-slate-950 dark:text-slate-100">
                  {{ factor.friendly_name || 'TOTP' }}
                </p>

                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  {{ factor.status }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 active:scale-[0.98] dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
              @click="openRemoveMfaConfirm(factor.id)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="2" />
              {{ t('settingsMfaRemove') }}
            </button>
          </div>
        </div>

        <button
          v-if="mfaStatus === 'idle'"
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"
          @click="startMFAEnroll"
        >
          <KeyRound class="h-4 w-4" :stroke-width="2.2" />
          {{ t('settingsMfaSetup') }}
        </button>

        <div
          v-if="mfaStatus === 'qr' || mfaStatus === 'verifying'"
          class="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <p class="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            {{ t('settingsMfaScanQr') }}
          </p>

          <div
            class="inline-block overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700"
            v-html="auth.mfaState.qrCode"
          ></div>

          <p class="break-all rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            {{ t('settingsSecretLabel') }} {{ auth.mfaState.secret }}
          </p>

          <input
            v-model="mfaCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            class="premium-input text-center font-mono text-xl tracking-[0.4em]"
            placeholder="000000"
          />

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/70 bg-orange-500 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-400 hover:text-white hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-400/60 dark:bg-orange-500 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-400"
            :disabled="mfaCode.length !== 6 || mfaStatus === 'verifying'"
            @click="verifyMFA"
          >
            <Loader2
              v-if="mfaStatus === 'verifying'"
              class="h-4 w-4 animate-spin"
              :stroke-width="2.2"
            />

            <ShieldCheck
              v-else
              class="h-4 w-4"
              :stroke-width="2.2"
            />

            {{ t('settingsMfaVerify') }}
          </button>

          <p
            v-if="mfaError"
            class="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
          >
            <ShieldAlert class="h-3.5 w-3.5" :stroke-width="2" />
            {{ mfaError }}
          </p>
        </div>

        <p
          v-if="mfaStatus === 'done'"
          class="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
        >
          <CheckCircle2 class="h-4 w-4" :stroke-width="2.2" />
          {{ t('settingsMfaDone') }}
        </p>
      </div>
    </article>

    <!-- Sessions -->
    <article
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
        >
          <LogOut class="h-5 w-5" :stroke-width="2.3" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
              {{ t('settingsActiveSessions') }}
            </h3>

            <span
              class="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
            >
              {{ t('settingsSensitiveAction') }}
            </span>
          </div>

          <p class="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {{ t('settingsSensitiveHint') }}
          </p>

          <button
            type="button"
            class="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-red-700 shadow-sm transition-colors duration-200 hover:border-red-400 hover:bg-red-50 hover:text-red-800 active:scale-[0.98] dark:border-red-900/70 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/25 dark:hover:text-red-200"
            @click="openLogoutAllConfirm"
          >
            <AlertTriangle class="h-4 w-4" :stroke-width="2.2" />
            {{ t('settingsLogoutAllDevices') }}
          </button>
        </div>
      </div>
    </article>

    <ConfirmDialog
      :open="confirmState.open"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-label="confirmState.confirmLabel"
      :variant="confirmState.variant"
      @confirm="runConfirmAction"
      @cancel="closeConfirm"
      @dismiss="closeConfirm"
    />
  </div>
</template>

<style scoped>
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

.dark .premium-input:focus {
  border-color: rgb(249 115 22);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}
</style>
