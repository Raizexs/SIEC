-- Seed: Insumos complementarios (antes hardcodeados como "Referencia")
-- Ejecutar contra DB local y Supabase

INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  ('Clavos estriados 3 pulgadas', 'Obra Gruesa', 'caja 100un', 'Clavos estriados 3 pulgadas para estructura de madera', TRUE),
  ('Clavos estriados 4 pulgadas', 'Obra Gruesa', 'caja 100un', 'Clavos estriados 4 pulgadas para soleras de madera', TRUE),
  ('Lana vidrio 50mm', 'Obra Gruesa', 'rollo', 'Aislante lana de vidrio 50mm rollo 14.4m2 para muros y techumbre', TRUE),
  ('Plancha zinc 0.85x2.5m', 'Techumbre', 'unidad', 'Plancha de zinc para cubierta 0.85x2.5m', TRUE),
  ('Costanera pino 2x2', 'Techumbre', 'pieza 3.2m', 'Costanera de pino 2x2 3.2m para soporte de cubierta', TRUE),
  ('Tornillo techo golilla neopreno', 'Techumbre', 'caja 100un', 'Tornillo autoperforante con golilla de neopreno para techumbre', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;
