-- Migración 019: Insumos complementarios con IDs fijos (46-51)
-- Requerido por main.py (_lookup_scraped(46|47|48)) y techumbre (49-51).

ALTER TABLE "Insumo" DROP CONSTRAINT IF EXISTS "Insumo_Categoria_check";
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_Categoria_check"
  CHECK ("Categoria" = ANY (ARRAY['Obra Gruesa', 'Terminaciones', 'Instalaciones', 'Mano de Obra', 'Techumbre']::text[]));

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
  'HH','hora'
));

INSERT INTO "Insumo" ("ID", "Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  (46, 'Clavos estriados 3 pulgadas', 'Obra Gruesa', 'caja 100un', 'Clavos estriados 3 pulgadas para estructura de madera', TRUE),
  (47, 'Clavos estriados 4 pulgadas', 'Obra Gruesa', 'caja 100un', 'Clavos estriados 4 pulgadas para soleras de madera', TRUE),
  (48, 'Lana vidrio 50mm', 'Obra Gruesa', 'rollo', 'Aislante lana de vidrio 50mm rollo 14.4m2 para muros y techumbre', TRUE),
  (49, 'Plancha zinc 0.85x2.5m', 'Techumbre', 'unidad', 'Plancha de zinc para cubierta 0.85x2.5m', TRUE),
  (50, 'Costanera pino 2x2', 'Techumbre', 'pieza 3.2m', 'Costanera de pino 2x2 3.2m para soporte de cubierta', TRUE),
  (51, 'Tornillo techo golilla neopreno', 'Techumbre', 'caja 100un', 'Tornillo autoperforante con golilla de neopreno para techumbre', TRUE)
ON CONFLICT ("ID") DO UPDATE SET
  "Nombre" = EXCLUDED."Nombre",
  "Categoria" = EXCLUDED."Categoria",
  "Unidad_Medida" = EXCLUDED."Unidad_Medida",
  "Descripcion" = EXCLUDED."Descripcion",
  "Activo" = EXCLUDED."Activo";

SELECT setval(pg_get_serial_sequence('"Insumo"', 'ID'), (SELECT MAX("ID") FROM "Insumo"));
