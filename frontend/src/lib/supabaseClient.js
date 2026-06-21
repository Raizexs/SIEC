/**
 * Supabase Client (singleton)
 *
 * Handles identity (auth) only — business logic (projects, calculations,
 * scraper data) lives in the FastAPI backend. The session JWT is forwarded
 * to FastAPI via the Authorization header in `useApi.js`.
 *
 * Falls back to a "mock" mode if env vars are missing so the app still boots
 * during onboarding / first run.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
/** Supabase: anon (eyJ…) o publishable (sb_publishable_…) desde el dashboard */
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project'),
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'siec.auth.token',
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        headers: { 'X-Client-Info': 'siec-web/1.0' },
      },
    })
  : null;

/**
 * Tiny wrapper that returns a usable shim when Supabase is not configured yet.
 * In dev, this lets the team run the app and hit a "Configura Supabase" banner
 * instead of a hard crash.
 */

export const safeSupabase = () => {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (o VITE_SUPABASE_ANON_KEY) en frontend/.env.local.',
    );
  }
  return supabase;
};
