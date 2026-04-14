-- Seed 003: Poblar tabla Insumo con catálogo completo de materiales
-- Incluye insumos de las 4 categorías: Obra Gruesa, Terminaciones, Instalaciones, Mano de Obra
-- Uso: docker-compose up (ejecutable múltiples veces sin duplicados)

-- OBRA GRUESA (5 insumos mínimos)
INSERT INTO Insumo (Nombre, Categoria, Unidad_Medida, Descripcion, Activo) VALUES
  ('Cemento Portland', 'Obra Gruesa', 'saco 25kg', 'Cemento Portland para uso general en albañilería y hormigón', TRUE),
  ('Cemento Especial', 'Obra Gruesa', 'saco 25kg', 'Cemento especial para refuerzos estructurales', TRUE),
  ('Fierro A63-42H', 'Obra Gruesa', 'kg', 'Acero laminado en caliente para refuerzo estructural', TRUE),
  ('Arena Gruesa', 'Obra Gruesa', 'metro cuadrado', 'Arena gruesa para hormigones y morteros', TRUE),
  ('Ripio', 'Obra Gruesa', 'metro cuadrado', 'Ripio o grava para hormigones', TRUE),
  ('Agua', 'Obra Gruesa', 'litro', 'Agua para obras civiles', TRUE)
ON CONFLICT (Nombre) DO NOTHING;

-- TERMINACIONES (4+ insumos mínimos)
INSERT INTO Insumo (Nombre, Categoria, Unidad_Medida, Descripcion, Activo) VALUES
  ('Volcanita RH Standard', 'Terminaciones', 'plancha', 'Placa de yeso cartón estándar 1.2x2.4m x 12.5mm', TRUE),
  ('Volcanita RH Reforzado', 'Terminaciones', 'plancha', 'Placa de yeso cartón reforzado para zonas húmedas', TRUE),
  ('Pintura Acrílica Blanca', 'Terminaciones', 'litro', 'Pintura acrílica blanca interior', TRUE),
  ('Pintura Esmalte', 'Terminaciones', 'litro', 'Pintura esmalte para exteriores', TRUE),
  ('Cerámica Piso', 'Terminaciones', 'metro cuadrado', 'Cerámica para pisos (varios modelos)', TRUE),
  ('Cerámica Muro', 'Terminaciones', 'metro cuadrado', 'Cerámica para muros interiores', TRUE),
  ('Piso Flotante', 'Terminaciones', 'metro cuadrado', 'Piso flotante laminado o vinílico', TRUE),
  ('Adhesivo Cerámico', 'Terminaciones', 'kg', 'Adhesivo para aplicación de cerámica', TRUE),
  ('Lechada Cerámica', 'Terminaciones', 'kg', 'Lechada o fragua para espacios entre cerámicas', TRUE)
ON CONFLICT (Nombre) DO NOTHING;

-- INSTALACIONES (3+ insumos mínimos)
INSERT INTO Insumo (Nombre, Categoria, Unidad_Medida, Descripcion, Activo) VALUES
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
ON CONFLICT (Nombre) DO NOTHING;

-- MANO DE OBRA (4 insumos mínimos, medidas en HH = Horas Hombre)
INSERT INTO Insumo (Nombre, Categoria, Unidad_Medida, Descripcion, Activo) VALUES
  ('Albañil', 'Mano de Obra', 'HH', 'Mano de obra de albañil (hora hombre)', TRUE),
  ('Electricista', 'Mano de Obra', 'HH', 'Mano de obra de electricista (hora hombre)', TRUE),
  ('Gasfíter', 'Mano de Obra', 'HH', 'Mano de obra de gasfíter/plomero (hora hombre)', TRUE),
  ('Ayudante General', 'Mano de Obra', 'HH', 'Mano de obra de ayudante general (hora hombre)', TRUE)
ON CONFLICT (Nombre) DO NOTHING;

-- Verificación: contar insumos por categoría
SELECT 
  Categoria,
  COUNT(*) as total_insumos
FROM Insumo
WHERE Activo = TRUE
GROUP BY Categoria
ORDER BY Categoria;

-- Verificación: total de insumos insertados
SELECT COUNT(*) as total_insumos FROM Insumo WHERE Activo = TRUE;
