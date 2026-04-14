-- ════════════════════════════════════════════════════════════════════════════════
-- HU10: Verificación de Rendimientos Constructivos
-- ════════════════════════════════════════════════════════════════════════════════
-- Script de validación que verifica la integridad de la tabla de rendimientos
-- ════════════════════════════════════════════════════════════════════════════════

-- Verificar que existan exactamente 4 rendimientos (uno por cada material)
SELECT 
  COUNT(*) as total_rendimientos,
  STRING_AGG(DISTINCT me.nombre, ', ') as materiales_configurados
FROM Rendimiento_Constructivo rc
INNER JOIN Material_Estructural me ON rc.material_estructural_id = me.id;

-- Mostrar detalles de cada rendimiento configurado
SELECT 
  me.id,
  me.nombre as material,
  rc.factor_rendimiento,
  rc.insumo_base,
  rc.unidad,
  rc.descripcion
FROM Rendimiento_Constructivo rc
INNER JOIN Material_Estructural me ON rc.material_estructural_id = me.id
ORDER BY me.id;

-- Verificar que no haya materiales sin rendimiento asociado
SELECT 
  me.id,
  me.nombre,
  CASE 
    WHEN rc.id IS NULL THEN 'SIN RENDIMIENTO'
    ELSE 'OK'
  END as estado
FROM Material_Estructural me
LEFT JOIN Rendimiento_Constructivo rc ON me.id = rc.material_estructural_id
ORDER BY me.id;

-- ════════════════════════════════════════════════════════════════════════════════
-- Ejemplo de cálculo: Vivienda de 100 m² en Madera
-- ════════════════════════════════════════════════════════════════════════════════
-- 100 m² × 0.5 = 50 sacos de cemento
-- ════════════════════════════════════════════════════════════════════════════════
