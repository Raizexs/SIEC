-- Seed 004: Poblar Matriz_Rendimiento desde respaldo CSV del SPIKE
-- Fuente: database/seeds/data/004_seed_matriz_rendimiento.csv
-- Requisito: 11 insumos x 4 materiales base = 44 registros

CREATE TEMP TABLE seed_matriz_rendimiento (
  material_nombre TEXT NOT NULL,
  insumo_nombre TEXT NOT NULL,
  factor_multiplicador NUMERIC(10,4) NOT NULL CHECK (factor_multiplicador > 0),
  descripcion TEXT NOT NULL
) ON COMMIT DROP;

\copy seed_matriz_rendimiento (material_nombre, insumo_nombre, factor_multiplicador, descripcion) FROM '/seeds/data/004_seed_matriz_rendimiento.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

DO $$
DECLARE
  expected_rows INTEGER;
  matched_rows INTEGER;
BEGIN
  SELECT COUNT(*) INTO expected_rows FROM seed_matriz_rendimiento;
  SELECT COUNT(*) INTO matched_rows
  FROM seed_matriz_rendimiento s
  JOIN "Material_Estructural" me ON me."Nombre" = s.material_nombre
  JOIN "Insumo" i ON i."Nombre" = s.insumo_nombre;

  IF matched_rows <> expected_rows THEN
    RAISE EXCEPTION 'Seed 004 invalido: % de % registros coinciden con llaves existentes', matched_rows, expected_rows;
  END IF;
END $$;

INSERT INTO "Matriz_Rendimiento" (
  "Material_Estructural_ID",
  "Insumo_ID",
  "Factor_Multiplicador",
  "Descripcion",
  "Activo"
)
SELECT
  me."ID",
  i."ID",
  s.factor_multiplicador,
  s.descripcion,
  TRUE
FROM seed_matriz_rendimiento s
JOIN "Material_Estructural" me ON me."Nombre" = s.material_nombre
JOIN "Insumo" i ON i."Nombre" = s.insumo_nombre
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO UPDATE
SET
  "Factor_Multiplicador" = EXCLUDED."Factor_Multiplicador",
  "Descripcion" = EXCLUDED."Descripcion",
  "Activo" = TRUE,
  "Fecha_Actualizacion" = CURRENT_TIMESTAMP;

-- Verificación: total de factores por material
SELECT
  me."Nombre" AS material,
  COUNT(mr."ID") AS total_insumos,
  ROUND(AVG(mr."Factor_Multiplicador")::numeric, 4) AS factor_promedio
FROM "Matriz_Rendimiento" mr
JOIN "Material_Estructural" me ON mr."Material_Estructural_ID" = me."ID"
WHERE mr."Activo" = TRUE
GROUP BY me."ID", me."Nombre"
ORDER BY me."ID";

-- Verificación: total de registros en matriz
SELECT COUNT(*) AS total_registros
FROM "Matriz_Rendimiento"
WHERE "Activo" = TRUE;
