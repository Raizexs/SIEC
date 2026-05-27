-- Migración 013: Permitir categoría "Techumbre" en tabla Insumo
-- Necesaria para los insumos de techumbre scrapeables (plancha zinc, costanera, etc.)

ALTER TABLE "Insumo" DROP CONSTRAINT IF EXISTS "Insumo_Categoria_check";
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_Categoria_check" CHECK ("Categoria" = ANY (ARRAY['Obra Gruesa', 'Terminaciones', 'Instalaciones', 'Mano de Obra', 'Techumbre']::text[]));
