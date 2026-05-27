/**
 * Vue Router with auth guards.
 *
 * Routes:
 *   /login                 — public auth screen (split layout)
 *   /auth/callback         — OAuth/magic-link landing
 *   /auth/reset-password   — password reset (token in URL hash)
 *   /onboarding            — first-run wizard (auth required)
 *   /dashboard             — projects grid (auth required)
 *   /workspace/:projectId? — 3D editor (auth required)
 *   /settings              — user profile, MFA, sessions (auth required)
 */
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView.vue"),
    meta: { requiresAuth: false, hideShell: true },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: () => import("../views/AuthCallbackView.vue"),
    meta: { requiresAuth: false, hideShell: true },
  },
  {
    path: "/auth/reset-password",
    name: "reset-password",
    component: () => import("../views/ResetPasswordView.vue"),
    meta: { requiresAuth: false, hideShell: true },
  },
  {
    path: "/onboarding",
    name: "onboarding",
    component: () => import("../views/OnboardingView.vue"),
    meta: { requiresAuth: true, hideShell: true },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/workspace/:projectId?",
    name: "workspace",
    component: () => import("../views/WorkspaceView.vue"),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("../views/SettingsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0, behavior: "auto" };
  },
});

let authInitialized = false;

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

  return true;
});

router.afterEach((to) => {
  if (to.name === "workspace" && typeof window !== "undefined") {
    window.localStorage.setItem("siec.lastWorkspacePath", to.fullPath);
  }
});

export default router;
