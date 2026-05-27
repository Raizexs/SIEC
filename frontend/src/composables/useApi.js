/**
 * useApi — fetch wrapper that injects the Supabase JWT automatically.
 *
 * Centralizes:
 *   - Base URL resolution (VITE_API_URL).
 *   - Authorization header attachment.
 *   - JSON encoding/decoding.
 *   - Error normalization (HttpError with status + payload).
 *   - Auto-redirect to /login on 401.
 */
import { useAuthStore } from "../stores/auth";

const API_BASE = (import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");

function buildApiUrl(path, query) {
  if (path.startsWith("http")) return new URL(path);
  const base = API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : "");
  if (!base) {
    throw new Error("VITE_API_URL no está configurada en el build de producción.");
  }
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${base}/`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url;
}

export class HttpError extends Error {
  constructor(status, payload, message) {
    super(message || payload?.detail || `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

async function request(method, path, { body, query, headers, signal } = {}) {
  const auth = useAuthStore();
  const url = buildApiUrl(path, query);

  const finalHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(headers || {}),
  };
  if (auth.accessToken) {
    finalHeaders.Authorization = `Bearer ${auth.accessToken}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth.accessToken) {
      const detail =
        typeof payload?.detail === "string" ? payload.detail : String(payload?.detail ?? "");
      const sessionExpired = /expirado|expired/i.test(detail);
      if (sessionExpired) {
        await auth.logout();
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
      }
    }
    throw new HttpError(res.status, payload);
  }
  return payload;
}

export function useApi() {
  return {
    get: (path, opts) => request("GET", path, opts),
    post: (path, body, opts) => request("POST", path, { ...opts, body }),
    put: (path, body, opts) => request("PUT", path, { ...opts, body }),
    patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
    delete: (path, opts) => request("DELETE", path, opts),
  };
}