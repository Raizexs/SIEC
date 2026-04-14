-- Script de inicialización para PostgreSQL
-- Ejecuta migraciones y seeds en orden

\i /migrations/001_create_material_estructural.sql
\i /migrations/002_create_configuracion_simulacion.sql
\i /migrations/003_create_insumo.sql
\i /migrations/004_create_matriz_rendimiento.sql

\i /seeds/001_seed_material_estructural.sql
\i /seeds/002_seed_configuracion_simulacion.sql
\i /seeds/003_seed_insumos.sql
\i /seeds/004_seed_matriz_rendimiento.sql
