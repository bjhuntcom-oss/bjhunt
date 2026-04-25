-- ============================================================================
-- Migration 0009 — Migration tracking table (audit VPS-P2-4)
-- ============================================================================
--
-- Until now migrations were applied by hand and we tracked nothing about
-- which ones had run on which DB. The audit flagged this as a footgun: a
-- future re-deploy could replay 0001 onto a DB that already has 0001
-- applied if the operator forgets where they are. The migrations all use
-- IF EXISTS / IF NOT EXISTS guards so a replay is safe today, but we
-- still want a paper trail.
--
-- This table is *additive*: it doesn't touch existing tables. The
-- `applied_at` column lets ops compare prod vs dev DB heads at a glance.
--
-- Backfill: every migration shipped before this one (0001-0008) is
-- inserted with a placeholder timestamp so the row history is complete
-- even though we can't reconstruct the real apply time.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_by  TEXT NOT NULL DEFAULT current_user,
    checksum    TEXT  -- optional sha256 of the migration body, for drift detection
);

-- Backfill prior migrations. Use 2026-04-18 (when 0001-0003 landed per
-- CLAUDE.md) for those, and 2026-04-25/26 for the audit-driven ones.
INSERT INTO schema_migrations (version, applied_at) VALUES
    ('0001_force_rls_and_with_check',          '2026-04-18 04:30:00+00'),
    ('0002_schema_completeness',               '2026-04-18 03:00:00+00'),
    ('0003_grant_app_role_on_new_tables',      '2026-04-18 04:30:00+00'),
    ('0004_rls_api_key_requests',              '2026-04-25 17:00:00+00'),
    ('0005_findings_dedup',                    '2026-04-25 17:50:00+00'),
    ('0006_email_verification_tokens',         '2026-04-25 17:55:00+00'),
    ('0007_fix_cascade_delete_chains',         '2026-04-25 18:30:00+00'),
    ('0008_engagements_status_failed',         '2026-04-25 23:00:00+00'),
    ('0009_migration_tracking',                now())
ON CONFLICT (version) DO NOTHING;

COMMIT;
