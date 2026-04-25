-- ============================================================================
-- Migration 0008 — Add 'failed' to engagements.status CHECK constraint
-- ============================================================================
--
-- The state-machine validator in routes/engagements.ts (added in commit
-- 9f4bb87 / ENG-P1-2) allows the transition `running → failed` but the
-- DB CHECK constraint only knows ('draft','planning','approved','running',
-- 'paused','completed','cancelled'). A run that legitimately fails could
-- only land at 'cancelled' which conflates two distinct semantics:
-- user-initiated abort vs. agent-side failure.
--
-- This migration extends the CHECK to add 'failed'. Idempotent — drops
-- the old constraint by name then re-adds the wider set.
-- ============================================================================

BEGIN;

ALTER TABLE engagements
  DROP CONSTRAINT IF EXISTS engagements_status_check;

ALTER TABLE engagements
  ADD  CONSTRAINT engagements_status_check
  CHECK (status IN ('draft', 'planning', 'approved', 'running',
                    'paused', 'completed', 'cancelled', 'failed'));

COMMIT;
