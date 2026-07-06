import { ref } from 'vue';

export const WORKSPACE_BUDGET_SESSION_KEY = Symbol('siec.workspaceBudgetSession');
const BUDGET_CACHE_STORAGE_KEY = 'siec.workspace.budget';

export function createWorkspaceBudgetSession() {
  return {
    hasGenerated: ref(false),
    desglose: ref([]),
    costoTotal: ref(null),
    fechaPrecios: ref(null),
    error: ref(null),
    disabledCategories: ref(new Set()),
    isLoading: ref(false),
    storeSelections: ref({}),
    tiendaRecomendada: ref(null),
    tiendasConsolidadas: ref([]),
  };
}

export function clearWorkspaceBudgetCache() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(BUDGET_CACHE_STORAGE_KEY);
}

/**
 * Persiste el presupuesto calculado para restaurarlo al volver de Ajustes u otra ruta.
 * @param {string | null | undefined} projectId
 * @param {number} m2Totales
 * @param {number} materialEstructuralId
 * @param {ReturnType<typeof createWorkspaceBudgetSession>} session
 */
export function persistWorkspaceBudgetSession(
  projectId,
  m2Totales,
  materialEstructuralId,
  session,
) {
  if (typeof sessionStorage === 'undefined' || !session?.hasGenerated?.value) return;

  const payload = {
    projectId: projectId || 'local',
    m2Totales,
    materialEstructuralId,
    hasGenerated: true,
    desglose: session.desglose.value,
    costoTotal: session.costoTotal.value,
    fechaPrecios: session.fechaPrecios.value,
    disabledCategories: [...(session.disabledCategories.value || [])],
    storeSelections: session.storeSelections?.value || {},
    tiendaRecomendada: session.tiendaRecomendada?.value || null,
    tiendasConsolidadas: session.tiendasConsolidadas?.value || [],
  };

  try {
    sessionStorage.setItem(BUDGET_CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage lleno o bloqueado — ignorar
  }
}

/**
 * Restaura presupuesto cacheado si coincide proyecto y parámetros base.
 * @returns {boolean} true si se restauró
 */
export function restoreWorkspaceBudgetSession(
  projectId,
  m2Totales,
  materialEstructuralId,
  session,
) {
  if (typeof sessionStorage === 'undefined' || !session) return false;

  try {
    const raw = sessionStorage.getItem(BUDGET_CACHE_STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);
    const cacheProjectId = data.projectId || 'local';
    const activeProjectId = projectId || 'local';

    if (cacheProjectId !== activeProjectId) return false;
    if (Number(data.m2Totales) !== Number(m2Totales)) return false;
    if (Number(data.materialEstructuralId) !== Number(materialEstructuralId)) return false;
    if (!data.hasGenerated || !Array.isArray(data.desglose)) return false;

    session.hasGenerated.value = true;
    session.desglose.value = data.desglose;
    session.costoTotal.value = data.costoTotal ?? null;
    session.fechaPrecios.value = data.fechaPrecios ?? null;
    session.error.value = null;
    session.disabledCategories.value = new Set(data.disabledCategories || []);
    if (session.storeSelections) {
      session.storeSelections.value = data.storeSelections || {};
    }
    if (session.tiendaRecomendada) {
      session.tiendaRecomendada.value = data.tiendaRecomendada || null;
    }
    if (session.tiendasConsolidadas) {
      session.tiendasConsolidadas.value = data.tiendasConsolidadas || [];
    }
    session.isLoading.value = false;

    return true;
  } catch {
    return false;
  }
}

export function resetWorkspaceBudgetSession(session) {
  if (!session) return;
  session.hasGenerated.value = false;
  session.desglose.value = [];
  session.costoTotal.value = null;
  session.fechaPrecios.value = null;
  session.error.value = null;
  session.disabledCategories.value = new Set();
  if (session.storeSelections) {
    session.storeSelections.value = {};
  }
  if (session.tiendaRecomendada) {
    session.tiendaRecomendada.value = null;
  }
  if (session.tiendasConsolidadas) {
    session.tiendasConsolidadas.value = [];
  }
  session.isLoading.value = false;
  clearWorkspaceBudgetCache();
}
