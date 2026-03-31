-- ════════════════════════════════════════════════════════════════════════════════
-- SCRUM-37: Seeds - Datos de Prueba para Configuracion_Simulacion
-- ════════════════════════════════════════════════════════════════════════════════
-- Inserta simulaciones de prueba para validar que la tabla funciona correctamente.
-- Estos datos pueden usarse para testing y demostración.
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO Configuracion_Simulacion 
  (M2_Totales, Material_Estructural_ID, Habitaciones, Banios, Areas_Comunes)
VALUES
  -- Simulación 1: Casa pequeña en Madera
  (80, 1, 2, 1, 1),
  
  -- Simulación 2: Departamento en Metalcom
  (60, 2, 1, 1, 1),
  
  -- Simulación 3: Casa grande en Albañilería
  (150, 3, 4, 2, 2),
  
  -- Simulación 4: Vivienda estándar en Hormigón Armado
  (100, 4, 3, 2, 1),
  
  -- Simulación 5: Pequeño estudio en Madera
  (35, 1, 0, 1, 0);

-- ════════════════════════════════════════════════════════════════════════════════
-- Notas sobre los datos de seed:
-- ════════════════════════════════════════════════════════════════════════════════
-- - Material_Estructural_ID: 1=Madera, 2=Metalcom, 3=Albañilería, 4=Hormigón Armado
-- - Los datos respetan todas las restricciones CHECK (M2 entre 15-1000, recintos >= 0)
-- - Las fechas de creación se asignan automáticamente con CURRENT_TIMESTAMP
-- - INSERT OR IGNORE previene errores si los datos ya existen (idempotente)
-- ════════════════════════════════════════════════════════════════════════════════
