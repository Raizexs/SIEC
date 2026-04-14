-- ════════════════════════════════════════════════════════════════════════════════
-- DIAGRAMA DE RELACIONES - HU10 MATRIZ DE RENDIMIENTOS CONSTRUCTIVOS
-- ════════════════════════════════════════════════════════════════════════════════

/*

┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE BASE DE DATOS - HU10                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│   MATERIAL_ESTRUCTURAL (FK)     │
├─────────────────────────────────┤
│ ID (PK)                         │
│ Nombre (UNIQUE, INDEX)          │
└─────────────────────────────────┘
         │
         │ 1:1 (UNIQUE FK)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│      RENDIMIENTO_CONSTRUCTIVO (HU10 - NUEVA TABLA)             │
├─────────────────────────────────────────────────────────────────┤
│ ID (PK)                                                         │
│ Material_Estructural_ID (FK, UNIQUE, INDEX) ──→ FK             │
│ Factor_Rendimiento (DECIMAL 8,4) - Dinámico                    │
│ Insumo_Base (VARCHAR) - "Sacos de Cemento"                     │
│ Unidad (VARCHAR) - "sacos", "kg", "m", etc                     │
│ Descripcion (TEXT)                                              │
│ Fecha_Creacion (TIMESTAMP, DEFAULT NOW)                        │
│ Fecha_Actualizacion (TIMESTAMP, DEFAULT NOW)                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ 1:N (Puede tener)
         │
         ▼
┌───────────────────────────────────────────────────────┐
│  CONFIGURACION_SIMULACION (Usa Rendimiento)          │
├───────────────────────────────────────────────────────┤
│ ID (PK)                                               │
│ M2_Totales (INTEGER)                                  │
│ Material_Estructural_ID (FK) ──→ Se busca en         │
│ Habitaciones (INTEGER)              Rendimiento      │
│ Banios (INTEGER)                                      │
│ Areas_Comunes (INTEGER)                               │
│ Fecha_Creacion (TIMESTAMP)                            │
└───────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE ESTIMACIÓN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuario: m² = 100, Material = 1 (Madera)                       │
│  ↓                                                              │
│  SELECT factor_rendimiento FROM Rendimiento_Constructivo        │
│  WHERE material_estructural_id = 1                              │
│  ↓                                                              │
│  factor = 0.5 (sacos de cemento)                                │
│  ↓                                                              │
│  cantidad_insumos = 100 * 0.5 = 50 sacos                        │
│  ↓                                                              │
│  INSERT INTO Configuracion_Simulacion (...)                     │
│  RETURN { estimacion_insumos: {...} }                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

*/

-- ════════════════════════════════════════════════════════════════════════════════
-- QUERIES DE REFERENCIA
-- ════════════════════════════════════════════════════════════════════════════════

-- Query 1: Obtener rendimiento para un material específico
-- Usada por: GET /api/rendimientos/{material_id}
SELECT 
  rc.id,
  rc.material_estructural_id,
  rc.factor_rendimiento,
  rc.insumo_base,
  rc.unidad,
  rc.descripcion
FROM Rendimiento_Constructivo rc
WHERE rc.material_estructural_id = 1;  -- Madera

-- Query 2: Obtener todos los rendimientos con nombres de materiales
-- Usada por: GET /api/rendimientos
SELECT 
  rc.id,
  me.nombre as material,
  rc.material_estructural_id,
  rc.factor_rendimiento,
  rc.insumo_base,
  rc.unidad,
  rc.descripcion
FROM Rendimiento_Constructivo rc
INNER JOIN Material_Estructural me ON rc.material_estructural_id = me.id
ORDER BY me.id;

-- Query 3: Calcular insumos para una vivienda (EJEMPLO)
-- Usada por: POST /api/simulacion/parametros (Backend)
-- Parámetros: m2_totales = 100, material_id = 1
WITH estimacion AS (
  SELECT 
    100 as m2_totales,                    -- m² ingresados por usuario
    rc.factor_rendimiento,                 -- Factor de BD
    100 * rc.factor_rendimiento as cantidad_insumos  -- FÓRMULA PRINCIPAL
  FROM Rendimiento_Constructivo rc
  WHERE rc.material_estructural_id = 1
)
SELECT 
  m2_totales,
  factor_rendimiento,
  cantidad_insumos,
  'sacos' as unidad,
  CONCAT(
    ROUND(cantidad_insumos, 4),
    ' ',
    'sacos',
    ' de Cemento'
  ) as estimacion_formateada
FROM estimacion;

-- Query 4: Verificar integridad - Materiales sin rendimiento
SELECT 
  me.id,
  me.nombre,
  CASE 
    WHEN rc.id IS NULL THEN '⚠️ SIN RENDIMIENTO'
    ELSE '✓ OK'
  END as estado
FROM Material_Estructural me
LEFT JOIN Rendimiento_Constructivo rc ON me.id = rc.material_estructural_id
ORDER BY me.id;

-- Query 5: Auditoría - Cambios en rendimientos
SELECT 
  rc.material_estructural_id,
  me.nombre,
  rc.factor_rendimiento,
  rc.fecha_creacion,
  rc.fecha_actualizacion,
  CASE 
    WHEN rc.fecha_actualizacion > rc.fecha_creacion THEN 'MODIFICADO'
    ELSE 'ORIGINAL'
  END as estado
FROM Rendimiento_Constructivo rc
INNER JOIN Material_Estructural me ON rc.material_estructural_id = me.id
ORDER BY rc.fecha_actualizacion DESC;

-- ════════════════════════════════════════════════════════════════════════════════
-- FÓRMULA DE CÁLCULO IMPLEMENTADA
-- ════════════════════════════════════════════════════════════════════════════════

/*

CANTIDAD_DE_INSUMOS = M² INGRESADOS × FACTOR_RENDIMIENTO

Donde:
- M² INGRESADOS: Área total de la vivienda (proporcionada por usuario)
- FACTOR_RENDIMIENTO: Valor dinámico consultado de BD por Material_Estructural_ID

Ejemplos:

1) Material: Madera (ID=1), Factor: 0.5 sacos/m²
   m² = 100
   Insumos = 100 × 0.5 = 50 sacos de cemento

2) Material: Metalcom (ID=2), Factor: 0.7 sacos/m²
   m² = 50
   Insumos = 50 × 0.7 = 35 sacos de cemento

3) Material: Albañilería (ID=3), Factor: 1.2 sacos/m²
   m² = 80
   Insumos = 80 × 1.2 = 96 sacos de cemento

4) Material: Hormigón Armado (ID=4), Factor: 1.5 sacos/m²
   m² = 120
   Insumos = 120 × 1.5 = 180 sacos de cemento

*/

-- ════════════════════════════════════════════════════════════════════════════════
-- CAMBIO DE FACTOR - CASO DE USO
-- ════════════════════════════════════════════════════════════════════════════════

/*

Si en el futuro se requiere cambiar el factor de rendimiento para Madera 
de 0.5 a 0.6 sacos/m², la actualización es simple y no requiere cambios en código:

UPDATE Rendimiento_Constructivo
SET 
  factor_rendimiento = 0.6,
  fecha_actualizacion = CURRENT_TIMESTAMP
WHERE material_estructural_id = 1;

Todos los nuevos cálculos usarán automáticamente 0.6 sin cambios en código.
Esta es la VENTAJA PRINCIPAL de usar BD en lugar de valores hardcodeados.

*/

-- ════════════════════════════════════════════════════════════════════════════════
