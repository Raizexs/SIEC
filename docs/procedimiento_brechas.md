# Procedimiento de respuesta ante incidentes de seguridad — SIEC

**Contacto DPO:** privacidad@siec.app  
**Última actualización:** Junio 2026

---

## 1. Detección

Fuentes de detección:
- Alertas Sentry (errores anómalos, picos de 5xx).
- Reportes de usuarios a privacidad@siec.app.
- Revisión de logs de `auditoria` (accesos inusuales).
- Notificaciones de proveedores (Supabase, Stripe).

---

## 2. Contención inmediata (0–4 horas)

1. Identificar alcance: qué datos, cuántos titulares, qué sistemas.
2. Revocar tokens/comprometer credenciales si aplica.
3. Deshabilitar endpoint o feature afectada.
4. Preservar evidencia (logs, snapshots) sin alterar.

---

## 3. Evaluación de riesgo (4–24 horas)

Clasificar según:
- Naturaleza de los datos (identificación, financieros, ubicación).
- Volumen de titulares afectados.
- Probabilidad de uso indebido.
- Si hay transferencia no autorizada a terceros.

Documentar en registro interno de incidentes (fecha, descripción, datos afectados, medidas).

---

## 4. Notificación

Según gravedad y plazos de la Ley 21.719:

| Destinatario | Cuándo |
|--------------|--------|
| Autoridad de protección de datos | Cuando el incidente represente riesgo para derechos de titulares (evaluar con asesor legal) |
| Titulares afectados | Cuando el riesgo sea alto para sus derechos y libertades |
| Subencargados | Si el incidente involucra su infraestructura |

Contenido mínimo de notificación: naturaleza del incidente, datos afectados, medidas adoptadas, contacto DPO, recomendaciones para el titular.

---

## 5. Recuperación y lecciones aprendidas

1. Restaurar servicio con parche verificado.
2. Actualizar RAT y EIPD si cambia el perfil de riesgo.
3. Revisión post-mortem en 7 días: causa raíz, acciones preventivas.
4. Actualizar este procedimiento si corresponde.

---

## Contactos de emergencia

| Rol | Contacto |
|-----|----------|
| DPO | privacidad@siec.app |
| Infraestructura | team@siec.app |
