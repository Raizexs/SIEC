# Backlog de Tareas — SIEC
> Actualizado: 2026-05-19 | Solo contiene tareas pendientes o en curso.
> Las tareas completadas (T12.1, T13.1, T13.2, T14.2, T15.2, T15.3, T18.2, T18.3) fueron removidas de este documento.

---

## ÉPICA 1: MOTOR DE SIMULACIÓN Y PARAMETRIZACIÓN

### User Story HU12: Renderizado Dinámico por Capas (Layers 3D)

- Resumen: Acoplar el panel de selección de capas ya existente con la respuesta visual del modelo 3D

#### Caso de Uso:
- Como usuario autoconstructor no experto
- Quiero que al activar o desactivar una capa constructiva en el panel lateral, el modelo 3D responda inmediatamente ocultando o mostrando esa parte del edificio
- Para comprender visualmente qué materiales componen cada etapa del proceso constructivo.

#### Criterios de Aceptación:
- Escenario: Propietario desglosando la estructura interactiva
- Dado que el usuario tiene un modelo 3D generado en pantalla
- Y el panel de capas está visible con sus 5 opciones (Fachada, Aislación, Instalaciones, Interior, Estructura)
- Cuando desactiva la capa "Fachada"
- Entonces el modelo 3D oculta los elementos correspondientes a esa capa con una transición suave, sin afectar la visibilidad de las otras capas.
- Y cuando vuelve a activar esa capa, los elementos reaparecen.

#### Planificación de Tareas

Tarea T12.2: Motor de Visibilidad por Capas en 3D `[FRONTEND]`
- Descripción: Conectar el estado del panel de capas (que ya existe) con la escena 3D para que los grupos de objetos correspondientes a cada capa constructiva respondan visualmente al toggle. Cada capa debe controlar un subconjunto específico de objetos dentro del visor.
- Criterios de Aceptación:
  - Al desactivar una capa, los objetos de esa capa desaparecen del visor 3D.
  - Al reactivarla, reaparecen. Las demás capas no se ven afectadas.
  - La transición entre estados es animada y no genera parpadeos o saltos bruscos en la escena.
  - El modelo base (volumen del recinto) siempre permanece visible independientemente del estado de las capas.
- Dependencias: Requiere que T12.1 (Panel UI de Capas) esté desplegado — ya completado.



---

## ÉPICA 2: MOTOR DE ESTIMACIÓN Y COSTOS

### User Story HU14: Mano de Obra con Datos Reales en el Presupuesto

- Resumen: Mostrar en el presupuesto el costo de instalación de los materiales basado en tarifas reales de maestros y ayudantes.

#### Caso de Uso:
- Como usuario que planifica una autoconstrucción
- Quiero que el presupuesto incluya el costo de contratar a los trabajadores que instalarán los materiales
- Para saber cuánto dinero necesito en total, no solo para los materiales sino también para la mano de obra.

#### Criterios de Aceptación:
- Escenario: Presupuesto con línea de mano de obra visible
- Dado que el usuario generó un presupuesto para un proyecto de 40 m²
- Cuando revisa el desglose por categorías
- Entonces existe una categoría "Mano de Obra" con al menos una línea que muestra el nombre del rol (maestro, ayudante), la cantidad de jornadas estimadas, el costo por jornada, y el subtotal.
- El subtotal de mano de obra tiene aplicado el recargo legal del 28% al 29%, y esto se indica explícitamente (por ejemplo: "incluye 28% leyes sociales").

#### Planificación de Tareas

Tarea T14.1: Completar el Catálogo de Mano de Obra en la Base de Datos `[DB] [BACKEND]`
- Descripción: Agregar al catálogo de insumos los roles de mano de obra para cada tipo de material estructural (Madera, Metalcon, Albañilería, Hormigón): maestro constructor y ayudante. Para cada uno se debe registrar el rendimiento en jornadas por metro cuadrado y el salario de referencia por jornada. Estos datos deben cargarse automáticamente junto con el resto del catálogo al iniciar el sistema.
- Criterios de Aceptación:
  - El presupuesto de cualquier proyecto muestra la categoría "Mano de Obra" con subtotal mayor a cero.
  - El subtotal de mano de obra cambia si cambia el material estructural del proyecto (Metalcon requiere más jornadas que Madera para albañilería, por ejemplo).
  - El desglose indica explícitamente que el valor incluye el recargo por leyes sociales y el porcentaje aplicado.
- Dependencias: Bloqueada por SIEC-101 (seed de materiales).

---

### User Story HU15-DATA: Datos Reales de Materiales y Precios en el Sistema

- Resumen: La base de datos debe contener materiales, insumos, rendimientos y precios de referencia para que el motor de estimación funcione correctamente.

#### Caso de Uso:
- Como usuario que genera un presupuesto
- Quiero ver una lista de materiales con cantidades y precios concretos
- Para poder evaluar el costo real de mi proyecto antes de comprar.

#### Criterios de Aceptación:
- Escenario: Presupuesto completo con precios
- Dado que el usuario diseñó una habitación de 20 m² con material Metalcon
- Cuando genera el presupuesto
- Entonces el resultado muestra al menos 5 insumos distintos con su cantidad, precio unitario y subtotal en pesos chilenos — ninguno aparece como "N/D" o en blanco.
- El costo total está en un rango creíble para la superficie indicada (entre $500.000 y $5.000.000 CLP para 20 m² en Metalcon).

#### Planificación de Tareas

Tarea SIEC-101: Completar el Catálogo de Materiales e Insumos `[DB] [BACKEND]`
- Descripción: Ampliar el catálogo existente de materiales constructivos para que cubra los 4 tipos estructurales disponibles (Madera, Metalcon, Albañilería, Hormigón Armado) con todos sus insumos principales. El catálogo debe incluir para cada insumo: nombre, categoría, unidad de medida, y cuánto se necesita por metro cuadrado de construcción. Debe cargarse automáticamente al iniciar el sistema sin pasos manuales.
- Categorías mínimas a cubrir: estructura principal, revestimientos, techumbre, terminaciones, instalaciones sanitarias básicas, mano de obra.
- Criterios de Aceptación:
  - Un proyecto en Madera muestra insumos distintos a uno en Metalcon.
  - Ningún insumo aparece con cantidad cero o negativa si el área es mayor a cero.
  - El catálogo se carga automáticamente. Si se ejecuta dos veces, no crea duplicados.
- Dependencias: Ninguna.

Tarea SIEC-102: Cargar Precios de Referencia del Mercado Chileno `[DB] [BACKEND]`
- Descripción: Cargar en la base de datos precios reales del mercado chileno para los insumos del catálogo. Los precios deben obtenerse consultando manualmente Sodimac, Easy o Construmart, y deben indicar la tienda de origen y la fecha de consulta. Cada precio debe especificar en qué unidad está expresado (por kilo, por plancha, por saco, por metro lineal, etc.) para que el motor los interprete correctamente.
- Criterios de Aceptación:
  - Al generar un presupuesto para 50 m² en Metalcon, el costo total está entre $3.000.000 y $15.000.000 CLP.
  - Cada insumo en el desglose muestra un precio unitario numérico, no "N/D".
  - La fecha de referencia de los precios es visible en el panel de presupuesto.
  - Si un insumo no tiene precio cargado, aparece explícitamente marcado como "sin cotización" — no en blanco.
- Dependencias: Requiere SIEC-101.

Tarea SIEC-103: Corregir el Envío de Geometría al Calcular el Presupuesto `[FRONTEND] [BACKEND]`
- Descripción: Cuando el usuario solicita calcular el presupuesto, el sistema actualmente solo envía el área total del proyecto pero no las dimensiones individuales de cada recinto. El motor de optimización de cortes necesita esas dimensiones para calcular cuántas planchas o piezas comerciales enteras se requieren. Esta tarea asegura que las dimensiones de los recintos seleccionados para el presupuesto se envíen correctamente al servidor.
- Criterios de Aceptación:
  - Al seleccionar recintos de diferentes tamaños y calcular el presupuesto, las cantidades de planchas y perfiles son distintas según las dimensiones reales de los recintos.
  - Una habitación de 3x3m y una de 5x4m producen cantidades de insumos diferentes aunque tengan el mismo tipo de material.
  - El tiempo de respuesta no aumenta más de 3 segundos respecto al comportamiento actual.
- Dependencias: Requiere SIEC-101 y SIEC-102.

Tarea SIEC-104: Corregir la Interpretación de Unidades de Precios `[BACKEND]`
- Descripción: El motor actualmente intenta adivinar la unidad en que viene cada precio del mercado y aplica conversiones internas fijas que pueden ser incorrectas, produciendo precios absurdos. La solución es que cada precio almacenado declare explícitamente su unidad, y que el motor use esa declaración en lugar de inferirla por el nombre del material.
- Criterios de Aceptación:
  - El precio unitario del cemento aparece en el rango de $4.000 a $9.000 CLP por saco de 25 kg.
  - El precio unitario de arena está en el rango de $5.000 a $25.000 CLP por metro cúbico.
  - El precio unitario de una plancha de yeso cartón está entre $5.000 y $20.000 CLP.
  - Ningún precio unitario en el desglose es menor a $1 CLP o mayor a $2.000.000 CLP.
  - Al cambiar el material estructural del proyecto, los subtotales cambian de forma coherente.
- Dependencias: Requiere SIEC-101 y SIEC-102.

---

## ÉPICA 3: INTEGRACIÓN DE DATOS DE MERCADO

### User Story HU16: Scraper de Precios y Normalización de Materiales

- Resumen: Mantener los precios del catálogo actualizados automáticamente desde tiendas retail chilenas.

#### Caso de Uso:
- Como sistema de estimación de costos
- Quiero que los precios de cada material se actualicen automáticamente desde tiendas como Sodimac o Easy
- Para que los presupuestos reflejen el mercado actual y no precios desactualizados.

#### Criterios de Aceptación:
- Escenario: Actualización nocturna de precios
- Dado que el scraper está configurado y programado para ejecutarse
- Cuando corre el proceso nocturno
- Entonces la base de datos recibe nuevos precios para al menos el 60% del catálogo de insumos, y los presupuestos generados al día siguiente usan esos precios actualizados.

#### Planificación de Tareas

Tarea T16.1: Ampliar el Scraper para Cubrir Más Categorías de Materiales `[SCRAPER]`
- Descripción: El scraper actual extrae precios de un subconjunto limitado de productos. Debe ampliarse para rastrear perfiles de Metalcon, maderas de construcción, tornillería estándar y aislantes. El proceso debe ejecutarse automáticamente de madrugada y registrar la fecha de cada precio obtenido.
- Criterios de Aceptación:
  - El scraper extrae precios de al menos 30 productos distintos en cada ejecución.
  - Cada precio registrado incluye nombre del producto, tienda, precio, y fecha de extracción.
  - El proceso se ejecuta sin intervención manual y genera un registro de errores si no puede acceder a alguna tienda.
- Dependencias: Ninguna.

Tarea T16.2: Normalizar Nombres de Productos Scrapeados contra el Catálogo Maestro `[BACKEND]`
- Descripción: Las tiendas nombran el mismo material de formas distintas ("Volcanita ST 15mm", "Yeso Cartón 15mm", "Placa ST 15"). El sistema debe identificar que estos nombres corresponden al mismo insumo del catálogo y vincularlos correctamente. Usar coincidencia por similitud de texto para hacer este cruce automáticamente.
- Criterios de Aceptación:
  - Un producto cuyo nombre en la tienda es diferente al nombre en el catálogo pero representa el mismo material queda vinculado correctamente en más del 80% de los casos.
  - No se crean entradas duplicadas del mismo material en el catálogo.
  - Los casos donde la coincidencia tiene baja confianza quedan marcados para revisión manual.
- Dependencias: Requiere T16.1 y SIEC-101.

Tarea T16.3: Integrar el Valor Diario de la UF desde la CMF `[BACKEND]`
- Descripción: El sistema usa actualmente un valor fijo de la Unidad de Fomento para las validaciones normativas. Debe conectarse a la API pública de la Comisión para el Mercado Financiero (CMF) para obtener el valor del día y actualizarlo automáticamente cada 24 horas. Si la API no responde, debe usar el último valor conocido.
- Criterios de Aceptación:
  - El valor de UF que usa el validador normativo corresponde al publicado por la CMF en la fecha actual.
  - Si la API de la CMF no responde, el sistema usa el último valor conocido (no arroja error).
  - El valor UF se actualiza automáticamente una vez al día sin intervención manual.
  - En la interfaz del validador de la Ley del Mono, se muestra el valor UF utilizado y su fecha de actualización.
- Dependencias: Ninguna.

---

## ÉPICA 4: NORMATIVA REGULATORIA (MINVU)

### User Story HU18: Información Normativa Integrada en el Presupuesto

- Resumen: El sistema debe informar al usuario sobre los requerimientos normativos que aplican a su proyecto y reflejarlos directamente en el presupuesto como insumos adicionales, sin interrumpir el flujo de trabajo con alertas bloqueantes.

#### Caso de Uso:
- Como propietario que quiere saber si su construcción es regularizable
- Quiero que el presupuesto me muestre claramente qué materiales son obligatorios por normativa y por qué
- Para entender el costo real de cumplir con la ley sin que la aplicación me interrumpa constantemente con avisos.

#### Criterios de Aceptación:
- Escenario 1: Material sin aislamiento térmico incorporado
  - Dado que el usuario eligió Metalcon o Madera como material estructural
  - Cuando genera el presupuesto
  - Entonces en la sección de revestimientos aparecen automáticamente los materiales de aislamiento térmico requeridos por la norma chilena (LOSCAT), cada uno con una etiqueta discreta que dice "Requerido por normativa"
  - Y el usuario no recibe ningún aviso emergente — la información está integrada en el desglose de forma natural.

- Escenario 2: Material que ya incluye aislamiento (SIP)
  - Dado que el usuario eligió paneles SIP
  - Cuando genera el presupuesto
  - Entonces no aparecen líneas de aislamiento adicional, y una nota breve en el desglose indica "Aislamiento incluido en el panel".

- Escenario 3: Panel informativo normativo en la interfaz
  - Dado que el usuario tiene un proyecto con material y área definidos
  - Cuando revisa el presupuesto o el panel lateral de información
  - Entonces puede ver un resumen informativo no bloqueante que indica qué normativas aplican a su proyecto (Ley del Mono, LOSCAT, LOSCAA, límite de pisos) con una descripción breve y amigable de cada una.

#### Planificación de Tareas

Tarea T18.1: Agregar Insumos Normativos al Presupuesto según el Material Elegido `[BACKEND]`
- Descripción: Cuando el motor de estimación calcula el presupuesto, debe revisar el material estructural y agregar automáticamente los insumos de aislamiento térmico que exige la normativa chilena si el material no los incluye por sí solo. Los insumos deben aparecer en el desglose normal del presupuesto con una etiqueta que los identifique como requeridos normativamente. No se deben generar alertas ni modales — la información debe ser parte del presupuesto.
- Criterios de Aceptación:
  - Con Metalcon o Madera: el presupuesto incluye al menos una línea de aislante térmico con su cantidad y costo estimado.
  - Con SIP: no se agregan líneas de aislante, y aparece una nota breve de que el aislamiento está incluido.
  - Cada línea de insumo normativo tiene una etiqueta visual que la distingue de los insumos regulares (ej: un ícono o badge de "Normativa").
  - No aparece ningún modal ni alerta emergente durante este proceso.
- Dependencias: Requiere SIEC-101 (los materiales de aislamiento deben existir en el catálogo).

Tarea T18.2: Panel Informativo de Normativas Aplicables al Proyecto `[FRONTEND]`
- Descripción: Crear una sección informativa dentro del área de trabajo (no un modal bloqueante) que muestre al usuario qué normativas aplican a su proyecto según el material elegido y el área total. Debe ser consultable a demanda, no aparecer automáticamente interrumpiendo el trabajo. El contenido es educativo y ayuda al usuario a entender qué implica construir con cada material en Chile.
- Normativas a cubrir: LOSCAT (aislamiento térmico), LOSCAA (aislamiento acústico), Ley 21.725 (regularización), límite de pisos por material.
- Criterios de Aceptación:
  - Existe un botón o sección accesible desde el área de trabajo que muestra las normativas aplicables.
  - El contenido cambia según el material estructural elegido y el área total del proyecto.
  - El panel es informativo, no bloqueante — el usuario puede ignorarlo y seguir trabajando normalmente.
  - El lenguaje es simple y orientado a propietarios no expertos, no a arquitectos.
  - Si el proyecto supera el límite de la Ley del Mono (90m² o 140m²), el panel lo indica de forma visible pero sin impedir continuar.
- Dependencias: Ninguna.

---

## ÉPICA 5: INTELIGENCIA ARTIFICIAL

### User Story HU17: Investigación de Viabilidad de Análisis Visual del Terreno

- Resumen: Evaluar si es técnica y económicamente viable incorporar análisis fotográfico del terreno donde se va a construir.

#### Caso de Uso:
- Como equipo de producto
- Quiero saber si podemos ofrecerle al usuario una herramienta para fotografiar su terreno y obtener medidas automáticas
- Para decidir si incluir este feature en el roadmap o descartarlo por inviabilidad de costos o tecnología.

#### Criterios de Aceptación:
- Escenario: Entrega de investigación técnica
  - Dado que el equipo completó el período de investigación (máximo 1 semana)
  - Cuando presenta los resultados
  - Entonces el documento entregado incluye: al menos 3 alternativas tecnológicas evaluadas, el costo por uso de cada una, los requerimientos de hardware del usuario, y una recomendación clara y justificada de continuar o descartar.

#### Planificación de Tareas

Tarea T17.1: Investigación de Modelos de Visión Computacional para Análisis de Terreno `[INVESTIGACIÓN]`
- Descripción: Investigar y documentar al menos tres alternativas para analizar fotografías del terreno del usuario y extraer información espacial útil (dimensiones aproximadas, pendiente, irregularidades). Las alternativas pueden incluir APIs de visión en la nube (como las de OpenAI o Google) y modelos que corran localmente en el dispositivo. Para cada una documentar: costo por uso, precisión esperada, limitaciones conocidas (por ejemplo, falla con terrenos sin textura visual).
- Criterios de Aceptación:
  - El documento compara al menos 3 alternativas con sus costos y limitaciones.
  - Incluye una conclusión con recomendación clara: avanzar o pausar.
  - Si se recomienda avanzar, indica cuál alternativa y por qué.
- Dependencias: Ninguna.

Tarea T17.2: Prueba de Concepto de Medición de Terreno con Tecnología AR `[INVESTIGACIÓN] [FRONTEND]`
- Descripción: Si la investigación T17.1 concluye que las APIs de visión en la nube son muy costosas o imprecisas, explorar el uso de las capacidades de realidad aumentada nativas de los teléfonos (disponibles en Android e iOS modernos) para que el usuario mida su terreno desde la aplicación apuntando con la cámara. El resultado esperado es: área estimada del terreno en metros cuadrados y pendiente aproximada.
- Criterios de Aceptación:
  - La prueba de concepto funciona en al menos un dispositivo móvil real (no simulador).
  - Al apuntar la cámara al suelo plano, el sistema estima el área de la zona visibile con un margen de error menor al 20%.
  - Si el terreno no tiene suficiente textura visual para ser analizado, la interfaz lo indica claramente y sugiere cómo mejorar la captura.
- Dependencias: Bloqueada por T17.1.

---

## ÉPICA 6: REFACTORIZACIÓN Y CALIDAD

### HU20: Refactorización del Repositorio

- Resumen: Eliminar código muerto, archivos sin uso y componentes sobredimensionados, y mejorar la comunicación de estado en la interfaz para reducir la deuda técnica acumulada.

#### Descripción:
El repositorio acumula deuda técnica visible en tres frentes: archivos de scaffolding que nunca fueron eliminados al iniciar el proyecto, una vista de configuración que creció sin estructura hasta volverse difícil de mantener, y un panel de presupuesto que no comunica claramente al usuario qué información está disponible y qué no. Esta tarea agrupa las acciones de limpieza y reorganización necesarias para dejar el proyecto en un estado mantenible antes de continuar añadiendo funcionalidades.

#### Criterios de Aceptación Generales (Definition of Done):
- El proyecto compila sin errores ni advertencias después de todos los cambios.
- Ninguna funcionalidad existente deja de funcionar tras la refactorización.
- El tamaño del bundle de producción es igual o menor al anterior.

---

#### Tareas

Tarea SIEC-105: Dividir la Vista de Configuración en Sub-secciones `[FRONTEND]`
- Descripción: La pantalla de Configuración es actualmente una sola vista de tamaño excesivo que mezcla opciones de cuenta, seguridad, preferencias del editor, exportación e integraciones. Debe reorganizarse con navegación por pestañas para que cada grupo de opciones sea una sección independiente. La sección de "Preferencias del Editor" (unidades, moneda, contingencia, impuestos) y "Exportación" (logo, pie de página) son prioritarias.
- Criterios de Aceptación:
  - Existen al menos 5 secciones navegables en la pantalla de configuración (Cuenta, Seguridad, Preferencias del Editor, Exportación, Integraciones).
  - Al hacer clic en una sección, solo carga el contenido de esa sección — el resto no se renderiza.
  - La sección activa está visualmente diferenciada de las inactivas.
  - Cambios guardados en una sección no resetean el estado visual de las otras.
  - La pantalla carga completamente en menos de 1 segundo.
  - En pantallas pequeñas, la navegación entre secciones es accesible sin scroll horizontal.
- Dependencias: Ninguna.

Tarea SIEC-106: Mejorar la Interfaz del Panel de Presupuesto para Datos Incompletos `[FRONTEND]`
- Descripción: Cuando el presupuesto se genera pero algunos materiales no tienen precio disponible, el panel actualmente muestra celdas vacías o "N/D" sin contexto. El usuario no sabe si es un error o un estado esperado. Rediseñar la presentación de resultados para comunicar claramente qué está cotizado y qué no, diferenciando visualmente las dos situaciones.
- Criterios de Aceptación:
  - El panel muestra en texto visible cuántos insumos tienen precio y cuántos no (ej: "14 de 17 insumos cotizados").
  - Los insumos sin precio tienen un badge o ícono distinto — no una celda en blanco ni "N/D" sin explicación.
  - El total general está marcado como "(parcial)" cuando al menos un insumo no tiene precio.
  - Si ningún insumo tiene precio, se muestra un estado de aviso con una explicación breve del motivo — no una tabla vacía.
- Dependencias: Ninguna.

Tarea SIEC-107: Eliminar Componentes Huérfanos y Archivos de Scaffolding `[FRONTEND]`
- Descripción: El proyecto contiene archivos que no están siendo referenciados en ninguna parte de la aplicación: el componente de ejemplo inicial generado al crear el proyecto con Vite, y posiblemente selectores o paneles duplicados por versiones más completas. Antes de eliminar cualquier archivo, verificar que no haya referencias activas a él. Documentar brevemente qué se eliminó y por qué.
- Criterios de Aceptación:
  - El componente de ejemplo/demo inicial ya no existe en el proyecto.
  - Si existen dos componentes que hacen lo mismo, solo queda el más completo o el que está en uso activo.
  - La aplicación compila y funciona correctamente tras la eliminación.
  - No aparecen errores en la consola del navegador relacionados con imports faltantes.
- Dependencias: Ninguna.

Tarea SIEC-108: Agregar Indicadores del Flujo Principal en el Área de Trabajo `[FRONTEND]`
- Descripción: El área de trabajo tiene muchos paneles activos simultáneamente sin señalizar cuál es el orden lógico de uso. Un usuario nuevo no sabe por dónde empezar. Implementar una guía visual discreta del flujo esperado: Configurar proyecto → Diseñar recintos → Revisar en 3D → Seleccionar recintos → Generar presupuesto → Exportar. La guía debe ser colapsable para no molestar a usuarios avanzados.
- Criterios de Aceptación:
  - Los pasos del flujo principal son visibles en el área de trabajo, numerados u ordenados.
  - El paso actual está destacado según el estado real del proyecto (si no hay recintos, el paso activo es "Diseñar recintos"; si hay recintos pero no presupuesto, el activo es "Generar presupuesto", etc.).
  - El indicador puede ocultarse manualmente y no reaparece en la misma sesión si el usuario lo cierra.
  - Un usuario sin experiencia previa puede generar su primer presupuesto en menos de 5 minutos siguiendo las señales visuales.
- Dependencias: Ninguna.
