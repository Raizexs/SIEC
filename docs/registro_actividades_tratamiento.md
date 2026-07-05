# Registro de Actividades de Tratamiento (RAT) — SIEC

**Responsable del tratamiento:** SIEC (Sistema Inteligente de Estimación de Costos)  
**Encargado de Protección de Datos (DPO):** privacidad@siec.app  
**Última actualización:** Junio 2026  
**Marco legal:** Ley N° 21.719 sobre protección de datos personales (Chile)

---

## Inventario de tratamientos

| Finalidad | Datos personales | Base legal | Encargados / subencargados | Plazo de retención |
|-----------|------------------|------------|----------------------------|-------------------|
| Cuenta y autenticación | email, nombre, empresa, avatar | Consentimiento / ejecución de contrato | Supabase Auth | Hasta supresión de cuenta + 30 días |
| Proyectos y presupuestos | cliente, ubicación, payload de diseño | Ejecución del servicio | Supabase (Postgres), Railway/Vercel | Hasta supresión o 2 años de inactividad |
| Colaboración y comentarios | nombre, comentarios, anclas 3D | Ejecución del servicio | Supabase | Hasta supresión del proyecto o cuenta |
| SIEC Place (marketplace) | email, nombre del propietario | Consentimiento específico | Stripe, Supabase | Hasta cierre del listing + plazo legal |
| Facturación y pagos | email, IDs Stripe, montos | Obligación legal / contrato | Stripe | Según normativa tributaria |
| Auditoría de seguridad | actor_id, acción, IP, user-agent | Interés legítimo | Supabase | 12 meses |
| Enlaces públicos de proyectos | datos del proyecto (opcional cliente/ubicación) | Consentimiento específico | Supabase, Vercel | Hasta expiración del enlace (máx. 90 días) |

---

## Subencargados y transferencias internacionales

| Proveedor | Ubicación | Finalidad | Garantías |
|-----------|-----------|-----------|-----------|
| Supabase | Confirmar región en dashboard del proyecto | Auth, base de datos | DPA estándar Supabase |
| Stripe | EE.UU./global | Pagos SIEC Place y suscripciones | DPA Stripe |
| Sentry | EE.UU. | Monitoreo de errores (PII scrubbed) | DPA Sentry |
| Vercel | Global | Hosting frontend | DPA Vercel |
| Railway / Render | Global | Hosting backend API | DPA del proveedor |
| Google OAuth | EE.UU. | Inicio de sesión | Políticas Google / Supabase |

---

## Medidas de seguridad técnicas

- Autenticación JWT (Supabase Auth) con MFA opcional.
- Row Level Security (RLS) en tablas de usuario y proyectos.
- Consentimientos versionados en `user_consent`.
- Purga automática de auditoría > 12 meses.
- Límite de versiones de proyecto (últimas 20).

---

## Contacto para titulares

Para ejercer derechos de acceso, rectificación, supresión, portabilidad u oposición: **privacidad@siec.app**
