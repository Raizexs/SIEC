# SIECres - OpenCode Instructions

## Project Overview
SIEC (Sistema Inteligente de Estimación de Costos) is a web platform for intelligent construction estimation, 2D/3D spatial planning, material analysis, layout management, and project portfolio analytics. It targets the Chilean residential construction market (B2C).

## Technology Stack
- **Frontend**: Vue 3 (Composition API), Vite, Pinia, Three.js, TailwindCSS, Lucide Icons
- **Backend**: FastAPI (Python 3.11), SQLAlchemy ORM, Alembic
- **Database**: PostgreSQL 15 (via Supabase)
- **Auth**: Supabase Auth
- **Scraper**: Playwright + APScheduler
- **Infrastructure**: Docker, Vercel, Railway

## Code Conventions

### Python/FastAPI
- Use PEP 8 conventions
- Type hints required on all public functions
- Async endpoints for I/O operations
- Pydantic models for request/response validation
- SQLAlchemy async session for DB operations
- Alembic for migrations
- Use `logging` not `print()`

### Vue 3 Frontend
- Composition API with `<script setup>`
- Pinia stores for state management
- Vue Router for navigation
- Three.js via WebGL for 3D rendering
- TailwindCSS for styling
- Lucide icons for UI

### Database
- PostgreSQL migrations in `database/migrations/`
- Seeds in `database/seeds/`
- Use `bigint` for IDs, `timestamptz` for timestamps
- RLS enabled on multi-tenant tables

### Scraper
- Playwright for browser automation
- APScheduler for scheduled runs (daily 3:00 AM)
- Price deviation filter (>200% or <50% rejected)

## Git Workflow
- Conventional commits preferred
- Feature branches per sprint task
- Tests required for new business logic

## Testing
- Python: pytest with coverage
- Frontend: Vitest
- Run `pytest` for backend tests
- Run `npm test` (Jest) for frontend JS tests

## Key Files
- `docs/context.md` - Full project context and vision
- `docs/reglas_negocio_siec.md` - Business rules
- `docs/observaciones.md` - Technical observations
