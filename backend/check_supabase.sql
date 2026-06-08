-- Verifica estado de Supabase
-- 1. Cuántos precios con URL hay?
SELECT COUNT(*) as total, COUNT(CASE WHEN "URL" != '' THEN 1 END) as con_url 
FROM precio_mercado WHERE "Exitoso" = true;

-- 2. Pino 2x3 y 2x4 tienen tienda?
SELECT "Insumo_ID", "Tienda", "Precio", "URL", "Fecha_Scraping"
FROM precio_mercado 
WHERE "Insumo_ID" IN (10, 11) AND "Exitoso" = true
ORDER BY "Fecha_Scraping" DESC;

-- 3. Cuántos insumos activos hay?
SELECT COUNT(*) FROM "Insumo" WHERE "Activo" = true;

-- 4. MatrizRendimiento rows?
SELECT COUNT(*) FROM "Matriz_Rendimiento" WHERE "Activo" = true;
