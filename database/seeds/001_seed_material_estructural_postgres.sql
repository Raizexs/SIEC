-- Seed 001 (PostgreSQL): materiales estructurales base
-- Ejecutar después de 001_create_material_estructural.sql (tabla con comillas)

INSERT INTO "Material_Estructural" ("Nombre", "Descripcion", "Activo") VALUES
  ('Madera', 'Estructura de madera para viviendas', TRUE),
  ('Metalcom', 'Estructura con perfiles metalcom', TRUE),
  ('Albañilería', 'Estructura de albañilería y hormigón', TRUE),
  ('Hormigón Armado', 'Estructura de hormigón con armadura de acero', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

SELECT "ID", "Nombre" FROM "Material_Estructural" ORDER BY "ID";
