-- Migration 010: Corregir Matriz_Rendimiento con IDs reales de Insumo
-- El init.sql inserto Perfiles y Tornillos en Obra Gruesa antes de Terminaciones,
-- desplazando todos los IDs. La matriz referencia IDs que no coinciden.
-- Esta migracion corrige los mapeos Material -> Insumo.

-- 1. Limpiar matriz actual (datos incorrectos)
DELETE FROM "Matriz_Rendimiento";

-- 2. Re-insertar con IDs correctos (segun orden real de init.sql)
-- IDs reales:
--   Obra Gruesa: 1-15 (1=Cemento Portland, 2=Cemento Especial, 3=Fierro, 4=Arena, 5=Ripio,
--      6=Agua, 7=Perfil C, 8=Perfil U, 9=Perfil Omega, 10=Pino 2x3, 11=Pino 2x4,
--      12=Terciado, 13=Tornillo Volcanita, 14=Tornillo Madera, 15=Tornillo Autoperforante)
--   Terminaciones: 16-24 (16=Volcanita RH Std, 17=Volcanita RH Ref, 18=Pintura Acrilica,
--      19=Pintura Esmalte, 20=Ceramica Piso, 21=Ceramica Muro, 22=Piso Flotante,
--      23=Adhesivo Ceramico, 24=Lechada Ceramica)
--   Instalaciones: 25-34 (25=Cable 2.5mm, 26=Cable 4mm, 27=Cable 6mm, 28=Tubo PVC 110,
--      29=Tubo PVC 75, 30=Tubo PVC 50, 31=Tubo Cobre 15, 32=Tubo Cobre 22,
--      33=Caja Electrica, 34=Disyuntor)

INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo") VALUES
  -- MADERA (Material_ID = 1)
  (1, 10, 0.51, 'piezas por m2', TRUE),
  (1, 11, 0.18, 'piezas por m2', TRUE),
  (1, 12, 0.17, 'planchas por m2', TRUE),
  (1, 16, 0.17, 'planchas por m2', TRUE),
  (1, 14, 0.03, 'cajas por m2', TRUE),
  (1, 13, 0.02, 'cajas por m2', TRUE),
  (1, 25, 0.035, 'rollos por m2', TRUE),
  (1, 29, 0.020, 'tubos por m2', TRUE),
  -- METALCOM (Material_ID = 2)
  (2, 7,  1.20, 'piezas por m2', TRUE),
  (2, 8,  0.40, 'piezas por m2', TRUE),
  (2, 9,  0.80, 'piezas por m2', TRUE),
  (2, 16, 0.28, 'planchas por m2', TRUE),
  (2, 13, 0.03, 'cajas por m2', TRUE),
  (2, 15, 0.02, 'cajas por m2', TRUE),
  (2, 25, 0.035, 'rollos por m2', TRUE),
  (2, 29, 0.020, 'tubos por m2', TRUE),
  -- ALBANILERIA (Material_ID = 3)
  (3, 1,  0.50, 'sacos por m2', TRUE),
  (3, 3,  0.04, 'barras por m2', TRUE),
  (3, 16, 0.15, 'planchas por m2', TRUE),
  (3, 25, 0.025, 'rollos por m2', TRUE),
  (3, 29, 0.020, 'tubos por m2', TRUE),
  -- HORMIGON ARMADO (Material_ID = 4)
  (4, 2,  0.90, 'sacos por m2', TRUE),
  (4, 3,  0.32, 'barras por m2', TRUE),
  (4, 4,  0.06, 'm3 por m2', TRUE),
  (4, 5,  0.08, 'm3 por m2', TRUE),
  (4, 16, 0.21, 'planchas por m2', TRUE),
  (4, 25, 0.025, 'rollos por m2', TRUE),
  (4, 29, 0.020, 'tubos por m2', TRUE)
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO UPDATE
  SET "Factor_Multiplicador" = EXCLUDED."Factor_Multiplicador",
      "Activo" = EXCLUDED."Activo";

-- Verificacion
SELECT me."Nombre" as Material, COUNT(mr."ID") as Insumos
FROM "Matriz_Rendimiento" mr
JOIN "Material_Estructural" me ON mr."Material_Estructural_ID" = me."ID"
WHERE mr."Activo" = TRUE
GROUP BY me."ID", me."Nombre"
ORDER BY me."ID";
