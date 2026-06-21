-- Sincroniza auth.users → app_user (backfill + trigger).
-- Requiere: migración 003 (tabla app_user). Corrige preferences NOT NULL en inserts.

SET client_min_messages TO WARNING;

-- Backfill usuarios existentes en auth sin fila en app_user
INSERT INTO public.app_user (id, email, full_name, company, avatar_url, role, preferences)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
    u.raw_user_meta_data ->> 'company',
    u.raw_user_meta_data ->> 'avatar_url',
    COALESCE(
        NULLIF(u.raw_user_meta_data ->> 'role', ''),
        'architect'
    ),
    COALESCE(u.raw_user_meta_data -> 'preferences', '{}'::jsonb)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.app_user a WHERE a.id = u.id);

-- Trigger para registros nuevos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.app_user (id, email, full_name, company, avatar_url, role, preferences)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data ->> 'company',
        NEW.raw_user_meta_data ->> 'avatar_url',
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'architect'),
        COALESCE(NEW.raw_user_meta_data -> 'preferences', '{}'::jsonb)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
