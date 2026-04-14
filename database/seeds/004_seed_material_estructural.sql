-- ════════════════════════════════════════════════════════════════════════════════
-- SCRUM-59: Seeds para Catálogo de Materiales Estructurales
-- ════════════════════════════════════════════════════════════════════════════════
-- Descripción:
-- Populate la tabla material_estructural con los 4 materiales base requeridos
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO material_estructural (nombre) VALUES 
  ('Madera'),
  ('Metalcom'),
  ('Albañilería'),
  ('Hormigón Armado')
ON CONFLICT (nombre) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
