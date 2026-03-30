Épica 1: Motor de Simulación y Parametrización
HU01 - Configuración de Parámetros Base
Como usuario, quiero ingresar los m² totales, la cantidad y tipo de recintos (habitaciones, baños, áreas comunes) y el material estructural, para establecer las variables fundamentales del proyecto de construcción.
Criterios de Aceptación:
Los parámetros configurados deben guardarse correctamente en la base de datos para que el motor de cálculo y el entorno 3D puedan procesarlos.
El selector de material estructural debe ofrecer exactamente cuatro opciones base: Madera, Metalcom, Albañilería y Hormigón Armado.
HU02 - Generación Volumétrica y Topológica 3D
Como usuario, quiero que el sistema calcule una distribución en planta (2D) continua y la renderice como un modelo 3D modular interactivo, para validar visualmente la volumetría y poder ajustar las dimensiones arrastrando los muros.
Criterios de Aceptación:
El modelo generará una planta geométrica unificada que encaje exactamente la cantidad de recintos en el área total (`m2Totales`) sin superposiciones.
El sistema debe identificar matemáticamente los tabiques interiores compartidos y los muros exteriores para no duplicar metraje.
La interfaz permitirá al usuario redimensionar los recintos gráficamente (arrastrando aristas), respetando un tamaño mínimo y bloqueándose si se intenta achicar más del límite.
La cámara del entorno 3D (Three.js) debe centrarse automáticamente abarcando el 100% de la vivienda.
HU03 - Cálculo Dinámico del Modelo
Como usuario, quiero modificar cualquier parámetro del formulario y ver el modelo 3D actualizarse en menos de 20 segundos, para iterar rápidamente sobre distintas configuraciones de vivienda.
Criterios de Aceptación:
Un cambio en el input (ej. sumar un baño) debe disparar la regeneración del modelo 3D sin necesidad de recargar la página completa.
HU11 - Sistema de Validación Espacial por Tokens 
Como usuario, quiero que el sistema asigne un presupuesto de m² (1 token = 1 m²) y aplique un descuento inicial por recintos configurados, garantizando coherencia geométrica base.
Criterios de Aceptación: 
El sistema usará el costo parametrizado en tokens (desde la BD `Tipo_Recinto`) como la reserva espacial inicial al cargar el modelo.
Ese mismo valor numérico actuará como el "área geométrica mínima" inquebrantable que un recinto podrá tener cuando el usuario interactúe con el modelo 3D en la HU02.
El backend (FastAPI) no grabará simulaciones cuya sumatoria inicial de tokens requeridos sea mayor a los m² totales elegidos.
La interfaz web contará con un contador moderno y robusto de capacidad, bloqueando inputs de texto en caso de insolvencia espacial.
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
El tiempo de lectura del almacenamiento local y renderización de la tabla en la interfaz no debe superar los 500 milisegundos.
