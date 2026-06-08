# Billing comercial — Free / Pro / Pro+

## Migración Supabase

Ejecutar en el SQL Editor:

`database/migrations/014_create_billing.sql`

## Variables de entorno (backend)

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | Firma webhook |
| `STRIPE_PRICE_PRO` | Price ID mensual plan Pro |
| `STRIPE_PRICE_PRO_PLUS` | Price ID mensual plan Pro+ |
| `FRONTEND_URL` | URL pública (ej. `https://app.siec.cl`) |

## Límites por plan

| Plan | Proyectos activos | Guardados | Export/mes | Materiales |
|------|-------------------|-----------|------------|------------|
| free | 1 | 1 | 2 | Madera |
| pro | 5 | 10 | 20 | Madera, Metalcom |
| pro_plus | ∞ | ∞ | ∞ | 1–4 |

## Endpoints

- `GET /billing/plan` — plan y uso
- `POST /billing/record-export` — incrementa contador antes de exportar
- `POST /billing/checkout` — sesión Stripe Checkout
- `POST /billing/webhook` — activación de suscripción
