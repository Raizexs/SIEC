-- AUDIT 1: Matriz_Rendimiento completa
SELECT 
  me."Nombre" as material,
  mr."Insumo_ID" as insumo_id,
  i."Nombre" as insumo,
  i."Unidad_Medida" as unidad,
  i."Categoria" as categoria,
  mr."Factor_Multiplicador" as factor,
  mr."Unidad_Factor" as unidad_factor
FROM "Matriz_Rendimiento" mr
JOIN "Material_Estructural" me ON me."ID" = mr."Material_Estructural_ID"
JOIN "Insumo" i ON i."ID" = mr."Insumo_ID"
WHERE mr."Activo" = true
ORDER BY mr."Material_Estructural_ID", mr."Insumo_ID";

-- AUDIT 2: Precios de mercado con promedios
SELECT 
  pm."Insumo_ID",
  i."Nombre" as insumo,
  i."Unidad_Medida" as unidad,
  count(*) as n_registros,
  round(avg(COALESCE(pm."Precio_Descuento", pm."Precio")),0) as precio_prom,
  round(min(COALESCE(pm."Precio_Descuento", pm."Precio")),0) as precio_min,
  round(max(COALESCE(pm."Precio_Descuento", pm."Precio")),0) as precio_max
FROM precio_mercado pm
JOIN "Insumo" i ON i."ID" = pm."Insumo_ID"
WHERE pm."Exitoso" = true
GROUP BY pm."Insumo_ID", i."Nombre", i."Unidad_Medida"
ORDER BY pm."Insumo_ID";

-- AUDIT 3: Simulación de cálculo para MADERA 29m2
SELECT 
  i."Nombre" as insumo,
  mr."Factor_Multiplicador" as factor_x_m2,
  round(mr."Factor_Multiplicador" * 29, 2) as cantidad_29m2,
  round(avg(COALESCE(pm."Precio_Descuento", pm."Precio")),0) as precio_prom,
  round(mr."Factor_Multiplicador" * 29 * avg(COALESCE(pm."Precio_Descuento", pm."Precio")),0) as subtotal_est
FROM "Matriz_Rendimiento" mr
JOIN "Insumo" i ON i."ID" = mr."Insumo_ID"
LEFT JOIN precio_mercado pm ON pm."Insumo_ID" = mr."Insumo_ID" AND pm."Exitoso" = true
WHERE mr."Material_Estructural_ID" = 1 AND mr."Activo" = true
GROUP BY i."Nombre", mr."Factor_Multiplicador"
ORDER BY subtotal_est DESC NULLS LAST;

-- AUDIT 4: Catalogo_Rendimiento (fuente original de los factores)
SELECT "Categoria", "Partida_Constructiva", "Insumo_Tecnico", "Unidad_Medida", "Rendimiento_Neto_x_Unidad", "Referencia"
FROM "Catalogo_Rendimiento"
WHERE "Activo" = true
ORDER BY "Categoria", "Partida_Constructiva";
