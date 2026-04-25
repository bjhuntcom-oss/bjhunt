-- ============================================================================
-- Migration 0006 — Email verification tokens
-- ============================================================================
--
-- AUTH-P1-1 (audit 2026-04-25): users.email_verified existed since the
-- original schema but no token table, no send path, no enforcement on
-- login. Anyone could register with attacker@victim-typo.com and get a
-- session immediately — trivial ATO via typo squatting.
--
-- This migration adds the token store. The auth.ts changes (send on
-- register, enforce on login, GET /verify-email/:token endpoint) ship
-- in the same commit.
--
-- Token format: 32-byte url-safe base64 (256 bits entropy). Stored as
-- SHA-256 hash so a DB read does not reveal usable tokens. TTL = 24h.
-- Single-use (used_at sets it).
--
-- Idempotent.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_tokens_hash    ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verif_tokens_user    ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_tokens_expires ON email_verification_tokens(expires_at);

-- Backfill: existing users created before this migration should be
-- considered verified so we don't lock them out. New users (created
-- after deploy) default to email_verified=false and must verify.
UPDATE users
   SET email_verified = true
 WHERE email_verified = false
   AND created_at < now();

COMMIT;
