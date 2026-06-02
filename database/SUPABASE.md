# Base de datos en Supabase (SQL Editor)

## Errores frecuentes y causa

| Error | Causa |
|-------|--------|
| `relation "Configuracion_Simulacion" does not exist` | Migración 007/008 antigua apuntaba a un nombre distinto al del backend (`configuracion_simulacion`). |
| `json has no default operator class for gin` | Índice GIN sobre columna `json` en lugar de `jsonb`. |
| `Insumo_ID=10` no existe | Seed con IDs fijos pero el catálogo tiene otro orden (p. ej. solo 31 insumos del seed reducido). |
| `material_estructural_id=1` no existe | No hay filas en `"Material_Estructural"` (migración 010 sin materiales). |
| Tablas `insumo` vs `"Insumo"` | Migraciones sin comillas crean tablas en minúsculas; el backend usa `"Insumo"` con comillas. |

## Opción A — Reparación rápida (recomendada si ya hubo errores)

1. En **SQL Editor**, pegar y ejecutar todo el archivo:
   - [`supabase_repair.sql`](./supabase_repair.sql)
2. Luego ejecutar migraciones de negocio que falten: `005` … `011` y `003_create_users_and_projects.sql` (si aún no están).
3. Si falla el índice GIN de `proyecto` (`json` vs `jsonb`), ejecutar solo esto y reintentar la migración:
   ```sql
   ALTER TABLE proyecto ALTER COLUMN payload TYPE jsonb USING payload::jsonb;
   DROP INDEX IF EXISTS idx_proyecto_payload;
   CREATE INDEX idx_proyecto_payload ON proyecto USING gin (payload jsonb_path_ops);
   ```
   La migración `003_create_users_and_projects.sql` ya incluye esa conversión automática.

## Opción B — Instalación limpia (orden correcto)

Ejecutar **cada archivo** en SQL Editor, en este orden:

### Migraciones core
1. `001_create_material_estructural.sql`
2. `002_create_configuracion_simulacion.sql`
3. `003_create_insumo.sql`
4. `004_create_matriz_rendimiento.sql`
5. `005_create_precio_mercado.sql`
6. `006_create_indicador_economico.sql`
7. `007_add_geometria_simulacion.sql`
8. `008_drop_recinto_counts.sql`
9. `009_expand_tienda_check.sql`
10. `010_fix_matriz_rendimiento.sql` — **opcional** si usas `supabase_repair.sql` o seed 004 por nombres
11. `013_add_techumbre_category.sql` (si aplica)
12. `014_create_billing.sql` — planes Free / Pro / Pro+ (Sprint 4 comercial)
11. `011_fix_unidades.sql`
12. `003_create_users_and_projects.sql` (proyectos multi-tenant)

### Seeds
1. `seeds/001_seed_material_estructural_postgres.sql`
2. `seeds/003_seed_insumos.sql` **o** catálogo completo dentro de `supabase_repair.sql`
3. `seeds/004_seed_matriz_rendimiento.sql` **o** matriz de `supabase_repair.sql`

No usar `seeds/001_seed_material_estructural.sql` (sintaxis SQLite `INSERT OR IGNORE`).

### Alternativa: un solo script
- [`init.sql`](./init.sql) crea tablas con comillas, pero usa `"Configuracion_Simulacion"` (legacy). El backend usa `configuracion_simulacion`; preferir migraciones 001–008 actualizadas o `supabase_repair.sql`.

## Verificación

```sql
SELECT COUNT(*) FROM "Material_Estructural";
SELECT COUNT(*) FROM "Insumo" WHERE "Activo" = TRUE;
SELECT me."Nombre", COUNT(*) FROM "Matriz_Rendimiento" mr
JOIN "Material_Estructural" me ON mr."Material_Estructural_ID" = me."ID"
GROUP BY me."Nombre";
```

Cada material debería tener al menos una fila en `"Matriz_Rendimiento"`.
