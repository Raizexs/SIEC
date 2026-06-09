

| SIEC  ·  Sistema Inteligente de Estimación de Costos | Entrega financiera |
| :---: | :---: |

**Estimación Financiera**

**SIEC — Grupo 6**

| Objetivo del documento Estimar los costos de desarrollo, infraestructura y operación del MVP; y justificar un modelo de negocio sostenible basado en un Marketplace de Oferta y Demanda (Estimación y Adjudicación) en Chile. |
| :---- |

| FECHA DE PRESENTACIÓN | Miércoles 3 de junio de 2026 |
| :---- | :---- |
| **MODALIDAD** | Equipos de trabajo del proyecto semestral |
| **PONDERACIÓN** | Según planificación del curso |
| **REPOSITORIO** | [Raizexs/SIEC](https://github.com/Raizexs/SIEC) · [Contribuidores](https://github.com/Raizexs/SIEC/graphs/contributors?all=1) |
| **REFERENCIA TÉCNICA** | SIEC \- Hito 3 |

Equipo: Andrés Tapia · Gonzalo Jara · Lukas Flores · Felipe Figueroa · Fernando Salazar

| SECCIÓN 00 |
| :---- |

**Resumen ejecutivo**

Visión financiera condensada para evaluación académica y presentación.

| COSTO RR.HH. $248.250 / mes  Equivalente a 112,5 horas mensuales del equipo  | INFRAESTRUCTURA MVP \~$30.160 / mes  Bootstrapping y pago por uso real) | BURN RATE (COSTO TOTAL) $\~278.410 / mes MVP acumulado | OPERACIÓN AÑO 1 \~$81.900 / mes post-lanzamiento |
| :---- | :---- | :---- | :---- |

El proyecto SIEC no solo debe demostrar factibilidad técnica: debe sostenerse financieramente. La estimación consolida recursos humanos, infraestructura tecnológica, costos operacionales y un modelo de ingresos coherente con el producto: un **Marketplace B2C/B2B** de estimación de costos y conexión garantizada con contratistas .

| Lectura estratégica El costo real está concentrado en trabajo humano, no en infraestructura. La decisión crítica no es “si se puede construir”, sino si el modelo de adquisición y conversión logra suficientes usuarios pagos para sostener scraper, soporte, mantenimiento y evolución normativa. |
| :---- |

**Alcance de evaluación**

* Parte 1: estimación de costos asociados al desarrollo del sistema: recursos humanos, infraestructura tecnológica y operación.

* Parte 2: selección y justificación de un modelo de negocio: generación de ingresos, usuario pagador, momento de pago y beneficio para el cliente.

* Enfoque: MVP desplegable con frontend, API, scraper de precios, PostgreSQL y herramientas de IA usadas durante el desarrollo.

| SECCIÓN 01 |
| :---- |

**Contexto**

Marco del proyecto y razón financiera de la evaluación.

Hasta este punto del proyecto, el equipo ha trabajado en la definición del problema, los requerimientos, la arquitectura y el desarrollo del **Sistema Inteligente de Estimación de Costos (SIEC)** orientado a propietarios B2C: diseño 2D/3D, presupuesto con precios de retail y validación normativa Ley 21.725, documentado en el Hito 3\.

Un proyecto técnicamente viable también debe ser **financieramente sostenible**. Este documento estima los costos de desarrollo y propone un modelo de negocio alineado con el producto desplegado: Vercel, API, SerpAPI / scraper y PostgreSQL.

**Metodología: horas a partir de commits**

Las horas por integrante se derivan de la **contribución real al repositorio** —rama main y ramas de feature, sin merge commits— complementada con ajustes mínimos por rol Scrum no reflejados en Git.

**Fuente de datos**

| Métrica | Valor |
| :---- | :---- |
| Período analizado | 06-mar-2026 \-\> 02-jun-2026 (\~13 semanas) |
| Commits totales (equipo, sin bots) | 338 |
| Commits con Co-authored-by: Cursor | 21 (Andrés: 14, Lukas: 7; validado por equipo) |
| Commits con Co-authored-by: Copilot | 13 (Felipe / MrPipe7: 10; autor Copilot: 3\) |

| Nota sobre alias Git Andres T. y Cliptap corresponden a Andrés Tapia; MrPipe7 y Felipe Figueroa a Felipe Figueroa; Fernandino945 y Fernando Salazar Cartes a Fernando Salazar. |
| :---- |

**Calibración de horas totales**

Se asume un esfuerzo acumulado del semestre de **450 horas-persona** para el equipo, equivalente a aproximadamente 5 integrantes x 7 h/semana de dedicación media durante el período.

* **\~1,33 h/commit** promedio, coherente con proyectos académicos con commits frecuentes, CI y asistencia de IA.

* Coherencia con el Sprint 3 del Hito 3: 13 HU completadas o en progreso, dailies documentadas y despliegue en producción.

**Distribución base proporcional a commits**

| Integrante | Rol (Hito 3 / README) | Commits | % sobre 338 | Horas base |
| :---- | :---- | ----: | ----: | ----: |
| Lukas Flores | Technical Lead / Desarrollador | 147 | 43,5 % | 196 |
| Andrés Tapia | Product Owner (PM) | 98¹ | 29,0 % | 130 |
| Felipe Figueroa | Desarrollador | 54² | 16,0 % | 72 |
| Fernando Salazar | Desarrollador | 18³ | 5,3 % | 24 |
| Gonzalo Jara | Scrum Master | 21 | 6,2 % | 28 |

*¹ Incluye 90 (Andres T.) \+ 8 (Cliptap).  ² Incluye 40 (MrPipe7) \+ 9 (Felipe Figueroa) \+ 5 (autor Copilot en PRs).  ³ Incluye 11 (Fernandino945) \+ 7 (Fernando Salazar Cartes).*

**Ajustes por rol, ceremonias y gestión**

| Integrante | Ajuste | Horas finales | Justificación breve |
| :---- | ----: | ----: | :---- |
| Andrés Tapia | \+18 h | 148 | Backlog, stakeholders, demos; alta presencia en repo pese a rol PO |
| Gonzalo Jara | \+24 h | 52 | Dailies (8 x 15 min x sprints), retrospectiva, desbloqueo de impedimentos |
| Fernando Salazar | \+10 h | 34 | 100 % asistencia a dailies; pruebas y documentación con menor frecuencia de commit |
| Lukas Flores | \-52 h | 144 | Rebalanceo para cuadrar total equipo (450 h) |
| Felipe Figueroa | \- | 72 | Scraper y backend; uso principal de Copilot |

| Total recursos humanos estimado 450 h: Andrés 148 \+ Gonzalo 52 \+ Lukas 144 \+ Felipe 72 \+ Fernando 34\. |
| :---- |

| SECCIÓN 02 |
| :---- |

## **Parte 1: Estimación de Costos**

Costos asociados al desarrollo del sistema y su operación inicial.

### **1\. Recursos humanos**

Valores hora en **CLP** como costo de oportunidad de practicante/junior en Chile, con referencia equivalente aproximada a USD 12-18/h. Son ajustables según criterio.

| Rol | Integrante | Horas est. | Valor hora (CLP) | Costo total (CLP) | Costo Mensual (CLP) |
| :---- | :---- | ----: | ----: | ----: | ----: |
| Product Owner | Andrés Tapia | 148 | $2.500  | $370.000  | $92.500 |
| Scrum Master | Gonzalo Jara | 52 | $2.500  | $360.000  | $90.000 |
| Technical Lead | Lukas Flores | 144 | $2.000  | $104.000  | $26.000 |
| Desarrollador | Felipe Figueroa | 72 | $1.500  | $108.000  | $27.000 |
| Desarrollador | Fernando Salazar | 34 | $1.500  | $51.000  | $12.750 |
| **Subtotal RR.HH.** |  | **450** | **\~$1500-2500/ hora** | **$993.000**  | **$248.250 / mes**  |

*Distribución: PO 32,9 %, SM 11,6 %, TL 32,0 %, Dev Felipe 16,0 %, Dev Fernando 7,6 %.*

**Resumen por rol Scrum**

| Rol genérico | Personas | Horas | Costo (CLP) |
| :---- | ----: | ----: | ----: |
| Product Owner | 1 | 148 | $1.776.000 |
| Scrum Master | 1 | 52 | $520.000 |
| Desarrolladores (+ Tech Lead) | 3 | 250 | $3.220.000 |

### **2\. Infraestructura tecnológica (semestre / MVP)**

Basado en despliegue del Hito 3 y pipeline actual: Vercel, API/worker, PostgreSQL, scraper de precios, SerpAPI y herramientas de IA utilizadas durante el desarrollo.

* **SerpAPI**: precios mayoritarios vía Google Shopping (\~34 insumos activos, 1 búsqueda/insumo/ciclo).

* **Construmart**: complemento con Playwright.

* **fallback\_prices.py** \+ **CMF**: fallback e indicador UF diaria.

* Job programado: **03:00 America/Santiago** en scraper/main.py.

**SerpAPI: consumo y costo**

| Escenario | Búsquedas/mes aprox. | Plan | Costo/mes USD |
| :---- | ----: | :---- | ----: |
| Desarrollo / siembra inicial | \<= 100 | Free (serpapi.com) | $0 |
| Producción (job diario) | \~34 insumos x 30 días ≈ 1.020 | Developer (\~5.000 búsquedas/mes)⁵ | \~$50 |

*⁵ Según documentación interna del proyecto (scraper/serpapi\_scraper.py); verificar tarifa vigente en SerpAPI.*

| Ítem | Proveedor / uso | Costo mensual USD  | Costo mensual CLP | Notas  |
| :---- | :---- | :---- | :---- | :---- |
| Extracción de Datos  | SerpAPI (Google Shopping)  | $25.00  | \~$23.750 CLP  | Plan de $25 USD. Núcleo operativo del MVP para la actualización de precios.  |
| API, Backend & BD  | Railway (Pay-as-you-go)  | \~$5.00  | \~$4.750 CLP  | Cómputo facturado por uso real de CPU/RAM. Aloja el motor Python, PostgreSQL y el job nocturno.  |
| Hosting Frontend  | Vercel (Hobby) / Cloudflare  | $0.00  | $0 CL P | Alojamiento de assets estáticos (Gratuito). Capacidad suficiente para tráfico de validación.  |
| Dominio  | NIC Chile (.cl)  | \~$1.75  | \~$1.660 CLP  | Costo real de $20.000 CLP anual, prorrateado a nivel mensual. Gasto obligatorio.  |
| **Total Infraestructura**  |  | **\~$31.75 USD**  | **\~$30.160 CLP**  | **Presupuesto comercial ultra-optimizado (Bootstrapping).**  |

### **3\. Costos operacionales (primer año post-lanzamiento)**

| Concepto | % / criterio | Monto estimado CLP/mes |
| :---- | ----: | ----: |
| Mantención pipeline de precios | 15% RR.HH. | $12.413 |
| Cuota SerpAPI en producción | Fijo | \~$23.750 |
| Soporte y corrección de errores  | 10% RR.HH. | $8.275 |
| Actualizaciones normativas/UF | 5% RR.HH. | $4.138 |
| Marketing básico y captación | Fijo | $33.333 |
| **Subtotal operacional post-lanzamiento** |  | **\~$81.909 / mes** |

### **4.Resumen de gasto mensual (Tasa de quema de capital MVP)** 

| Categoría | Costo |
| :---- | ----: |
| Recursos Humanos (Costo mensualizado)  | $248.250 CLP |
| Infraestructura Comercial (Suscripciones y Cloud)  | $30.160 CLP  |
| BURN RATE MENSUAL (Desarrollo MVP) | $278.410 CLP / mes  |

| SECCIÓN 03 |
| :---- |

## **Parte 2: Modelo de Negocio**

Modelo seleccionado, lógica de ingresos y viabilidad comercial.

### **Modelo seleccionado: Modelo seleccionado: Marketplace de Oferta y Demanda (Pago por Lead y Publicación)**

El modelo evoluciona la propuesta B2C del Hito 3 hacia una plataforma bilateral. Es más coherente que una suscripción mensual, ya que la necesidad del autoconstructor es episódica (una vez cada varios años). Este modelo monetiza directamente la intención real de construir." 

| Elemento | Descripción |
| :---- | :---- |
| Cómo se generan ingresos | Mediante micro-transacciones bilaterales: Cobro de una tarifa de publicación (Commitment Fee) al cliente, y cobro por desbloqueo de contacto (Lead) al contratista. Incluye un sistema de compensación cruzada como garantía . |
| Quién paga | 1\. El propietario/cliente final al publicar su proyecto en el directorio. 2\. El maestro/contratista al solicitar el contacto de un proyecto publicado.  |
| Cuándo paga | El cliente paga al publicar su PDF en el directorio de obras. El contratista, que navega las ofertas libremente, paga al hacer clic en 'Obtener contacto'. Si el cliente abandona el proceso o no responde al contratista, el dinero pagado por el cliente se transfiere al contratista como compensación por su tiempo.  |
| Beneficio para el cliente | Para el cliente: Obtiene estimación transparente y ofertas serias de contratistas motivados. Para el maestro: Acceso a obras pre-cubicadas, eliminando las horas perdidas en visitas a terreno para presupuestos que nunca se concretan.  |

### **Proyección**

### **Tarifa de Publicación de Proyecto (Cliente): $4.990 CLP**

**Tarifa de Desbloqueo de match (Contratista):** **$2.990 CLP**

**Justificación de ingresos:** "En lugar de depender de una base recurrente mensual (MRR) con alto riesgo de cancelación (*churn*), los ingresos se vinculan al volumen de proyectos publicados y la competitividad de los maestros por adjudicárselos."

| Punto de equilibrio operativo Con costos fijos operacionales cercanos a $173.000/mes \+ infraestructura aproximada de $30.000/mes, se requieren alrededor de 70 suscriptores de pago mixtos Pro/Pro+ o un ajuste de precios. La viabilidad depende de adquisición digital y conversión, no solo de que el MVP funcione. |
| :---- |

**Justificación frente a alternativas**

| Modelo | Descartado / parcial porque |
| :---- | :---- |
| Venta única | No financia scraper ni actualización de precios 24/7. |
| Publicidad | Debilita confianza en datos de costos sensibles. |
| SaaS Mensual  | El usuario B2C no cotiza proyectos constantemente, por lo que la suscripción pierde valor tras ya haber cotizado. |
| Pago por uso | Difícil de comunicar al usuario B2C; suscripción es estándar SaaS. |

**Conclusión financiera**

El modelo de Marketplace con retención de garantía es financieramente más sólido y escalable que un SaaS tradicional. Alinea la monetización con la naturaleza transitoria de la autoconstrucción y genera un ecosistema seguro, resolviendo el miedo al abandono tanto para el cliente como para el contratista. 