-- ============================================================================
-- Migration 0007 — Fix incomplete cascade chains on engagement delete
-- ============================================================================
--
-- ENG-P1-3 (audit 2026-04-25): when an engagement is deleted, the audit
-- found two FK relationships that left orphans behind:
--   - chat_conversations.engagement_id ON DELETE SET NULL → conversations
--     stayed in the table with engagement_id=NULL, polluting the sidebar
--     and accumulating storage indefinitely.
--   - agent_runs.conversation_id ON DELETE SET NULL → if the conversation
--     was deleted (or null'd by the chain above), agent_runs lost their
--     forensic link but stayed.
--
-- Switching both to CASCADE so deletion is end-to-end. Justification:
--   - chat_conversations are an audit log of a conversation about an
--     engagement; if the engagement is gone, the conversation has no
--     remaining context.
--   - agent_runs are scoped per (engagement, conversation) tuple; if
--     the conversation is gone, the run's chain is gone with it.
--
-- This is a non-destructive migration: existing rows with NULL
-- engagement_id stay (no-op cleanup; they were already orphaned and
-- queries already filter them out).
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- ── chat_conversations.engagement_id: SET NULL → CASCADE ────────────
ALTER TABLE chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_engagement_id_fkey;
ALTER TABLE chat_conversations
  ADD  CONSTRAINT chat_conversations_engagement_id_fkey
  FOREIGN KEY (engagement_id)
  REFERENCES engagements(id)
  ON DELETE CASCADE;

-- ── agent_runs.conversation_id: SET NULL → CASCADE ──────────────────
ALTER TABLE agent_runs
  DROP CONSTRAINT IF EXISTS agent_runs_conversation_id_fkey;
ALTER TABLE agent_runs
  ADD  CONSTRAINT agent_runs_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES chat_conversations(id)
  ON DELETE CASCADE;

COMMIT;
