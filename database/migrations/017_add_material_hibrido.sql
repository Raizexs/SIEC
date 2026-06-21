-- Migration 017: Material estructural Híbrido (ID 5)
-- Sistema mixto madera + metalcon para Pro+

INSERT INTO "Material_Estructural" ("ID", "Nombre", "Descripcion", "Activo")
VALUES (5, 'Híbrido', 'Sistema mixto madera y metalcon', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo") VALUES
  (5, 10, 0.35, 'piezas por m2', TRUE),
  (5, 11, 0.12, 'piezas por m2', TRUE),
  (5, 7,  0.75, 'piezas por m2', TRUE),
  (5, 8,  0.25, 'piezas por m2', TRUE),
  (5, 12, 0.12, 'planchas por m2', TRUE),
  (5, 16, 0.22, 'planchas por m2', TRUE),
  (5, 14, 0.02, 'cajas por m2', TRUE),
  (5, 15, 0.015, 'cajas por m2', TRUE),
  (5, 25, 0.035, 'rollos por m2', TRUE),
  (5, 29, 0.020, 'tubos por m2', TRUE)
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('"Material_Estructural"', 'ID'),
  (SELECT COALESCE(MAX("ID"), 1) FROM "Material_Estructural")
);
