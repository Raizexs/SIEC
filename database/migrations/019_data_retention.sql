-- Retención y minimización de datos — Ley 21.719
SET client_min_messages TO WARNING;

-- Función: purgar auditoría mayor a 12 meses
CREATE OR REPLACE FUNCTION purge_old_auditoria() RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM auditoria
    WHERE created_at < now() - interval '12 months';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función: conservar solo las últimas 20 versiones por proyecto
CREATE OR REPLACE FUNCTION prune_old_proyecto_versions() RETURNS integer AS $$
DECLARE
    deleted_count integer := 0;
    r RECORD;
    cnt integer;
BEGIN
    FOR r IN
        SELECT proyecto_id, COUNT(*) AS total
        FROM proyecto_version
        GROUP BY proyecto_id
        HAVING COUNT(*) > 20
    LOOP
        DELETE FROM proyecto_version
        WHERE id IN (
            SELECT id FROM proyecto_version
            WHERE proyecto_id = r.proyecto_id
            ORDER BY version_number DESC
            OFFSET 20
        );
        GET DIAGNOSTICS cnt = ROW_COUNT;
        deleted_count := deleted_count + cnt;
    END LOOP;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS auditoría: usuario lee solo sus propias acciones
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS auditoria_select_own ON auditoria;
        CREATE POLICY auditoria_select_own ON auditoria
            FOR SELECT USING (actor_id = auth.uid());
    END IF;
END $$;

-- Nota: programar con pg_cron o cron externo:
-- SELECT purge_old_auditoria();
-- SELECT prune_old_proyecto_versions();
