-- Migration 011: Expandir CHECK de Unidad_Medida para reflejar unidades comerciales reales
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

-- Aplicar unidades comerciales reales
UPDATE "Insumo" SET "Unidad_Medida" = 'pieza 3.2m'   WHERE "ID" IN (10, 11);
UPDATE "Insumo" SET "Unidad_Medida" = 'plancha 1.22x2.44m' WHERE "ID" = 12;
UPDATE "Insumo" SET "Unidad_Medida" = 'caja 100un'   WHERE "ID" IN (13, 14, 15);
UPDATE "Insumo" SET "Unidad_Medida" = 'plancha 1.2x2.4m' WHERE "ID" IN (16, 17);
UPDATE "Insumo" SET "Unidad_Medida" = 'galon 4L'     WHERE "ID" IN (18, 19);
UPDATE "Insumo" SET "Unidad_Medida" = 'caja 2.03m2'  WHERE "ID" = 20;
UPDATE "Insumo" SET "Unidad_Medida" = 'caja 1.5m2'   WHERE "ID" = 21;
UPDATE "Insumo" SET "Unidad_Medida" = 'caja 2.4m2'   WHERE "ID" = 22;
UPDATE "Insumo" SET "Unidad_Medida" = 'saco 25kg'    WHERE "ID" = 23;
UPDATE "Insumo" SET "Unidad_Medida" = 'saco 1kg'     WHERE "ID" = 24;
UPDATE "Insumo" SET "Unidad_Medida" = 'rollo 100m'   WHERE "ID" IN (25, 26, 27);
UPDATE "Insumo" SET "Unidad_Medida" = 'tubo 3m'      WHERE "ID" IN (28, 29, 30, 31, 32);
UPDATE "Insumo" SET "Unidad_Medida" = 'pieza'        WHERE "ID" IN (33, 34);
UPDATE "Insumo" SET "Unidad_Medida" = 'barra 6m'     WHERE "ID" = 3;
UPDATE "Insumo" SET "Unidad_Medida" = 'saco 25kg'    WHERE "ID" IN (1, 2, 4, 5);
UPDATE "Insumo" SET "Unidad_Medida" = 'pieza 6m'     WHERE "ID" IN (7, 8, 9);

SELECT "ID", "Nombre", "Unidad_Medida" FROM "Insumo" WHERE "Activo" = TRUE ORDER BY "ID";
