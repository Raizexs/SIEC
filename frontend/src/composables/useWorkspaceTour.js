import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/driver-tour-overrides.css';
import { bindCardHover } from './useMotionContext';
import { prefersReducedMotion } from '../design/motionTokens';

const DRIVER_CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const patchDriverCloseButton = (popover) => {
  const closeBtn = popover?.closeButton;
  if (!closeBtn) return;
  closeBtn.innerHTML = DRIVER_CLOSE_ICON;
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.userSelect = 'none';
};

let activeTourDriver = null;
let unbindTourHover = null;

const bindTourPopoverHover = (popover) => {
  unbindTourHover?.();
  if (prefersReducedMotion()) return;

  const targets = [];
  if (popover?.closeButton) targets.push(popover.closeButton);
  popover?.footer?.querySelectorAll?.('button')?.forEach((btn) => targets.push(btn));

  if (!targets.length) return;
  unbindTourHover = bindCardHover(targets, { lift: -2 });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSelector = (selector, timeoutMs = 4000) =>
  new Promise((resolve) => {
    if (!selector) {
      resolve(null);
      return;
    }

    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const scrollWorkspaceIntoView = (selector) => {
  const el = selector ? document.querySelector(selector) : null;
  const scrollRoot = document.querySelector('[data-workspace-scroll]');
  if (!el || !scrollRoot) return;

  const rootRect = scrollRoot.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const offset = elRect.top - rootRect.top - 24;

  if (Math.abs(offset) > 8) {
    scrollRoot.scrollBy({ top: offset, behavior: 'auto' });
  }
};

const isElementVisible = (el) => {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 4 && rect.height > 4;
};

const expandSidebarIfCollapsed = (expandLabel) => {
  if (!expandLabel) return false;
  const buttons = document.querySelectorAll('button[aria-label]');
  for (const btn of buttons) {
    if (btn.getAttribute('aria-label') === expandLabel) {
      btn.click();
      return true;
    }
  }
  return false;
};

/**
 * Recorrido guiado del workspace (driver.js).
 * Prepara el paso del workspace ANTES de mover el highlight (driver no espera hooks async).
 */
export function startWorkspaceTour({ t, prepareTutorialStep }) {
  if (activeTourDriver?.isActive?.()) {
    activeTourDriver.destroy();
    activeTourDriver = null;
  }

  const prefersReducedMotionLocal = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const stepMeta = [
    {},
    { selector: '.tour-workspace-stepper' },
    { selector: '.tour-sidebar-presets', expandSidebar: true },
    { selector: '.tour-config-panel', workspaceStep: 'configure' },
    { selector: '.tour-metrics-bar', workspaceStep: 'design' },
    { selector: '.tour-editor-2d-toolbar', workspaceStep: 'design' },
    { selector: '.tour-editor-2d-actions', workspaceStep: 'design' },
    { selector: '.tour-editor-2d', workspaceStep: 'design' },
    { selector: '.tour-scene-3d-tools', workspaceStep: 'design' },
    { selector: '.tour-scene-3d-actions', workspaceStep: 'design' },
    { selector: '.tour-budget-step', workspaceStep: 'budget' },
    { selector: '.tour-export-step', workspaceStep: 'budget' },
    {},
  ];

  const prepareForIndex = async (index) => {
    const meta = stepMeta[index] || {};

    if (meta.expandSidebar) {
      const expanded = expandSidebarIfCollapsed(t('expandPanel'));
      if (expanded) await delay(340);
    }

    if (meta.workspaceStep) {
      await prepareTutorialStep(meta.workspaceStep);
    }

    if (meta.selector) {
      const el = await waitForSelector(meta.selector);
      if (!el || !isElementVisible(el)) return false;
      scrollWorkspaceIntoView(meta.selector);
      await delay(80);
    }

    return true;
  };

  const baseSteps = [
    {
      popover: {
        title: t('tourWelcomeTitle'),
        description: t('tourWelcomeDesc'),
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '.tour-workspace-stepper',
      popover: {
        title: t('tourStepperTitle'),
        description: t('tourStepperDesc'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.tour-sidebar-presets',
      popover: {
        title: t('tourSidebarPresetsTitle'),
        description: t('tourSidebarPresetsDesc'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.tour-config-panel',
      popover: {
        title: t('tourConfigureTitle'),
        description: t('tourConfigureDesc'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '.tour-metrics-bar',
      popover: {
        title: t('tourMetricsTitle'),
        description: t('tourMetricsDesc'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.tour-editor-2d-toolbar',
      popover: {
        title: t('tourEditorToolsTitle'),
        description: t('tourEditorToolsDesc'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.tour-editor-2d-actions',
      popover: {
        title: t('tourEditorActionsTitle'),
        description: t('tourEditorActionsDesc'),
        side: 'left',
        align: 'center',
      },
    },
    {
      element: '.tour-editor-2d',
      popover: {
        title: t('tourEditorCanvasTitle'),
        description: t('tourEditorCanvasDesc'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '.tour-scene-3d-tools',
      popover: {
        title: t('tourSceneToolsTitle'),
        description: t('tourSceneToolsDesc'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.tour-scene-3d-actions',
      popover: {
        title: t('tourSceneActionsTitle'),
        description: t('tourSceneActionsDesc'),
        side: 'left',
        align: 'center',
      },
    },
    {
      element: '.tour-budget-step',
      popover: {
        title: t('tourBudgetTitle'),
        description: t('tourBudgetDesc'),
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '.tour-export-step',
      popover: {
        title: t('tourExportTitle'),
        description: t('tourExportDesc'),
        side: 'top',
        align: 'start',
      },
    },
    {
      popover: {
        title: t('tourDoneTitle'),
        description: t('tourDoneDesc'),
        side: 'over',
        align: 'center',
      },
    },
  ];

  let driverRef = null;

  const goToStep = async (targetIndex) => {
    if (!driverRef) return;
    const steps = baseSteps.length;
    if (targetIndex < 0 || targetIndex >= steps) return;

    const ready = await prepareForIndex(targetIndex);
    if (!ready && stepMeta[targetIndex]?.selector) {
      // Si el target no existe (p. ej. vista solo 2D), saltar al siguiente válido
      const next = targetIndex + 1;
      if (next < steps) return goToStep(next);
      driverRef.destroy();
      return;
    }

    driverRef.moveTo(targetIndex);
    requestAnimationFrame(() => driverRef.refresh());
  };

  const steps = baseSteps.map((step, index) => {
    const isFirst = index === 0;
    const isLast = index === baseSteps.length - 1;

    return {
      ...step,
      popover: {
        ...step.popover,
        onNextClick: (_el, _step, { driver: d }) => {
          if (isLast) {
            d.destroy();
            return;
          }
          void goToStep(index + 1);
        },
        onPrevClick: isFirst
          ? undefined
          : (_el, _step, { driver: d }) => {
              void goToStep(index - 1);
            },
      },
    };
  });

  driverRef = driver({
    showProgress: true,
    animate: !prefersReducedMotionLocal,
    smoothScroll: false,
    allowClose: true,
    overlayOpacity: 0.5,
    overlayColor: '#020617',
    stagePadding: 14,
    stageRadius: 20,
    popoverOffset: 14,
    popoverClass: 'siec-driver-theme',
    disableActiveInteraction: true,
    allowKeyboardControl: true,
    nextBtnText: t('tourBtnNext'),
    prevBtnText: t('tourBtnPrev'),
    doneBtnText: t('tourBtnDone'),
    progressText: t('tourProgressText'),
    onPopoverRender: (popover) => {
      patchDriverCloseButton(popover);
      bindTourPopoverHover(popover);
    },
    steps,
    onDestroyed: () => {
      unbindTourHover?.();
      unbindTourHover = null;
      activeTourDriver = null;
      void prepareTutorialStep('design');
    },
  });

  activeTourDriver = driverRef;
  driverRef.drive(0);
  return driverRef;
}
