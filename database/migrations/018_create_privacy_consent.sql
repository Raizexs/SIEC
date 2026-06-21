-- Ley 21.719: consentimiento versionado y políticas de privacidad
SET client_min_messages TO WARNING;

CREATE TABLE IF NOT EXISTS privacy_policy_version (
    id              text PRIMARY KEY,
    version         text NOT NULL,
    published_at    timestamptz NOT NULL DEFAULT now(),
    url_path        text NOT NULL DEFAULT '/legal/privacidad',
    summary         text
);

CREATE TABLE IF NOT EXISTS user_consent (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    consent_type    text NOT NULL,
    policy_version  text NOT NULL,
    granted         boolean NOT NULL,
    granted_at      timestamptz NOT NULL DEFAULT now(),
    revoked_at      timestamptz,
    ip_address      text,
    user_agent      text,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_consent_user ON user_consent(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consent_granted ON user_consent(user_id, consent_type, granted_at DESC);

-- Tabla para tokens de confirmación de eliminación de cuenta
CREATE TABLE IF NOT EXISTS account_deletion_token (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token           text NOT NULL UNIQUE,
    expires_at      timestamptz NOT NULL,
    used_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_token_user ON account_deletion_token(user_id);

-- Semilla política v1.0
INSERT INTO privacy_policy_version (id, version, published_at, url_path, summary)
VALUES (
    '2026-06-01',
    '1.0',
    '2026-06-01T00:00:00Z',
    '/legal/privacidad',
    'Política de privacidad inicial SIEC — Ley 21.719'
)
ON CONFLICT (id) DO NOTHING;

-- RLS user_consent: usuario lee/inserta solo sus registros
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS user_consent_select_own ON user_consent;
        CREATE POLICY user_consent_select_own ON user_consent
            FOR SELECT USING (user_id = auth.uid());

        DROP POLICY IF EXISTS user_consent_insert_own ON user_consent;
        CREATE POLICY user_consent_insert_own ON user_consent
            FOR INSERT WITH CHECK (user_id = auth.uid());

        ALTER TABLE privacy_policy_version ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS privacy_policy_public_read ON privacy_policy_version;
        CREATE POLICY privacy_policy_public_read ON privacy_policy_version
            FOR SELECT USING (true);
    END IF;
END $$;
