-- ─────────────────────────────────────────────────────────────────────────────
-- SIEC: Multi-tenant — users, projects, collaboration, audit.
-- Migration 003 (Phase 1.5 + 3.x).
--
-- Designed to live alongside Supabase Auth (auth.users.id is a uuid). When the
-- schema is hosted in Supabase directly, references to auth.users.id are real
-- foreign keys; when running on a non-Supabase Postgres, the FK is dropped.
-- ─────────────────────────────────────────────────────────────────────────────
SET client_min_messages TO WARNING;

-- ── 1. App-level user profile (mirrors auth.users.id) ───────────────────────
CREATE TABLE IF NOT EXISTS app_user (
    id              uuid PRIMARY KEY,                       -- mirrors auth.users.id
    email           text UNIQUE NOT NULL,
    full_name       text,
    company         text,
    avatar_url      text,
    role            text NOT NULL DEFAULT 'architect'
        CHECK (role IN ('architect', 'engineer', 'contractor', 'client_viewer', 'admin')),
    preferences     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION trigger_set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_user_updated_at ON app_user;
CREATE TRIGGER app_user_updated_at BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 2. Projects (the unit of multi-tenant data) ─────────────────────────────
CREATE TABLE IF NOT EXISTS proyecto (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            uuid NOT NULL,
    name                text NOT NULL,
    description         text,
    cliente             text,
    ubicacion           text,
    tags                text[] NOT NULL DEFAULT '{}',
    -- Full design payload: formData + recintos + currentFloor (snapshot of
    -- workspace state). Indexed for partial JSON queries.
    payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
    thumbnail_url       text,
    estimated_cost      numeric(14,2),
    m2_totales          integer,
    material_id         integer,
    archived            boolean NOT NULL DEFAULT false,
    is_public           boolean NOT NULL DEFAULT false,
    public_token        text UNIQUE,
    public_expires_at   timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proyecto_owner ON proyecto(owner_id);
CREATE INDEX IF NOT EXISTS idx_proyecto_archived ON proyecto(archived);
CREATE INDEX IF NOT EXISTS idx_proyecto_payload ON proyecto USING gin(payload);
CREATE INDEX IF NOT EXISTS idx_proyecto_search ON proyecto USING gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(cliente,'') || ' ' || coalesce(ubicacion,'')));

DROP TRIGGER IF EXISTS proyecto_updated_at ON proyecto;
CREATE TRIGGER proyecto_updated_at BEFORE UPDATE ON proyecto
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 3. Collaborators (Phase 3.4) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proyecto_colaborador (
    proyecto_id    uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
    usuario_id     uuid NOT NULL,
    rol            text NOT NULL DEFAULT 'viewer'
        CHECK (rol IN ('viewer', 'editor', 'owner')),
    invited_at     timestamptz NOT NULL DEFAULT now(),
    accepted_at    timestamptz,
    PRIMARY KEY (proyecto_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_colaborador_user ON proyecto_colaborador(usuario_id);

-- ── 4. Versioning (Phase 3.3) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proyecto_version (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id     uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
    version_number  integer NOT NULL,
    author_id       uuid NOT NULL,
    payload         jsonb NOT NULL,
    summary         text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (proyecto_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_version_proyecto ON proyecto_version(proyecto_id, version_number DESC);

-- ── 5. Comments anchored to 3D coords (Phase 3.3) ───────────────────────────
CREATE TABLE IF NOT EXISTS proyecto_comentario (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id     uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
    parent_id       uuid REFERENCES proyecto_comentario(id) ON DELETE CASCADE,
    author_id       uuid NOT NULL,
    body            text NOT NULL,
    -- 3D anchor (optional): coords + recinto reference
    anchor          jsonb,
    resolved        boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_proyecto ON proyecto_comentario(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON proyecto_comentario(parent_id);

DROP TRIGGER IF EXISTS comment_updated_at ON proyecto_comentario;
CREATE TRIGGER comment_updated_at BEFORE UPDATE ON proyecto_comentario
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── 6. Audit log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
    id              bigserial PRIMARY KEY,
    actor_id        uuid,
    action          text NOT NULL,           -- e.g. 'project.created', 'auth.mfa.enabled'
    entity_type     text,
    entity_id       text,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address      inet,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_actor ON auditoria(actor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_action ON auditoria(action);
CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria(created_at DESC);

-- ── 7. Notifications (Phase 3.3 / 5) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacion (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL,
    type            text NOT NULL,           -- 'comment.added', 'price.alert', etc.
    title           text NOT NULL,
    body            text,
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notificacion(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notificacion(user_id) WHERE read_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security policies (only run when Supabase Auth schema exists)
-- Wrap in DO block to no-op gracefully on plain Postgres.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
        ALTER TABLE proyecto ENABLE ROW LEVEL SECURITY;
        ALTER TABLE proyecto_colaborador ENABLE ROW LEVEL SECURITY;
        ALTER TABLE proyecto_version ENABLE ROW LEVEL SECURITY;
        ALTER TABLE proyecto_comentario ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notificacion ENABLE ROW LEVEL SECURITY;

        -- app_user: each user reads/updates their own profile.
        DROP POLICY IF EXISTS app_user_self_select ON app_user;
        CREATE POLICY app_user_self_select ON app_user
            FOR SELECT TO authenticated
            USING (id = auth.uid());

        DROP POLICY IF EXISTS app_user_self_update ON app_user;
        CREATE POLICY app_user_self_update ON app_user
            FOR UPDATE TO authenticated
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());

        -- proyecto: visible if owner OR collaborator OR public link active
        DROP POLICY IF EXISTS proyecto_visible ON proyecto;
        CREATE POLICY proyecto_visible ON proyecto
            FOR SELECT TO authenticated
            USING (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM proyecto_colaborador
                    WHERE proyecto_id = proyecto.id AND usuario_id = auth.uid()
                )
                OR (is_public AND (public_expires_at IS NULL OR public_expires_at > now()))
            );

        DROP POLICY IF EXISTS proyecto_owner_modify ON proyecto;
        CREATE POLICY proyecto_owner_modify ON proyecto
            FOR ALL TO authenticated
            USING (
                owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM proyecto_colaborador
                    WHERE proyecto_id = proyecto.id
                      AND usuario_id = auth.uid()
                      AND rol IN ('editor', 'owner')
                )
            )
            WITH CHECK (owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM proyecto_colaborador
                WHERE proyecto_id = proyecto.id
                  AND usuario_id = auth.uid()
                  AND rol IN ('editor', 'owner')
            ));

        -- collaborators: only project owner manages, all participants can view
        DROP POLICY IF EXISTS colab_select ON proyecto_colaborador;
        CREATE POLICY colab_select ON proyecto_colaborador
            FOR SELECT TO authenticated
            USING (
                usuario_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM proyecto p
                    WHERE p.id = proyecto_id AND p.owner_id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS colab_modify ON proyecto_colaborador;
        CREATE POLICY colab_modify ON proyecto_colaborador
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM proyecto p
                    WHERE p.id = proyecto_id AND p.owner_id = auth.uid()
                )
            );

        -- versions inherit project visibility
        DROP POLICY IF EXISTS version_visible ON proyecto_version;
        CREATE POLICY version_visible ON proyecto_version
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM proyecto p
                    WHERE p.id = proyecto_id
                      AND (p.owner_id = auth.uid() OR EXISTS (
                          SELECT 1 FROM proyecto_colaborador
                          WHERE proyecto_id = p.id AND usuario_id = auth.uid()
                      ))
                )
            );

        DROP POLICY IF EXISTS version_insert ON proyecto_version;
        CREATE POLICY version_insert ON proyecto_version
            FOR INSERT TO authenticated
            WITH CHECK (author_id = auth.uid());

        -- comments: same visibility, only authors edit their own
        DROP POLICY IF EXISTS comment_visible ON proyecto_comentario;
        CREATE POLICY comment_visible ON proyecto_comentario
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM proyecto p
                    WHERE p.id = proyecto_id
                      AND (p.owner_id = auth.uid() OR EXISTS (
                          SELECT 1 FROM proyecto_colaborador
                          WHERE proyecto_id = p.id AND usuario_id = auth.uid()
                      ))
                )
            );

        DROP POLICY IF EXISTS comment_insert ON proyecto_comentario;
        CREATE POLICY comment_insert ON proyecto_comentario
            FOR INSERT TO authenticated
            WITH CHECK (author_id = auth.uid());

        DROP POLICY IF EXISTS comment_modify ON proyecto_comentario;
        CREATE POLICY comment_modify ON proyecto_comentario
            FOR UPDATE TO authenticated
            USING (author_id = auth.uid())
            WITH CHECK (author_id = auth.uid());

        DROP POLICY IF EXISTS comment_delete ON proyecto_comentario;
        CREATE POLICY comment_delete ON proyecto_comentario
            FOR DELETE TO authenticated
            USING (author_id = auth.uid());

        -- notifications: only the recipient can read/update
        DROP POLICY IF EXISTS notif_self ON notificacion;
        CREATE POLICY notif_self ON notificacion
            FOR ALL TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());

        -- ── Auto-create app_user row on auth.users insert ────────────────────
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $func$
        BEGIN
            INSERT INTO public.app_user (id, email, full_name, role, avatar_url)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
                COALESCE(NEW.raw_user_meta_data ->> 'role', 'architect'),
                NEW.raw_user_meta_data ->> 'avatar_url'
            )
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;
