# Tareas Sprint 3 — Jira (SIEC)

Alcance: Historias bajo la Visión B2C Actual.

---

## ÉPICA 1: MOTOR DE SIMULACIÓN Y PARAMETRIZACIÓN

### User Story HU12: Desarrollo Renderizado Dinámico por Capas (Layers 3D)

- Resumen: Visualización del proceso constructivo en capas progresivas para el modelo 3D

#### Caso de Uso:
- Como usuario autoconstructor no experto
- Quiero aislar la vista 3D de mi proyecto en 5 capas constructivas progresivas (fachada exterior, aislación, instalaciones, panel interior y estructura)
- Para comprender visual y educativamente los pasos exactos que conlleva construir mi recinto con la materialidad elegida.

#### Criterios de Aceptación:
- Escenario: Propietario desglosando la estructura interactiva
- Dado que el usuario generó su volumen básico de recinto en la App
- Y dado que ha seleccionado una materialidad en el panel de configuración
- Cuando activa el selector "Modo de Construcción" (Layers)
- Entonces el modelo 3D oculta y muestra interactivamente los conjuntos de mallas volumétricas, permitiéndole investigar internamente el sistema.

---

### User Story HU13: Desarrollo Alertador de Logística en Interfaz

- Resumen: Modal preventivo al seleccionar sistemas de peso industrial para obras menores

#### Caso de Uso:
- Como propietario planificando en su patio trasero
- Quiero recibir una alerta visual inmediata si selecciono Ferrocemento
- Para comprender que mover e instalar módulos de 105 kg exige entrada de maquinaria como grúas, invalidando la construcción a mano alzada.

#### Criterios de Aceptación:
- Escenario: Prevención logística por exceso de peso estructural
- Dado que el usuario se encuentra en el configurador de materialidad
- Cuando selecciona "Ferrocemento" de la lista 
- Entonces el frontend bloquea momentáneamente la pantalla con un Modal advirtiendo de "Requisitos Logísticos Pesados"
- Y entonces el Modal le dispone un botón directo "Cotizar en Cambio con Materiales Ligeros" (Ej: Acero Galvanizado).

---

### User Story HU19: Exportador BIM 5D a Formato IFC

- Resumen: Traducción de geometría 2D/3D y cotizaciones a archivo universal BIM.

#### Caso de Uso:
- Como usuario propenso a contratar a un profesional futuro
- Quiero poder pulsar "Exportar mi diseño a IFC"
- Para que mi boceto arquitectónico (geometría) y su data económica (5D) puedan ser abiertos y continuados formalmente en Revit de forma nativa por un arquitecto.

#### Criterios de Aceptación:
- Escenario: Descarga de entregable CAD universal
- Dado que el usuario diseñó muros y cotizó precios
- Cuando presiona exportar modelo
- Entonces el backend empaqueta los vértices, espesores y metadata scraper en un archivo estándar `.ifc`.

---

## ÉPICA 2: MOTOR DE ESTIMACIÓN Y COSTOS

### User Story HU14: Cálculo Estructurado de Mano de Obra y Sobrecargos B2C

- Resumen: Estimación algorítmica de la fuerza laboral y prevención de descapitalización con leyes sociales.

#### Caso de Uso:
- Como usuario cotizador / gestor de autoconstrucción
- Quiero que mi presupuesto proyecte los costos de instalación basándose en rendimientos inversos estrictos (jornadas por m²)
- Para asegurar un cronograma coherente, sumar obligatoriamente un 28-29% de sobrecargo por leyes sociales a las tarifas nominales y blindarme financieramente contra el pago deficitario a obreros.

#### Criterios de Aceptación:
- Escenario: Estructuración del APU (Costo Directo Laboral)
- Dado que se calcularon las dimensiones de tabiquería u obra gruesa
- Cuando el motor de estimación calcula salarios y tiempos
- Entonces debe cruzar la tarifa hora/día por el rendimiento y aplicar irrevocablemente un factor multiplicador de recargo entre 1.28 y 1.29 (Leyes Sociales).

---

### User Story HU15: Ingestión de Matrices CSV y Reglas de Desperdicio

- Resumen: Alimentación del catálogo y seteo del motor de mermas y modulación geométrica.

#### Caso de Uso:
- Como motor de cubicación SIEC
- Quiero consumir la data estructurada del archivo `matrices_rendimiento.csv` y acoplar el motor algorítmico a reglas formales.
- Para someter las peticiones a algoritmos de anidación (Nesting 1D/2D), deducción de vanos, e inflación por factores de merma.

#### Criterios de Aceptación:
- Escenario: Operación de Cubicación y Optimización de Cortes
- Dado que el usuario traza un escenario con dimensiones en metros
- Cuando el backend solicita requerimientos de compra
- Entonces deduce vanos, lee el CSV, infla la mezcla y para panelería aplica un algoritmo de Nesting (bajando la merma al rango 4%-12%).

---

### User Story HU18: Implementación de Hard Constraints Regulatorios (MINVU)

- Resumen: Bloqueos lógicos en sugerencia de materialidades para asegurar regularización y viabilidad técnica.

#### Caso de Uso:
- Como sistema validador experto
- Quiero restringir la cotización a soluciones normadas (LOSCAT) y vigilar la Ley del Mono y estabilidad de pisos.
- Para garantizar que la obra sea regularizable (<= 90 o 140 m²) y estructuralmente segura (ej: Max 3 pisos para Metalcon sin ingeniero).

#### Criterios de Aceptación:
- Escenario: Auditoría Automática Legal y Estructural
- Dado que el usuario culmina su diseño
- Cuando se cursa la evaluación del proyecto
- Entonces el motor alerta si excede los m² de autoconstrucción, exige LOSCAT en zonas frías, y bloquea configuraciones de Metalcon de más de 3 plantas.

---

## ÉPICA 3: INTEGRACIÓN DE DATOS DE MERCADO

### User Story HU16: Configuración Extra en Framework Web Scraper B2C

- Resumen: Rastreo de materiales complementarios básicos desde tiendas retail

#### Caso de Uso:
- Como usuario cotizador
- Quiero rastrear retail estándar, normalizar nombres automáticamente usando modelos NLP/LLM, y convertir valores contra UF.
- Para poseer compras exactas (aunque las tiendas las nombren distinto) y saber si excedo los límites legales en Unidad de Fomento para procedimientos simplificados.

#### Criterios de Aceptación:
- Escenario: Background Batch con Normalización e Ingreso Financiero
- Dado que el scraper nocturno o la cotización inicia
- Cuando recorre plataformas y el Banco Central
- Entonces extrae consumibles normalizando los SKU erráticos por similitud NLP a la DB, y actualiza el valor de la UF.

---

## ÉPICA 5: INNOVACIÓN E INTELIGENCIA ARTIFICIAL

### User Story HU17: Spike sobre Evaluación Técnica de Visión Computacional Terrestre

- Resumen: Timeboxed Spike para validar consumo y viabilidad de análisis espacial fotográfico

#### Caso de Uso:
- Como equipo de desarrollo
- Quiero evaluar modelos fundacionales de análisis multimodales e inferencia de segmentación (OpenSource / OpenAI)
- Para conocer con anticipación qué infraestructura exigiría alertar a usuarios acerca de hundimientos, ángulos o riesgos topográficos enviando fotos del patio de su hogar.

#### Criterios de Aceptación:
- Escenario: Entrega documental final de investigación técnica
- Dado que finaliza la ventana de exploración (Spike de 5/7 puntos) en el ciclo Sprint 3
- Cuando se rinde cuentas del avance total de Jira
- Entonces el equipo publica un README evidenciando requerimientos de VRAM, tarifas de las API probadas, y una sólida decisión de avanzar y agendar su programación real, o pausarla si encarece brutalmente el coste de servidor.

---

## 📋 PLANIFICACIÓN DE MÓDULOS DE TICKETS (AGENTIC PM SPECS)

A continuación se detallan las tareas específicas extraídas de cada historia, con la información contextual necesaria para el desarrollo autónomo.

### HU12: Renderizado Dinámico por Capas (Layers 3D)

Tarea T12.1: Panel UI para Selección de Capas `[FRONTEND]`
- Descripción: Crear la interfaz visual de controles para alternar la visibilidad de 5 capas constructivas (Fachada, Aislación, Instalaciones, Interior, Estructura). Gestionar este estado de selección globalmente para su consumo por el visor interactivo.
- Criterios de Aceptación:
  - Los controles permiten activar y desactivar estado (toggles/checkbox).
  - La estética y animaciones mantienen el lineamiento visual del proyecto (Glassmorphism, hover effects).
  - El estado resultante es expuesto correctamente hacia otros módulos/composables.
- Dependencias: Ninguna.

Tarea T12.2: Motor de Visibilidad por Capas en 3D `[FRONTEND]`
- Descripción: Implementar la lógica que acople el estado de las capas reactivas y gobierne la visibilidad interactiva de los mallas/planos dentro del escenario 3D. 
- Criterios de Aceptación:
  - Al cambiar el estado de las capas, el volumen base responde dinámicamente mostrando u ocultando lo necesario.
  - Las transiciones no deben romper los agrupamientos fundamentales ni la renderización principal de la app.
- Dependencias: Bloqueada por Panel UI para Selección de Capas.

### HU13: Alertador de Logística en Interfaz

Tarea T13.1: Componente de Alerta Preventiva Logística `[FRONTEND]`
- Descripción: Desarrollar un modal de nivel superior que detenga la visualización informando los riesgos logísticos del material debido al peso. Debe ofrecer la acción explícita de "Cotizar con Materiales Ligeros" junto con una opción secundaria de descarte o cierre.
- Criterios de Aceptación:
  - Bloqueo visual efectivo mediante oscurecimiento del fondo (backdrop).
  - Presencia del mensaje explicativo sobre maquinaria pesada requerida.
  - El Call-To-Action (CTA) principal de "materiales ligeros" emite una acción clara al sistema.
- Dependencias: Ninguna.

Tarea T13.2: Disparador Condicional de Ferrocemento `[FRONTEND]`
- Descripción: Habilitar el trigger del modal de prevención en la vista de configuración general, observando en todo momento qué materialidad se está fijando.
- Criterios de Aceptación:
  - Si la materialidad asignada pasa a ser "Ferrocemento", el alerta aparece automáticamente en pantalla.
  - Si en la alerta se confirma usar materiales ligeros, la aplicación cambia globalmente la materialidad a "Acero Galvanizado".
- Dependencias: Bloqueada por Componente de Alerta Preventiva Logística.

### HU19: Exportador BIM 5D a Formato IFC

Tarea T19.1: Motor de Transpilación Constructiva a IFC `[BACKEND]`
- Descripción: Capturar el sub-árbol JSON del modelador (coordenadas, volúmenes de vanos e Insumos proyectados extraídos de Retail) y empaquetarlos cumpliendo el esquema estructural del protocolo Standard Industry Foundation Classes (.IFC).
- Criterios de Aceptación:
  - Se puede descargar la modulación y visualizar íntegra en un entorno BIM arquitectónico como Autodesk Revit o Navisworks.
- Dependencias: Finalización de la generación isométrica frontend.

### HU14: Cálculo Estructurado de Mano de Obra y Sobrecargos B2C

Tarea T14.1: Parametrización del Costo Laboral en Base a Jornadas `[BACKEND]`
- Descripción: Crear la estructura en el motor de costos que, siguiendo el APU, procese: `(salario diario maestro + ayudante)  rendimiento en_jornadas_por_m2`. 
- Criterios de Aceptación:
  - Los rendimientos se consumen de la tabla poblada por el CSV de matrices_rendimiento.
  - Generación de tarifa pura local.
- Dependencias: Ninguna.

Tarea T14.2: Inyección de Leyes Sociales en Componente de Cotizador `[BACKEND]`
- Descripción: Implementar en el motor la obligación de inflar el Costo Laboral Neto aplicando el factor de leyes sociales (`1.28` a `1.29`) dictado por la nueva regla de negocios.
- Criterios de Aceptación:
  - Toda respuesta de Costo Laboral expone explícitamente el porcentaje retenido por Leyes Sociales para evitar descapitalización.
- Dependencias: Bloqueada por Parametrización del Costo Laboral en Base a Jornadas.

### HU15: Ingestión de Matrices CSV y Reglas de Desperdicio

Tarea T15.1: Parser Seed de Archivo de Matrices CSV `[DB] [BACKEND]`
- Descripción: Desarrollar un seeder o script de carga que lea `docs/matrices_rendimiento.csv` y emita registros en la BD conteniendo Categoría, Partida, Insumo, Unidad y Rendimiento.
- Criterios de Aceptación:
  - Script programado correctamente en Python/TS según stack y tabla creada.
- Dependencias: Ninguna.

Tarea T15.2: Motor de Deducción de Vanos y Mermas `[BACKEND]`
- Descripción: Escribir las funciones matemáticas que antes de derivar la cotización: Resten áreas de vanos de la superficie bruta; y multipliquen los totales por factores de pérdida (1.10 para morteros premezclados, 1.05 Albañilería/Hormigón, factor variable en acero).
- Criterios de Aceptación:
  - El volumen arrojado previo es el neto más la compensación de daño estructural por pérdida.
- Dependencias: Ninguna.

Tarea T15.3: Algoritmo de Nesting para Corte Optimo `[BACKEND]`
- Descripción: Reemplazar multiplicadores de placa y redondeos brutos Ceiling por algoritmos computacionales de `Nesting` geométrico (1D/2D). Esto encajará virtualmente los Paneles/Tiras comerciales sobre el diseño, reduciendo desperdicio.
- Criterios de Aceptación:
  - Emite listas de compra optimizadas, limitando estadísticamente la pérdida entre el 4% y 12%.
- Dependencias: Ninguna.

### HU18: Implementación de Hard Constraints Regulatorios (MINVU)

Tarea T18.1: Interceptor Normativo LOSCAT/LOSCAA `[BACKEND]`
- Descripción: Acoplar aislamientos acústicos y cortafuegos F-60 obligatorios a cotizaciones de recintos que no usen SIP; validar fundación a H20.
- Criterios de Aceptación: Requerimientos térmicos inyectados por defecto al Payload.

Tarea T18.2: Validador de Regularización (Ley 21.725 / Ley del Mono) `[BACKEND]`
- Descripción: Medir el área geométrica total del diseño contra los umbrales sociales (90m² a 140m²) verificando en cruce con el límite < 520 UF de tasación.
- Criterios de Aceptación: Alerta explícita bloqueante de "Infracción Ley 21.725" si el usuario sobrepasa el límite.

Tarea T18.3: Alertas Críticas de Seguridad Estructural `[BACKEND]`
- Descripción: Modulo validador de cruce (Insumo vs Altura). Si el usuario levanta modelo Metalcon > 3 pisos, arrojar excepción severa alertando sobre la inviabilidad sin ingeniero.
- Criterios de Aceptación: Sistema imposibilitado para tramitar renders constructivos sobre topes gravitatoriamente peligrosos.

### HU16: Configuración Extra en Framework Web Scraper B2C

Tarea T16.1: Ampliación de Criterios del Web Scraper B2C `[BACKEND] [SCRAPER]`
- Descripción: Expandir los targets del spider añadiendo la extracción del estrato retail genérico: Perfiles livianos (Metalcon), maderas, tornillería estandar.
- Criterios de Aceptación: El sistema raspa un espectro completo constructivo cada madrugada.

Tarea T16.2: Motor de Normalización LLM de SKUs `[AI] [BACKEND]`
- Descripción: Implementar filtro de coincidencia difusa (Fuzzy Matching) o llamada a micro-LLM/NLP para estandarizar los nombres erráticos de Retail ("Volcanita x10mm", "Yeso Cartón 10", "Pladur 1cm") referenciándolos correctamente a nuestra DB Maestra.
- Criterios de Aceptación: Cruce relacional normalizado. Eliminación de duplicidad por nomenclatura de origen.

Tarea T16.3: Integración de Endpoint Financiero (UF) `[BACKEND]`
- Descripción: Script programado conectando la base de datos a la CMF (Comisión Mercado Financiero) para refresco y persistencia del Valor UF del día.
- Criterios de Aceptación: UF 100% verídica utilizada para límites del Ley del Mono T18.2.

### HU17: Spike sobre Evaluación Técnica de Visión Computacional Terrestre

Tarea T17.1: Documentación de Viabilidad AI Visual `[INVESTIGACIÓN]`
- Descripción: Confeccionar una bitácora o README comparativo en torno al estado del arte sobre modelos fundacionales de percepción multi-modal (GPT-V, Sonnet, OpenSource Local). Analizar y comparar el coste monetario por inferencia API vs el coste computacional y VRAM para un auto-hospedaje de este feature en el contexto MVP.
- Criterios de Aceptación:
  - Registro de al menos tres alternativas reales.
  - Conclusión tajante recomendando o descartando su implementación por limitación de costes/viabilidad en fase MVP.
- Dependencias: Ninguna.

Tarea T17.2: Prueba de Concepto (PoC) sobre Análisis Topográfico `[BACKEND] [AI]`
- Descripción: Escribir un script experimental que invoque la API elegida cargando una imagen estática (foto de ejemplo del patio del cliente) con prompt pidiendo determinar factibilidad u observaciones del relieve. Evaluar respuesta del modelo.
- Criterios de Aceptación:
  - Código capaz de completar el ciclo carga (Request) y devolución textual (JSON).
  - Existencia de un log midiendo en la consola los segundos que tardó en resolver la petición.
- Dependencias: Bloqueada parcialmente por Documentación de Viabilidad AI Visual (Determinar a qué proveedor/API disparar).
