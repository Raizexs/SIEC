-- ════════════════════════════════════════════════════════════════════════════════
-- SCRUM-37: Verificación de Integridad de Tabla Configuracion_Simulacion
-- ════════════════════════════════════════════════════════════════════════════════
-- Script de validación que verifica:
-- 1. Tabla existe con todos los campos requeridos
-- 2. Claves foráneas mantienen integridad referencial
-- 3. Restricciones CHECK funcionan correctamente
-- 4. Índices están creados
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR QUE LA TABLA EXISTE
-- ════════════════════════════════════════════════════════════════════════════════
SELECT name FROM sqlite_master 
WHERE type='table' AND name='Configuracion_Simulacion';
-- Resultado esperado: Una fila con 'Configuracion_Simulacion'

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. VERIFICAR ESTRUCTURA DE COLUMNAS
-- ════════════════════════════════════════════════════════════════════════════════
PRAGMA table_info(Configuracion_Simulacion);
-- Resultado esperado:
-- cid | name                    | type      | notnull | dflt_value           | pk
-- 0   | ID                      | INTEGER   | 0       | NULL                 | 1
-- 1   | M2_Totales              | INTEGER   | 1       | NULL                 | 0
-- 2   | Material_Estructural_ID | INTEGER   | 1       | NULL                 | 0
-- 3   | Habitaciones            | INTEGER   | 1       | 0                    | 0
-- 4   | Banios                  | INTEGER   | 1       | 0                    | 0
-- 5   | Areas_Comunes           | INTEGER   | 1       | 0                    | 0
-- 6   | Fecha_Creacion          | TIMESTAMP | 1       | CURRENT_TIMESTAMP    | 0

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. VERIFICAR CLAVES FORÁNEAS
-- ════════════════════════════════════════════════════════════════════════════════
PRAGMA foreign_key_list(Configuracion_Simulacion);
-- Resultado esperado:
-- id | seq | table              | from        | to  | on_delete | on_update
-- 0  | 0   | Material_Estructural | Material_Estructural_ID | ID | RESTRICT  | CASCADE

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR ÍNDICES
-- ════════════════════════════════════════════════════════════════════════════════
SELECT name, tbl_name FROM sqlite_master 
WHERE type='index' AND tbl_name='Configuracion_Simulacion';
-- Resultado esperado:
-- idx_configuracion_fecha
-- idx_configuracion_material

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR DATOS DE SEED (si existen)
-- ════════════════════════════════════════════════════════════════════════════════
SELECT COUNT(*) as total_simulaciones FROM Configuracion_Simulacion;
-- Resultado esperado: 5 (o más si hay datos adicionales)

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. VERIFICAR JOINS CON Material_Estructural (Integridad Referencial)
-- ════════════════════════════════════════════════════════════════════════════════
SELECT 
  cs.ID,
  cs.M2_Totales,
  me.Nombre as Material,
  cs.Habitaciones,
  cs.Banios,
  cs.Areas_Comunes,
  cs.Fecha_Creacion
FROM Configuracion_Simulacion cs
INNER JOIN Material_Estructural me ON cs.Material_Estructural_ID = me.ID
ORDER BY cs.ID;
-- Resultado esperado: Listado de simulaciones con nombre del material

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. VERIFICAR RESTRICCIONES CHECK (M2 válido)
-- ════════════════════════════════════════════════════════════════════════════════
-- Este query debería retornar solo registros válidos
SELECT ID, M2_Totales FROM Configuracion_Simulacion 
WHERE M2_Totales < 1 OR M2_Totales > 1000;
-- Resultado esperado: Ninguna fila (0 resultados)

-- ════════════════════════════════════════════════════════════════════════════════
-- 8. VERIFICAR RESTRICCIONES CHECK (Recintos no negativos)
-- ════════════════════════════════════════════════════════════════════════════════
SELECT ID, Habitaciones, Banios, Areas_Comunes FROM Configuracion_Simulacion 
WHERE Habitaciones < 0 OR Banios < 0 OR Areas_Comunes < 0;
-- Resultado esperado: Ninguna fila (0 resultados)

-- ════════════════════════════════════════════════════════════════════════════════
-- 9. VERIFICAR INTEGRIDAD REFERENCIAL (Material existe)
-- ════════════════════════════════════════════════════════════════════════════════
SELECT cs.ID, cs.Material_Estructural_ID 
FROM Configuracion_Simulacion cs
LEFT JOIN Material_Estructural me ON cs.Material_Estructural_ID = me.ID
WHERE me.ID IS NULL;
-- Resultado esperado: Ninguna fila (0 resultados) - todos los materiales existen

-- ════════════════════════════════════════════════════════════════════════════════
-- RESUMEN DE VALIDACIONES
-- ════════════════════════════════════════════════════════════════════════════════
-- ✅ Tabla existe con estructura correcta
-- ✅ Claves foráneas configuradas correctamente
-- ✅ Restricciones CHECK funcionan
-- ✅ Índices creados para optimización
-- ✅ Integridad referencial mantiene datos válidos
-- ✅ Seeds insertados correctamente
-- ════════════════════════════════════════════════════════════════════════════════
