# Contexto de Proyecto: Sistema Inteligente de Estimación de Costos (SIEC)

## 1. Visión General
SIEC es una plataforma web orientada a la estimación de costos de construcción residencial y visualización paramétrica en 3D. El sistema permite al usuario configurar los parámetros de una vivienda (m², recintos, materialidad), visualizarlos instantáneamente en 3D mediante generación procedimental, y obtener un presupuesto detallado basado en el cruce de métricas de rendimiento constructivo y precios reales del mercado obtenidos mediante web scraping.

## 2. Stack Tecnológico Decidido
* **Frontend / UI:** Vue 3 (Composition API + `<script setup>`) con Vite como bundler y Pinia como store de estado.
* **Motor 3D:** Three.js (WebGL nativo) integrado como componente Vue (`Scene3D.vue`) con generación procedimental controlada por composables reactivos. *Nota crítica: Se descartó Unity por problemas de peso y comunicación. Todo el 3D debe programarse en JavaScript/TypeScript.*
* **Backend:** FastAPI (Python 3.11) con SQLAlchemy ORM. Arquitectura orientada a microservicios:
  - `backend/` — API REST principal (cálculos, simulaciones, catálogos).
  - `scraper/` — Microservicio de scraping de precios (Playwright + APScheduler) [Sprint 2].
* **Base de Datos:** PostgreSQL 15 (dockerizado con `postgres:15-alpine`).
* **Orquestación:** Docker Compose v3.8 (servicios: `db`, `backend`, `frontend`, `scraper`).
* **Persistencia Local:** LocalStorage (máximo 3 simulaciones por usuario, límite de peso 50 KB por registro).

## 3. Lógicas de Negocio Críticas (Core Mechanics)

### A. Sistema de Validación Espacial (Tokens)
El espacio de la vivienda se gestiona como una economía de recursos para gamificar y validar la UX:
* **Fórmula:** 1 token por cada 10 m² ingresados (ej: 150 m² = 15 tokens). Máximo 2500 m².
* Cada tipo de recinto tiene un "costo" en tokens:
  - Habitación Simple = 5 tokens
  - Habitación Doble = 8 tokens
  - Habitación Triple = 12 tokens
  - Baño = 4 tokens
  - Área Común = 12 tokens
* **Regla:** El frontend debe bloquear la adición de nuevos recintos si el costo supera el saldo de tokens disponibles.
* **Estados de alerta:** Safe (≤70% uso), Warning (≤90%), Danger (>90%).
* **Implementación:** Lógica pura en `utils/tokenMath.js`, reactividad Vue en `composables/useTokenCounter.js`.

### B. Matriz de Rendimientos Constructivos (Base de Datos)
El código backend NO debe contener multiplicadores *hardcodeados*. Debe consultar una tabla relacional que cruza `Material_Estructural` e `Insumo` con un `Factor_Multiplicador`.
* *Ejemplo:* 1 m² de Albañilería requiere 0.5 sacos de cemento.
* La API multiplica los m² ingresados por el usuario por este factor para obtener la cantidad matemática de insumos, agrupados por categoría (Obra Gruesa, Terminaciones, Instalaciones y Mano de Obra).

### C. Estrategia de Precios (Web Scraping)
* **Arquitectura:** Microservicio independiente (`scraper/`) con su propio contenedor Docker.
* **Tecnología:** Playwright (headless Chromium) + `playwright-stealth` para evadir anti-bot.
* **Frecuencia:** APScheduler ejecuta el scraping cada 24 horas a las 03:00 AM.
* **Fuentes:** Tiendas retail (Sodimac, Easy, Construmart).
* **Geolocalización:** Estrictamente filtrado para sucursales de la Región de Valparaíso.
* **Regla de Seguridad:** El motor de cálculo JAMÁS hace scraping en tiempo real. Lee exclusivamente de la tabla interna de la base de datos. Si un precio varía más del 200% o cae por debajo del 50% de un día a otro, se descarta la actualización.
* **Promedio:** Si existen precios de múltiples tiendas para un mismo insumo, el motor usa el promedio de los precios más recientes.

### D. Estrategia de Obtención de Datos (Rendimientos y Matriz)
Para poblar la matriz de rendimiento de materiales y conseguir correlaciones efectivas, se investigarán las siguientes alternativas:
1. **RSMeans de Gordian (Free Trial):** Motor estándar mundial. Sus precios están calibrados para EE.UU. (se descartarán), pero **los rendimientos son universales y aplicables localmente** (ej. cantidad de cemento/madera por pared).
2. **Manual Ondac:** Alternativa prioritaria a investigar para obtener datos exactos localizados en Chile sobre rendimiento de materiales y horas-hombre por metro cuadrado.
3. **Cacería de Datasets Académicos y Open Source (BIM 5D):**
   * **Repositorios Científicos:** Mendeley Data y Zenodo, donde investigadores liberan bases de datos o *Bill of Quantities (BOQ)* sobre estimaciones en residencias.
   * **Plataformas Open Source:** Archivos JSON/CSV en GitHub y Kaggle.
   * **Buscadores:** Google Scholar y ResearchGate (términos clave: "BIM 5D cost estimation case study dataset", "Bill of Quantities residential building excel").

## 4. Requisitos No Funcionales (RNF) Prioritarios
1.  **Rendimiento 3D:** El recálculo y actualización del modelo Three.js debe ocurrir en < 20 segundos. Debe usar *Object Pooling* (reciclaje de mallas) y la caché de posiciones no debe superar los 100 KB.
2.  **Rendimiento API:** El backend debe responder con el cálculo y desglose en < 2.5 segundos.
3.  **Rendimiento Caché:** La lectura de LocalStorage y renderizado de la tabla de historial debe ejecutarse en < 500 milisegundos sin bloquear el Main Thread.

## 5. Modelo Entidad-Relación

### Tablas en Producción (Sprint 1)
1.  `Material_Estructural` (ID, Nombre) → Madera, Metalcom, Albañilería, Hormigón Armado.
2.  `Tipo_Recinto` (ID, Nombre, Costo_Tokens) → Habitación (9), Baño (4), Área Común (12).
3.  `Configuracion_Simulacion` (ID, M2_Totales, Material_Estructural_ID FK, Habitaciones, Banios, Areas_Comunes, Fecha_Creacion).

### Tablas Planificadas (Sprint 2)
4.  `Insumo` (ID, Nombre, Categoria CHECK('Obra Gruesa','Terminaciones','Instalaciones','Mano de Obra'), Unidad_Medida).
5.  `Matriz_Rendimiento` (ID, Material_ID FK, Insumo_ID FK, Factor_Multiplicador). UNIQUE(Material_ID, Insumo_ID).
6.  `Precio_Mercado` (ID, Insumo_ID FK, Precio_CLP, Tienda_Origen CHECK('Sodimac','Easy','Construmart'), Fecha_Scraping, Region DEFAULT 'Valparaíso').

## 6. Arquitectura de Componentes Frontend

### Composables (lógica reutilizable)
| Archivo | Responsabilidad |
|---|---|
| `useTokenCounter.js` | Cálculo reactivo de tokens (envuelve `tokenMath.js`) |
| `useLayoutManager.js` | Guardar/cargar layouts de simulación |
| `useTopologyComputed.js` | Cálculos de topología para generación 3D |
| `useTopologyExtractor.js` | Extracción de datos de recintos para Three.js |
| `useInteractiveEditor.js` | Lógica del editor 2D interactivo |
| `useI18n.js` | Internacionalización ES/EN |

### Componentes Vue
| Componente | Responsabilidad |
|---|---|
| `ConfigurationPanel.vue` | Formulario principal de parámetros (m², recintos, material) |
| `MetricsPanel.vue` | Panel de métricas, tokens y estado del espacio |
| `MaterialsPanel.vue` | Selector visual de material estructural |
| `Scene3D.vue` | Escena Three.js con modelo 3D procedimental |
| `RoomEditor2D.vue` | Editor 2D de distribución de habitaciones |
| `Sidebar.vue` | Barra lateral con presets y layouts guardados |
| `TopNavBar.vue` | Barra de navegación con tabs |
| `SaveLayoutDialog.vue` | Diálogo modal para guardar layouts |
| `MaterialSelector.vue` | Selector dropdown de material |

### Store (Pinia)
| Store | Responsabilidad |
|---|---|
| `recintos.js` | Estado centralizado de recintos y layout actual |

## 7. Estado del Desarrollo

### Sprint 1 (Completado ✅)
**Objetivo:** Validar la viabilidad técnica del sistema, decidiendo stack y creación de tareas.

**Logros:**
- ✅ Stack definido: Vue 3 + FastAPI + PostgreSQL + Three.js + Docker Compose
- ✅ SPA con visualización 3D procedimental funcionando
- ✅ Sistema de tokens implementado (useTokenCounter + tokenMath)
- ✅ Binding reactivo frontend-motor (watchEffect + Pinia)
- ✅ CRUD de simulaciones en backend (POST /api/simulacion/parametros)
- ✅ Tablas `tipo_recinto` y `configuracion_simulacion` migradas y seeded
- ✅ 3 servicios Docker orquestados (frontend, backend, db)
- ✅ Internacionalización implementada (ES/EN)
- ✅ Editor 2D de habitaciones interactivo
- ✅ Selector visual de materiales con panel dedicado

### Sprint 2 (En Curso)
**Objetivo:** Implementar el motor de costos (Épica 2) y la integración de datos de mercado (Épica 3).
**HUs del Sprint:** HU04, HU06, HU07, HU08, HU10.
**Detalle de tareas:** Ver `docs/planeacion_tareas_jira.md`.

## 8. Historias de Usuario

### Épica 1: Motor de Simulación y Parametrización

**HU01 - Configuración de Parámetros Base**
Como usuario, quiero ingresar los m² totales, la cantidad y tipo de recintos (habitaciones, baños, áreas comunes) y el material estructural, para establecer las variables fundamentales del proyecto de construcción.
Criterios de Aceptación:
- Los parámetros configurados deben guardarse correctamente en la base de datos para que el motor de cálculo y el entorno 3D puedan procesarlos.
- El selector de material estructural debe ofrecer exactamente cuatro opciones base: Madera, Metalcom, Albañilería y Hormigón Armado.

**HU02 - Generación Volumétrica 3D**
Como usuario, quiero que el sistema construya y renderice automáticamente el modelo 3D de la vivienda al procesar mis parámetros, para validar visualmente la distribución espacial y volumetría calculada.
Criterios de Aceptación:
- El modelo 3D debe instanciarse en pantalla generando exactamente la cantidad de habitaciones y baños definidos en el input.
- La cámara del entorno 3D debe centrarse automáticamente y mostrar el 100% del modelo generado.
- Todos los assets mostrados deben formar parte del recinto.

**HU03 - Cálculo Dinámico del Modelo**
Como usuario, quiero modificar cualquier parámetro del formulario y ver el modelo 3D actualizarse en menos de 20 segundos, para iterar rápidamente sobre distintas configuraciones de vivienda.
Criterios de Aceptación:
- Un cambio en el input (ej. sumar un baño) debe disparar la regeneración del modelo 3D sin necesidad de recargar la página completa.

**HU11 - Sistema de Validación Espacial por Tokens**
Como usuario, quiero que el sistema me asigne un presupuesto de tokens basado en los m² totales y me descuente tokens por cada recinto configurado, para asegurar visualmente que la cantidad de habitaciones cabe en el espacio disponible.
Criterios de Aceptación:
- El sistema debe establecer una equivalencia de 1 token por cada 10 metros cuadrados ingresados.
- La configuración del sistema debe definir un costo fijo en tokens para cada tipo de recinto (Habitaciones Simples, Dobles, Triples, Baños, Áreas Comunes).
- La interfaz debe mostrar un contador de espacio disponible que bloquee la adición de nuevos recintos si el saldo de tokens es insuficiente.

### Épica 2: Motor de Estimación y Costos

**HU04 - Cálculo y Desglose Total de Insumos**
Como usuario, quiero visualizar el costo total del proyecto y un desglose completo de todos los insumos requeridos, para analizar la factibilidad financiera exacta de la configuración actual.
Criterios de Aceptación:
- La interfaz debe mostrar el valor monetario total actualizado.
- Debe existir un panel o tabla que liste todos los insumos calculados (fierro, cemento, agua, cableado, tuberías) con su cantidad específica y precio unitario aplicado.

**HU05 - Estimación de Mano de Obra**
Como usuario, quiero que el cálculo total integre automáticamente una estimación del costo de mano de obra, para que el presupuesto refleje el costo real de ejecución y no solo de materiales.
Criterios de Aceptación:
- El algoritmo debe aplicar multiplicadores de horas-hombre basándose en los m² y la complejidad de los recintos.
- El costo de mano de obra debe aparecer como un ítem separado dentro del desglose general.

**HU10 - Matriz de Rendimientos Constructivos**
Como analista de costos, quiero que el sistema consulte una tabla de métricas en la base de datos que defina cuánto insumo se gasta por unidad (ej. 0.5 sacos de cemento por m² de albañilería), para que el motor de cálculo sea dinámico y los multiplicadores no estén fijos en el código fuente.
Criterios de Aceptación:
- La base de datos debe contener una tabla relacional que asocie cada Material Estructural Base (Madera, Metalcom, etc.) con su factor de rendimiento por m².
- El endpoint de estimación debe multiplicar los m² ingresados por el usuario por el factor de rendimiento consultado en esta tabla.

### Épica 3: Integración de Datos de Mercado

**HU06 - Motor de Web Scraping Automatizado**
Como administrador del sistema, quiero que un proceso en segundo plano extraiga periódicamente los precios de materiales desde los catálogos web de Sodimac, Easy y Construmart, para alimentar la base de datos interna sin intervención manual.
Criterios de Aceptación:
- El script de scraping debe ejecutarse de forma automática y programada exactamente una vez cada 24 horas.
- La extracción debe parametrizarse para capturar obligatoriamente el stock y los precios correspondientes a los proveedores en Chile.
- El sistema debe insertar o actualizar los datos en la base de datos relacional completando estrictamente los campos requeridos (ID, Nombre, Precio, Unidad, Tienda, Fecha).

**HU07 - Resiliencia y Tolerancia a Fallos del Scraper**
Como administrador del sistema, quiero que el proceso de scraping maneje los errores de red o bloqueos de las tiendas retail, para garantizar que la base de datos nunca quede vacía o corrupta.
Criterios de Aceptación:
- Si el scraper no recibe respuesta HTTP 200 de una tienda en un máximo de 30 segundos, debe abortar la conexión y registrar el error en un log interno.
- Si falla la extracción de un material específico, el sistema tiene prohibido sobreescribir el dato anterior con nulos o ceros, manteniendo el último precio válido.
- Si el nuevo precio extraído representa una variación ilógica (mayor al 200% o menor al 50% respecto al día anterior), el sistema debe descartar la actualización.

**HU08 - Consumo de Precios para el Presupuesto**
Como usuario, quiero que el cálculo total de mi simulación utilice los datos recopilados por el scraper, para obtener un valor financiero apegado a la realidad del mercado actual.
Criterios de Aceptación:
- El motor de cálculo debe consultar los precios exclusivamente desde la base de datos relacional interna (no realizar peticiones de scraping durante la simulación).
- La interfaz gráfica debe mostrar un texto visible que indique la fecha de actualización de los últimos precios utilizados.
- Si existen múltiples precios para un mismo material estructural base, el motor de cálculo debe utilizar el valor promedio para la estimación final.

**HU09 - Historial de Simulaciones**
Como usuario, quiero acceder a una vista con el listado de mis simulaciones guardadas, para revisar, comparar o retomar estimaciones anteriores.
Criterios de Aceptación:
- El usuario, tras ver su modelo 3D y su presupuesto, puede persistir esa data para que se guarden temporalmente en el navegador (LocalStorage) y no perderla al cerrar la pestaña.
- La pestaña debe mostrar el nombre o ID de la simulación, fecha de creación y costo total guardado.
- Al hacer clic en un registro, el sistema debe cargar los parámetros exactos y regenerar el modelo 3D correspondiente.
- El sistema debe limitar el historial a un máximo estricto de 3 simulaciones guardadas, sobrescribiendo automáticamente el registro más antiguo al intentar guardar una cuarta.
- El tiempo de lectura del almacenamiento local y renderización de la tabla en la interfaz no debe superar los 500 milisegundos.
