const DEFAULT_PROD_API_BASE = 'https://api.siec.app';
const DEFAULT_DEV_API_BASE = 'http://localhost:8000';

export const resolveApiBaseUrl = () =>
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API_BASE : DEFAULT_DEV_API_BASE);
