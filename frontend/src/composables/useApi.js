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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class HttpError extends Error {
  constructor(status, payload, message) {
    super(message || payload?.detail || `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

async function request(method, path, { body, query, headers, signal } = {}) {
  const auth = useAuthStore();
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

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
    if (res.status === 401) {
      await auth.logout();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
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