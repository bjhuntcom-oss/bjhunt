-- ============================================================================
-- Migration 0004 — Add RLS + bjhunt_app grants on api_key_requests
-- ============================================================================
--
-- Audit 2026-04-25 (DB-C-1) found api_key_requests is tenant-scoped (org_id
-- FK) but has no RLS policy and no bjhunt_app grant. Currently the only
-- writer is admin code via adminSql (BYPASSRLS) so no incident, but as soon
-- as withOrg() is used to read/write request logs, cross-tenant leak risk.
--
-- Idempotent. Skips bjhunt_app grant block if the role is not provisioned.
-- ============================================================================

BEGIN;

-- ── Enable + force RLS ───────────────────────────────────────────────
ALTER TABLE IF EXISTS api_key_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_key_requests FORCE ROW LEVEL SECURITY;

-- ── Org isolation policy ─────────────────────────────────────────────
DROP POLICY IF EXISTS api_key_requests_org_isolation ON api_key_requests;
CREATE POLICY api_key_requests_org_isolation ON api_key_requests
    USING (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

-- ── Grant DML to bjhunt_app (only if role exists) ────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bjhunt_app') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON api_key_requests TO bjhunt_app';
        RAISE NOTICE 'bjhunt_app: granted DML on api_key_requests';
    ELSE
        RAISE NOTICE 'bjhunt_app role not found — skipping grant. Re-run after 0001 lands.';
    END IF;
END $$;

COMMIT;
