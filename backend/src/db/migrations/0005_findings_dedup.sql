-- ============================================================================
-- Migration 0005 — Findings deduplication
-- ============================================================================
--
-- ENG-P0-1 (audit 2026-04-25): findings table had no unique constraint, so
-- multiple agents scanning the same target produced duplicate rows that
-- skewed dashboards, risk scores and reports.
--
-- The dedup key is (engagement_id, title, severity, md5(evidence::text)).
-- Title + severity alone are too coarse (legit variations: same nmap host
-- discovered from two scans of different ports). The evidence hash makes
-- the row truly identical at the data level.
--
-- We use a unique index on a computed expression rather than a constraint
-- so existing duplicates (if any) are not retroactively rejected — the
-- index will fail to create if duplicates already exist; the cleanup query
-- below removes them first, keeping the oldest row per dedup key.
--
-- INSERTs in backend/src/routes/engagements.ts must use
-- `ON CONFLICT ON CONSTRAINT findings_dedup_uq DO NOTHING` (or no clause —
-- Postgres returns 0 rows on the duplicate insert and the .RETURNING is
-- empty, which is the desired behaviour).
-- ============================================================================

BEGIN;

-- ── Cleanup pre-existing duplicates (keep oldest per dedup key) ──────
WITH dups AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY engagement_id, title, severity, md5(coalesce(evidence::text, ''))
           ORDER BY created_at ASC, id ASC
         ) AS rn
    FROM findings
)
DELETE FROM findings
 WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- ── Unique index for dedup ──────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS findings_dedup_uq
  ON findings (engagement_id, title, severity, md5(coalesce(evidence::text, '')));

COMMIT;
