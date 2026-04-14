-- ════════════════════════════════════════════════════════════════════════════════
-- SCRUM-59: Motor de Costos - Tablas de Insumos, Rendimientos y Precios
-- ════════════════════════════════════════════════════════════════════════════════
-- Descripción:
-- Tablas relacionales que soportan el motor de costos y scraping de precios.
-- Extiende el esquema existente con cuatro tablas: material_estructural, 
-- insumo, matriz_rendimiento y precio_mercado.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: material_estructural
-- Descripción: Catálogo de materiales estructurales disponibles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_estructural (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: insumo
-- Descripción: Catálogo de insumos (materiales, componentes, mano de obra)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insumo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Obra Gruesa', 'Terminaciones', 'Instalaciones', 'Mano de Obra')),
  unidad_medida VARCHAR(30) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: matriz_rendimiento
-- Descripción: Matriz que relaciona materiales con insumos y sus factores
-- Permite calcular cantidades de insumo por material e intensidad de uso
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matriz_rendimiento (
  id SERIAL PRIMARY KEY,
  material_id INT NOT NULL REFERENCES material_estructural(id),
  insumo_id INT NOT NULL REFERENCES insumo(id),
  factor_multiplicador NUMERIC(10,4) NOT NULL CHECK (factor_multiplicador > 0),
  UNIQUE(material_id, insumo_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: precio_mercado
-- Descripción: Precios históricos de insumos recolectados mediante scraping
-- Permite rastrear variaciones de precio por tienda y fecha
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS precio_mercado (
  id SERIAL PRIMARY KEY,
  insumo_id INT NOT NULL REFERENCES insumo(id),
  precio_clp INT NOT NULL CHECK (precio_clp > 0),
  tienda_origen VARCHAR(50) NOT NULL CHECK (tienda_origen IN ('Sodimac', 'Easy', 'Construmart')),
  fecha_scraping TIMESTAMP NOT NULL DEFAULT NOW(),
  region VARCHAR(50) NOT NULL DEFAULT 'Valparaíso'
);

-- ════════════════════════════════════════════════════════════════════════════════
-- Índices para optimización
-- ════════════════════════════════════════════════════════════════════════════════

-- Índices para matriz_rendimiento (búsquedas por material e insumo)
CREATE INDEX IF NOT EXISTS idx_matriz_material_id ON matriz_rendimiento(material_id);
CREATE INDEX IF NOT EXISTS idx_matriz_insumo_id ON matriz_rendimiento(insumo_id);

-- Índices para precio_mercado (búsquedas por insumo, tienda y fecha)
CREATE INDEX IF NOT EXISTS idx_precio_insumo_id ON precio_mercado(insumo_id);
CREATE INDEX IF NOT EXISTS idx_precio_tienda_origen ON precio_mercado(tienda_origen);
CREATE INDEX IF NOT EXISTS idx_precio_fecha_scraping ON precio_mercado(fecha_scraping DESC);

-- ════════════════════════════════════════════════════════════════════════════════
