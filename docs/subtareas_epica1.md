# Subtareas — Épica 1: Motor de Simulación y Parametrización

Desglose de tareas específicas para cada Historia de Usuario de la **Épica 1** del proyecto **SIEC**.

---

## HU01 — Configuración de Parámetros Base

> **Como** usuario, **quiero** ingresar los m² totales, la cantidad y tipo de recintos y el material estructural, **para** establecer las variables fundamentales del proyecto de construcción.

---

### T-1.1 — Input de Metros Cuadrados Totales
**Categoría:** Frontend / UI · **Complejidad:** Baja

**Descripción:**
Diseñar y maquetar un campo de entrada numérico en el formulario de configuración que permita al usuario ingresar los metros cuadrados totales de la vivienda. El campo debe aceptar únicamente valores enteros positivos con un mínimo razonable (ej. ≥ 15 m²) y un máximo definido. Debe incluir etiqueta descriptiva y placeholder orientativo.

**Validación:**
- El campo solo acepta números enteros positivos.
- Si el usuario ingresa un valor fuera del rango permitido, se muestra un mensaje de error inmediato.
- El valor ingresado queda almacenado en el estado del formulario y disponible para las demás tareas.

---

### T-1.2 — Selector de Material Estructural
**Categoría:** Frontend / UI · **Complejidad:** Baja

**Descripción:**
Implementar un componente de selección restringido (dropdown o select) que ofrezca exactamente las 4 opciones de material estructural base del sistema: Madera, Metalcom, Albañilería y Hormigón Armado. El selector no debe permitir valores vacíos, opciones adicionales, ni texto libre.

**Validación:**
- El componente despliega exactamente 4 opciones: Madera, Metalcom, Albañilería, Hormigón Armado.
- No es posible dejar el campo sin selección (debe tener un valor por defecto o forzar selección).
- El valor seleccionado se persiste correctamente en el estado del formulario.

---

### T-1.3 — Contadores de Recintos por Tipo
**Categoría:** Frontend / UI · **Complejidad:** Baja

**Descripción:**
Crear controles de tipo contador (botones +/−) para que el usuario defina la cantidad de cada tipo de recinto: Habitaciones, Baños y Áreas Comunes. Cada contador debe mostrar el valor actual y no permitir valores negativos (mínimo 0).

**Validación:**
- Se muestran 3 contadores independientes: Habitaciones, Baños, Áreas Comunes.
- El botón "−" se deshabilita o no tiene efecto cuando el valor es 0.
- El botón "+" incrementa el valor en 1 por cada clic.
- Los valores son enteros positivos o cero.

---

### T-1.4 — Validación del Formulario
**Categoría:** Frontend / UI · **Complejidad:** Baja

**Descripción:**
Implementar lógica de validación sobre todos los campos del formulario de configuración: m² totales, material estructural y contadores de recintos. Al detectar un campo inválido o incompleto, el sistema debe resaltar el campo y mostrar un mensaje de error contextual sin necesidad de enviar el formulario.

**Validación:**
- Los campos requeridos muestran error si están vacíos al intentar continuar.
- Los rangos numéricos inválidos (m² fuera de rango, valores negativos) son detectados al instante.
- Los mensajes de error son visibles, comprensibles y desaparecen al corregir el campo.
- El botón de envío/guardar se deshabilita mientras existan errores de validación.

---

### T-1.5 — Tabla de Tipos de Recinto en Base de Datos
**Categoría:** Backend / BD · **Complejidad:** Baja

**Descripción:**
Crear la tabla `Tipo_Recinto` en la base de datos relacional con los campos `(ID, Nombre, Costo_Tokens)`. Poblarla con los datos semilla iniciales: Habitación, Baño y Área Común, cada uno con su costo de tokens asignado según las reglas de negocio definidas en el contexto.

**Validación:**
- La tabla `Tipo_Recinto` existe en la BD con los 3 campos indicados.
- Contiene al menos 3 registros: Habitación, Baño y Área Común.
- Cada registro tiene un `Costo_Tokens` mayor a 0.
- La estructura soporta consultas desde el endpoint de la API.

---

### T-1.6 — Tabla de Materiales Estructurales en Base de Datos
**Categoría:** Backend / BD · **Complejidad:** Baja

**Descripción:**
Crear la tabla `Material_Estructural` en la base de datos relacional con los campos `(ID, Nombre)`. Insertarle los 4 materiales base del sistema: Madera, Metalcom, Albañilería y Hormigón Armado.

**Validación:**
- La tabla `Material_Estructural` existe en la BD con los campos `ID` y `Nombre`.
- Contiene exactamente 4 registros correspondientes a los materiales definidos.
- Los nombres coinciden exactamente con los establecidos en el contexto del proyecto.

---

### T-1.7 — Tabla de Configuración de Simulación
**Categoría:** Backend / BD · **Complejidad:** Media

**Descripción:**
Crear la tabla `Configuracion_Simulacion` (o equivalente) que persista los parámetros completos de cada simulación creada por el usuario. Debe almacenar: m² totales, ID del material estructural seleccionado, cantidad de cada tipo de recinto (habitaciones, baños, áreas comunes), y la fecha de creación del registro. Definir claves foráneas hacia `Material_Estructural`.

**Validación:**
- La tabla existe con todos los campos requeridos: m² totales, FK al material, cantidades de recintos, fecha de creación.
- La clave foránea a `Material_Estructural` mantiene integridad referencial (no se permite un material inexistente).
- Un registro insertado directamente en BD es legible y contiene todos los campos sin nulos donde no corresponde.

---

### T-1.8 — Endpoint de Guardado de Parámetros
**Categoría:** Backend / API · **Complejidad:** Media

**Descripción:**
Desarrollar el endpoint REST `POST /api/simulacion/parametros` que reciba en el cuerpo de la petición los parámetros de configuración (m² totales, material estructural, cantidad de cada tipo de recinto), los valide en el servidor, los persista en la tabla `Configuracion_Simulacion`, y retorne el ID de la simulación creada junto con un código de estado 201.

**Validación:**
- El endpoint responde con código 201 y el ID de la simulación al recibir datos válidos.
- Si faltan campos obligatorios o los valores son inválidos, responde con código 400 y un mensaje de error descriptivo.
- Los datos quedan correctamente persistidos en la BD tras la llamada.
- El ID del material estructural enviado debe existir en la tabla `Material_Estructural` (validación de FK).

---

### T-1.9 — Endpoint de Lectura de Parámetros
**Categoría:** Backend / API · **Complejidad:** Baja

**Descripción:**
Desarrollar el endpoint REST `GET /api/simulacion/:id/parametros` que, dado el ID de una simulación, retorne todos sus parámetros de configuración almacenados: m² totales, material estructural (nombre e ID), cantidad de cada tipo de recinto y fecha de creación.

**Validación:**
- El endpoint retorna código 200 y un JSON con todos los parámetros al consultar un ID existente.
- Si el ID no existe, responde con código 404 y un mensaje de error claro.
- Los datos retornados coinciden exactamente con los persistidos en la BD.

---

### T-1.10 — Conexión Formulario-Backend
**Categoría:** Integración · **Complejidad:** Media

**Descripción:**
Conectar el formulario de configuración del frontend con el endpoint `POST /api/simulacion/parametros` del backend. Implementar el manejo de los tres estados de la petición: carga (loading con indicador visual), éxito (confirmación y navegación o actualización de vista), y error (mostrar mensaje del servidor al usuario).

**Validación:**
- Al enviar el formulario, se muestra un indicador de carga mientras la petición está en curso.
- Tras una respuesta exitosa (201), el usuario recibe confirmación visual y el sistema almacena el ID de simulación retornado.
- Ante un error del servidor (4xx/5xx), se muestra un mensaje de error comprensible sin que la página se rompa.
- No se permiten envíos múltiples simultáneos (el botón se deshabilita durante el loading).

---
---
## HU02 — Generación Volumétrica 3D

> **Como** usuario, **quiero** que el sistema construya y renderice automáticamente el modelo 3D de la vivienda, **para** validar visualmente la distribución espacial y volumetría calculada.

> **🔬 Estado: Validación técnica en curso.** Antes de definir las subtareas finales de esta HU, se ejecutan 2 tareas preliminares en paralelo para confirmar la viabilidad del enfoque y seleccionar el repositorio base definitivo.

---

### T-2.POC — Prueba de Concepto: Motor de Paredes con blueprint-js
**Categoría:** Spike / POC · **Complejidad:** Media · **Estimación:** 1-2 horas (asistido por IA)

**Descripción:**
Construir una prueba de concepto funcional que valide la viabilidad de usar [`aalavandhaann/blueprint-js`](https://github.com/aalavandhaann/blueprint-js) (MIT, 579 ⭐) como base del motor 3D de SIEC. La POC debe demostrar el flujo completo:
1. Clonar el repositorio y extraer los módulos de renderizado de paredes (`model/`, `three/`).
2. Reemplazar la edición manual 2D por generación automática: dado un set de parámetros hardcodeados (ej. 2 habitaciones, 1 baño, 80 m²), generar las coordenadas de paredes en metros.
3. Renderizar las paredes con grosor real, esquinas automáticas y pisos diferenciados por recinto.
4. Aplicar estilo visual inspirado en *Foundation* (materiales low-poly, colores cálidos, sombras suaves).
5. Incluir OrbitControls y auto-encuadre de cámara.

**Entregable:** Una página HTML funcional autocontenida que al abrirse muestre el modelo 3D de una vivienda generada automáticamente a partir de parámetros fijos, con paredes realistas, esquinas, pisos y estilo visual profesional.

**Validación:**
- La POC se ejecuta en el navegador sin errores.
- Se visualizan paredes con grosor y altura real (no planos infinitamente delgados).
- Las esquinas se generan automáticamente donde se juntan dos paredes.
- Los recintos son diferenciables por color/material.
- Las dimensiones corresponden a metros reales parametrizados.
- El estilo visual es profesional y atractivo.
- OrbitControls y auto-encuadre funcionan correctamente.

---

### T-2.INV — Investigación de Repositorios Alternativos
**Categoría:** Investigación / Spike · **Complejidad:** Baja

**Descripción:**
En paralelo a la POC, investigar y documentar al menos 3 repositorios open-source alternativos a blueprint-js que podrían servir como base del motor 3D de SIEC. Evaluar cada uno según los criterios específicos del proyecto: paredes con grosor real, dimensiones en metros, esquinas automáticas, generación paramétrica (no edición manual), licencia permisiva (MIT/Apache), estado de mantenimiento, y facilidad de integración. Incluir enlaces, screenshots si es posible, y una recomendación comparativa.

**Entregable:** Documento con la evaluación comparativa de al menos 3 alternativas, con pros/contras y recomendación.

**Validación:**
- Se documentan al menos 3 repos alternativos con URL, licencia y descripción.
- Cada repo se evalúa contra los criterios de SIEC (paredes reales, metros, esquinas, paramétrico).
- Existe una recomendación clara con justificación.

---

> **📋 Nota:** Una vez completadas estas 2 tareas, se definirán las subtareas finales de HU02 basándose en los resultados de la POC y la investigación. Las 5 subtareas detalladas previamente se mantienen como referencia en el [análisis de repos](../../.gemini/antigravity/brain/dca0adf9-56df-4bfc-9684-6990c3ee58ea/analisis_hu2_repos.md).

---




## HU03 — Cálculo Dinámico del Modelo

> **Como** usuario, **quiero** modificar cualquier parámetro del formulario y ver el modelo 3D actualizarse en menos de 20 segundos, **para** iterar rápidamente sobre distintas configuraciones.

---

### T-3.1 — Listeners Reactivos con Debounce
**Categoría:** Frontend / Motor 3D · **Complejidad:** Media

**Descripción:**
Implementar event listeners en todos los inputs del formulario de configuración (m², contadores de recintos, selector de material) que disparen la regeneración del modelo 3D sin necesidad de recargar la página completa. Incorporar un mecanismo de debounce (retardo de ~300-500ms) para evitar actualizaciones excesivas cuando el usuario modifica los valores rápidamente.

**Validación:**
- Al cambiar cualquier parámetro (m², sumar un baño, cambiar material), el modelo 3D se regenera automáticamente.
- No se recarga la página durante la actualización.
- Si el usuario hace clic rápidamente varias veces en "+", el modelo solo se regenera una vez tras la estabilización del input (debounce funcional).
- No se producen errores en consola durante las actualizaciones.

---

### T-3.2 — Sistema de Object Pooling
**Categoría:** Motor 3D · **Complejidad:** Alta

**Descripción:**
Implementar un sistema de Object Pooling en Three.js que mantenga un pool de mallas (meshes) precreadas. En cada regeneración del modelo, las mallas existentes deben reciclarse (reposicionar, re-escalar, cambiar material) en lugar de destruirse y crearse nuevas, reduciendo drásticamente el costo de garbage collection y creación de objetos. Este sistema es esencial para cumplir el requisito no funcional de regeneración en menos de 20 segundos.

**Validación:**
- En una regeneración, no se crean nuevos objetos Three.js si hay suficientes en el pool; se reciclan los existentes.
- Las mallas no utilizadas se ocultan (visible = false) en lugar de destruirse.
- Si se necesitan más mallas de las disponibles en el pool, se crean nuevas y se agregan al pool.
- El tiempo de regeneración del modelo es consistentemente inferior a 20 segundos (medido con performance.now()).

---

### T-3.3 — Gestión de Memoria y Caché de Posiciones
**Categoría:** Motor 3D · **Complejidad:** Media

**Descripción:**
Implementar control de memoria en el cliente asegurando que la caché de posiciones de geometrías no supere el límite de 100 KB establecido en los RNF. Agregar rutinas de limpieza (dispose) para geometrías, materiales y texturas huérfanas que ya no se referencien en la escena, evitando memory leaks progresivos.

**Validación:**
- La caché de posiciones medida en el navegador no supera los 100 KB.
- Tras múltiples regeneraciones consecutivas, el consumo de memoria no crece indefinidamente (no hay memory leaks).
- Al inspeccionar el performance monitor del navegador, la memoria se mantiene estable durante ciclos de cambio de parámetros.
- Los objetos Three.js eliminados (geometrías, materiales) son correctamente liberados con `.dispose()`.

---

### T-3.4 — Indicador Visual de Regeneración
**Categoría:** Frontend / UI · **Complejidad:** Baja

**Descripción:**
Implementar un indicador visual (spinner, barra de progreso o overlay semitransparente) que se muestre sobre el canvas 3D mientras el modelo está siendo regenerado. Debe dar feedback claro al usuario de que el sistema está procesando y no se ha congelado.

**Validación:**
- Al iniciar una regeneración del modelo, aparece un indicador visual de carga.
- El indicador desaparece automáticamente cuando la regeneración finaliza.
- El indicador no bloquea la interacción con el formulario (el usuario puede seguir editando parámetros).
- Es visible y comprensible (no es un cambio sutil que pase desapercibido).

---

### T-3.5 — Pruebas de Rendimiento de Regeneración
**Categoría:** QA / Testing · **Complejidad:** Media

**Descripción:**
Realizar pruebas de rendimiento sistemáticas usando las herramientas de profiling del navegador (Chrome DevTools Performance tab). Medir el tiempo de regeneración del modelo 3D al agregar y quitar recintos en diferentes configuraciones (pocos recintos, muchos recintos, cambios de material). Documentar los resultados y verificar el cumplimiento del RNF de regeneración en menos de 20 segundos.

**Validación:**
- Existe un documento o reporte con las mediciones de tiempo de regeneración para al menos 3 configuraciones distintas.
- Todas las mediciones están por debajo de 20 segundos.
- Se identifican los cuellos de botella principales (si los hay) y se documentan posibles optimizaciones.
- Las pruebas son reproducibles por cualquier miembro del equipo.

---

### T-3.6 — Prueba de Estrés del Renderer
**Categoría:** QA / Testing · **Complejidad:** Media

**Descripción:**
Configurar escenarios de prueba de estrés donde se utilice el máximo razonable de recintos (según el límite de tokens) y se realicen múltiples ciclos de regeneración consecutivos. Verificar que no se producen memory leaks, crashes del renderer WebGL, ni degradación progresiva del rendimiento.

**Validación:**
- El sistema no crashea ni muestra errores WebGL tras 20+ ciclos consecutivos de regeneración.
- La memoria del tab del navegador se mantiene estable (sin crecimiento indefinido) tras los ciclos.
- El tiempo de regeneración no se degrada significativamente entre el primer y el último ciclo.
- No se producen consumos extremos de GPU que causen congelamiento del navegador.

---
---

## HU11 — Sistema de Validación Espacial por Tokens

> **Como** usuario, **quiero** que el sistema me asigne un presupuesto de tokens basado en los m² y me descuente por cada recinto, **para** asegurar que las habitaciones caben en el espacio disponible.

---

### T-11.1 — Inicialización del Presupuesto de Tokens
**Categoría:** Lógica de Negocio / Frontend · **Complejidad:** Baja

**Descripción:**
Implementar la regla de inicialización del presupuesto espacial donde 1 metro cuadrado ingresado equivale a 1 token. El valor total de tokens disponibles debe actualizarse reactivamente cada vez que el usuario modifique el campo de m² totales. Si el usuario reduce los m² por debajo de los tokens ya consumidos, debe señalizarse el conflicto.

**Validación:**
- Al ingresar 80 m², el sistema muestra 80 tokens disponibles.
- Al cambiar el valor de m² a 60, los tokens disponibles se actualizan inmediatamente a 60.
- La equivalencia es exactamente 1:1 (1 m² = 1 token).
- Si los tokens consumidos superan el nuevo total, el sistema lo indica visualmente.

---

### T-11.2 — Mapa de Costos de Tokens por Recinto
**Categoría:** Lógica de Negocio / Frontend · **Complejidad:** Baja

**Descripción:**
Crear un diccionario o mapa que defina el costo en tokens de cada tipo de recinto, consumiendo los valores desde la tabla `Tipo_Recinto.Costo_Tokens` de la base de datos (o desde una configuración del sistema cargada al inicio). Los valores deben ser configurables desde la BD (ej. Baño = 4 tokens, Habitación = 9 tokens, Área Común = variable).

**Validación:**
- El mapa de costos contiene una entrada para cada tipo de recinto existente en el sistema.
- Los valores provienen de la BD o configuración y no están hardcodeados en el frontend.
- Al modificar un costo en la BD y recargar, el frontend refleja el nuevo valor.
- Los costos son números enteros positivos mayores a 0.

---

### T-11.3 — Cálculo Reactivo del Saldo de Tokens
**Categoría:** Lógica de Negocio / Frontend · **Complejidad:** Baja

**Descripción:**
Programar la función de cálculo del saldo de tokens aplicando la fórmula: `Saldo = Tokens_Iniciales − Σ(Costo_Token_i × Cantidad_Recinto_i)`. El cálculo debe ejecutarse reactivamente cada vez que el usuario modifique cualquier parámetro (m² totales o cantidad de recintos) y debe exponer el resultado para su uso por la UI y la lógica de bloqueo.

**Validación:**
- Con 80 m² (80 tokens), 2 Habitaciones (9 c/u) y 1 Baño (4), el saldo calculado es: 80 − (2×9 + 1×4) = 58 tokens.
- El saldo se recalcula al instante al agregar o quitar cualquier recinto.
- El saldo se recalcula al instante al modificar los m² totales.
- El saldo nunca muestra valores incorrectos o desfasados.

---

### T-11.4 — Bloqueo Condicional de Contadores
**Categoría:** Lógica de Negocio / Frontend · **Complejidad:** Media

**Descripción:**
Implementar la lógica que deshabilite el botón "+" de cada tipo de recinto cuando el saldo de tokens disponible sea menor que el costo de agregar una unidad adicional de ese recinto específico. Los botones "−" siempre deben permanecer habilitados mientras la cantidad del recinto sea mayor a 0. Esta lógica debe evaluarse tras cada cambio de parámetros.

**Validación:**
- Si el saldo es 7 y el costo de una habitación es 9, el botón "+" de habitación está deshabilitado.
- Si el saldo es 7 y el costo de un baño es 4, el botón "+" de baño permanece habilitado.
- El botón "−" funciona normalmente mientras la cantidad sea > 0, independientemente del saldo.
- Al liberar tokens (eliminar un recinto), los botones "+" se re-habilitan si el saldo es suficiente.

---

### T-11.5 — Componente Visual de Tokens
**Categoría:** UI · **Complejidad:** Media

**Descripción:**
Diseñar e implementar un componente de interfaz que muestre el estado del presupuesto de tokens de forma visual y clara. Debe incluir: tokens totales, tokens consumidos y tokens disponibles. Puede implementarse como barra de progreso, indicador circular, o contador numérico con barra. El componente debe cambiar de color al acercarse al límite (ej. verde → amarillo → rojo).

**Validación:**
- El componente muestra correctamente los tres valores: total, consumidos y disponibles.
- Los valores se actualizan en tiempo real al modificar parámetros.
- El componente cambia de apariencia visual (color/estado) al acercarse al límite de tokens.
- Es legible y comprensible sin necesidad de explicación (diseño autoexplicativo).

---

### T-11.6 — Feedback de Tokens Insuficientes
**Categoría:** UI · **Complejidad:** Baja

**Descripción:**
Mostrar retroalimentación visual al usuario cuando intente agregar un recinto sin tener tokens suficientes. El feedback puede ser un tooltip explicativo, una animación de shake en el botón deshabilitado, un mensaje contextual tipo toast, o una combinación de estos. El objetivo es que el usuario entienda por qué no puede agregar más recintos.

**Validación:**
- Al hacer clic en un botón "+" deshabilitado (o al intentar interactuar con él), se muestra un mensaje claro indicando que no hay tokens suficientes.
- El mensaje indica cuántos tokens faltan o cuál es el costo del recinto vs. el saldo disponible.
- El feedback es no intrusivo (no bloquea la interfaz, no requiere cerrar un modal).
- Desaparece automáticamente o cuando el usuario interactúa con otra parte de la interfaz.

---

### T-11.7 — Indicador de Costo por Recinto
**Categoría:** UI · **Complejidad:** Baja

**Descripción:**
Mostrar junto a cada tipo de recinto en el formulario su costo en tokens, para que el usuario pueda planificar la distribución de espacios antes de agregar recintos. La información debe ser visible de forma permanente (no solo en hover) y actualizarse si los costos provienen dinámicamente de la BD.

**Validación:**
- Junto a cada contador de recinto (Habitación, Baño, Área Común) se muestra texto como "Costo: X tokens".
- Los valores mostrados coinciden con los definidos en la BD / configuración.
- La información es visible sin necesidad de interacción (no solo en hover o tooltip).
- Si los costos cambian en la BD y se recarga la página, los valores mostrados se actualizan.

---
---

## Resumen de Tareas

| HU | Nombre | Tareas | Baja | Media | Alta |
|----|--------|--------|------|-------|------|
| HU01 | Configuración de Parámetros Base | 10 | 6 | 3 | 0 |
| HU02 | Generación Volumétrica 3D *(preliminar)* | 2 | 1 | 1 | 0 |
| HU03 | Cálculo Dinámico del Modelo | 6 | 1 | 4 | 1 |
| HU11 | Validación Espacial por Tokens | 7 | 4 | 2 | 0 |
| **Total** | | **25** | **12** | **10** | **1** |

> **🔬 Nota:** La HU02 tiene actualmente solo 2 tareas preliminares (POC + Investigación). Las subtareas finales se definirán tras validar la viabilidad de la POC con blueprint-js y evaluar los repos alternativos. La estimación de la POC es de **1-2 horas asistida por IA**.

> **⚠️ Importante:** La única tarea de complejidad **Alta** es T-3.2 (Object Pooling). Se recomienda abordarla como prueba de concepto técnica, ya que es la de mayor riesgo del sprint.


