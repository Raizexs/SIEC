# Billing comercial — Free / Pro / Pro+

## Migración Supabase

Ejecutar en el SQL Editor (en orden):

1. `database/migrations/015_create_billing.sql`
2. `database/migrations/016_create_siecplace.sql`

## Variables de entorno (backend)

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | Firma webhook |
| `STRIPE_PRICE_PRO_ONETIME` | Price ID pago único plan Pro ($4.990 CLP) |
| `STRIPE_PRICE_PRO_PLUS_ONETIME` | Price ID pago único plan Pro+ ($9.990 CLP) |
| `STRIPE_PRICE_PRO` | Fallback legacy (opcional) |
| `STRIPE_PRICE_PRO_PLUS` | Fallback legacy (opcional) |
| `STRIPE_PRICE_LISTING` | Price ID publicación SIEC Place ($4.990 CLP) |
| `STRIPE_PRICE_LEAD` | Price ID desbloqueo contacto ($2.990 CLP) |
| `FRONTEND_URL` | URL pública (ej. `https://app.siec.cl`) |

## Modelo de cobro

- **Pro** y **Pro+**: pago único (`mode: payment` en Stripe Checkout), activación lifetime en `user_subscription`.
- **SIEC Place** (solo Pro+): micro-transacciones aparte para publicar obra y desbloquear contacto.

## Límites por plan

| Plan | Proyectos activos | Guardados | Export/mes | Materiales | SIEC Place |
|------|-------------------|-----------|------------|------------|------------|
| free | 1 | 1 | 2 | Madera | No |
| pro | 5 | 10 | 20 | Madera, Metalcom | No |
| pro_plus | ∞ | ∞ | ∞ | 1–4 | Sí |

Precios pago único: **Pro $4.990** · **Pro+ $9.990** CLP.

## Endpoints billing

- `GET /billing/plan` — plan, límites (`marketplace_access`) y uso
- `POST /billing/record-export` — incrementa contador antes de exportar
- `POST /billing/checkout` — sesión Stripe Checkout (pago único)
- `POST /billing/webhook` — activación de plan y pagos SIEC Place

## Endpoints SIEC Place

- `GET /siecplace/listings` — obras publicadas (sin contacto)
- `GET /siecplace/listings/mine` — mis publicaciones (Pro+)
- `POST /siecplace/listings` — crear borrador
- `GET /siecplace/listings/{id}` — detalle; contacto si lead desbloqueado
- `POST /siecplace/listings/{id}/checkout-publish` — pago publicación $4.990
- `POST /siecplace/listings/{id}/checkout-unlock` — pago contacto $2.990 (Pro+)
