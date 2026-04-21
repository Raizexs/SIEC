Este documento Markdown contiene las lógicas de restricción y cálculo que el agente debe aplicar sobre los datos de la matriz al procesar los inputs del usuario.

Reglas de Negocio - Motor de Cálculo SIEC (Sistema Inteligente de Estimación de Costos)
1. Reglas de Desperdicios y Mermas (Factores de Inflación de Insumos)
El sistema nunca debe cotizar rendimientos netos teóricos. Antes de realizar la consulta al scraper de retail, los totales deben multiplicarse por los siguientes factores de pérdida por material:

Morteros (Pega y Repello/Estuco): Multiplicar consumo neto por 1.10 (10% de pérdida por caída de mezcla y ajuste de plomos).

Hormigón in situ y Albañilería (Ladrillos/Bloques): Multiplicar por 1.05 (5% de desperdicio por rotura y derrames).

Acero de Refuerzo (Enfierradura): El desperdicio es dinámico, aplicar entre 3% y 10% dependiendo de la cantidad de cortes y cruces del elemento.

2. Modulación Geométrica y Algoritmos de Corte
Función Techo (Ceiling): El sistema debe impedir la compra de fracciones de materiales indivisibles. Todos los elementos comercializados por unidad (paneles, tiras, sacos) deben redondearse al entero superior una vez sumado el desperdicio.

Cubicación de Paneles (SIP, OSB, Yeso Cartón): El algoritmo debe dividir la superficie bruta del muro por el rendimiento comercial invariable de la placa base, que es de 2.97 m2 por unidad (formato 1,22 x 2,44 m).

Descuento de Vanos: Al calcular superficies de albañilería, la fórmula debe descontar estrictamente el área de soleras, columnas, mochetas y los vanos de puertas y ventanas antes de aplicar el factor de ladrillos por metro cuadrado.

3. Restricciones Regulatorias Obligatorias (MINVU)
Para asegurar que la ampliación sea regularizable y aplicable a subsidios (DS27/Mejoramiento), el sistema aplicará bloqueos lógicos (Hard Constraints) en las recomendaciones de diseño:

Aislamiento Térmico: Si la ampliación perimetral no es de SIP, el sistema debe inyectar forzosamente los requerimientos del Listado Oficial de Soluciones Constructivas para Acondicionamiento Térmico (LOSCAT), añadiendo aislantes interiores y barreras de vapor compatibles.

Comportamiento Acústico y Fuego: Los muros divisorios sugeridos deben cumplir con resoluciones exentas como el LOSCAA para ruido  y usar configuraciones resistentes al fuego, como doble placa de volcanita o lanas minerales, de acuerdo a la normativa vigente.

Resistencia de Hormigones: Para radicaciones o cadenas estructurales en el modelador 3D, el sistema fijará por defecto la dosificación de hormigón a Grado H20.

4. Estructuración del Costo de Mano de Obra (APU)

Nota operativa: El sistema normaliza automáticamente precios de mano de obra obtenidos del mercado. Si un precio de mercado está expresado "por jornada/día" y el insumo está definido en HH (horas hombre), el motor convertirá el precio a "por HH" dividiéndolo por HOURS_PER_DAY. HOURS_PER_DAY es configurable vía variable de entorno (por defecto 8). Esto asegura consistencia entre factores de rendimiento (factor_multiplicador en Matriz_Rendimiento) y tarifas de mercado.

La transición hacia la proyección del costo de instalación requiere que el sistema estandarice el costo del tiempo de la fuerza laboral:

Costo Diario Real: El cálculo de la mano de obra debe componerse del salario diario o por hora del maestro y su ayudante, multiplicándolo por el inverso del rendimiento diario por metro cuadrado.

Leyes Sociales: El sistema debe sumar obligatoriamente un recargo por leyes sociales de entre el 28% y el 29% sobre el valor nominal de la mano de obra, evitando la descapitalización financiera del usuario al ejecutar la obra, [].