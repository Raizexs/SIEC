-- Script de inicialización: Ejecuta todas las migraciones y seeds en orden

-- ========== MIGRACIONES ==========

-- Migración 001: Crear tabla Material_Estructural
CREATE TABLE IF NOT EXISTS "Material_Estructural" (
  "ID" SERIAL PRIMARY KEY,
  "Nombre" TEXT NOT NULL UNIQUE,
  "Descripcion" TEXT,
  "Activo" BOOLEAN DEFAULT TRUE,
  "Fecha_Creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migración 002: Crear tabla Configuracion_Simulacion
CREATE TABLE IF NOT EXISTS "Configuracion_Simulacion" (
  "ID" SERIAL PRIMARY KEY,
  "M2_Totales" INTEGER NOT NULL,
  "Material_Estructural_ID" INTEGER NOT NULL REFERENCES "Material_Estructural"("ID"),
  "Habitaciones" INTEGER NOT NULL DEFAULT 0,
  "Banios" INTEGER NOT NULL DEFAULT 0,
  "Areas_Comunes" INTEGER NOT NULL DEFAULT 0,
  "Fecha_Creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_positive_m2 CHECK ("M2_Totales" > 0)
);

-- Migración 003: Crear tabla Insumo
CREATE TABLE IF NOT EXISTS "Insumo" (
  "ID" SERIAL PRIMARY KEY,
  "Nombre" TEXT NOT NULL UNIQUE,
  "Categoria" TEXT NOT NULL CHECK ("Categoria" IN (
    'Obra Gruesa',
    'Terminaciones',
    'Instalaciones',
    'Mano de Obra'
  )),
  "Unidad_Medida" TEXT NOT NULL CHECK ("Unidad_Medida" IN (
    'saco 25kg',
    'saco 50kg',
    'kg',
    'litro',
    'metro',
    'metro lineal',
    'plancha',
    'unidad',
    'caja',
    'rollo',
    'HH',
    'hora',
    'metro cuadrado'
  )),
  "Descripcion" TEXT,
  "Activo" BOOLEAN DEFAULT TRUE,
  "Fecha_Creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_insumo_categoria ON "Insumo"("Categoria");
CREATE INDEX IF NOT EXISTS idx_insumo_activo ON "Insumo"("Activo");

-- Migración 004: Crear tabla Matriz_Rendimiento
CREATE TABLE IF NOT EXISTS "Matriz_Rendimiento" (
  "ID" SERIAL PRIMARY KEY,
  "Material_Estructural_ID" INTEGER NOT NULL REFERENCES "Material_Estructural"("ID"),
  "Insumo_ID" INTEGER NOT NULL REFERENCES "Insumo"("ID"),
  "Factor_Multiplicador" NUMERIC(10, 4) NOT NULL CHECK ("Factor_Multiplicador" > 0),
  "Unidad_Factor" TEXT DEFAULT 'cantidad por m2',
  "Activo" BOOLEAN DEFAULT TRUE,
  "Fecha_Creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("Material_Estructural_ID", "Insumo_ID")
);

-- ========== SEEDS ==========

-- Seed 001: Poblar Material_Estructural
INSERT INTO "Material_Estructural" ("Nombre", "Descripcion", "Activo") VALUES
  ('Madera', 'Estructura de madera para viviendas', TRUE),
  ('Metalcom', 'Estructura con perfiles metalcom', TRUE),
  ('Albañilería', 'Estructura de albañilería y hormigón', TRUE),
  ('Hormigón Armado', 'Estructura de hormigón con armadura de acero', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

-- Seed 002: Poblar Configuracion_Simulacion (ejemplo)
INSERT INTO "Configuracion_Simulacion" ("M2_Totales", "Material_Estructural_ID", "Habitaciones", "Banios", "Areas_Comunes") VALUES
  (80, 1, 3, 2, 2),
  (100, 2, 4, 2, 3),
  (120, 3, 4, 3, 3)
ON CONFLICT DO NOTHING;

-- Seed 003: Poblar Insumo con catálogo completo de materiales

-- OBRA GRUESA (5 insumos mínimos)
INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  ('Cemento Portland', 'Obra Gruesa', 'saco 25kg', 'Cemento Portland para uso general en albañilería y hormigón', TRUE),
  ('Cemento Especial', 'Obra Gruesa', 'saco 25kg', 'Cemento especial para refuerzos estructurales', TRUE),
  ('Fierro A63-42H', 'Obra Gruesa', 'kg', 'Acero laminado en caliente para refuerzo estructural', TRUE),
  ('Arena Gruesa', 'Obra Gruesa', 'metro cuadrado', 'Arena gruesa para hormigones y morteros', TRUE),
  ('Ripio', 'Obra Gruesa', 'metro cuadrado', 'Ripio o grava para hormigones', TRUE),
  ('Agua', 'Obra Gruesa', 'litro', 'Agua para obras civiles', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

-- TERMINACIONES (4+ insumos mínimos)
INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  ('Volcanita RH Standard', 'Terminaciones', 'plancha', 'Placa de yeso cartón estándar 1.2x2.4m x 12.5mm', TRUE),
  ('Volcanita RH Reforzado', 'Terminaciones', 'plancha', 'Placa de yeso cartón reforzado para zonas húmedas', TRUE),
  ('Pintura Acrílica Blanca', 'Terminaciones', 'litro', 'Pintura acrílica blanca interior', TRUE),
  ('Pintura Esmalte', 'Terminaciones', 'litro', 'Pintura esmalte para exteriores', TRUE),
  ('Cerámica Piso', 'Terminaciones', 'metro cuadrado', 'Cerámica para pisos (varios modelos)', TRUE),
  ('Cerámica Muro', 'Terminaciones', 'metro cuadrado', 'Cerámica para muros interiores', TRUE),
  ('Piso Flotante', 'Terminaciones', 'metro cuadrado', 'Piso flotante laminado o vinílico', TRUE),
  ('Adhesivo Cerámico', 'Terminaciones', 'kg', 'Adhesivo para aplicación de cerámica', TRUE),
  ('Lechada Cerámica', 'Terminaciones', 'kg', 'Lechada o fragua para espacios entre cerámicas', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

-- INSTALACIONES (3+ insumos mínimos)
INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  ('Cable H07Z1-K 1x2.5mm', 'Instalaciones', 'metro lineal', 'Cable flexible libre de halógenos 1x2.5mm²', TRUE),
  ('Cable H07Z1-K 1x4mm', 'Instalaciones', 'metro lineal', 'Cable flexible libre de halógenos 1x4mm²', TRUE),
  ('Cable H07Z1-K 1x6mm', 'Instalaciones', 'metro lineal', 'Cable flexible libre de halógenos 1x6mm²', TRUE),
  ('Tubo PVC Agua 110mm', 'Instalaciones', 'metro lineal', 'Tubo de PVC para agua potable diámetro 110mm', TRUE),
  ('Tubo PVC Agua 75mm', 'Instalaciones', 'metro lineal', 'Tubo de PVC para agua potable diámetro 75mm', TRUE),
  ('Tubo PVC Agua 50mm', 'Instalaciones', 'metro lineal', 'Tubo de PVC para agua potable diámetro 50mm', TRUE),
  ('Tubo Cobre 15mm', 'Instalaciones', 'metro lineal', 'Tubo de cobre rígido 15mm para gas', TRUE),
  ('Tubo Cobre 22mm', 'Instalaciones', 'metro lineal', 'Tubo de cobre rígido 22mm para gas', TRUE),
  ('Caja Eléctrica Embutida', 'Instalaciones', 'unidad', 'Caja eléctrica embutida para enchufes', TRUE),
  ('Disyuntor Termomagnético', 'Instalaciones', 'unidad', 'Disyuntor termomagnético 16-20A', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

-- MANO DE OBRA (4 insumos mínimos, medidas en HH = Horas Hombre)
INSERT INTO "Insumo" ("Nombre", "Categoria", "Unidad_Medida", "Descripcion", "Activo") VALUES
  ('Albañil', 'Mano de Obra', 'HH', 'Mano de obra de albañil (hora hombre)', TRUE),
  ('Electricista', 'Mano de Obra', 'HH', 'Mano de obra de electricista (hora hombre)', TRUE),
  ('Gasfíter', 'Mano de Obra', 'HH', 'Mano de obra de gasfíter/plomero (hora hombre)', TRUE),
  ('Ayudante General', 'Mano de Obra', 'HH', 'Mano de obra de ayudante general (hora hombre)', TRUE)
ON CONFLICT ("Nombre") DO NOTHING;

-- Seed 004: Poblar Matriz_Rendimiento (factores de rendimiento por material)
INSERT INTO "Matriz_Rendimiento" ("Material_Estructural_ID", "Insumo_ID", "Factor_Multiplicador", "Unidad_Factor", "Activo") VALUES
  (1, 1, 0.5, 'cantidad por m2', TRUE),   -- Madera + Cemento
  (1, 3, 0.8, 'cantidad por m2', TRUE),   -- Madera + Fierro
  (1, 6, 0.3, 'cantidad por m2', TRUE),   -- Madera + Agua
  (2, 2, 0.4, 'cantidad por m2', TRUE),   -- Metalcom + Cemento Especial
  (2, 9, 2.0, 'cantidad por m2', TRUE),   -- Metalcom + Volcanita
  (3, 1, 0.7, 'cantidad por m2', TRUE),   -- Albañilería + Cemento Portland
  (3, 4, 1.5, 'cantidad por m2', TRUE),   -- Albañilería + Arena
  (3, 5, 1.2, 'cantidad por m2', TRUE),   -- Albañilería + Ripio
  (4, 1, 0.8, 'cantidad por m2', TRUE),   -- Hormigón Armado + Cemento Portland
  (4, 3, 1.5, 'cantidad por m2', TRUE),   -- Hormigón Armado + Fierro
  (4, 4, 2.0, 'cantidad por m2', TRUE),   -- Hormigón Armado + Arena
  (1, 20, 0.15, 'cantidad por m2', TRUE), -- Madera + Albañil (HH por m2)
  (2, 20, 0.2, 'cantidad por m2', TRUE),  -- Metalcom + Albañil
  (3, 20, 0.3, 'cantidad por m2', TRUE),  -- Albañilería + Albañil
  (4, 20, 0.25, 'cantidad por m2', TRUE)  -- Hormigón Armado + Albañil
ON CONFLICT ("Material_Estructural_ID", "Insumo_ID") DO NOTHING;

-- ========== VERIFICACIONES FINALES ==========
-- Contar todas las tablas principales
SELECT 'Material_Estructural' as tabla, COUNT(*) as total FROM "Material_Estructural" 
UNION ALL
SELECT 'Insumo' as tabla, COUNT(*) as total FROM "Insumo" 
UNION ALL
SELECT 'Matriz_Rendimiento' as tabla, COUNT(*) as total FROM "Matriz_Rendimiento" 
UNION ALL
SELECT 'Configuracion_Simulacion' as tabla, COUNT(*) as total FROM "Configuracion_Simulacion";

-- Verificación específica de Insumo por categoría
SELECT 'INSUMO VERIFICATION' as "VERIFICATION", 'Obra Gruesa' as categoria, COUNT(*) as cantidad FROM "Insumo" WHERE "Categoria" = 'Obra Gruesa'
UNION ALL
SELECT 'INSUMO VERIFICATION', 'Terminaciones' as categoria, COUNT(*) as cantidad FROM "Insumo" WHERE "Categoria" = 'Terminaciones'
UNION ALL
SELECT 'INSUMO VERIFICATION', 'Instalaciones' as categoria, COUNT(*) as cantidad FROM "Insumo" WHERE "Categoria" = 'Instalaciones'
UNION ALL
SELECT 'INSUMO VERIFICATION', 'Mano de Obra' as categoria, COUNT(*) as cantidad FROM "Insumo" WHERE "Categoria" = 'Mano de Obra'
UNION ALL
SELECT 'INSUMO VERIFICATION', 'TOTAL' as categoria, COUNT(*) as cantidad FROM "Insumo";

