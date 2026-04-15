-- BJHUNT Backend — PostgreSQL Schema
-- Multi-tenant with Row-Level Security (RLS)
-- Run with: psql $DATABASE_URL -f schema.sql

BEGIN;

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Organizations (tenants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           TEXT NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    password_hash   TEXT NOT NULL,
    display_name    TEXT,
    role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_platform_admin BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY, -- nanoid
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address  INET,
    user_agent  TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- API Keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    key_hash        TEXT NOT NULL UNIQUE, -- sha256 of the key
    key_prefix      TEXT NOT NULL,        -- first 8 chars for identification
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================================
-- Engagements (security assessments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS engagements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id),
    name            TEXT NOT NULL,
    description     TEXT,
    target          TEXT NOT NULL,  -- target scope (domain, IP range, etc.)
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'draft', 'planning', 'approved', 'running',
                        'paused', 'completed', 'cancelled'
                    )),
    agent_graph     TEXT NOT NULL DEFAULT 'bjhunt', -- langgraph graph name
    langgraph_thread_id TEXT,       -- LangGraph thread ID for resumption
    roe             JSONB,          -- Rules of Engagement
    opplan          JSONB,          -- Operational Plan
    config          JSONB NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagements_org ON engagements(org_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);

-- ============================================================================
-- Findings (vulnerabilities discovered)
-- ============================================================================
CREATE TABLE IF NOT EXISTS findings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    engagement_id   UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    severity        TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    cvss_score      NUMERIC(3,1),
    cvss_vector     TEXT,
    cve_ids         TEXT[],
    mitre_attack    TEXT[],         -- ATT&CK technique IDs
    evidence        JSONB,
    remediation     TEXT,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                        'open', 'confirmed', 'false_positive', 'remediated', 'accepted'
                    )),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_findings_org ON findings(org_id);
CREATE INDEX IF NOT EXISTS idx_findings_engagement ON findings(engagement_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);

-- ============================================================================
-- Audit Log (immutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,       -- 'user.login', 'engagement.create', etc.
    resource    TEXT,                 -- 'engagement:uuid', 'user:uuid'
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- Password Reset Tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);

-- ============================================================================
-- Platform Settings (global, not tenant-scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Chat Conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    engagement_id   UUID REFERENCES engagements(id) ON DELETE SET NULL,
    title           TEXT NOT NULL DEFAULT 'New conversation',
    model           TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_engagement ON chat_conversations(engagement_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_org ON chat_conversations(org_id);

-- ============================================================================
-- Chat Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content         TEXT NOT NULL,
    tool_calls      JSONB,           -- [{id, name, args, result, status, duration}]
    thinking        TEXT,            -- reasoning/thinking content
    sub_agents      JSONB,           -- [{id, name, status, ...}]
    tokens_input    INTEGER,
    tokens_output   INTEGER,
    model           TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON chat_messages(created_at DESC);

-- ============================================================================
-- Agent Runs (tracking which agent ran, when, duration, tokens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    engagement_id   UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
    agent_name      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    input_summary   TEXT,
    output_summary  TEXT,
    error           TEXT,
    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    duration_ms     INTEGER,
    started_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_engagement ON agent_runs(engagement_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at DESC);

-- ============================================================================
-- Notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,    -- 'engagement_completed', 'finding_critical', etc.
    title           TEXT NOT NULL,
    message         TEXT,
    resource_type   TEXT,            -- 'engagement', 'finding', etc.
    resource_id     UUID,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- File Uploads
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    mimetype TEXT,
    size_bytes INTEGER,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_file_uploads_conv ON file_uploads(conversation_id);

-- ============================================================================
-- Gateway Providers (LLM provider configs — platform-global, not tenant-scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gateway_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL, -- 'anthropic', 'openai', 'ollama', 'ollama-cloud', 'google'
    api_key_encrypted TEXT, -- AES-256-GCM encrypted
    api_base TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    models JSONB NOT NULL DEFAULT '[]',
    config JSONB NOT NULL DEFAULT '{}',
    last_tested_at TIMESTAMPTZ,
    last_test_status TEXT, -- 'success', 'error'
    last_test_latency INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Agent Profiles (AI agent personality & config profiles — platform-global)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    soul_md TEXT NOT NULL DEFAULT '',
    agents_md TEXT NOT NULL DEFAULT '',
    identity_name TEXT,
    identity_emoji TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT false,
    visible_to_users BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Row-Level Security (RLS) — multi-tenant isolation
-- ============================================================================

-- The app sets `app.current_org_id` on every connection via:
--   SET LOCAL app.current_org_id = '<uuid>';

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see users in their own org
CREATE POLICY users_org_isolation ON users
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- Policy: engagements scoped to org
CREATE POLICY engagements_org_isolation ON engagements
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- Policy: findings scoped to org
CREATE POLICY findings_org_isolation ON findings
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- Policy: API keys scoped to org
CREATE POLICY api_keys_org_isolation ON api_keys
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- Policy: audit logs scoped to org (platform admins bypass via BYPASSRLS)
CREATE POLICY audit_logs_org_isolation ON audit_logs
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY chat_conv_org_isolation ON chat_conversations
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY chat_msg_org_isolation ON chat_messages
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY agent_runs_org_isolation ON agent_runs
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY notifications_org_isolation ON notifications
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY file_uploads_org_isolation ON file_uploads
    USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_engagements_updated BEFORE UPDATE ON engagements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_findings_updated BEFORE UPDATE ON findings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chat_conv_updated BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gateway_providers_updated BEFORE UPDATE ON gateway_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agent_profiles_updated BEFORE UPDATE ON agent_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2FA / TOTP columns on users
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];

COMMIT;
