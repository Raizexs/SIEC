/**
 * Vue Router with auth guards.
 *
 * Routes:
 *   /                      — public landing page
 *   /login                 — public auth screen (split layout)
 *   /auth/callback         — OAuth/magic-link landing
 *   /auth/reset-password   — password reset (token in URL hash)
 *   /onboarding            — first-run wizard (auth required)
 *   /dashboard             — projects grid (auth required)
 *   /workspace/:projectId? — 3D editor (auth required)
 *   /siecplace             — marketplace de obras (auth required)
 *   /settings              — user profile, MFA, sessions (auth required)
 */
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { usePrivacy } from "../composables/usePrivacy";
import { routes } from "./routes.js";

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.name === 'landing') return { top: 0, behavior: 'auto' };
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0, behavior: 'auto' };
  },
});

let authInitialized = false;

const PUBLIC_ROUTES = new Set([
  "landing",
  "login",
  "auth-callback",
  "reset-password",
  "legal-privacy",
  "legal-terms",
  "share-project",
]);

const CONSENT_EXEMPT_ROUTES = new Set([
  ...PUBLIC_ROUTES,
  "privacy-accept",
  "onboarding",
]);

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!authInitialized) {
    await auth.initializeAuth();
    authInitialized = true;
  }

  const requiresAuth = to.meta.requiresAuth;

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (!requiresAuth && auth.isAuthenticated && to.name === "login") {
    const redirect =
      to.query.redirect && typeof to.query.redirect === "string"
        ? to.query.redirect
        : "/workspace";
    return redirect;
  }

  if (!requiresAuth && auth.isAuthenticated && to.name === "landing") {
    return "/dashboard";
  }

  if (
    auth.isAuthenticated &&
    requiresAuth &&
    !CONSENT_EXEMPT_ROUTES.has(to.name)
  ) {
    try {
      const { hasConsent } = usePrivacy();
      const ok = await hasConsent("privacy_policy");
      if (!ok) {
        return {
          name: "privacy-accept",
          query: { redirect: to.fullPath },
        };
      }
    } catch {
      // API unavailable — do not block navigation in dev
    }
  }

  return true;
});

router.afterEach((to) => {
  if (to.name === "workspace" && typeof window !== "undefined") {
    window.localStorage.setItem("siec.lastWorkspacePath", to.fullPath);
  }
});

export { routes };

export default router;
