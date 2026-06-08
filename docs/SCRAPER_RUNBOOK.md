# Scraper — Runbook de producción

## Pipeline activo

- **SerpAPI** (precios mayoritarios)
- **Construmart** (Playwright)
- **fallback_prices.py** (insumos sin match)
- **CMF** (UF diaria)

Job programado: `03:00` America/Santiago (`scraper/main.py`).

## Variables

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Postgres / Supabase |
| `SERPAPI_KEY` | Cuota SerpAPI |
| `RUN_NOW=true` | Ejecutar al iniciar contenedor |

## Checklist diario

1. Revisar logs del contenedor `scraper` (errores SerpAPI / Construmart).
2. Query cobertura: insumos activos con precio &lt; 24 h.
3. Si cobertura &lt; 85 %: reinyectar `backend/inject_serpapi.py` o ampliar fallback.

## CI

`scraper/tests/test_smoke.py` debe pasar en cada push a `main` / `develop`.
