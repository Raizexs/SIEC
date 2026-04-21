-- Create Insumo_Role table and insert role mappings for Mano de Obra
CREATE TABLE IF NOT EXISTS "Insumo_Role" (
  "ID" INTEGER PRIMARY KEY,
  "Insumo_ID" INTEGER NOT NULL,
  "Role" TEXT NOT NULL
);

-- Insert role mappings by matching Insumo.Nombre (adjust as needed)
INSERT INTO "Insumo_Role" ("Insumo_ID", "Role")
SELECT "ID", 'maestro' FROM "Insumo" WHERE lower("Nombre") LIKE '%albañil%' OR lower("Nombre") LIKE '%maestro%' ON CONFLICT DO NOTHING;

INSERT INTO "Insumo_Role" ("Insumo_ID", "Role")
SELECT "ID", 'ayudante' FROM "Insumo" WHERE lower("Nombre") LIKE '%ayudante%' OR lower("Nombre") LIKE '%ayuda%' ON CONFLICT DO NOTHING;

-- Add explicit mappings if names differ
-- INSERT INTO "Insumo_Role" ("Insumo_ID", "Role") VALUES (10, 'maestro');
-- INSERT INTO "Insumo_Role" ("Insumo_ID", "Role") VALUES (11, 'ayudante');
