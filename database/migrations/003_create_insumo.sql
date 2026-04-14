-- Migración 003: Crear tabla Insumo
-- Almacena el catálogo de materiales/componentes utilizados en construcción
-- Estos insumos se utilizan luego en la tabla Matriz_Rendimiento para definir factores

CREATE TABLE IF NOT EXISTS Insumo (
  ID SERIAL PRIMARY KEY,
  Nombre TEXT NOT NULL UNIQUE,
  Categoria TEXT NOT NULL CHECK (Categoria IN (
    'Obra Gruesa',
    'Terminaciones',
    'Instalaciones',
    'Mano de Obra'
  )),
  Unidad_Medida TEXT NOT NULL CHECK (Unidad_Medida IN (
    'saco 25kg',
    'saco 50kg',
    'kg',
    'litro',
    'metro',
    'metro lineal',
    'plancha',
    'unidad',
    'caja',
    'rollo',
    'HH',
    'hora',
    'metro cuadrado'
  )),
  Descripcion TEXT,
  Activo BOOLEAN DEFAULT TRUE,
  Fecha_Creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_insumo_categoria ON Insumo(Categoria);
CREATE INDEX IF NOT EXISTS idx_insumo_activo ON Insumo(Activo);
