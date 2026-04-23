-- Migración 005: Crear tabla precio_mercado
-- Almacena los precios scrapeados desde Sodimac, Easy y Construmart

CREATE TABLE IF NOT EXISTS "precio_mercado" (
  "ID"           SERIAL PRIMARY KEY,
  "Insumo_ID"    INTEGER REFERENCES "Insumo"("ID") ON DELETE SET NULL,
  "Tienda"       TEXT NOT NULL CHECK ("Tienda" IN ('sodimac', 'easy', 'construmart')),
  "Nombre_Producto" TEXT NOT NULL,
  "Precio"       NUMERIC(12, 2),
  "Precio_Descuento" NUMERIC(12, 2),
  "Stock"        TEXT,
  "Categoria"    TEXT,
  "URL"          TEXT NOT NULL,
  "Fecha_Scraping" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Exitoso"      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Índices para queries frecuentes del backend
CREATE INDEX IF NOT EXISTS idx_pm_tienda         ON "precio_mercado"("Tienda");
CREATE INDEX IF NOT EXISTS idx_pm_insumo         ON "precio_mercado"("Insumo_ID");
CREATE INDEX IF NOT EXISTS idx_pm_fecha          ON "precio_mercado"("Fecha_Scraping" DESC);
CREATE INDEX IF NOT EXISTS idx_pm_tienda_fecha   ON "precio_mercado"("Tienda", "Fecha_Scraping" DESC);
