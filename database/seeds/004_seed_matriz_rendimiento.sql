-- Seed 004: Insertar factores de rendimiento en tabla Matriz_Rendimiento
-- Define cuánto insumo se gasta por m² para cada Material Estructural Base
-- Ejemplo: 0.5 sacos de cemento por m² de albañilería

INSERT INTO Matriz_Rendimiento (Material_Estructural_ID, Insumo_ID, Factor_Multiplicador, Descripcion, Activo) VALUES
  -- MADERA (Material_ID = 1)
  (1, 3, 0.08, 'Fierro A63 para refuerzo en estructura de madera', TRUE),
  (1, 16, 0.02, 'Cable eléctrico 1x2.5mm para instalaciones', TRUE),
  (1, 19, 0.015, 'Tubo PVC agua 75mm para tuberías de agua', TRUE),
  
  -- METALCOM (Material_ID = 2)
  (2, 3, 0.15, 'Fierro A63 para estructura metalcom', TRUE),
  (2, 16, 0.025, 'Cable para electricidad en metalcom', TRUE),
  (2, 19, 0.02, 'Tubo PVC agua para instalaciones sanitarias', TRUE),
  
  -- ALBAÑILERÍA (Material_ID = 3)
  (3, 1, 0.5, 'Cemento Portland: 0.5 sacos por m² de albañilería', TRUE),
  (3, 3, 0.04, 'Fierro A63 de refuerzo: 0.04 kg por m²', TRUE),
  (3, 8, 0.15, 'Volcanita RH Standard para revestimiento interior', TRUE),
  (3, 16, 0.01, 'Cable para instalaciones eléctricas', TRUE),
  (3, 19, 0.008, 'Tubo PVC agua para agua y desagüe', TRUE),
  (3, 41, 0.05, 'Albañil: 0.05 HH por m² de albañilería', TRUE),
  
  -- HORMIGÓN ARMADO (Material_ID = 4)
  (4, 2, 0.35, 'Cemento Especial: 0.35 sacos por m² de hormigón', TRUE),
  (4, 3, 0.08, 'Fierro A63 de refuerzo principal: 0.08 kg por m²', TRUE),
  (4, 16, 0.012, 'Cable para instalaciones eléctricas en hormigón', TRUE),
  (4, 19, 0.01, 'Tubo PVC agua para instalaciones en hormigón', TRUE),
  (4, 41, 0.08, 'Albañil: 0.08 HH por m² de hormigón armado', TRUE)
ON CONFLICT (Material_Estructural_ID, Insumo_ID) DO NOTHING;

-- Verificación: total de factores por material
SELECT 
  me.Nombre as Material,
  COUNT(mr.ID) as total_insumos,
  ROUND(AVG(mr.Factor_Multiplicador)::numeric, 4) as factor_promedio
FROM Matriz_Rendimiento mr
JOIN Material_Estructural me ON mr.Material_Estructural_ID = me.ID
WHERE mr.Activo = TRUE
GROUP BY me.ID, me.Nombre
ORDER BY me.ID;
