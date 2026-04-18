-- ============================================================================
-- Migration 0002 — Schema completeness per docs/architecture/11-DATABASE-SCHEMA
-- ============================================================================
--
-- Additive only: ADD COLUMN with DEFAULT, CREATE TABLE IF NOT EXISTS, indexes.
-- No DROP, no RENAME, no destructive change. Re-runs as a no-op (idempotent).
--
-- Adds the columns and tables that doc 11 lists which the live schema is
-- missing today:
--   - users.{status, stripe_customer_id, stripe_subscription_id, settings,
--            last_active_at}
--   - engagements.{audit_type, duration_ms, findings_count, security_score,
--                  report_url, error_message, workspace_id, model}
--   - findings.{cwe, impact, recommendation, agent, verified, exploited,
--               patched, false_positive, iteration, confidence,
--               discovered_at, verified_methods}
--   - api_keys.scopes
--   - audit_logs.{category, resource_type, user_agent}
--   - NEW TABLE jobs               (BullMQ persistence — backs W4)
--   - NEW TABLE quota_usage        (per-tenant counters — backs W10)
--   - NEW TABLE stream_events      (event replay — backs W11)
--   - TRIGGER update_findings_count on findings INSERT/DELETE
--
-- Rollout:
--   * Apply on staging, smoke test, then prod (no downtime expected).
--     psql $DATABASE_URL -v ON_ERROR_STOP=1 -f 0002_schema_completeness.sql
--
-- Rollback:
--   * ADD COLUMN is reversible via DROP COLUMN. Tables can be DROP TABLEd.
--     But: app code that lands in W4-W11 will start writing to these columns,
--     so rollback is only safe BEFORE any wave touches them.
-- ============================================================================

BEGIN;

-- ── users ────────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status                TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted', 'pending_verification')),
    ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS settings              JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_active_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE status != 'active';
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- ── engagements ──────────────────────────────────────────────────────────
ALTER TABLE engagements
    ADD COLUMN IF NOT EXISTS audit_type      TEXT
        CHECK (audit_type IS NULL OR audit_type IN ('chat', 'web', 'cloud', 'ad', 'contracts', 'binary', 'fullscope')),
    ADD COLUMN IF NOT EXISTS duration_ms     BIGINT,
    ADD COLUMN IF NOT EXISTS findings_count  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS security_score  NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS report_url      TEXT,
    ADD COLUMN IF NOT EXISTS error_message   TEXT,
    ADD COLUMN IF NOT EXISTS workspace_id    TEXT,
    ADD COLUMN IF NOT EXISTS model           TEXT;

CREATE INDEX IF NOT EXISTS idx_engagements_workspace
    ON engagements(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engagements_audit_type
    ON engagements(audit_type) WHERE audit_type IS NOT NULL;

-- ── findings ─────────────────────────────────────────────────────────────
ALTER TABLE findings
    ADD COLUMN IF NOT EXISTS cwe              TEXT[],
    ADD COLUMN IF NOT EXISTS impact           TEXT,
    ADD COLUMN IF NOT EXISTS recommendation   TEXT,
    ADD COLUMN IF NOT EXISTS agent            TEXT,
    ADD COLUMN IF NOT EXISTS verified         BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS exploited        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS patched          BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS false_positive   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS iteration        INTEGER,
    ADD COLUMN IF NOT EXISTS confidence       NUMERIC(3,2)
        CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    ADD COLUMN IF NOT EXISTS discovered_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_methods TEXT[];

CREATE INDEX IF NOT EXISTS idx_findings_agent ON findings(agent) WHERE agent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_findings_verified ON findings(verified) WHERE verified = true;

-- ── api_keys ─────────────────────────────────────────────────────────────
ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[];

-- ── audit_logs ───────────────────────────────────────────────────────────
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS category      TEXT
        CHECK (category IS NULL OR category IN (
            'auth', 'admin', 'engagement', 'finding', 'billing', 'api_key',
            'platform', 'security', 'data'
        )),
    ADD COLUMN IF NOT EXISTS resource_type TEXT,
    ADD COLUMN IF NOT EXISTS user_agent    TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_category
    ON audit_logs(category) WHERE category IS NOT NULL;

-- ── jobs (BullMQ persistence + status mirror) ────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    engagement_id   UUID REFERENCES engagements(id) ON DELETE CASCADE,
    queue           TEXT NOT NULL,
    type            TEXT NOT NULL,                 -- 'audit', 'report', 'cleanup', etc.
    status          TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'completed', 'failed', 'delayed', 'cancelled')),
    priority        INTEGER NOT NULL DEFAULT 5,
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    result          JSONB,
    error           TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 2,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_engagement ON jobs(engagement_id) WHERE engagement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_org_isolation ON jobs;
CREATE POLICY jobs_org_isolation ON jobs
    USING (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

-- ── quota_usage (per-tenant counters per period) ─────────────────────────
CREATE TABLE IF NOT EXISTS quota_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start    DATE NOT NULL,                 -- first day of billing month
    metric          TEXT NOT NULL                  -- 'scans', 'api_requests', 'tokens', etc.
        CHECK (metric IN ('scans', 'scans_overage', 'api_requests', 'tokens_in', 'tokens_out',
                          'concurrent_max', 'sandbox_minutes', 'storage_bytes')),
    used            BIGINT NOT NULL DEFAULT 0,
    quota_limit     BIGINT,                        -- snapshot at start of period
    last_increment_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, period_start, metric)
);
CREATE INDEX IF NOT EXISTS idx_quota_usage_org_period ON quota_usage(org_id, period_start);

ALTER TABLE quota_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quota_usage_org_isolation ON quota_usage;
CREATE POLICY quota_usage_org_isolation ON quota_usage
    USING (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

-- ── stream_events (SSE event replay — append-only) ──────────────────────
CREATE TABLE IF NOT EXISTS stream_events (
    id          BIGSERIAL PRIMARY KEY,
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id      UUID NOT NULL,
    conv_id     UUID,
    event_type  TEXT NOT NULL,                    -- 'token', 'tool_call', 'tool_result', etc.
    data        JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stream_events_run ON stream_events(run_id, id);
CREATE INDEX IF NOT EXISTS idx_stream_events_org_created ON stream_events(org_id, created_at DESC);

ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stream_events_org_isolation ON stream_events;
CREATE POLICY stream_events_org_isolation ON stream_events
    USING (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

-- Retention: cap stream_events to 30 days (call from a cron, not auto here)
COMMENT ON TABLE stream_events IS
    'Append-only SSE replay log. Trim with: DELETE FROM stream_events WHERE created_at < now() - interval ''30 days''';

-- ── findings_count maintenance trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_engagement_findings_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE engagements SET findings_count = findings_count + 1, updated_at = now()
            WHERE id = NEW.engagement_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE engagements SET findings_count = GREATEST(findings_count - 1, 0), updated_at = now()
            WHERE id = OLD.engagement_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_findings_count ON findings;
CREATE TRIGGER trg_findings_count
    AFTER INSERT OR DELETE ON findings
    FOR EACH ROW EXECUTE FUNCTION update_engagement_findings_count();

-- Backfill existing counts (one-shot — safe to re-run, idempotent)
UPDATE engagements e SET findings_count = (
    SELECT COUNT(*) FROM findings f WHERE f.engagement_id = e.id
);

COMMIT;
