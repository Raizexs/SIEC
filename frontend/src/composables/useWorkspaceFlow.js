import { ref, computed } from 'vue';

/** @typedef {'configure' | 'design' | 'budget'} WorkspaceStepId */

export const WORKSPACE_STEPS = [
  {
    id: 'configure',
    labelKey: 'wsStepConfigure',
    order: 1,
    tone: 'sky',
    icon: 'terrain',
  },
  {
    id: 'design',
    labelKey: 'wsStepDesign',
    order: 2,
    tone: 'amber',
    icon: 'design',
  },
  {
    id: 'budget',
    labelKey: 'wsStepBudget',
    order: 3,
    tone: 'emerald',
    icon: 'budget',
  },
];

const FLOW_DISMISS_KEY = 'siec.flowguide.dismissed';

/**
 * Flujo del workspace: diseño = solo 2D+3D; presupuesto = vista dedicada (sin lienzo).
 */
export function useWorkspaceFlow({ recintosCount, hasBudget, selectedM2 }) {
  const currentStep = ref(/** @type {WorkspaceStepId} */ ('configure'));

  const suggestedStep = computed(() => {
    if (hasBudget.value) return 'budget';
    if (recintosCount.value > 0) return 'design';
    return 'configure';
  });

  const resetToConfigure = () => {
    currentStep.value = 'configure';
  };

  const goToStep = (stepId) => {
    currentStep.value = stepId;
  };

  const nextStep = () => {
    const idx = WORKSPACE_STEPS.findIndex((s) => s.id === currentStep.value);
    if (idx < WORKSPACE_STEPS.length - 1) {
      goToStep(WORKSPACE_STEPS[idx + 1].id);
    }
  };

  const prevStep = () => {
    const idx = WORKSPACE_STEPS.findIndex((s) => s.id === currentStep.value);
    if (idx > 0) {
      goToStep(WORKSPACE_STEPS[idx - 1].id);
    }
  };

  const isFlowGuideDismissed = () => {
    try {
      return sessionStorage.getItem(FLOW_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  };

  const dismissFlowGuide = () => {
    try {
      sessionStorage.setItem(FLOW_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const showConfigure = computed(() => currentStep.value === 'configure');
  const showDesignStep = computed(() => currentStep.value === 'design');
  const showBudgetStep = computed(() => currentStep.value === 'budget');

  const showMetricsBar = computed(() => currentStep.value === 'design');

  return {
    currentStep,
    suggestedStep,
    resetToConfigure,
    goToStep,
    nextStep,
    prevStep,
    showConfigure,
    showDesignStep,
    showBudgetStep,
    showMetricsBar,
    isFlowGuideDismissed,
    dismissFlowGuide,
    WORKSPACE_STEPS,
  };
}
