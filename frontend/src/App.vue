<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue';
import { Toaster } from 'vue-sonner';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { useAuthStore } from './stores/auth';
import { useTheme } from './composables/useTheme';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import { motionTokens, prefersReducedMotion } from './design/motionTokens';
import CommandPalette from './components/CommandPalette.vue';
import KeyboardShortcuts from './components/KeyboardShortcuts.vue';

const router = useRouter();
const auth = useAuthStore();
const theme = useTheme();
const showShortcuts = ref(false);

useKeyboardShortcuts({
  help: () => (showShortcuts.value = true),
  gotoDashboard: () => router.push('/dashboard'),
  gotoWorkspace: () => router.push('/workspace'),
  gotoSettings: () => router.push('/settings'),
  saveVersion: () => window.dispatchEvent(new CustomEvent('siec:save-version')),
  fullscreen: () => window.dispatchEvent(new CustomEvent('siec:fullscreen')),
  measure: () => window.dispatchEvent(new CustomEvent('siec:tool', { detail: 'measure' })),
  walkthrough: () => window.dispatchEvent(new CustomEvent('siec:walkthrough')),
});

const onShowShortcutsEvent = () => (showShortcuts.value = true);

const onGlobalKeyDown = (event) => {
  if (event.key !== 'Escape') return;
  if (showShortcuts.value) {
    showShortcuts.value = false;
    event.preventDefault();
    return;
  }
  window.dispatchEvent(new CustomEvent('siec:cancel'));
};

onMounted(async () => {
  theme.apply(false);
  window.addEventListener('siec:show-shortcuts', onShowShortcutsEvent);
  window.addEventListener('keydown', onGlobalKeyDown);
  await auth.initializeAuth();
});

onBeforeUnmount(() => {
  window.removeEventListener('siec:show-shortcuts', onShowShortcutsEvent);
  window.removeEventListener('keydown', onGlobalKeyDown);
});

/** Vue transition hooks must always call done(); out-in + GSAP can otherwise leave a permanent blank. */
const onceDone = (done) => {
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    done();
  };
};

/** Login, callback, reset, onboarding: sin fade del RouterView (no compite con GSAP del layout). */
const isBareAuthShell = (el) => el?.getAttribute?.('data-siec-bare-route') === 'true';

/** Editor 3D: micro-entrada rápida (antes sin animación + sensación de “lag” al montar Three). */
const isWorkspaceShell = (el) => el?.getAttribute?.('data-siec-workspace-shell') != null;

const WORKSPACE_ENTER_S = 0.2;

/**
 * Entrada de ruta en un solo `fromTo` (sin `beforeEnter` previo).
 * Evita dejar el root en autoAlpha 0 mientras useProMotion anima hijos — eso dejaba dashboard/settings en blanco.
 */
const enter = (el, done) => {
  const finish = onceDone(done);
  nextTick(() => {
    if (prefersReducedMotion()) {
      gsap.killTweensOf(el);
      gsap.set(el, { autoAlpha: 1, y: 0, clearProps: "transform,opacity" });
      finish();
      return;
    }
    if (isWorkspaceShell(el)) {
      gsap.killTweensOf(el);
      gsap.set(el, { autoAlpha: 1, transformOrigin: "50% 0%" });
      gsap.fromTo(
        el,
        { y: 12, opacity: 0.97 },
        {
          y: 0,
          opacity: 1,
          duration: WORKSPACE_ENTER_S,
          ease: motionTokens.ease.standardOut,
          clearProps: "transform",
          onComplete: finish,
        },
      );
      return;
    }
    if (isBareAuthShell(el)) {
      gsap.killTweensOf(el);
      gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'transform,opacity' });
      finish();
      return;
    }
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: motionTokens.distance.sm },
      {
        autoAlpha: 1,
        y: 0,
        duration: motionTokens.duration.base,
        ease: motionTokens.ease.entrance,
        onComplete: finish,
      },
    );
  });
};

const leave = (el, done) => {
  const finish = onceDone(done);
  if (prefersReducedMotion()) {
    finish();
    return;
  }
  if (isWorkspaceShell(el)) {
    finish();
    return;
  }
  if (isBareAuthShell(el)) {
    finish();
    return;
  }
  gsap.killTweensOf(el);
  gsap.to(el, {
    autoAlpha: 0,
    y: -motionTokens.distance.xs,
    duration: motionTokens.duration.fast,
    ease: motionTokens.ease.standardInOut,
    onComplete: finish,
  });
};

</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition @enter="enter" @leave="leave">
      <component :is="Component" :key="$route.fullPath" />
    </transition>
  </RouterView>
  <CommandPalette />
  <KeyboardShortcuts :show="showShortcuts" @close="showShortcuts = false" />
  <Toaster :theme="theme.isDark ? 'dark' : 'light'" position="bottom-right" rich-colors close-button />
</template>

<style></style>