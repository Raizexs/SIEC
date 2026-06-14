-- SCRUM-118: Añadir columnas geométricas a Configuracion_Simulacion
-- Permite almacenar perímetro, altura de muro y flag de techumbre
-- para la cubicación por superficie real de muro.

ALTER TABLE Configuracion_Simulacion
  ADD COLUMN IF NOT EXISTS Perimetro_ML NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS Altura_Muro_M NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS Incluir_Techumbre BOOLEAN NULL DEFAULT FALSE;
