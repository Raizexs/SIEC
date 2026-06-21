/**
 * apiConfig.js — Configuración centralizada de la URL del backend.
 *
 * ÚNICA fuente de verdad para la base URL del API.
 * Todos los módulos deben importar desde aquí en lugar de
 * repetir la lógica de resolución de localhost:8000.
 */

/**
 * URL base del backend, sin barra final.
 * Orden de resolución:
 *   1. VITE_API_URL (variable de entorno en producción / staging)
 *   2. http://localhost:8000 solo en desarrollo (import.meta.env.DEV)
 *   3. Cadena vacía en producción sin VITE_API_URL (same-origin / proxy Nginx)
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/$/, '');
