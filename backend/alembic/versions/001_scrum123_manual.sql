-- ============================================================
-- SCRUM-123: Agregar columna Unidad_Precio a precio_mercado
-- ============================================================
-- Ejecutar UNA sola vez en producción/desarrollo.
-- Es idempotente: el bloque DO NOTHING evita error si la columna ya existe.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'precio_mercado'
          AND column_name = 'Unidad_Precio'
    ) THEN
        ALTER TABLE precio_mercado
            ADD COLUMN "Unidad_Precio" VARCHAR
            DEFAULT NULL;

        COMMENT ON COLUMN precio_mercado."Unidad_Precio" IS
            'SCRUM-123: unidad en que está expresado el precio almacenado. '
            'Valores válidos: ''saco 25kg'', ''unidad'', ''m²'', ''m³'', ''barra 6m'', '
            '''plancha 1.22x2.44m'', ''caja 100un'', ''galón 4L'', ''rollo 100m'', ''tubo 3m''. '
            'NULL = sin declarar; el motor usa Unidad_Medida del Insumo como fallback.';
    END IF;
END $$;

-- ============================================================
-- Poblar Unidad_Precio para insumos conocidos (ajustar según IDs reales)
-- ============================================================
-- Cemento: precio almacenado por saco de 25 kg
UPDATE precio_mercado pm
SET "Unidad_Precio" = 'saco 25kg'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND LOWER(i."Nombre") LIKE '%cemento%'
  AND pm."Unidad_Precio" IS NULL;

-- Hormigón dosificado: precio almacenado por m³
UPDATE precio_mercado pm
SET "Unidad_Precio" = 'm³'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND LOWER(i."Nombre") LIKE '%hormig%'
  AND pm."Unidad_Precio" IS NULL;

-- Tornillos autoperforantes: precio almacenado por unidad
UPDATE precio_mercado pm
SET "Unidad_Precio" = 'unidad'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND LOWER(i."Nombre") LIKE '%tornillo%'
  AND pm."Unidad_Precio" IS NULL;

-- Arena / Gravilla / Ripio: precio almacenado por m³
UPDATE precio_mercado pm
SET "Unidad_Precio" = 'm³'
FROM "Insumo" i
WHERE pm."Insumo_ID" = i."ID"
  AND (
      LOWER(i."Nombre") LIKE '%arena%'
      OR LOWER(i."Nombre") LIKE '%gravilla%'
      OR LOWER(i."Nombre") LIKE '%ripio%'
  )
  AND pm."Unidad_Precio" IS NULL;

-- Resto: dejar NULL (el motor usará Unidad_Medida del Insumo como fallback)
