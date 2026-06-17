<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { usePrivacy } from '../../composables/usePrivacy';
import { useAuthStore } from '../../stores/auth';
import { runReveal, bindCardHover } from '../../composables/useMotionContext';
import { toast } from 'vue-sonner';
import {
  Shield,
  Download,
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
  Scale,
  ScrollText,
  Mail,
  CheckCircle2,
  CircleDashed,
  ChevronRight,
} from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();
const {
  fetchConsentStatus,
  exportMyData,
  requestAccountDeletion,
  confirmAccountDeletion,
} = usePrivacy();

const consents = ref([]);
const loadingConsents = ref(false);
const exporting = ref(false);
const deleting = ref(false);
const deleteToken = ref('');
const deleteStep = ref('idle');
const deleteConfirmText = ref('');

const legalDocsRef = ref(null);
let legalDocsCtx = null;
let unbindLegalHover = null;

const DPO_EMAIL = 'privacidad@siec.app';

const activeConsentsCount = computed(
  () => consents.value.filter((c) => c.has_active_consent).length,
);

const canRequestDeletion = computed(
  () => deleteConfirmText.value.toUpperCase() === 'ELIMINAR',
);

const exportFileName = computed(() => {
  const id = auth.user?.id || auth.profile?.id || 'usuario';
  const date = new Date().toISOString().slice(0, 10);
  return `siec-datos-${id}-${date}.json`;
});

const onDeleteConfirmInput = (event) => {
  deleteConfirmText.value = event.target.value.toUpperCase().slice(0, 8);
};

const loadConsents = async () => {
  loadingConsents.value = true;
  try {
    consents.value = await fetchConsentStatus(true);
  } catch (e) {
    toast.error(e.message || 'No se pudieron cargar los consentimientos');
  } finally {
    loadingConsents.value = false;
  }
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const data = await exportMyData();
    if (!data || typeof data !== 'object') {
      throw new Error('La respuesta del servidor no es válida');
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFileName.value;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado correctamente');
  } catch (e) {
    toast.error(e.message || 'Error al exportar datos');
  } finally {
    exporting.value = false;
  }
};

const handleDeleteRequest = async () => {
  if (!canRequestDeletion.value) return;
  deleting.value = true;
  try {
    const res = await requestAccountDeletion();
    deleteToken.value = res.token;
    deleteStep.value = 'requested';
    toast.message('Solicitud registrada. Confirma la eliminación definitiva.');
  } catch (e) {
    toast.error(e.message || 'Error al solicitar eliminación');
  } finally {
    deleting.value = false;
  }
};

const handleDeleteConfirm = async () => {
  if (!deleteToken.value) return;
  deleting.value = true;
  try {
    await confirmAccountDeletion(deleteToken.value);
    toast.success('Cuenta eliminada');
    await auth.logout();
    router.replace('/login');
  } catch (e) {
    toast.error(e.message || 'Error al eliminar la cuenta');
  } finally {
    deleting.value = false;
  }
};

const formatConsentType = (type) => {
  const labels = {
    privacy_policy: 'Política de privacidad',
    terms: 'Términos de servicio',
    siecplace_publish: 'Publicar en SIEC Place',
    siecplace_contact_share: 'Compartir contacto (marketplace)',
    public_share: 'Enlaces públicos de proyecto',
  };
  return labels[type] || type;
};

const animateLegalDocuments = async () => {
  await nextTick();
  if (!legalDocsRef.value) return;

  legalDocsCtx?.revert();
  unbindLegalHover?.();

  legalDocsCtx = gsap.context(() => {
    runReveal(legalDocsRef.value, {
      selector: '[data-legal-motion]',
      pace: 'snappy',
      levels: ['hero', 'card'],
    });
    unbindLegalHover = bindCardHover(
      legalDocsRef.value.querySelectorAll('[data-legal-motion="card"]'),
    );
  }, legalDocsRef.value);
};

const onSettingsTabRevealed = (event) => {
  if (event.detail?.tab === 'privacy') animateLegalDocuments();
};

onMounted(() => {
  loadConsents();
  animateLegalDocuments();
  window.addEventListener('siec:settings-tab-revealed', onSettingsTabRevealed);
});

onUnmounted(() => {
  window.removeEventListener('siec:settings-tab-revealed', onSettingsTabRevealed);
  unbindLegalHover?.();
  legalDocsCtx?.revert();
});
</script>

<template>
  <div class="space-y-8">
    <!-- Privacidad y datos personales -->
    <article
      data-motion="section"
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <header
        class="border-b border-slate-200/80 bg-slate-50/80 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <Shield class="h-5 w-5" :stroke-width="2.3" />
          </div>

          <div class="min-w-0 flex-1">
            <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
              Privacidad y datos personales
            </h3>

            <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Ejerce tus derechos conforme a la Ley 21.719. Puedes acceder, rectificar,
              exportar o solicitar la eliminación de tu información en cualquier momento.
            </p>
          </div>
        </div>
      </header>

      <div class="space-y-6 p-6">
        <div
          class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800/80 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
            >
              <Mail class="h-4 w-4" :stroke-width="2.2" />
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Encargado de protección de datos
              </p>
              <a
                :href="`mailto:${DPO_EMAIL}`"
                class="mt-1 inline-block text-sm font-bold text-orange-600 transition-colors hover:text-orange-500 dark:text-orange-300 dark:hover:text-orange-200"
              >
                {{ DPO_EMAIL }}
              </a>
            </div>
          </div>
        </div>

        <div
          ref="legalDocsRef"
          class="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-900/35"
        >
          <p
            data-legal-motion="label"
            class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
          >
            Documentos legales
          </p>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <router-link
              to="/legal/privacidad"
              data-legal-motion="card"
              class="group relative flex h-full min-h-[9rem] items-start gap-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-orange-300/70 hover:shadow-lg hover:shadow-orange-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/25 dark:hover:border-orange-900/55 dark:hover:shadow-orange-950/20"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-orange-500/[0.07]"
              />

              <div
                data-legal-motion="icon"
                class="relative flex h-11 w-11 shrink-0 origin-center items-center justify-center rounded-2xl border border-orange-200/90 bg-orange-50 text-orange-600 shadow-sm dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <ScrollText class="h-5 w-5" :stroke-width="2.2" />
              </div>

              <div class="relative min-w-0 flex-1 pr-5">
                <p class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                  Política de privacidad
                </p>
                <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  Finalidades del tratamiento, plazos de retención y transferencias internacionales.
                </p>
              </div>

              <ChevronRight
                data-legal-motion="chevron"
                class="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 opacity-70 transition-colors group-hover:text-orange-400 dark:text-slate-600 dark:group-hover:text-orange-300"
                :stroke-width="2.5"
              />
            </router-link>

            <router-link
              to="/legal/terminos"
              data-legal-motion="card"
              class="group relative flex h-full min-h-[9rem] items-start gap-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-slate-400/80 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:border-slate-800/90 dark:bg-slate-950/90 dark:shadow-black/25 dark:hover:border-slate-600/70 dark:hover:shadow-black/30"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-500/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-slate-400/[0.06]"
              />

              <div
                data-legal-motion="icon"
                class="relative flex h-11 w-11 shrink-0 origin-center items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50 text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200"
              >
                <Scale class="h-5 w-5" :stroke-width="2.2" />
              </div>

              <div class="relative min-w-0 flex-1 pr-5">
                <p class="text-sm font-black tracking-tight text-slate-950 dark:text-slate-100">
                  Términos de servicio
                </p>
                <p class="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  Condiciones de uso de SIEC y SIEC Place.
                </p>
              </div>

              <ChevronRight
                data-legal-motion="chevron"
                class="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 opacity-70 transition-colors group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300"
                :stroke-width="2.5"
              />
            </router-link>
          </div>
        </div>
      </div>
    </article>

    <!-- Consentimientos -->
    <article
      data-motion="section"
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <header
        class="border-b border-slate-200/80 bg-slate-50/80 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
              Consentimientos
            </h3>
            <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Registro de las finalidades que has autorizado. Puedes rectificar datos de cliente
              y ubicación editando cada proyecto en el workspace.
            </p>
          </div>

          <span
            v-if="!loadingConsents"
            class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
          >
            {{ activeConsentsCount }} / {{ consents.length }} activos
          </span>
        </div>
      </header>

      <div class="p-6">
        <div
          v-if="loadingConsents"
          class="flex items-center justify-center gap-2 py-10 text-sm font-medium text-slate-500"
        >
          <Loader2 class="h-4 w-4 animate-spin" />
          Cargando consentimientos…
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="item in consents"
            :key="item.consent_type"
            class="flex items-center justify-between gap-4 rounded-2xl border px-4 py-4 transition-colors"
            :class="
              item.has_active_consent
                ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                : 'border-slate-200/80 bg-slate-50/40 dark:border-slate-800/80 dark:bg-slate-900/30'
            "
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm"
                :class="
                  item.has_active_consent
                    ? 'border-emerald-200 bg-white text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500'
                "
              >
                <FileText class="h-4 w-4" :stroke-width="2.2" />
              </div>

              <div class="min-w-0">
                <p class="truncate text-sm font-black text-slate-950 dark:text-slate-100">
                  {{ formatConsentType(item.consent_type) }}
                </p>
                <p
                  v-if="item.granted_at"
                  class="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
                >
                  {{ new Date(item.granted_at).toLocaleDateString('es-CL') }}
                </p>
              </div>
            </div>

            <span
              class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight"
              :class="
                item.has_active_consent
                  ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500'
              "
            >
              <CheckCircle2 v-if="item.has_active_consent" class="h-3 w-3" />
              <CircleDashed v-else class="h-3 w-3" />
              {{ item.has_active_consent ? `v${item.policy_version}` : 'No activo' }}
            </span>
          </li>
        </ul>
      </div>
    </article>

    <!-- Portabilidad -->
    <article
      data-motion="section"
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <Download class="h-5 w-5" :stroke-width="2.3" />
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
            Portabilidad de datos
          </h3>

          <p class="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Descarga una copia legible de tu perfil, proyectos, consentimientos y actividad
            reciente en formato JSON, conforme a tu derecho de portabilidad.
          </p>

          <button
            type="button"
            class="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] disabled:translate-y-0 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
            :disabled="exporting"
            @click="handleExport"
          >
            <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" :stroke-width="2.2" />
            <Download v-else class="h-4 w-4" :stroke-width="2.2" />
            {{ exporting ? 'Generando archivo…' : 'Descargar mis datos' }}
          </button>
        </div>
      </div>
    </article>

    <!-- Eliminar cuenta — estilo sesiones activas -->
    <article
      data-motion="section"
      class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/85 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/30"
    >
      <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
        >
          <Trash2 class="h-5 w-5" :stroke-width="2.3" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">
              Eliminar cuenta
            </h3>

            <span
              class="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-red-700 dark:border-red-900/70 dark:bg-red-950/25 dark:text-red-300"
            >
              Acción sensible
            </span>
          </div>

          <p class="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Se borrarán permanentemente tu perfil, proyectos, publicaciones en SIEC Place,
            consentimientos y suscripciones asociadas. Esta acción no se puede deshacer.
          </p>

          <template v-if="deleteStep === 'idle'">
            <label class="mt-5 block max-w-sm">
              <span class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Escribe la palabra "ELIMINAR"
              </span>
              <input
                :value="deleteConfirmText"
                type="text"
                maxlength="8"
                autocomplete="off"
                spellcheck="false"
                class="premium-input mt-2 font-mono uppercase tracking-[0.2em]"
                @input="onDeleteConfirmInput"
              />
            </label>

            <button
              type="button"
              class="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-red-700 shadow-sm transition-colors duration-200 hover:border-red-400 hover:bg-red-50 hover:text-red-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/70 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/25 dark:hover:text-red-200"
              :disabled="!canRequestDeletion || deleting"
              @click="handleDeleteRequest"
            >
              <AlertTriangle class="h-4 w-4" :stroke-width="2.2" />
              {{ deleting ? 'Procesando…' : 'Solicitar eliminación' }}
            </button>
          </template>

          <template v-else-if="deleteStep === 'requested'">
            <p
              class="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200"
            >
              <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" :stroke-width="2.2" />
              Último paso: confirma la eliminación definitiva de tu cuenta y todos tus datos.
            </p>

            <button
              type="button"
              class="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-red-700 shadow-sm transition-colors duration-200 hover:border-red-400 hover:bg-red-50 hover:text-red-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/70 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/25 dark:hover:text-red-200"
              :disabled="deleting"
              @click="handleDeleteConfirm"
            >
              <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" :stroke-width="2.2" />
              <Trash2 v-else class="h-4 w-4" :stroke-width="2.2" />
              {{ deleting ? 'Eliminando…' : 'Eliminar mi cuenta definitivamente' }}
            </button>
          </template>
        </div>
      </div>
    </article>
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
