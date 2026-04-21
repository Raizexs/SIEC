Reglas de negocio SIEC — Variables y migraciones relevantes

- SOCIAL_LEY_FACTOR: Multiplicador obligatorio aplicado sólo a insumos de categoría 'Mano de Obra'. Valor por defecto 1.28. Rango permitido: [1.28, 1.29]. Configurar vía variable de entorno.

- HOURS_PER_DAY: Horas por jornada usadas para normalizar precios por jornada a precio por HH. Default: 8. Configurar vía env HOURS_PER_DAY.

Migraciones y seeds

- database/migrations/001_create_insumo_role.sql: Crea la tabla Insumo_Role (si no existe) para mapear insumo_id -> role (maestro/ayudante).
- database/seeds/004_seed_matriz_rendimiento_fixed.sql: Seed compatible con SQLite para Matriz_Rendimiento. Ajustar contenido según datos de origen.
- database/seeds/005_seed_insumo_roles.sql: Seed idempotente para poblar Insumo_Role desde Insumo (ejemplos comentados).
- Para aplicar seeds localmente: python database/apply_seeds.py [sqlite_file]

CI

- Se agregó .github/workflows/ci.yml que aplica seeds y ejecuta pytest en push/PR.

Notas

- Se recomienda crear migraciones formales con Alembic antes de desplegar a producción.
- Si se usa Postgres en staging/production, adapatar apply_seeds.py y seeds/migrations para ejecutarse con la herramienta de migración del equipo.

