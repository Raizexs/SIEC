-- SCRUM-123: Agregar columna Unidad_Precio a precio_mercado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'precio_mercado'
          AND column_name = 'Unidad_Precio'
    ) THEN
        ALTER TABLE precio_mercado
            ADD COLUMN "Unidad_Precio" VARCHAR DEFAULT NULL;
        RAISE NOTICE 'Columna Unidad_Precio agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna Unidad_Precio ya existe';
    END IF;
END $$;

-- Poblar Unidad_Precio para insumos conocidos
UPDATE precio_mercado pm
SET "Unidad_Precio" = 'saco 25kg'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND LOWER(i."Nombre") LIKE '%cemento%'
  AND pm."Unidad_Precio" IS NULL;

UPDATE precio_mercado pm
SET "Unidad_Precio" = 'm³'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND LOWER(i."Nombre") LIKE '%hormig%'
  AND pm."Unidad_Precio" IS NULL;

UPDATE precio_mercado pm
SET "Unidad_Precio" = 'unidad'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND LOWER(i."Nombre") LIKE '%tornillo%'
  AND pm."Unidad_Precio" IS NULL;

UPDATE precio_mercado pm
SET "Unidad_Precio" = 'm³'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND (LOWER(i."Nombre") LIKE '%arena%'
       OR LOWER(i."Nombre") LIKE '%gravilla%'
       OR LOWER(i."Nombre") LIKE '%ripio%')
  AND pm."Unidad_Precio" IS NULL;

SELECT 'Migración completada' as status;
