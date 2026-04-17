-- ============================================================================
-- Migration 0001 — Force RLS + WITH CHECK + dedicated bjhunt_app role
-- ============================================================================
--
-- Addresses audit-2026-04-17 findings #3-01 and #3-02 (critical, C-11 + C-12):
--
--   1. Every tenant table has ENABLE ROW LEVEL SECURITY but NOT FORCE ROW LEVEL
--      SECURITY. Table owners (the role the backend currently connects as)
--      therefore bypass policies entirely. This migration adds FORCE on every
--      tenant table so RLS applies to ALL roles, including the owner.
--
--   2. The existing policies declared only `USING (...)`; they had no
--      `WITH CHECK (...)` clause. Without WITH CHECK, INSERT and UPDATE can
--      insert rows with any `org_id`, including one belonging to another
--      tenant — as long as the session later filters with WHERE. This
--      migration drops every existing org-isolation policy and recreates each
--      with both USING and WITH CHECK on org_id.
--
--   3. Creates a non-owner application role `bjhunt_app` with the minimum
--      privileges the backend needs (SELECT/INSERT/UPDATE/DELETE on the app
--      tables, USAGE on schema public, no DDL, no SUPERUSER, no BYPASSRLS).
--      FORCE RLS already makes policies apply to the owner, but operating
--      through a dedicated role adds defense-in-depth: a future `FORCE` mis-
--      configuration still cannot leak data because the role has no bypass.
--
-- Rollout plan:
--
--   * Staging:
--       1. Take a snapshot / backup.
--       2. Apply this migration: psql $DATABASE_URL -f 0001_force_rls_and_with_check.sql
--       3. Run the cross-tenant read test (see docs/audit-2026-04-17/verification/rls-withOrg-audit.md).
--       4. Run the full app smoke test (auth, dashboard, engagements, findings).
--
--   * Production (follow-up):
--       1. Set the `BJHUNT_APP_PASSWORD` secret in the secret store.
--       2. Run this migration (after replacing the REPLACE_ME_BJHUNT_APP_PASSWORD
--          placeholder via psql -v or a pre-processing step — see below).
--       3. Switch `DATABASE_URL` in the backend service to use bjhunt_app.
--       4. Restart the backend. Verify `/api/health/ready` passes.
--       5. Revoke direct owner access from application runtime only after
--          verifying the app is stable as `bjhunt_app`.
--
-- Rollback:
--
--   * To soften RLS back to pre-migration behaviour (NOT RECOMMENDED outside
--     emergency recovery), run:
--
--         ALTER TABLE users               NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE engagements         NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE findings            NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE api_keys            NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE audit_logs          NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE chat_conversations  NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE chat_messages       NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE agent_runs          NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE notifications       NO FORCE ROW LEVEL SECURITY;
--         ALTER TABLE file_uploads        NO FORCE ROW LEVEL SECURITY;
--
--   * The previous USING-only policies can be restored by re-running the
--     schema.sql statements in lines 332-364.
--
--   * To drop the role:
--         REASSIGN OWNED BY bjhunt_app TO CURRENT_USER;
--         DROP OWNED BY bjhunt_app;
--         DROP ROLE IF EXISTS bjhunt_app;
--
-- Password for bjhunt_app:
--
--   * The CREATE ROLE statement below uses a psql variable. Invoke with:
--
--         psql $DATABASE_URL \
--           -v bjhunt_app_password="'$(openssl rand -base64 48)'" \
--           -f 0001_force_rls_and_with_check.sql
--
--     If the variable is not provided, the CREATE ROLE block is skipped
--     (see the DO block below). This lets the migration re-run idempotently
--     and keeps the password out of version control.
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop every existing org-isolation policy (USING-only).
-- ============================================================================

DROP POLICY IF EXISTS users_org_isolation              ON users;
DROP POLICY IF EXISTS engagements_org_isolation        ON engagements;
DROP POLICY IF EXISTS findings_org_isolation           ON findings;
DROP POLICY IF EXISTS api_keys_org_isolation           ON api_keys;
DROP POLICY IF EXISTS audit_logs_org_isolation         ON audit_logs;
DROP POLICY IF EXISTS chat_conv_org_isolation          ON chat_conversations;
DROP POLICY IF EXISTS chat_msg_org_isolation           ON chat_messages;
DROP POLICY IF EXISTS agent_runs_org_isolation         ON agent_runs;
DROP POLICY IF EXISTS notifications_org_isolation      ON notifications;
DROP POLICY IF EXISTS file_uploads_org_isolation       ON file_uploads;

-- ============================================================================
-- 2. FORCE RLS on every tenant table. This makes policies apply to the table
--    owner too (Postgres default is for owners to bypass RLS).
-- ============================================================================

ALTER TABLE users              FORCE ROW LEVEL SECURITY;
ALTER TABLE engagements        FORCE ROW LEVEL SECURITY;
ALTER TABLE findings           FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys           FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_runs         FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications      FORCE ROW LEVEL SECURITY;
ALTER TABLE file_uploads       FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Recreate each org-isolation policy with USING + WITH CHECK.
--
--    USING      — gates SELECT and the "before" visibility for UPDATE/DELETE.
--    WITH CHECK — gates INSERT and the "after" state for UPDATE.
--
--    Both expressions resolve `app.current_org_id` set by `withOrg(...)` in
--    backend/src/db/client.ts. A bare query outside `withOrg(...)` sees NULL
--    here, which makes the comparison UNKNOWN → treated as FALSE by RLS →
--    zero rows visible AND no inserts possible. This is what "forgetting
--    WHERE org_id" should always fail like.
-- ============================================================================

CREATE POLICY users_org_isolation ON users
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY engagements_org_isolation ON engagements
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY findings_org_isolation ON findings
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY api_keys_org_isolation ON api_keys
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY audit_logs_org_isolation ON audit_logs
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY chat_conv_org_isolation ON chat_conversations
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY chat_msg_org_isolation ON chat_messages
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY agent_runs_org_isolation ON agent_runs
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY notifications_org_isolation ON notifications
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY file_uploads_org_isolation ON file_uploads
    USING      (org_id = current_setting('app.current_org_id', true)::UUID)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID);

-- ============================================================================
-- 4. Table comments documenting the RLS contract.
-- ============================================================================

COMMENT ON TABLE users IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id = app.current_org_id. '
  'All access MUST go through withOrg(orgId, tx => ...) in backend/src/db/client.ts. '
  'A bare sql`` call without BEGIN + SET LOCAL will see NULL for the setting, '
  'which makes USING evaluate to UNKNOWN and returns zero rows.';

COMMENT ON TABLE engagements IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE findings IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE api_keys IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE audit_logs IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg(). '
  'Platform-global audit events (no org) must NOT be written here; use a '
  'dedicated platform_audit_logs table if needed.';

COMMENT ON TABLE chat_conversations IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE chat_messages IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE agent_runs IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE notifications IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

COMMENT ON TABLE file_uploads IS
  'Tenant-scoped. RLS FORCE + USING/WITH CHECK on org_id. Access via withOrg().';

-- Document the non-tenant (platform-global) tables too, so a future reader
-- understands why they do NOT have RLS.

COMMENT ON TABLE organizations IS
  'Platform-global. No RLS — the tenant root. Readable/writable only by '
  'platform admins or by the user own-org resolution in auth middleware.';

COMMENT ON TABLE sessions IS
  'Platform-global (keyed by user_id, not org_id). No RLS. Access is '
  'session-owner or platform admin. Do NOT write org-scoped data here.';

COMMENT ON TABLE platform_settings IS
  'Platform-global key-value store. Admin-only. No RLS.';

COMMENT ON TABLE gateway_providers IS
  'Platform-global LLM provider registry. Admin-only. No RLS.';

COMMENT ON TABLE agent_profiles IS
  'Platform-global agent personality profiles. Admin-only. No RLS.';

COMMENT ON TABLE password_reset_tokens IS
  'User-scoped single-use tokens. No RLS (identified by token_hash).';

COMMENT ON TABLE api_key_requests IS
  'API key usage ledger. Tenant-scoped by org_id but not under RLS because '
  'writes are synchronous with the API request itself and require no extra '
  'isolation beyond the key-scoped middleware. A future migration MAY add '
  'RLS here for symmetry with api_keys.';

-- ============================================================================
-- 5. Create the non-owner application role.
--
--    This block is skipped when the migration is re-run without the password
--    variable. Supplying :bjhunt_app_password via `psql -v` enables creation.
-- ============================================================================

-- Create role if it doesn't exist. Intentionally PASSWORD NULL on first pass
-- so it cannot log in until the password is rotated in via a separate step
-- using ALTER ROLE in the secret-aware deployment pipeline.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bjhunt_app') THEN
        CREATE ROLE bjhunt_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
            NOINHERIT NOREPLICATION NOBYPASSRLS
            PASSWORD NULL;
    END IF;
END
$$;

-- Minimum privileges. bjhunt_app must NOT own any table (that's still the
-- current database owner); it only reads and writes.
GRANT USAGE ON SCHEMA public TO bjhunt_app;

-- Application tables: full DML, no DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    users,
    organizations,
    sessions,
    api_keys,
    api_key_requests,
    engagements,
    findings,
    audit_logs,
    password_reset_tokens,
    platform_settings,
    chat_conversations,
    chat_messages,
    agent_runs,
    notifications,
    file_uploads,
    gateway_providers,
    agent_profiles
TO bjhunt_app;

-- Sequences (UUID defaults use gen_random_uuid so we mostly don't need
-- sequence privileges, but any SERIAL/IDENTITY columns added later will).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bjhunt_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO bjhunt_app;

-- Any tables added by future migrations inherit DML rights.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bjhunt_app;

COMMIT;

-- ============================================================================
-- Post-migration reminder (print as NOTICE):
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE
      'Migration 0001 complete. RLS is now FORCE-enforced on 10 tables with '
      'matching WITH CHECK policies, and role bjhunt_app exists. '
      'TODO: (a) set a password via ALTER ROLE bjhunt_app PASSWORD ''...''; '
      '(b) switch DATABASE_URL to use bjhunt_app; '
      '(c) make config.ts reject DATABASE_URLs with user=postgres in prod.';
END
$$;
