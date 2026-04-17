-- Migration: 2026-04-17 — Encrypt gateway provider API keys at rest
--
-- Context: audit Finding #3-36 (C-14, CWE-312).
--   `gateway_providers.api_key_encrypted` was named "encrypted" but actually
--   stored plaintext. Starting with backend/src/lib/crypto.ts the column now
--   holds AES-256-GCM ciphertext in the format `iv_b64:ct_b64:tag_b64`.
--
-- Encryption keys live in the application (ENCRYPTION_KEY env var) and are
-- NOT available to PostgreSQL, so we cannot transparently re-encrypt
-- existing rows in pure SQL. This migration takes the defensive path:
-- it NULLs out any legacy plaintext rows so that the next outbound call
-- fails fast with a clear "re-enter the key" error, rather than silently
-- leaking the plaintext on test or chat request.
--
-- OPERATOR ACTION REQUIRED AFTER RUNNING THIS MIGRATION:
--   1. Log into /dashboard/admin/gateway
--   2. For each provider listed as "API key missing", re-save the API key.
--   3. The backend will encrypt at rest on save.
--
-- Reversing: there is no rollback — plaintext keys are purged on purpose.
--
-- Detection heuristic: an encrypted value is exactly three base64 chunks
-- separated by colons, where the first chunk (IV) decodes to 12 bytes.
-- Anything else is treated as legacy plaintext.

BEGIN;

UPDATE gateway_providers
SET api_key_encrypted = NULL,
    last_test_status = 'error',
    last_test_latency = NULL,
    updated_at = now()
WHERE api_key_encrypted IS NOT NULL
  AND (
    -- Not three colon-separated parts → not our ciphertext format.
    array_length(string_to_array(api_key_encrypted, ':'), 1) IS DISTINCT FROM 3
    -- Or the first part isn't a 16-char base64 (12-byte IV → 16 chars).
    OR length(split_part(api_key_encrypted, ':', 1)) <> 16
  );

COMMIT;
