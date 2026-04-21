-- Migración 006: Crear tabla indicador_economico
CREATE TABLE IF NOT EXISTS indicador_economico (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL, -- 'UF', 'Dolar', etc.
    valor NUMERIC(12, 2) NOT NULL,
    fecha DATE NOT NULL,
    fecha_captura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuente TEXT DEFAULT 'CMF',
    UNIQUE(nombre, fecha)
);

CREATE INDEX IF NOT EXISTS idx_ie_nombre_fecha ON indicador_economico (nombre, fecha DESC);
