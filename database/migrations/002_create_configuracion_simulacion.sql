-- ════════════════════════════════════════════════════════════════════════════════
-- SCRUM-37: Tabla de Configuración de Simulación
-- ════════════════════════════════════════════════════════════════════════════════
-- Descripción:
-- Tabla que persiste los parámetros completos de cada simulación creada por 
-- el usuario. Almacena: m² totales, ID del material estructural, cantidades 
-- de recintos y fecha de creación.
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Configuracion_Simulacion (
  ID SERIAL PRIMARY KEY,
  M2_Totales INTEGER NOT NULL CHECK (M2_Totales >= 1 AND M2_Totales <= 1000),
  Material_Estructural_ID INTEGER NOT NULL,
  Habitaciones INTEGER NOT NULL DEFAULT 0 CHECK (Habitaciones >= 0),
  Banios INTEGER NOT NULL DEFAULT 0 CHECK (Banios >= 0),
  Areas_Comunes INTEGER NOT NULL DEFAULT 0 CHECK (Areas_Comunes >= 0),
  Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- ════════════════════════════════════════════════════════════════════════════════
-- Índices para optimización de consultas frecuentes
-- ════════════════════════════════════════════════════════════════════════════════

-- Índice en Fecha_Creacion para queries ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_configuracion_fecha 
  ON Configuracion_Simulacion (Fecha_Creacion DESC);

-- Índice en Material_Estructural_ID para joins rápidos
CREATE INDEX IF NOT EXISTS idx_configuracion_material 
  ON Configuracion_Simulacion (Material_Estructural_ID);

-- ════════════════════════════════════════════════════════════════════════════════
-- Estructura de la Tabla
-- ════════════════════════════════════════════════════════════════════════════════
-- ID: Identificador único de la simulación (Auto-incrementable)
-- M2_Totales: Metros cuadrados totales de la vivienda
--   - Restricción: debe estar entre 1 y 1000 m²
-- Material_Estructural_ID: FK a la tabla Material_Estructural
--   - Restricción: Debe existir en Material_Estructural (ON DELETE RESTRICT)
-- Habitaciones: Cantidad de habitaciones (mínimo 0)
-- Banios: Cantidad de baños (mínimo 0)
-- Areas_Comunes: Cantidad de áreas comunes (mínimo 0)
-- Fecha_Creacion: Timestamp automático de creación (DEFAULT CURRENT_TIMESTAMP)
-- ════════════════════════════════════════════════════════════════════════════════
