# Diagnóstico de protección de datos — SIEC

**Actividad:** Buenas y malas prácticas en cumplimiento regulatorio  
**Proyecto:** SIEC — Sistema Inteligente de Estimación de Costos  
**Marco legal de referencia:** Ley N° 21.719 (protección de datos personales, Chile)  
**Fecha:** Junio 2026

---

## Contexto del proyecto

SIEC es una plataforma web orientada a propietarios y profesionales de la construcción que permite diseñar ampliaciones residenciales, estimar costos y generar propuestas. Además, incorpora un marketplace (SIEC Place) para publicar obras y conectar propietarios con contratistas.

En el uso normal de la plataforma se tratan datos personales como nombre, correo electrónico, empresa, ubicación de la obra, datos de clientes asociados a proyectos, historial de pagos y, en ciertos casos, datos de contacto compartidos entre usuarios del marketplace.

---

## Parte 2 — Diagnóstico rápido

| Pregunta | Sí | No | Observación |
|----------|:--:|:--:|-------------|
| ¿Recopila datos personales? | ✓ | | Sí: identificación del usuario, datos de contacto, ubicación de proyectos e información vinculada a transacciones y publicaciones. |
| ¿Recopila datos sensibles? | | ✓ | No se recopilan categorías sensibles definidas por la ley (salud, biométricos, creencias, etc.). |
| ¿Tiene consentimiento explícito? | | ✓ | El registro no solicita aceptación de política de privacidad ni informa de forma clara las finalidades del tratamiento. |
| ¿El usuario puede eliminar sus datos? | | ✓ | Puede eliminar proyectos individuales, pero no existe un mecanismo claro para solicitar la eliminación integral de su cuenta y datos asociados. |
| ¿Los datos están protegidos? | ✓ | | Existen medidas de seguridad (autenticación, acceso restringido, registro de actividad). Aun así, hay puntos débiles: enlaces de compartición pública sin control granular. |
| ¿Usa IA para tomar decisiones? | | ✓ | Las validaciones normativas son reglas fijas del sistema, no decisiones automatizadas con efecto legal sobre el usuario. |
| ¿Existe responsable del tratamiento de datos? | | ✓ | No se ha designado un encargado de protección de datos ni existe un registro formal de las actividades de tratamiento. |

---

## Parte 3 — El abogado llegó...

*Escenario: mañana entra en vigor una fiscalización de la Ley 21.719.*

### Los tres mayores riesgos legales del proyecto

| Riesgo | Impacto |
|--------|---------|
| **Ausencia de consentimiento informado** | Alto |
| **Imposibilidad de ejercer el derecho a eliminar los datos personales** | Alto |
| **Compartir datos de contacto en SIEC Place sin consentimiento específico** | Medio |

**Breve justificación**

1. **Consentimiento:** Al registrarse, el usuario entrega datos personales sin haber sido informado de manera clara sobre para qué se usarán ni sin haber aceptado expresamente una política de privacidad.

2. **Derecho de supresión:** Si un usuario solicita que se eliminen todos sus datos, la plataforma no ofrece hoy un canal ni un procedimiento que permita dar cumplimiento a ese derecho de forma integral.

3. **Marketplace:** Publicar obras y compartir contacto con contratistas requiere consentimiento específico y trazable para esa finalidad.

**Otros riesgos a considerar**

| Riesgo | Impacto |
|--------|---------|
| Conservar más información de la estrictamente necesaria (historial de versiones, registros de actividad) | Medio |
| Enlaces públicos de proyectos sin control claro sobre qué datos quedan expuestos | Medio |

---

## Parte 4 — Plan de mejora (3 cambios)

### 1. Incorporar consentimiento explícito y política de privacidad

Publicar una política de privacidad accesible desde el registro y el onboarding, y exigir que el usuario la acepte antes de crear su cuenta. Para funcionalidades con finalidades distintas —como publicar una obra en SIEC Place o compartir datos de contacto con contratistas— el consentimiento debe ser separado y específico.

Dejar constancia de qué versión de la política aceptó cada usuario y en qué fecha, como respaldo ante una eventual fiscalización.

---

### 2. Habilitar la eliminación y portabilidad de datos personales

Ofrecer al usuario la posibilidad de solicitar la eliminación completa de su cuenta y de todos los datos asociados, así como de obtener una copia de su información en un formato comprensible. Definir además cuánto tiempo se conservan los registros de actividad y bajo qué criterios, aplicando el principio de minimización de datos.

---

### 3. Reforzar controles en SIEC Place y enlaces públicos

Exigir consentimiento específico antes de publicar obras o compartir contacto con contratistas. Limitar la exposición de datos en enlaces públicos con expiración configurable y opción de ocultar datos de terceros (cliente, ubicación).

---

## Conclusión

SIEC cuenta con medidas de seguridad razonables para una plataforma en desarrollo, pero aún presenta brechas importantes en transparencia y derechos de los titulares. Los tres cambios propuestos permiten avanzar hacia un cumplimiento más sólido de la Ley 21.719 sin renunciar a las funcionalidades centrales del producto.
