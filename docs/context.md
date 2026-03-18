# Contexto de Proyecto: Sistema Inteligente de Estimación de Costos (SIEC)

## 1. Visión General
SIEC es una plataforma web orientada a la estimación de costos de construcción residencial y visualización paramétrica en 3D. El sistema permite al usuario configurar los parámetros de una vivienda (m², recintos, materialidad), visualizarlos instantáneamente en 3D mediante generación procedimental, y obtener un presupuesto detallado basado en el cruce de métricas de rendimiento constructivo y precios reales del mercado obtenidos mediante web scraping.

## 2. Stack Tecnológico Decidido
* **Frontend / UI:** HTML/CSS/JS (o framework compatible seleccionado por el equipo, ej. React/Vue).
* **Motor 3D:** Three.js (WebGL nativo). *Nota crítica: Se descartó Unity por problemas de peso y comunicación. Todo el 3D debe programarse en JavaScript/TypeScript.*
* **Backend:** Arquitectura orientada a microservicios (REST API).
* **Base de Datos:** Relacional (MySQL/PostgreSQL).
* **Persistencia Local:** LocalStorage (máximo 3 simulaciones por usuario, límite de peso 50 KB por registro).

## 3. Lógicas de Negocio Críticas (Core Mechanics)

### A. Sistema de Validación Espacial (Tokens)
El espacio de la vivienda se gestiona como una economía de recursos para gamificar y validar la UX:
* 1 m² ingresado por el usuario = 1 Token de presupuesto espacial.
* Cada tipo de recinto tiene un "costo" en tokens (ej. Baño = 4 tokens, Habitación = 9 tokens).
* **Regla:** El frontend debe bloquear la adición de nuevos recintos si el costo supera el saldo de tokens disponibles.

### B. Matriz de Rendimientos Constructivos (Base de Datos)
El código backend NO debe contener multiplicadores *hardcodeados*. Debe consultar una tabla relacional que cruza `Material_Estructural` e `Insumo` con un `Factor_Multiplicador`.
* *Ejemplo:* 1 m² de Albañilería requiere 0.5 sacos de cemento.
* La API multiplica los m² ingresados por el usuario por este factor para obtener la cantidad matemática de insumos (Obra Gruesa, Instalaciones y Mano de Obra).

### C. Estrategia de Precios (Web Scraping)
* **Frecuencia:** Un cronjob extrae precios cada 24 horas.
* **Fuentes:** Tiendas retail (Sodimac, Easy, Construmart).
* **Geolocalización:** Estrictamente filtrado para sucursales de la Región de Valparaíso.
* **Regla de Seguridad:** El motor de cálculo JAMÁS hace scraping en tiempo real. Lee exclusivamente de la tabla interna de la base de datos. Si un precio varía más del 200% o cae por debajo del 50% de un día a otro, se descarta la actualización.

## 4. Requisitos No Funcionales (RNF) Prioritarios
1.  **Rendimiento 3D:** El recálculo y actualización del modelo Three.js debe ocurrir en < 20 segundos. Debe usar *Object Pooling* (reciclaje de mallas) y la caché de posiciones no debe superar los 100 KB.
2.  **Rendimiento API:** El backend debe responder con el cálculo y desglose en < 2.5 segundos.
3.  **Rendimiento Caché:** La lectura de LocalStorage y renderizado de la tabla de historial debe ejecutarse en < 50 milisegundos sin bloquear el Main Thread.

## 5. Modelo Entidad-Relación Base (Borrador)
1.  `Material_Estructural` (ID, Nombre) -> Madera, Metalcom, Albañilería, Hormigón Armado.
2.  `Tipo_Recinto` (ID, Nombre, Costo_Tokens).
3.  `Insumo` (ID, Nombre, Categoria).
4.  `Matriz_Rendimiento` (ID, ID_Material, ID_Recinto, ID_Insumo, Unidad_Medida, Factor_Multiplicador).
5.  `Precio_Mercado` (ID, ID_Insumo, Precio_CLP, Tienda_Origen, Fecha_Scraping).

## 6. Estado Actual del Desarrollo: Sprint 1
**Objetivo del Sprint:** Validar la viabilidad técnica del sistema,decidiendo stack y creacion de tareas especificas

**Historias de Usuario**
Épica 1: Motor de Simulación y Parametrización
HU01 - Configuración de Parámetros Base
Como usuario, quiero ingresar los m² totales, la cantidad y tipo de recintos (habitaciones, baños, áreas comunes) y el material estructural, para establecer las variables fundamentales del proyecto de construcción.
Criterios de Aceptación:
Los parámetros configurados deben guardarse correctamente en la base de datos para que el motor de cálculo y el entorno 3D puedan procesarlos.
El selector de material estructural debe ofrecer exactamente cuatro opciones base: Madera, Metalcom, Albañilería y Hormigón Armado.
HU02 - Generación Volumétrica 3D
Como usuario, quiero que el sistema construya y renderice automáticamente el modelo 3D de la vivienda al procesar mis parámetros, para validar visualmente la distribución espacial y volumetría calculada.
Criterios de Aceptación:
El modelo 3D debe instanciarse en pantalla generando exactamente la cantidad de habitaciones y baños definidos en el input.
La cámara del entorno 3D debe centrarse automáticamente y mostrar el 100% del modelo generado.
Todos los assets mostrados deben formar parte del recinto.
HU03 - Cálculo Dinámico del Modelo
Como usuario, quiero modificar cualquier parámetro del formulario y ver el modelo 3D actualizarse en menos de 20 segundos, para iterar rápidamente sobre distintas configuraciones de vivienda.
Criterios de Aceptación:
Un cambio en el input (ej. sumar un baño) debe disparar la regeneración del modelo 3D sin necesidad de recargar la página completa.
HU11 - Sistema de Validación Espacial por Tokens 
Como usuario, quiero que el sistema me asigne un presupuesto de tokens basado en los m² totales y me descuente tokens por cada recinto configurado, para asegurar visualmente que la cantidad de habitaciones cabe en el espacio disponible. 
Criterios de Aceptación: 
El sistema debe establecer una equivalencia de 1 token por cada metro cuadrado ingresado en los parámetros iniciales. 
La configuración del sistema debe definir un costo fijo en tokens para cada tipo de recinto (Habitaciones, Baños, Áreas Comunes). 
La interfaz debe mostrar un contador de espacio disponible que bloquee la adición de nuevos recintos si el saldo de tokens es insuficiente.
Épica 2: Motor de Estimación y Costos
HU04 - Cálculo y Desglose Total de Insumos
Como usuario, quiero visualizar el costo total del proyecto y un desglose completo de todos los insumos requeridos, para analizar la factibilidad financiera exacta de la configuración actual.
Criterios de Aceptación:
La interfaz debe mostrar el valor monetario total actualizado.
Debe existir un panel o tabla que liste todos los insumos calculados (fierro, cemento, agua, cableado, tuberías) con su cantidad específica y precio unitario aplicado.
HU05 - Estimación de Mano de Obra
Como usuario, quiero que el cálculo total integre automáticamente una estimación del costo de mano de obra, para que el presupuesto refleje el costo real de ejecución y no solo de materiales.
Criterios de Aceptación:
El algoritmo debe aplicar multiplicadores de horas-hombre basándose en los m² y la complejidad de los recintos.
El costo de mano de obra debe aparecer como un ítem separado dentro del desglose general.
HU10 - Matriz de Rendimientos Constructivos
Como analista de costos, quiero que el sistema consulte una tabla de métricas en la base de datos que defina cuánto insumo se gasta por unidad (ej. 0.5 sacos de cemento por m² de albañilería), para que el motor de cálculo sea dinámico y los multiplicadores no estén fijos en el código fuente.
Criterios de Aceptación:
La base de datos debe contener una tabla relacional que asocie cada Material Estructural Base (Madera, Metalcom, etc.) con su factor de rendimiento por m².
El endpoint de estimación debe multiplicar los m² ingresados por el usuario por el factor de rendimiento consultado en esta tabla.
Épica 3: Integración de Datos de Mercado
HU06 - Motor de Web Scraping Automatizado 
Como administrador del sistema, quiero que un proceso en segundo plano extraiga periódicamente los precios de materiales desde los catálogos web de Sodimac, Easy y Construmart, para alimentar la base de datos interna sin intervención manual. 
Criterios de Aceptación: 
El script de scraping debe ejecutarse de forma automática y programada exactamente una vez cada 24 horas. 
La extracción debe parametrizarse para capturar obligatoriamente el stock y los precios correspondientes a los proveedores en Chile. 
El sistema debe insertar o actualizar los datos en la base de datos relacional completando estrictamente los campos requeridos (ID, Nombre, Precio, Unidad, Tienda, Fecha).
HU07 - Resiliencia y Tolerancia a Fallos del Scraper 
Como administrador del sistema, quiero que el proceso de scraping maneje los errores de red o bloqueos de las tiendas retail, para garantizar que la base de datos nunca quede vacía o corrupta.
Criterios de Aceptación: 
Si el scraper no recibe respuesta HTTP 200 de una tienda en un máximo de 30 segundos, debe abortar la conexión y registrar el error en un log interno.
Si falla la extracción de un material específico, el sistema tiene prohibido sobreescribir el dato anterior con nulos o ceros, manteniendo el último precio válido.
Si el nuevo precio extraído representa una variación ilógica (mayor al 200% o menor al 50% respecto al día anterior), el sistema debe descartar la actualización.
HU08 - Consumo de Precios para el Presupuesto 
Como usuario, quiero que el cálculo total de mi simulación utilice los datos recopilados por el scraper, para obtener un valor financiero apegado a la realidad del mercado actual.
Criterios de Aceptación: 
El motor de cálculo debe consultar los precios exclusivamente desde la base de datos relacional interna (no realizar peticiones de scraping durante la simulación)
La interfaz gráfica debe mostrar un texto visible que indique la fecha de actualización de los últimos precios utilizados.
Si existen múltiples precios para un mismo material estructural base, el motor de cálculo debe utilizar el valor promedio para la estimación final.
HU09 - Historial de Simulaciones
Como usuario, quiero acceder a una vista con el listado de mis simulaciones guardadas, para revisar, comparar o retomar estimaciones anteriores.
Criterios de Aceptación:
El usuario, tras ver su modelo 3D y su presupuesto, puede persistir esa data para que se guarden temporalmente en el navegador (LocalStorage) y no perderla al cerrar la pestaña.
La pestaña debe mostrar el nombre o ID de la simulación, fecha de creación y costo total guardado.
Al hacer clic en un registro, el sistema debe cargar los parámetros exactos y regenerar el modelo 3D correspondiente.
El sistema debe limitar el historial a un máximo estricto de 3 simulaciones guardadas, sobrescribiendo automáticamente el registro más antiguo al intentar guardar una cuarta. 
El tiempo de lectura del almacenamiento local y renderización de la tabla en la interfaz no debe superar los 500 milisegundos

