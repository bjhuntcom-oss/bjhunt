-- ============================================================================
-- Migration 0003 — Extend bjhunt_app grants and FORCE RLS to new tables
-- ============================================================================
--
-- Migration 0002 created jobs / quota_usage / stream_events AFTER the
-- ALTER DEFAULT PRIVILEGES from 0001 (which only affects tables created
-- AFTER it runs). Since 0002 was applied BEFORE 0001 in our deploy order,
-- the new tables miss the bjhunt_app grants and FORCE RLS.
--
-- This migration is idempotent: it grants/forces only on tables that exist
-- and skips bjhunt_app DML grants if the role is not yet provisioned.
--
-- Rollout order:
--   1. Apply 0002 (already done on prod 2026-04-18)
--   2. Apply 0001 (creates bjhunt_app, forces RLS on schema.sql tables)
--   3. Apply 0003 (this — extends to 0002 tables, idempotent)
--
-- It is also safe to run BEFORE 0001 (no-op for the bjhunt_app block).
-- ============================================================================

BEGIN;

-- ── FORCE RLS on the new tables ──────────────────────────────────────
-- Tables already have ENABLE RLS + USING + WITH CHECK from 0002. FORCE
-- ensures the schema owner role is also subject to policies (defense in
-- depth even if the connection is reused for super-admin paths).
ALTER TABLE IF EXISTS jobs           FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quota_usage    FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stream_events  FORCE ROW LEVEL SECURITY;

-- ── Grant DML to bjhunt_app on the new tables (only if role exists) ──
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bjhunt_app') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON jobs           TO bjhunt_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON quota_usage    TO bjhunt_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON stream_events  TO bjhunt_app';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE stream_events_id_seq TO bjhunt_app';
        RAISE NOTICE 'bjhunt_app: granted DML on jobs / quota_usage / stream_events';
    ELSE
        RAISE NOTICE 'bjhunt_app role not found — skipping grants. Re-run after 0001 lands.';
    END IF;
END $$;

COMMIT;
