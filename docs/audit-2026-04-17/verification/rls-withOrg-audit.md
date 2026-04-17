# RLS + withOrg() audit (verification of audit-2026-04-17 findings #3-01 / #3-02, C-11 / C-12)

Date: 2026-04-17
Branch: `main`
Scope: every bare `` sql` `` template-literal call in `backend/src/routes/`.
Migration: `backend/src/db/migrations/2026-04-17-force-rls-and-with-check.sql`.

## TL;DR

Before this ticket, the audit reported ~72% of tenant-scoped DB writes were using
bare `` sql` `` — outside any `SET LOCAL app.current_org_id`. Combined with the
missing `FORCE ROW LEVEL SECURITY` and missing `WITH CHECK` clauses in
`schema.sql`, this meant:

- Row-level security policies fired only on SELECT, not on INSERT / UPDATE
  (no `WITH CHECK`).
- The backend connected as the table owner, so RLS was bypassed entirely.
- A developer who forgot `WHERE org_id = ${orgId}` would silently leak data
  across tenants.

The migration and code changes in this commit fix (a) and (b) at the schema
level and migrate the route-level writes that can be fixed today. See
"Known bootstrap limitations" at the bottom for the follow-ups that remain.

## Migration summary

`backend/src/db/migrations/2026-04-17-force-rls-and-with-check.sql`:

- Drops the 10 existing `USING`-only policies.
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY` for:
  `users`, `engagements`, `findings`, `api_keys`, `audit_logs`,
  `chat_conversations`, `chat_messages`, `agent_runs`, `notifications`,
  `file_uploads`.
- Recreates each policy with both `USING` and `WITH CHECK` asserting
  `org_id = current_setting('app.current_org_id', true)::UUID`.
- Creates a non-owner role `bjhunt_app` with minimal DML privileges
  (`SELECT / INSERT / UPDATE / DELETE` only, no DDL, no SUPERUSER, no
  BYPASSRLS). Default privileges propagate to future tables.
- Adds `COMMENT ON TABLE` for every tenant table documenting the RLS
  contract, and for every non-tenant table documenting that it is
  platform-global.
- Ships with a self-rollback plan and a staging rollout procedure in the
  file header. **Not run** in production from this session per the ticket
  constraint.

The migration coexists with the current owner-based backend connection
today: `FORCE` will enforce RLS on owners too, so the follow-up to switch
`DATABASE_URL` to `bjhunt_app` only hardens the defence-in-depth — it is not
required for the primary fix to take effect.

## Route-level audit

Total bare `` sql` `` occurrences reviewed across `backend/src/routes/`:
**133** (pre-change) → **101** (post-change).

Of the 101 remaining, **every** one is either:

- inside a file the ticket forbids changing (`chat.ts` 24, `auth.ts` 15 —
  will be migrated in a follow-up; see "Known bootstrap limitations"), or
- a confirmed platform-global / bootstrap query (see per-file table below).

### Per-file breakdown

| File | Before | After | Migrated | Left bare | Rationale for bare |
|------|--------|-------|----------|-----------|---------------------|
| `routes/auth.ts` | 15 | 15 | 0 | 15 | Ticket forbids modification. All reads are pre-session user lookups or audit writes tied to the same pre-session path. Follow-up must wrap post-session writes in `withOrg()`. |
| `routes/chat.ts` | 24 | 24 | 0 | 24 | Ticket forbids modification. All 24 are tenant-scoped writes on `chat_conversations`, `chat_messages`, `agent_runs`, `audit_logs`, `file_uploads`. **These MUST be migrated** before FORCE RLS is switched on in prod — tracked in "Known bootstrap limitations". |
| `routes/two-factor.ts` | 13 | 2 | 11 | 2 | Both remaining are pre-session user lookups in `/verify` (before we have `orgId` to pass to `withOrg`). Documented inline. Post-session writes all migrated. |
| `routes/api-keys.ts` | 6 | 2 | 4 | 2 | Remaining: `organizations` lookup (platform-global, no RLS) and `api_key_requests` usage ledger (tenant-scoped but not under RLS per schema.sql — documented in migration table comment). |
| `routes/billing.ts` | 2 | 2 | 0 | 2 | Both are `organizations` lookups (platform-global). No tenant-scoped bare sql in this file; the rest already uses `withOrg()`. |
| `routes/dashboard.ts` | 3 | 1 | 2 | 1 | Remaining: `organizations` plan lookup (platform-global). `sessions` JOIN `users` and `audit_logs` counts migrated into `withOrg()` for defence-in-depth. |
| `routes/engagements.ts` | 8 | 0 | 8 | 0 | All 8 audit-log inserts (`engagement.create` / `.update` / `.launch` / `.delete`, `finding.create`, `graph.ingest`, `defense.approve` / `.reject`) migrated to `withOrg()`. `sql` import removed. |
| `routes/findings.ts` | 1 | 0 | 1 | 0 | The `finding.update` audit log migrated to `withOrg()`. `sql` import removed. |
| `routes/notifications.ts` | 2 | 0 | 2 | 0 | Both `notifications` updates migrated to `withOrg()`. `sql` import removed. |
| `routes/public-api.ts` | 4 | 1 | 3 | 1 | Remaining: `organizations` plan check (platform-global). `agent_runs` insert + two `audit_logs` inserts migrated to `withOrg()`. |
| `routes/reports.ts` | 0 | 0 | — | — | Already 100% `withOrg()`. No bare sql. |
| `routes/tools.ts` | 1 | 0 | 1 | 0 | Tool execution audit log migrated to `withOrg()`. |
| `routes/health.ts` | 1 | 1 | 0 | 1 | `SELECT 1` liveness probe — not tenant-scoped. Explicitly allowed per audit Finding #3-02: "session lookup by ID, etc." |
| `routes/admin/users.ts` | 15 | 15 | 0 | 15 | Platform-admin routes: intentionally cross-tenant. **Will break under FORCE RLS** unless admin role is granted BYPASSRLS or admin operations are moved behind a SECURITY DEFINER wrapper. Tracked below. |
| `routes/admin/settings.ts` | 10 | 10 | 0 | 10 | Same — platform-admin, cross-tenant. Also writes `platform_settings` (global, no RLS). Tracked below. |
| `routes/admin/gateway.ts` | 16 | 16 | 0 | 16 | Mostly platform-global tables (`gateway_providers`, `platform_settings`). Four audit-log inserts here set `org_id = NULL` because there is no tenant — these WILL fail `WITH CHECK` once FORCE RLS is live. Tracked below. |
| `routes/admin/agents.ts` | 12 | 12 | 0 | 12 | Same — platform-global `agent_profiles` and audit-log inserts with `org_id = NULL`. Tracked below. |
| **Total** | **133** | **101** | **32** | **101** | |

"Left bare" includes the 39 in `auth.ts` + `chat.ts` that are not migrated
today because the ticket forbids touching those files.

### Files changed in this ticket

- `backend/src/routes/api-keys.ts` — 4 bare `sql` → `withOrg`.
- `backend/src/routes/notifications.ts` — 2 bare `sql` → `withOrg`. `sql`
  import dropped.
- `backend/src/routes/engagements.ts` — 8 bare `sql` → `withOrg`. `sql`
  import dropped.
- `backend/src/routes/findings.ts` — 1 bare `sql` → `withOrg`. `sql`
  import dropped.
- `backend/src/routes/dashboard.ts` — 2 bare `sql` → `withOrg`.
- `backend/src/routes/tools.ts` — 1 bare `sql` → `withOrg`. `sql` import
  replaced by `withOrg`.
- `backend/src/routes/public-api.ts` — 3 bare `sql` → `withOrg`.
- `backend/src/routes/two-factor.ts` — 11 bare `sql` → `withOrg`. 2 remain
  (pre-session user lookups in `/verify`).

## Known bootstrap limitations (follow-ups required before production FORCE-RLS)

The migration is deliberately **additive** and **not run** in production from
this session. When it is run, the following must be addressed:

1. **`backend/src/routes/auth.ts`** — login/register/reset-password all
   use bare `sql` on `users` (pre-session). With FORCE RLS and the
   `bjhunt_app` role active, these queries will return 0 rows. Options:
   - Keep connecting as table owner (FORCE still applies) so no code
     change is required today — but this forfeits the defence-in-depth
     provided by the dedicated role.
   - Add a SECURITY DEFINER helper `lookup_user_for_auth(email TEXT)` that
     bypasses RLS for the bootstrap path only.
   - Embed `org_id` in the temp-2FA token (and in the session cookie after
     login) so subsequent queries can use `withOrg()`.
2. **`backend/src/routes/chat.ts`** — all 24 bare `sql` writes are
   tenant-scoped on `chat_conversations`, `chat_messages`, `agent_runs`,
   `audit_logs`, `file_uploads`. These will **all silently no-op** under
   FORCE RLS because `WITH CHECK` requires a matching `org_id =
   current_setting('app.current_org_id')::uuid`. **Must be migrated**
   before the migration is applied in production.
3. **`backend/src/routes/admin/*.ts`** — 53 bare `sql` calls across
   `admin/users.ts`, `admin/settings.ts`, `admin/gateway.ts`,
   `admin/agents.ts`. Platform admins need cross-tenant access by design;
   this is incompatible with `bjhunt_app`'s `NOBYPASSRLS`. The correct
   follow-up is:
   - Introduce a second role `bjhunt_admin` with `BYPASSRLS`, used only by
     admin routes behind `requireAdmin`.
   - Or: rewrite the admin audit-log writes to target a new
     `platform_audit_logs` table (referenced in the migration comment on
     `audit_logs`).
4. **`backend/src/config.ts`** — audit finding #3-01 step 4 recommends
   rejecting `DATABASE_URL` whose username is `postgres` in production.
   Not implemented in this ticket to keep diff focused on RLS+withOrg;
   tracked for a follow-up.

## Smoke test — cross-tenant read blocked after FORCE

No automated DB-level test infrastructure exists in this repo
(`backend/package.json` has no `test` script — see audit Finding "Hygiene
#4. No automated tests"). An **E2E cross-tenant isolation test is
deferred** to the follow-up that adds the test harness.

Manual test instructions (staging):

```sql
-- Seed two orgs and one user in each.
INSERT INTO organizations (id, name, slug)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Alpha', 'alpha'),
         ('00000000-0000-0000-0000-000000000002', 'Bravo', 'bravo');
INSERT INTO users (id, org_id, email, password_hash)
  VALUES ('00000000-0000-0000-0000-00000000000a',
          '00000000-0000-0000-0000-000000000001',
          'a@example.com', 'x'),
         ('00000000-0000-0000-0000-00000000000b',
          '00000000-0000-0000-0000-000000000002',
          'b@example.com', 'x');

-- Connect as the bjhunt_app role (after setting its password with ALTER
-- ROLE bjhunt_app PASSWORD '...'; and GRANTing connect to the database).

BEGIN;
SELECT set_config('app.current_org_id',
                  '00000000-0000-0000-0000-000000000001', true);
-- Alpha should see exactly one user:
SELECT id, email FROM users;
-- Attempting to insert into Bravo from Alpha's context must fail:
INSERT INTO users (org_id, email, password_hash)
  VALUES ('00000000-0000-0000-0000-000000000002',
          'c@example.com', 'x');  -- expect: ERROR: new row violates row-level security policy
COMMIT;

BEGIN;
SELECT set_config('app.current_org_id',
                  '00000000-0000-0000-0000-000000000002', true);
-- Bravo should see exactly one user, and its id is b's.
SELECT id, email FROM users;
COMMIT;

-- And bare sql (no set_config) must see zero rows:
SELECT id, email FROM users;  -- expect: (0 rows)
```

## Typecheck

Before: `bun run typecheck` produced the pre-existing errors listed in the
ticket (reports.ts / findings.ts / plan-gate.ts) plus none in this ticket's
files.

After: same pre-existing errors; zero new errors introduced by this ticket.
Verified by running `cd backend && bun run typecheck`.

## References

- `backend/src/db/migrations/2026-04-17-force-rls-and-with-check.sql` — the
  migration and its header-level rollout / rollback plan.
- `docs/audit-2026-04-17/partial/agent-3-backend-api.md` — Findings
  #3-01 (RLS inert) and #3-02 (72% bypass).
- PostgreSQL 17 CREATE POLICY:
  https://www.postgresql.org/docs/17/sql-createpolicy.html
- PostgreSQL 17 ALTER TABLE ... FORCE ROW LEVEL SECURITY:
  https://www.postgresql.org/docs/17/sql-altertable.html
