<script setup>
import logger from '../utils/logger.js';
/**
 * ShareDialog — invite collaborators by email + manage public share link.
 *
 * Premium language:
 * - Modal claro/oscuro consistente.
 * - Slate/orange visual system.
 * - Public link flow with clear states.
 * - Collaborators rendered as audit-friendly cards.
 */

import { ref, onMounted, watch, computed, toRef } from 'vue';
import { useProjectsApi } from '../composables/useProjectsApi';
import { usePrivacy } from '../composables/usePrivacy';
import { useMotionModal } from '../composables/useMotionModal';
import ConsentModal from './privacy/ConsentModal.vue';
import { toast } from 'vue-sonner';

const props = defineProps({
  show: { type: Boolean, default: false },
  projectId: { type: String, required: true },
});

const emit = defineEmits(['close']);

const api = useProjectsApi();
const { fetchPolicy, grantConsent, hasConsent } = usePrivacy();

const collaborators = ref([]);
const inviteEmail = ref('');
const inviteRole = ref('viewer');
const expiresInDays = ref(7);
const hideCliente = ref(true);
const shareLink = ref(null);
const isLoading = ref(false);
const isCopying = ref(false);
const showShareConsent = ref(false);
const policyVersion = ref('1.0');
const backdropRef = ref(null);
const panelRef = ref(null);

useMotionModal(toRef(props, 'show'), {
  backdropRef,
  panelRef,
  staggerItems: true,
});

const canInvite = computed(() => inviteEmail.value.trim().length > 0);

const selectedExpirationLabel = computed(() => {
  const days = Number(expiresInDays.value);

  if (days === 1) return '1 día';
  return `${days} días`;
});

const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const load = async () => {
  if (!props.projectId || props.projectId === 'local') return;

  try {
    collaborators.value = await api.listCollaborators(props.projectId);
  } catch (e) {
    logger.warn('No se pudieron cargar colaboradores:', e);
  }
};

const copyShareLink = async () => {
  if (!shareLink.value || !navigator.clipboard) return;

  isCopying.value = true;

  try {
    await navigator.clipboard.writeText(shareLink.value);
    toast.success('Enlace copiado al portapapeles');
  } catch (e) {
    toast.error('No se pudo copiar el enlace');
  } finally {
    isCopying.value = false;
  }
};

const generateShareLink = async () => {
  if (!props.projectId || props.projectId === 'local') {
    toast.error('No puedes generar enlaces para un proyecto local.');
    return;
  }

  const consented = await hasConsent('public_share').catch(() => false);
  if (!consented) {
    showShareConsent.value = true;
    return;
  }

  await doGenerateShareLink();
};

const doGenerateShareLink = async () => {
  isLoading.value = true;

  try {
    const res = await api.createShareLink(props.projectId, {
      expires_in_days: Math.min(expiresInDays.value, 90),
      hide_cliente: hideCliente.value,
    });

    shareLink.value = `${window.location.origin}${res.public_url_path}`;

    await copyShareLink();

    toast.success('Enlace generado correctamente');
  } catch (e) {
    toast.error(`Error: ${e.message}`);
  } finally {
    isLoading.value = false;
  }
};

const onShareConsentConfirm = async () => {
  try {
    await grantConsent('public_share', policyVersion.value);
    showShareConsent.value = false;
    await doGenerateShareLink();
  } catch (e) {
    toast.error(e.message || 'No se pudo registrar el consentimiento');
  }
};

const revokeLink = async () => {
  try {
    await api.revokeShareLink(props.projectId);
    shareLink.value = null;
    toast.success('Enlace revocado');
  } catch (e) {
    toast.error(`Error: ${e.message}`);
  }
};

watch(
  () => props.show,
  (value) => {
    if (value) load();
  },
);

onMounted(async () => {
  load();
  try {
    const policy = await fetchPolicy();
    policyVersion.value = policy.version;
  } catch {
    policyVersion.value = '1.0';
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="backdropRef"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md dark:bg-black/60 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
      @click.self="emit('close')"
    >
      <section
        ref="panelRef"
        class="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-black/40"
      >
            <!-- Top accent -->
            <div class="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-slate-900 dark:to-orange-300"></div>

            <!-- Header -->
            <header
              class="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800/80 dark:bg-slate-900/60 sm:px-6"
            >
              <div class="flex min-w-0 items-start gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                >
                  <span class="material-symbols-outlined text-[25px]">
                    share
                  </span>
                </div>

                <div class="min-w-0">
                  <p
                    class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                  >
                    Colaboración
                  </p>

                  <h2
                    id="share-dialog-title"
                    class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100"
                  >
                    Compartir proyecto
                  </h2>

                  <p class="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    Gestiona acceso temporal, colaboradores e invitaciones del proyecto actual.
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-95 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                aria-label="Cerrar diálogo de compartir"
                @click="emit('close')"
              >
                <span
                  class="material-symbols-outlined text-[21px] transition-transform duration-200 group-hover:rotate-90"
                >
                  close
                </span>
              </button>
            </header>

            <!-- Body -->
            <div class="space-y-5 px-5 py-5 sm:px-6">
              <!-- Invite by email -->
              <section
                class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div class="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3
                      class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Invitar por email
                    </h3>

                    <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      El invitado debe tener cuenta en SIEC para acceder al proyecto.
                    </p>
                  </div>

                  <span
                    class="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-300"
                  >
                    Pendiente
                  </span>
                </div>

                <div class="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500"
                    >
                      <span class="material-symbols-outlined text-[19px]">
                        alternate_email
                      </span>
                    </div>

                    <input
                      v-model="inviteEmail"
                      type="email"
                      placeholder="colaborador@empresa.com"
                      autocomplete="email"
                      class="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
                    />
                  </div>

                  <select
                    v-model="inviteRole"
                    class="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
                  >
                    <option value="viewer">Lector</option>
                    <option value="editor">Editor</option>
                  </select>

                  <button
                    type="button"
                    disabled
                    class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-300 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600"
                    :class="{ 'opacity-80': canInvite }"
                    title="Conecta endpoint de invitación para habilitar esta acción"
                  >
                    Invitar
                  </button>
                </div>
              </section>

              <!-- Public temporary link -->
              <section
                class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div class="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3
                      class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Enlace público temporal
                    </h3>

                    <p class="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      Genera un enlace de acceso con vencimiento automático. Puede exponer datos del
                      proyecto (cliente, ubicación) a quien tenga el enlace.
                    </p>
                  </div>

                  <span
                    v-if="shareLink"
                    class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300"
                  >
                    Activo
                  </span>
                </div>

                <div v-if="!shareLink" class="space-y-3">
                  <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <input v-model="hideCliente" type="checkbox" class="rounded border-slate-300" />
                    Ocultar nombre de cliente en la vista pública
                  </label>
                  <div class="grid gap-2 sm:grid-cols-[9rem_1fr]">
                  <select
                    v-model.number="expiresInDays"
                    class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition-all duration-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:ring-orange-500/15"
                  >
                    <option :value="1">1 día</option>
                    <option :value="7">7 días</option>
                    <option :value="30">30 días</option>
                    <option :value="90">90 días</option>
                  </select>

                  <button
                    type="button"
                    class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-950 bg-slate-950 px-5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/20 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    :disabled="isLoading"
                    @click="generateShareLink"
                  >
                    <span
                      v-if="isLoading"
                      class="material-symbols-outlined animate-spin text-[17px]"
                    >
                      progress_activity
                    </span>

                    <span
                      v-else
                      class="material-symbols-outlined text-[17px]"
                    >
                      link
                    </span>

                    Generar enlace · {{ selectedExpirationLabel }}
                  </button>
                </div>
                </div>

                <div v-else class="space-y-3">
                  <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      :value="shareLink"
                      readonly
                      class="h-12 min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 font-mono text-xs font-semibold text-emerald-800 outline-none dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-200"
                    />

                    <button
                      type="button"
                      class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                      @click="copyShareLink"
                    >
                      <span
                        class="material-symbols-outlined text-[17px]"
                        :class="isCopying ? 'animate-pulse' : ''"
                      >
                        content_copy
                      </span>
                      Copiar
                    </button>
                  </div>

                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-transparent px-2 py-1.5 text-xs font-bold text-red-600 transition-colors duration-200 hover:border-red-200 hover:bg-red-50 dark:text-red-300 dark:hover:border-red-900/70 dark:hover:bg-red-950/30"
                    @click="revokeLink"
                  >
                    <span class="material-symbols-outlined text-[15px]">
                      link_off
                    </span>
                    Revocar enlace
                  </button>
                </div>
              </section>

              <!-- Collaborators -->
              <section
                class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3
                      class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
                    >
                      Colaboradores
                    </h3>

                    <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Usuarios con acceso registrado a este proyecto.
                    </p>
                  </div>

                  <span
                    class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                  >
                    {{ collaborators.length }}
                  </span>
                </div>

                <div
                  v-if="collaborators.length === 0"
                  class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-950/50"
                >
                  <div
                    class="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
                  >
                    <span class="material-symbols-outlined text-[23px]">
                      group
                    </span>
                  </div>

                  <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Sin colaboradores aún
                  </p>

                  <p class="mt-1 max-w-sm text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                    Los usuarios invitados o con permisos aparecerán en esta lista.
                  </p>
                </div>

                <ul v-else class="space-y-2">
                  <li
                    v-for="collaborator in collaborators"
                    :key="collaborator.usuario_id"
                    data-motion="item"
                    class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {{ collaborator.usuario_id.slice(0, 2) }}
                      </div>

                      <div class="min-w-0">
                        <p class="truncate text-xs font-black text-slate-900 dark:text-slate-100">
                          {{ collaborator.usuario_id.slice(0, 8) }}…
                        </p>

                        <p class="mt-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">
                          {{ formatDate(collaborator.invited_at) }}
                        </p>
                      </div>
                    </div>

                    <span
                      class="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                    >
                      {{ collaborator.rol }}
                    </span>
                  </li>
                </ul>
              </section>
            </div>

            <!-- Footer -->
            <footer
              class="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 sm:px-6"
            >
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
                Revisa los permisos antes de compartir enlaces fuera del equipo.
              </p>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                @click="emit('close')"
              >
                Cerrar
              </button>
            </footer>
          </section>
    </div>
  </Teleport>

  <ConsentModal
    :show="showShareConsent"
    title="Compartir proyecto públicamente"
    description="Cualquier persona con el enlace podrá ver información del proyecto hasta su vencimiento. No se incluyen tus datos de contacto."
    consent-type="public_share"
    :policy-version="policyVersion"
    @confirm="onShareConsentConfirm"
    @cancel="showShareConsent = false"
    @close="showShareConsent = false"
  />
</template>