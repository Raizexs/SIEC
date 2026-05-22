-- SCRUM-118: Eliminar columnas redundantes de tipo de recinto
-- habitaciones, banios, areas_comunes no se usan en el cálculo real
-- que ahora trabaja solo con m2_totales + geometria (perimetro, altura).

ALTER TABLE Configuracion_Simulacion
  DROP COLUMN IF EXISTS Habitaciones,
  DROP COLUMN IF EXISTS Banios,
  DROP COLUMN IF EXISTS Areas_Comunes;
