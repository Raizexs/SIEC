-- Migration 009: Expandir CHECK de Tienda en precio_mercado
-- Permite cualquier nombre de tienda (no solo sodimac/easy/construmart)
-- Necesario para SerpAPI que devuelve resultados de multiples retailers

ALTER TABLE precio_mercado
  DROP CONSTRAINT IF EXISTS "precio_mercado_Tienda_check";

ALTER TABLE precio_mercado
  ADD CONSTRAINT "precio_mercado_Tienda_check"
  CHECK ("Tienda" IS NOT NULL AND char_length("Tienda") > 0);
