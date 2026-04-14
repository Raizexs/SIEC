-- ════════════════════════════════════════════════════════════════════════════════
-- HU10: Tabla de Rendimientos Constructivos
-- ════════════════════════════════════════════════════════════════════════════════
-- Descripción:
-- Tabla relacional que define la matriz de rendimientos constructivos. 
-- Asocia cada Material Estructural Base con su factor de rendimiento por m².
-- Ejemplo: Madera requiere 0.5 sacos de cemento por m² de albañilería
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS Rendimiento_Constructivo (
  ID SERIAL PRIMARY KEY,
  Material_Estructural_ID INTEGER NOT NULL UNIQUE,
  Factor_Rendimiento DECIMAL(8, 4) NOT NULL,
  Insumo_Base VARCHAR(100) NOT NULL,
  Unidad VARCHAR(50) NOT NULL DEFAULT 'm²',
  Descripcion TEXT,
  Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Fecha_Actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- ════════════════════════════════════════════════════════════════════════════════
-- Índices para optimización
-- ════════════════════════════════════════════════════════════════════════════════

-- Índice en Material_Estructural_ID para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_rendimiento_material 
  ON Rendimiento_Constructivo (Material_Estructural_ID);

-- ════════════════════════════════════════════════════════════════════════════════
-- Estructura de la Tabla
-- ════════════════════════════════════════════════════════════════════════════════
-- ID: Identificador único del rendimiento
-- Material_Estructural_ID: FK a Material_Estructural (relación 1:1)
-- Factor_Rendimiento: Factor multiplicador dinámico (ej. 0.5, 1.2, etc.)
--   - Tipo: DECIMAL(8,4) para precisión en cálculos constructivos
--   - Ejemplo: 0.5 sacos de cemento por m² para albañilería en Madera
-- Insumo_Base: Descripción del insumo principal (ej. "Sacos de Cemento")
-- Unidad: Unidad de medida del insumo (ej. "sacos", "kg", "unidades")
-- Descripcion: Documentación adicional del factor
-- Fecha_Creacion: Timestamp automático
-- Fecha_Actualizacion: Timestamp para auditoría de cambios
-- ════════════════════════════════════════════════════════════════════════════════
