-- SIEC Place: marketplace de obras (publicación + desbloqueo de leads)
SET client_min_messages TO WARNING;

-- Requerido por el trigger updated_at (definido en 003; idempotente si ya existe)
CREATE OR REPLACE FUNCTION trigger_set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS siecplace_listing (    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                uuid NOT NULL,
    project_id              uuid,
    title                   text NOT NULL,
    region                  text,
    m2                      integer,
    material_id             integer,
    estimated_total_clp     numeric(14, 2),
    pdf_url                 text,
    status                  text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_payment', 'published', 'closed')),
    commitment_fee_paid     boolean NOT NULL DEFAULT false,
    budget_metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    published_at            timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_siecplace_listing_owner ON siecplace_listing(owner_id);
CREATE INDEX IF NOT EXISTS idx_siecplace_listing_status ON siecplace_listing(status);
CREATE INDEX IF NOT EXISTS idx_siecplace_listing_published_at ON siecplace_listing(published_at DESC);

CREATE TABLE IF NOT EXISTS siecplace_lead_unlock (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id              uuid NOT NULL REFERENCES siecplace_listing(id) ON DELETE CASCADE,
    contractor_user_id      uuid NOT NULL,
    fee_paid                boolean NOT NULL DEFAULT false,
    compensation_status     text NOT NULL DEFAULT 'pending'
        CHECK (compensation_status IN ('pending', 'eligible', 'paid', 'waived')),
    unlocked_at             timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE (listing_id, contractor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_siecplace_lead_unlock_contractor ON siecplace_lead_unlock(contractor_user_id);

CREATE TABLE IF NOT EXISTS siecplace_payment (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL,
    stripe_session_id       text UNIQUE,
    amount_clp              integer NOT NULL,
    payment_type            text NOT NULL
        CHECK (payment_type IN ('listing_fee', 'lead_fee', 'plan_pro', 'plan_pro_plus')),
    listing_id              uuid REFERENCES siecplace_listing(id) ON DELETE SET NULL,
    status                  text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed')),
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_siecplace_payment_user ON siecplace_payment(user_id);

DROP TRIGGER IF EXISTS siecplace_listing_updated_at ON siecplace_listing;
CREATE TRIGGER siecplace_listing_updated_at BEFORE UPDATE ON siecplace_listing
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        ALTER TABLE siecplace_listing ENABLE ROW LEVEL SECURITY;
        ALTER TABLE siecplace_lead_unlock ENABLE ROW LEVEL SECURITY;
        ALTER TABLE siecplace_payment ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS siecplace_listing_owner ON siecplace_listing;
        CREATE POLICY siecplace_listing_owner ON siecplace_listing
            FOR ALL TO authenticated
            USING (owner_id = auth.uid())
            WITH CHECK (owner_id = auth.uid());

        DROP POLICY IF EXISTS siecplace_listing_published_read ON siecplace_listing;
        CREATE POLICY siecplace_listing_published_read ON siecplace_listing
            FOR SELECT TO authenticated
            USING (status = 'published');

        DROP POLICY IF EXISTS siecplace_lead_unlock_self ON siecplace_lead_unlock;
        CREATE POLICY siecplace_lead_unlock_self ON siecplace_lead_unlock
            FOR ALL TO authenticated
            USING (contractor_user_id = auth.uid())
            WITH CHECK (contractor_user_id = auth.uid());

        DROP POLICY IF EXISTS siecplace_payment_self ON siecplace_payment;
        CREATE POLICY siecplace_payment_self ON siecplace_payment
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;
