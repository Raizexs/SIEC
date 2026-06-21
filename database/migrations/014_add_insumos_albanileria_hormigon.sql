-- Migration 014: Agregar insumos + Matriz_Rendimiento para Albañilería y Hormigón Armado
-- Ejecutar: psql -f 014_add_insumos_albanileria_hormigon.sql
-- Es idempotente: si se ejecuta dos veces, no crea duplicados.

-- 1. Expandir CHECK de Unidad_Medida para incluir m3, m2
ALTER TABLE "Insumo" DROP CONSTRAINT IF EXISTS "Insumo_Unidad_Medida_check";
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_Unidad_Medida_check"
CHECK ("Unidad_Medida" IN (
  'saco 25kg','saco 50kg','saco 1kg',
  'kg','litro','galon 4L',
  'metro','metro lineal','metro cuadrado',
  'plancha','plancha 1.22x2.44m','plancha 1.2x2.4m',
  'unidad','pieza','pieza 3.2m','pieza 6m',
  'caja','caja 100un','caja 2.03m2','caja 1.5m2','caja 2.4m2',
  'rollo','rollo 100m',
  'tubo 3m',
  'barra 4.71kg','barra 6m',
  'HH','hora',
  'm3','m2'
));

-- 2. Insumos para Albañilería + Hormigón Armado
INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  -- Albañilería
  ('Ladrillo Fiscal 7x14x28', 'Obra Gruesa', 'unidad', 'Ladrillo fiscal de arcilla 7x14x28 cm para muros de albañilería', TRUE),
  ('Ladrillo Princesa 4x11x24', 'Obra Gruesa', 'unidad', 'Ladrillo princesa de arcilla 4x11x24 cm para tabiques', TRUE),
  ('Bloque Cemento 15x20x40', 'Obra Gruesa', 'unidad', 'Bloque de cemento estándar 15x20x40 cm para muros', TRUE),
  ('Mortero Pega', 'Obra Gruesa', 'm3', 'Mortero para pega de ladrillos y bloques (confeccionado en obra)', TRUE),
  ('Mortero Estuco', 'Obra Gruesa', 'm3', 'Mortero para estuco y revoque de muros interiores/exteriores', TRUE),
  ('Enfierradura Horizontal', 'Obra Gruesa', 'kg', 'Acero de refuerzo horizontal para cadenas de albañilería', TRUE),
  ('Enfierradura Vertical', 'Obra Gruesa', 'kg', 'Acero de refuerzo vertical para pilares de albañilería', TRUE),
  ('Hormigón Pilares', 'Obra Gruesa', 'm3', 'Hormigón para pilares y columnas de albañilería armada', TRUE),
  ('Hormigón Cadenas', 'Obra Gruesa', 'm3', 'Hormigón para cadenas y vigas de albañilería armada', TRUE),
  -- Hormigón Armado
  ('Hormigón H25', 'Obra Gruesa', 'm3', 'Hormigón H25 (250 kg cemento/m³) para losas y muros', TRUE),
  ('Hormigón H30', 'Obra Gruesa', 'm3', 'Hormigón H30 (300 kg cemento/m³) para elementos estructurales', TRUE),
  ('Acero A63-42H ø8mm', 'Obra Gruesa', 'kg', 'Acero de refuerzo diámetro 8 mm en barras', TRUE),
  ('Acero A63-42H ø10mm', 'Obra Gruesa', 'kg', 'Acero de refuerzo diámetro 10 mm en barras', TRUE),
  ('Acero A63-42H ø12mm', 'Obra Gruesa', 'kg', 'Acero de refuerzo diámetro 12 mm en barras', TRUE),
  ('Acero A63-42H ø16mm', 'Obra Gruesa', 'kg', 'Acero de refuerzo diámetro 16 mm en barras', TRUE),
  ('Moldaje Metálico', 'Obra Gruesa', 'm2', 'Moldaje metálico para losas y muros de hormigón armado', TRUE),
  ('Moldaje Madera', 'Obra Gruesa', 'm2', 'Moldaje de madera para elementos de hormigón armado', TRUE),
  ('Alambre Negro', 'Obra Gruesa', 'kg', 'Alambre negro recocido para amarras de acero de refuerzo', TRUE),
  ('Separadores Plásticos', 'Obra Gruesa', 'unidad', 'Separadores plásticos para distancia de armadura a moldaje', TRUE),
  ('Desmoldante', 'Obra Gruesa', 'litro', 'Agente desmoldante para moldajes de hormigón', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

-- 3. Matriz_Rendimiento — primero limpiar filas antiguas para materiales 3 y 4
DELETE FROM "Matriz_Rendimiento" WHERE "Material_Estructural_ID" IN (3, 4);

-- Albañilería (Material_ID = 3)
-- Factores calculados para muro de 14 cm de espesor:
--   Ladrillo Fiscal 7x14x28: 1 m² / (0.29 × 0.08) m²/junta ≈ 43 un/m²
--   Ladrillo Princesa 4x11x24: 1 m² / (0.25 × 0.05) ≈ 80 un/m² -> ajustado 65 con mortero
--   Bloque 15x20x40: 1 / (0.41 × 0.21) ≈ 11.6 -> 12.5 con desperdicio
--   Mortero Pega: 0.03 m³ por m² de muro (junta 1cm)
--   Mortero Estuco: 0.02 m³ por m² de muro (1.5 cm espesor, 2 caras)
INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo")
SELECT 3, "ID", 43.0, 'unidades por m2 muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Ladrillo Fiscal 7x14x28'
UNION ALL
SELECT 3, "ID", 65.0, 'unidades por m2 muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Ladrillo Princesa 4x11x24'
UNION ALL
SELECT 3, "ID", 12.5, 'unidades por m2 muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Bloque Cemento 15x20x40'
UNION ALL
SELECT 3, "ID", 0.030, 'm3 por m2 muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Mortero Pega'
UNION ALL
SELECT 3, "ID", 0.020, 'm3 por m2 muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Mortero Estuco'
UNION ALL
SELECT 3, "ID", 2.5, 'kg por ml muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Enfierradura Horizontal'
UNION ALL
SELECT 3, "ID", 1.8, 'kg por ml altura', TRUE FROM "Insumo" WHERE "Nombre" = 'Enfierradura Vertical'
UNION ALL
SELECT 3, "ID", 0.040, 'm3 por ml altura', TRUE FROM "Insumo" WHERE "Nombre" = 'Hormigón Pilares'
UNION ALL
SELECT 3, "ID", 0.028, 'm3 por ml muro', TRUE FROM "Insumo" WHERE "Nombre" = 'Hormigón Cadenas'
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO NOTHING;

-- Albañilería: insumos compartidos (instalaciones)
INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo") VALUES
  (3, 25, 0.035, 'rollos por m2', TRUE),
  (3, 29, 0.020, 'tubos por m2', TRUE)
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO NOTHING;

-- Hormigón Armado (Material_ID = 4)
-- Factores base (el código ajusta según área de losa + muros):
--   Hormigón H25/H30: factor base 1.0, el código multiplica por espesor (m)
--   Acero ø: 100 kg/m³ de hormigón (promedio 80-120)
--   Moldaje: 2.0 m² por m² (2 caras de muro), código ajusta con perímetro
--   Alambre: 10 kg por tonelada de acero
INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo")
SELECT 4, "ID", 1.0, 'm3 por m2', TRUE FROM "Insumo" WHERE "Nombre" = 'Hormigón H25'
UNION ALL
SELECT 4, "ID", 1.0, 'm3 por m2', TRUE FROM "Insumo" WHERE "Nombre" = 'Hormigón H30'
UNION ALL
SELECT 4, "ID", 100.0, 'kg por m3 hormigon', TRUE FROM "Insumo" WHERE "Nombre" = 'Acero A63-42H ø8mm'
UNION ALL
SELECT 4, "ID", 100.0, 'kg por m3 hormigon', TRUE FROM "Insumo" WHERE "Nombre" = 'Acero A63-42H ø10mm'
UNION ALL
SELECT 4, "ID", 100.0, 'kg por m3 hormigon', TRUE FROM "Insumo" WHERE "Nombre" = 'Acero A63-42H ø12mm'
UNION ALL
SELECT 4, "ID", 100.0, 'kg por m3 hormigon', TRUE FROM "Insumo" WHERE "Nombre" = 'Acero A63-42H ø16mm'
UNION ALL
SELECT 4, "ID", 1.0, 'm2 por m2', TRUE FROM "Insumo" WHERE "Nombre" = 'Moldaje Metálico'
UNION ALL
SELECT 4, "ID", 1.0, 'm2 por m2', TRUE FROM "Insumo" WHERE "Nombre" = 'Moldaje Madera'
UNION ALL
SELECT 4, "ID", 10.0, 'kg por ton acero', TRUE FROM "Insumo" WHERE "Nombre" = 'Alambre Negro'
UNION ALL
SELECT 4, "ID", 4.0, 'un por m2 moldaje', TRUE FROM "Insumo" WHERE "Nombre" = 'Separadores Plásticos'
UNION ALL
SELECT 4, "ID", 0.15, 'l por m2 moldaje', TRUE FROM "Insumo" WHERE "Nombre" = 'Desmoldante'
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO NOTHING;

-- Hormigón Armado: insumos compartidos (instalaciones)
INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo") VALUES
  (4, 25, 0.035, 'rollos por m2', TRUE),
  (4, 29, 0.020, 'tubos por m2', TRUE)
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO NOTHING;

-- Verificación
SELECT '=== INSUMOS NUEVOS ===' as "";
SELECT "ID", "Nombre", "Categoria", "Unidad_Medida" FROM "Insumo" WHERE "ID" >= 52 ORDER BY "ID";

SELECT '=== MATRIZ ALBAÑILERIA (3) ===' as "";
SELECT i."Nombre", mr."Factor_Multiplicador", mr."Unidad_Factor"
FROM "Matriz_Rendimiento" mr
JOIN "Insumo" i ON mr."Insumo_ID" = i."ID"
WHERE mr."Material_Estructural_ID" = 3 AND mr."Activo" = TRUE
ORDER BY i."ID";

SELECT '=== MATRIZ HORMIGON ARMADO (4) ===' as "";
SELECT i."Nombre", mr."Factor_Multiplicador", mr."Unidad_Factor"
FROM "Matriz_Rendimiento" mr
JOIN "Insumo" i ON mr."Insumo_ID" = i."ID"
WHERE mr."Material_Estructural_ID" = 4 AND mr."Activo" = TRUE
ORDER BY i."ID";
