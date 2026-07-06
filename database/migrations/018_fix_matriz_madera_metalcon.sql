-- Migration 018: Corregir Matriz_Rendimiento para Madera (1) y Metalcon (2)
-- Supabase producción tenía IDs incorrectos (45/46) en lugar de 10-16.
-- No toca albañilería/hormigón extendidos (IDs 107+).

DELETE FROM "Matriz_Rendimiento" WHERE "Material_Estructural_ID" IN (1, 2);

INSERT INTO "Matriz_Rendimiento" (
    "Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo"
) VALUES
  (1, 10, 0.51, 'piezas por m2', TRUE),
  (1, 11, 0.18, 'piezas por m2', TRUE),
  (1, 12, 0.17, 'planchas por m2', TRUE),
  (1, 16, 0.17, 'planchas por m2', TRUE),
  (1, 14, 0.03, 'cajas por m2', TRUE),
  (1, 13, 0.02, 'cajas por m2', TRUE),
  (1, 25, 0.035, 'rollos por m2', TRUE),
  (1, 29, 0.020, 'tubos por m2', TRUE),
  (2, 7,  1.20, 'piezas por m2', TRUE),
  (2, 8,  0.40, 'piezas por m2', TRUE),
  (2, 9,  0.80, 'piezas por m2', TRUE),
  (2, 16, 0.28, 'planchas por m2', TRUE),
  (2, 13, 0.03, 'cajas por m2', TRUE),
  (2, 15, 0.02, 'cajas por m2', TRUE),
  (2, 25, 0.035, 'rollos por m2', TRUE),
  (2, 29, 0.020, 'tubos por m2', TRUE)
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO UPDATE SET
  "Factor_Multiplicador" = EXCLUDED."Factor_Multiplicador",
  "Unidad_Factor" = EXCLUDED."Unidad_Factor",
  "Activo" = EXCLUDED."Activo";
