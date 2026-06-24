import LandingView from "../views/LandingView.vue";
import LoginView from "../views/LoginView.vue";

export const routes = [
  {
    path: "/",
    name: "landing",
    component: LandingView,
    meta: { requiresAuth: false, hideShell: true },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
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
    path: "/legal/privacidad",
    name: "legal-privacy",
    component: () => import("../views/legal/PrivacyPolicyView.vue"),
    meta: { requiresAuth: false, hideShell: true },
  },
  {
    path: "/legal/terminos",
    name: "legal-terms",
    component: () => import("../views/legal/TermsView.vue"),
    meta: { requiresAuth: false, hideShell: true },
  },
  {
    path: "/privacy/accept",
    name: "privacy-accept",
    component: () => import("../views/PrivacyAcceptView.vue"),
    meta: { requiresAuth: true, hideShell: true },
  },
  {
    path: "/share/:token",
    name: "share-project",
    component: () => import("../views/ShareProjectView.vue"),
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
    path: "/siecplace",
    name: "siecplace",
    component: () => import("../views/SiecPlaceView.vue"),
    meta: { requiresAuth: true },
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
