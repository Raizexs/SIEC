import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

/**
 * Hybrid Auth Store
 *
 * Identity is delegated to Supabase Auth (OAuth, MFA, magic links, password
 * reset, refresh tokens). Business state (projects, exports, audit) lives in
 * the FastAPI backend, accessed via `useApi.js` with the Supabase JWT.
 *
 * Falls back to a mock identity if Supabase is not configured yet so onboarding
 * developers can still boot the app.
 */

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null); // Inicialmente carga sesión guardada
  const session = ref(null);
  const profile = ref(null);
  const isLoading = ref(true);
  const error = ref(null);
  const exportHistory = ref([]);

  const mfaState = ref({
    factors: [],
    challengeId: null,
    factorId: null,
    isEnrolling: false,
    qrCode: null,
    secret: null,
  });

  const isAuthenticated = computed(() => !!user.value);
  const userId = computed(() => user.value?.id || null);
  const accessToken = computed(() => session.value?.access_token || null);
  const role = computed(
    () => profile.value?.role || user.value?.user_metadata?.role || 'architect',
  );
  const fullName = computed(
    () =>
      profile.value?.full_name ||
      user.value?.user_metadata?.full_name ||
      user.value?.email?.split('@')[0] ||
      'Arquitecto',
  );
  const avatarUrl = computed(
    () =>
      profile.value?.avatar_url ||
      user.value?.user_metadata?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName.value)}`,
  );

  /* ── Mock fallback (no Supabase configured) ─────────────────────────────── */
  const mockLogin = async (email) => {
    user.value = {
      id: 'dev-user-mock',
      email,
      user_metadata: { full_name: email.split('@')[0], role: 'architect' },
    };
    session.value = { access_token: 'mock-token', expires_at: Date.now() + 3600_000 };
    localStorage.setItem('siec_mock_session', JSON.stringify({ user: user.value, session: session.value }));
  };

  // Guard: initializeAuth may be called from App.vue mount AND router.beforeEach.
  // We only register the onAuthStateChange listener ONCE.
  let _initPromise = null;
  let _stateChangeUnsub = null;

  const initializeAuth = async () => {
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      isLoading.value = true;

      try {
        if (!isSupabaseConfigured) {
          const stored = localStorage.getItem("siec_mock_session");

          if (stored) {
            const data = JSON.parse(stored);
            user.value = data.user;
            session.value = data.session;
          }

          return;
        }

        const { data } = await supabase.auth.getSession();

        session.value = data.session;
        user.value = data.session?.user ?? null;

        if (user.value) {
          await loadProfile();
        }

        if (!_stateChangeUnsub) {
          const { data: sub } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              session.value = newSession;
              user.value = newSession?.user ?? null;

              if (user.value) {
                await loadProfile();
              } else {
                profile.value = null;
              }

              if (event === "TOKEN_REFRESHED") {
                console.debug("[auth] Token refreshed.");
              }
            },
          );

          _stateChangeUnsub =
            sub?.subscription?.unsubscribe?.bind(sub.subscription) || null;
        }
      } catch (e) {
        console.warn("[auth] No se pudo inicializar la sesión:", e);
      } finally {
        isLoading.value = false;
      }
    })();

    return _initPromise;
  };

  /* ── Profile loading from FastAPI backend ───────────────────────────────── */
  const loadProfile = async () => {
    if (!user.value) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });
      if (res.ok) {
        profile.value = await res.json();
      }
    } catch (e) {
      console.warn('[auth] No se pudo cargar perfil del backend:', e);
    }
  };

  /* ── Email + Password ───────────────────────────────────────────────────── */
  const login = async (email, password) => {
    isLoading.value = true;
    error.value = null;
    try {
      if (!isSupabaseConfigured) {
        if (!email || !password) throw new Error('Credenciales inválidas');
        await new Promise((r) => setTimeout(r, 800));
        await mockLogin(email);
        return { success: true };
      }
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified = factorsData?.totp?.find((f) => f.status === 'verified');
      if (verified) {
        return { success: true, mfaRequired: true, factorId: verified.id };
      }
      session.value = data.session;
      user.value = data.user;
      await loadProfile();
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  const signUp = async ({ email, password, fullName: name, company, role: userRole }) => {
    isLoading.value = true;
    error.value = null;
    try {
      if (!isSupabaseConfigured) {
        await mockLogin(email);
        return { success: true };
      }
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company,
            role: userRole || 'architect',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) throw err;
      return { success: true, needsConfirmation: !data.session };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  /* ── OAuth (Google, GitHub, Microsoft) ──────────────────────────────────── */
  const signInWithOAuth = async (provider) => {
    error.value = null;
    if (!isSupabaseConfigured) {
      error.value = 'OAuth requiere Supabase configurado.';
      return { success: false, error: error.value };
    }
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {},
        },
      });
      if (err) throw err;
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    }
  };

  /* ── Magic Link ─────────────────────────────────────────────────────────── */
  const signInWithMagicLink = async (email) => {
    isLoading.value = true;
    error.value = null;
    try {
      if (!isSupabaseConfigured) throw new Error('Magic links requieren Supabase configurado.');
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) throw err;
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  /* ── Password Reset ─────────────────────────────────────────────────────── */
  const requestPasswordReset = async (email) => {
    error.value = null;
    if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado.' };
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (err) throw err;
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    }
  };

  const updatePassword = async (newPassword) => {
    error.value = null;
    if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado.' };
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    }
  };

  /* ── MFA (TOTP) ─────────────────────────────────────────────────────────── */
  const enrollMFA = async () => {
    error.value = null;
    if (!isSupabaseConfigured) return { success: false, error: 'Supabase no configurado.' };
    try {
      mfaState.value.isEnrolling = true;
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `SIEC ${new Date().toISOString().slice(0, 10)}`,
      });
      if (err) throw err;
      mfaState.value.factorId = data.id;
      mfaState.value.qrCode = data.totp.qr_code;
      mfaState.value.secret = data.totp.secret;
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    } finally {
      mfaState.value.isEnrolling = false;
    }
  };

  const verifyMFAEnroll = async (code) => {
    error.value = null;
    try {
      const { data: challenge, error: challengeErr } =
        await supabase.auth.mfa.challenge({ factorId: mfaState.value.factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaState.value.factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw verifyErr;
      mfaState.value = { factors: [], challengeId: null, factorId: null, isEnrolling: false, qrCode: null, secret: null };
      await refreshFactors();
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    }
  };

  const challengeMFA = async (factorId, code) => {
    error.value = null;
    try {
      const { data: challenge, error: challengeErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw verifyErr;
      const { data: sessData } = await supabase.auth.getSession();
      session.value = sessData.session;
      user.value = sessData.session?.user ?? null;
      await loadProfile();
      return { success: true };
    } catch (err) {
      error.value = mapAuthError(err);
      return { success: false, error: error.value };
    }
  };

  const refreshFactors = async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.auth.mfa.listFactors();
    mfaState.value.factors = data?.totp || [];
  };

  const unenrollMFA = async (factorId) => {
    if (!isSupabaseConfigured) return { success: false };
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
    if (err) {
      error.value = mapAuthError(err);
      return { success: false };
    }
    await refreshFactors();
    return { success: true };
  };

  /* ── Session lifecycle ──────────────────────────────────────────────────── */
  const logout = async () => {
    isLoading.value = true;
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      user.value = null;
      session.value = null;
      profile.value = null;
      exportHistory.value = [];
      localStorage.removeItem('siec_mock_session');
      localStorage.removeItem('siec_export_history');
    } finally {
      isLoading.value = false;
    }
  };

  const logoutAllDevices = async () => {
    if (!isSupabaseConfigured) return logout();
    await supabase.auth.signOut({ scope: 'global' });
    return logout();
  };

  /* ── Export history (UI niceness) ───────────────────────────────────────── */

  const addExportToHistory = (projectName) => {
    exportHistory.value.unshift({
      id: Date.now(),
      name: projectName || 'Proyecto Sin Título',
      date: new Date().toLocaleDateString(),
    });
    if (exportHistory.value.length > 10) exportHistory.value.pop();
    localStorage.setItem('siec_export_history', JSON.stringify(exportHistory.value));
  };

  return {
    user,
    session,
    profile,
    isLoading,
    error,
    exportHistory,
    mfaState,
    isAuthenticated,
    userId,
    accessToken,
    role,
    fullName,
    avatarUrl,
    initializeAuth,
    loadProfile,
    login,
    signUp,
    signInWithOAuth,
    signInWithMagicLink,
    requestPasswordReset,
    updatePassword,
    enrollMFA,
    verifyMFAEnroll,
    challengeMFA,
    refreshFactors,
    unenrollMFA,
    logout,
    logoutAllDevices,
    addExportToHistory,
  };
});

/* ── Helpers ────────────────────────────────────────────────────────────── */

function mapAuthError(err) {
  const message = err?.message || String(err);
  const map = {
    'Invalid login credentials': 'Correo o contraseña inválidos.',
    'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
    'User already registered': 'Este correo ya está registrado.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
  };
  return map[message] || message;
}