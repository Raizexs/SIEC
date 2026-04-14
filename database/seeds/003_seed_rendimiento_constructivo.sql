-- ════════════════════════════════════════════════════════════════════════════════
-- HU10: Seed de Rendimientos Constructivos
-- ════════════════════════════════════════════════════════════════════════════════
-- Inserta factores de rendimiento para cada material estructural base
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO Rendimiento_Constructivo 
  (Material_Estructural_ID, Factor_Rendimiento, Insumo_Base, Unidad, Descripcion)
VALUES
  (
    1,
    0.5,
    'Sacos de Cemento',
    'sacos',
    'Madera: Factor constructivo de 0.5 sacos de cemento por m² para estructuras de madera'
  ),
  (
    2,
    0.7,
    'Sacos de Cemento',
    'sacos',
    'Metalcom: Factor constructivo de 0.7 sacos de cemento por m² para estructuras metálicas'
  ),
  (
    3,
    1.2,
    'Sacos de Cemento',
    'sacos',
    'Albañilería: Factor constructivo de 1.2 sacos de cemento por m² para albañilería tradicional'
  ),
  (
    4,
    1.5,
    'Sacos de Cemento',
    'sacos',
    'Hormigón Armado: Factor constructivo de 1.5 sacos de cemento por m² para estructuras de hormigón'
  )
ON CONFLICT (Material_Estructural_ID) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
-- Tabla de Referencia de Valores Iniciales:
-- ════════════════════════════════════════════════════════════════════════════════
-- Material_Estructural_ID | Nombre             | Factor | Insumo_Base
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1                       | Madera             | 0.5    | Sacos de Cemento
-- 2                       | Metalcom           | 0.7    | Sacos de Cemento
-- 3                       | Albañilería        | 1.2    | Sacos de Cemento
-- 4                       | Hormigón Armado    | 1.5    | Sacos de Cemento
-- ════════════════════════════════════════════════════════════════════════════════
