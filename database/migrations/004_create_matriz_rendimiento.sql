-- Migración 004: Crear tabla Matriz_Rendimiento
-- Define cuánto insumo se gasta por m² para cada Material Estructural
-- Ejemplo: 0.5 sacos de cemento por m² de albañilería
-- Esto permite que el cálculo de costos sea dinámico sin hardcodear multiplicadores

CREATE TABLE IF NOT EXISTS Matriz_Rendimiento (
  ID SERIAL PRIMARY KEY,
  Material_Estructural_ID INTEGER NOT NULL,
  Insumo_ID INTEGER NOT NULL,
  Factor_Multiplicador DECIMAL(10, 4) NOT NULL CHECK (Factor_Multiplicador > 0),
  Descripcion TEXT,
  Activo BOOLEAN DEFAULT TRUE,
  Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Fecha_Actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  FOREIGN KEY (Insumo_ID) REFERENCES Insumo (ID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    
  -- Restricción única: un material + insumo solo tiene un factor
  UNIQUE(Material_Estructural_ID, Insumo_ID)
);

-- Índices para optimizar queries frecuentes
CREATE INDEX IF NOT EXISTS idx_matriz_material ON Matriz_Rendimiento(Material_Estructural_ID);
CREATE INDEX IF NOT EXISTS idx_matriz_insumo ON Matriz_Rendimiento(Insumo_ID);
CREATE INDEX IF NOT EXISTS idx_matriz_activo ON Matriz_Rendimiento(Activo);

-- Índice compuesto para queries de "dame todos los insumos de este material"
CREATE INDEX IF NOT EXISTS idx_matriz_material_activo ON Matriz_Rendimiento(Material_Estructural_ID, Activo);
