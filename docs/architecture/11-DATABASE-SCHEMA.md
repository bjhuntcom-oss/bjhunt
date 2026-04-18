# 11 — Database Schema

> PostgreSQL 17 avec Row-Level Security.
> Drizzle ORM pour le type-safety, SQL raw pour les queries complexes.

## Schema complet

```sql
-- ============================================================
-- BJHUNT Database Schema
-- PostgreSQL 17 with Row-Level Security
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";           -- Case-insensitive text (emails)

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin', 'super_admin')),
    plan TEXT NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================
-- ENGAGEMENTS & FINDINGS
-- ============================================================

CREATE TABLE engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    audit_type TEXT NOT NULL
        CHECK (audit_type IN (
            'external', 'web_app', 'api', 'internal',
            'cloud', 'ad', 'smart_contract'
        )),
    scope JSONB NOT NULL DEFAULT '{}',
    rules_of_engagement JSONB NOT NULL DEFAULT '{}',
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'queued', 'running', 'paused',
            'completed', 'failed', 'cancelled'
        )),
    model TEXT NOT NULL DEFAULT 'anthropic/claude-sonnet-4-6',
    thread_id TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    findings_count INTEGER NOT NULL DEFAULT 0,
    security_score NUMERIC(5,2),
    report_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagements_user ON engagements(user_id);
CREATE INDEX idx_engagements_status ON engagements(status);
CREATE INDEX idx_engagements_created ON engagements(created_at DESC);

CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL
        CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    cvss_score NUMERIC(3,1) CHECK (cvss_score >= 0 AND cvss_score <= 10),
    cvss_vector TEXT,
    cve TEXT,
    cwe TEXT,
    mitre_attack TEXT[],
    description TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}',
    impact TEXT,
    recommendation TEXT,
    agent TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    exploited BOOLEAN NOT NULL DEFAULT false,
    patched BOOLEAN NOT NULL DEFAULT false,
    false_positive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_findings_engagement ON findings(engagement_id);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_cve ON findings(cve) WHERE cve IS NOT NULL;

-- ============================================================
-- JOBS (BullMQ metadata)
-- ============================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    bullmq_id TEXT,
    thread_id TEXT,
    container_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'completed', 'failed')),
    priority INTEGER NOT NULL DEFAULT 5,
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    result JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_user ON jobs(user_id);
CREATE INDEX idx_jobs_engagement ON jobs(engagement_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN ('auth', 'audit', 'admin', 'api', 'system', 'billing')),
    resource_type TEXT,
    resource_id TEXT,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Partition par mois pour les performances
-- (a activer quand le volume justifie)

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================

CREATE TABLE platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings par defaut
INSERT INTO platform_settings (key, value) VALUES
    ('registration_mode', '"invite_only"'),
    ('max_concurrent_audits', '3'),
    ('warm_pool_size', '3'),
    ('maintenance_mode', 'false'),
    ('default_model', '"anthropic/claude-sonnet-4-6"');

-- ============================================================
-- QUOTAS TRACKING
-- ============================================================

CREATE TABLE quota_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource TEXT NOT NULL,
    period TEXT NOT NULL,            -- "2026-04" (YYYY-MM)
    used INTEGER NOT NULL DEFAULT 0,
    limit_override INTEGER,          -- NULL = use plan default
    UNIQUE(user_id, resource, period)
);

CREATE INDEX idx_quota_user_period ON quota_usage(user_id, period);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- Activer RLS
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_usage ENABLE ROW LEVEL SECURITY;

-- Policies pour le role applicatif
CREATE POLICY tenant_isolation ON engagements
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY tenant_isolation ON findings
    FOR ALL USING (engagement_id IN (
        SELECT id FROM engagements
        WHERE user_id = current_setting('app.current_user_id')::uuid
    ));

CREATE POLICY tenant_isolation ON api_keys
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY tenant_isolation ON jobs
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY tenant_isolation ON quota_usage
    FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

-- Tables sans RLS (acces global ou system-only)
-- users: pas de RLS (l'app gere l'acces via middleware)
-- sessions: pas de RLS (lookup par session_id, pas par user_id)
-- audit_logs: pas de RLS (admin-only, read via adminDb)
-- platform_settings: pas de RLS (admin-only)

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_engagements_updated
    BEFORE UPDATE ON engagements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-count findings
CREATE OR REPLACE FUNCTION update_findings_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE engagements
        SET findings_count = findings_count + 1
        WHERE id = NEW.engagement_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE engagements
        SET findings_count = findings_count - 1
        WHERE id = OLD.engagement_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_findings_count
    AFTER INSERT OR DELETE ON findings
    FOR EACH ROW EXECUTE FUNCTION update_findings_count();
```

## Drizzle Schema

```typescript
// db/schema.ts
import { pgTable, uuid, text, boolean, timestamp,
         integer, numeric, jsonb, inet, citext,
         uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(), // citext in DB
  emailVerified: boolean('email_verified').notNull().default(false),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const engagements = pgTable('engagements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  target: text('target').notNull(),
  auditType: text('audit_type').notNull(),
  scope: jsonb('scope').notNull().default({}),
  rulesOfEngagement: jsonb('rules_of_engagement').notNull().default({}),
  config: jsonb('config').notNull().default({}),
  status: text('status').notNull().default('pending'),
  model: text('model').notNull().default('anthropic/claude-sonnet-4-6'),
  threadId: text('thread_id'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMs: integer('duration_ms'),
  findingsCount: integer('findings_count').notNull().default(0),
  securityScore: numeric('security_score', { precision: 5, scale: 2 }),
  reportUrl: text('report_url'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('idx_engagements_user').on(table.userId),
  statusIdx: index('idx_engagements_status').on(table.status),
  createdIdx: index('idx_engagements_created').on(table.createdAt),
}));

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  severity: text('severity').notNull(),
  cvssScore: numeric('cvss_score', { precision: 3, scale: 1 }),
  cvssVector: text('cvss_vector'),
  cve: text('cve'),
  cwe: text('cwe'),
  mitreAttack: text('mitre_attack').array(),
  description: text('description').notNull(),
  evidence: jsonb('evidence').notNull().default({}),
  impact: text('impact'),
  recommendation: text('recommendation'),
  agent: text('agent').notNull(),
  verified: boolean('verified').notNull().default(false),
  exploited: boolean('exploited').notNull().default(false),
  patched: boolean('patched').notNull().default(false),
  falsePositive: boolean('false_positive').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  engagementIdx: index('idx_findings_engagement').on(table.engagementId),
  severityIdx: index('idx_findings_severity').on(table.severity),
}));

// ... sessions, apiKeys, jobs, auditLogs, platformSettings, quotaUsage
// (meme pattern)
```

## Migrations

```bash
# Generer une migration
bunx drizzle-kit generate

# Appliquer les migrations
bunx drizzle-kit migrate

# Pousser le schema directement (dev only)
bunx drizzle-kit push
```

## Backup

```bash
# Backup quotidien (cron 02:00 UTC)
pg_dump -Fc bjhunt > /srv/bjhunt/backups/bjhunt_$(date +%Y%m%d_%H%M%S).dump

# Retention: 7 jours locaux, 30 jours sur stockage externe
find /srv/bjhunt/backups -name "*.dump" -mtime +7 -delete

# Restore
pg_restore -d bjhunt /srv/bjhunt/backups/bjhunt_20260417_020000.dump
```
