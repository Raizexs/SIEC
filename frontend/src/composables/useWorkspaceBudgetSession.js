import { ref } from 'vue';

export const WORKSPACE_BUDGET_SESSION_KEY = Symbol('siec.workspaceBudgetSession');

export function createWorkspaceBudgetSession() {
  return {
    hasGenerated: ref(false),
    desglose: ref([]),
    costoTotal: ref(null),
    fechaPrecios: ref(null),
    error: ref(null),
    disabledCategories: ref(new Set()),
    isLoading: ref(false),
  };
}

export function resetWorkspaceBudgetSession(session) {
  if (!session) return;
  session.hasGenerated.value = false;
  session.desglose.value = [];
  session.costoTotal.value = null;
  session.fechaPrecios.value = null;
  session.error.value = null;
  session.disabledCategories.value = new Set();
  session.isLoading.value = false;
}
