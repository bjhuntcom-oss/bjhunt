-- ============================================================================
-- Migration 0010 — Stripe billing scaffolding (W10 prep)
-- ============================================================================
--
-- Audit ENG-P0-3: Stripe is currently a stub. The pricing UI was renamed
-- from "Souscrire" to "Demander un accès" so it doesn't lie, but for the
-- real W10 ship we need:
--   - org-level stripe_customer_id / stripe_subscription_id
--   - subscription_status + current_period_end + trial_ends_at
--   - stripe_events idempotency table (so a webhook replayed by Stripe
--     doesn't double-charge or double-fulfil)
--
-- This migration adds the schema; the route-level wiring lands in the
-- same commit. Routes return 501 until STRIPE_SECRET_KEY is set in env,
-- so deploying this migration alone is safe.
-- ============================================================================

BEGIN;

-- ── Organizations: Stripe linkage ───────────────────────────────────
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status    TEXT
        CHECK (subscription_status IN (
            'trialing', 'active', 'past_due', 'canceled',
            'unpaid', 'paused', 'incomplete', 'incomplete_expired'
        )),
    ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer
    ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_subscription_status
    ON organizations(subscription_status) WHERE subscription_status IS NOT NULL;

-- ── Stripe webhook idempotency ──────────────────────────────────────
-- Stripe documentation requires consumers to store the event id for at
-- least 30 days to drop replays. We store all received events plus a
-- handled_at timestamp.
CREATE TABLE IF NOT EXISTS stripe_events (
    id            TEXT PRIMARY KEY,        -- stripe event id (evt_*)
    type          TEXT NOT NULL,           -- event type (e.g. invoice.paid)
    org_id        UUID REFERENCES organizations(id) ON DELETE SET NULL,
    payload       JSONB NOT NULL,          -- full event for forensic audit
    received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    handled_at    TIMESTAMPTZ,             -- set once our handler ran successfully
    error         TEXT                     -- non-null if handler failed
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_received ON stripe_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type     ON stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_org      ON stripe_events(org_id) WHERE org_id IS NOT NULL;

-- platform-global table; no RLS (admin-only access via /api/admin/billing)

INSERT INTO schema_migrations (version) VALUES ('0010_stripe_billing')
ON CONFLICT (version) DO NOTHING;

COMMIT;
