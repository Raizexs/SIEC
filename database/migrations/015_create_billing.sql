-- SIEC Sprint 4: suscripciones y uso (planes Free / Pro / Pro+)
SET client_min_messages TO WARNING;

CREATE TABLE IF NOT EXISTS user_subscription (
    user_id                 uuid PRIMARY KEY,
    plan                    text NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'pro', 'pro_plus')),
    status                  text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    provider                text,
    provider_subscription_id text,
    current_period_start    timestamptz,
    current_period_end      timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_usage (
    user_id                 uuid PRIMARY KEY,
    exports_this_month      integer NOT NULL DEFAULT 0,
    usage_month             date NOT NULL DEFAULT (date_trunc('month', now())::date),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscription_plan ON user_subscription(plan);

DROP TRIGGER IF EXISTS user_subscription_updated_at ON user_subscription;
CREATE TRIGGER user_subscription_updated_at BEFORE UPDATE ON user_subscription
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS user_usage_updated_at ON user_usage;
CREATE TRIGGER user_usage_updated_at BEFORE UPDATE ON user_usage
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        ALTER TABLE user_subscription ENABLE ROW LEVEL SECURITY;
        ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS user_subscription_self ON user_subscription;
        CREATE POLICY user_subscription_self ON user_subscription
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());

        DROP POLICY IF EXISTS user_usage_self ON user_usage;
        CREATE POLICY user_usage_self ON user_usage
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;
