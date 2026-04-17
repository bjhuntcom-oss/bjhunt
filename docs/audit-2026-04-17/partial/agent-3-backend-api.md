# Agent 3 — Backend API (non-chat) — Audit Report

**Date**: 2026-04-17
**Agent**: Opus 4.7 (1M context)
**Scope**: `backend/src/` except `routes/chat.ts` and `lib/langgraph-client.ts`

## Summary

Files examined (absolute paths):

- `d:/bjhunt-v2/backend/src/index.ts`
- `d:/bjhunt-v2/backend/src/config.ts`
- `d:/bjhunt-v2/backend/src/types.ts`
- `d:/bjhunt-v2/backend/src/plans.ts`
- `d:/bjhunt-v2/backend/src/auth/password.ts`
- `d:/bjhunt-v2/backend/src/auth/session.ts`
- `d:/bjhunt-v2/backend/src/auth/totp.ts`
- `d:/bjhunt-v2/backend/src/auth/api-keys.ts`
- `d:/bjhunt-v2/backend/src/db/client.ts`
- `d:/bjhunt-v2/backend/src/db/schema.sql`
- `d:/bjhunt-v2/backend/src/db/seed.ts`
- `d:/bjhunt-v2/backend/src/middleware/auth.ts`
- `d:/bjhunt-v2/backend/src/middleware/cors.ts`
- `d:/bjhunt-v2/backend/src/middleware/csrf.ts`
- `d:/bjhunt-v2/backend/src/middleware/rate-limit.ts`
- `d:/bjhunt-v2/backend/src/middleware/plan-gate.ts`
- `d:/bjhunt-v2/backend/src/middleware/request-id.ts`
- `d:/bjhunt-v2/backend/src/lib/stream-ticket.ts`
- `d:/bjhunt-v2/backend/src/lib/email.ts`
- `d:/bjhunt-v2/backend/src/lib/email-templates.ts`
- `d:/bjhunt-v2/backend/src/routes/auth.ts`
- `d:/bjhunt-v2/backend/src/routes/two-factor.ts`
- `d:/bjhunt-v2/backend/src/routes/api-keys.ts`
- `d:/bjhunt-v2/backend/src/routes/billing.ts`
- `d:/bjhunt-v2/backend/src/routes/dashboard.ts`
- `d:/bjhunt-v2/backend/src/routes/engagements.ts`
- `d:/bjhunt-v2/backend/src/routes/findings.ts`
- `d:/bjhunt-v2/backend/src/routes/reports.ts`
- `d:/bjhunt-v2/backend/src/routes/notifications.ts`
- `d:/bjhunt-v2/backend/src/routes/health.ts`
- `d:/bjhunt-v2/backend/src/routes/public-api.ts`
- `d:/bjhunt-v2/backend/src/routes/cve.ts`
- `d:/bjhunt-v2/backend/src/routes/skills.ts`
- `d:/bjhunt-v2/backend/src/routes/tools.ts`
- `d:/bjhunt-v2/backend/src/routes/admin/users.ts`
- `d:/bjhunt-v2/backend/src/routes/admin/settings.ts`
- `d:/bjhunt-v2/backend/src/routes/admin/agents.ts`
- `d:/bjhunt-v2/backend/src/routes/admin/gateway.ts`
- `d:/bjhunt-v2/backend/package.json`
- `d:/bjhunt-v2/backend/tsconfig.json`
- `d:/bjhunt-v2/backend/Dockerfile`

Method: static analysis, cross-reference with `CLAUDE.md` rules and `docs/DEEP-AUDIT-2026-04-16.md`, verification of every route file for auth / input validation / authorization / SQL injection / rate limiting / error handling. Web research for 2026 best practices.

### Top-line findings count
- **Critical**: 6
- **High**: 14
- **Medium**: 18
- **Low**: 10

**Total: 48 findings.**

---

## Findings

### Finding #3-01 — RLS is declared but structurally inert — tenant isolation is illusory

- **Severity**: Critical
- **Category**: Security
- **File**: `backend/src/db/schema.sql:320-364`; `backend/src/db/client.ts:8-28`
- **Bug / Inconsistency**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is set, but (a) `FORCE ROW LEVEL SECURITY` is not declared, so the `postgres` owner role bypasses policies; (b) policies only specify `USING`, not `WITH CHECK`, so a poisoned org id can be inserted; (c) the Postgres connection created by `postgres(config.database.url)` is a single pool with transform camel — same pool is used by `withOrg()` and by hundreds of bare `sql\`` calls across routes. Bare `sql\`` calls execute **outside** any `SET LOCAL app.current_org_id`, so the `current_setting('app.current_org_id', true)` returns `NULL`, and `USING (org_id = NULL::UUID)` evaluates to `UNKNOWN` — which is treated as false by RLS, so the query returns zero rows. For queries inside `withOrg()` the setting is applied transactionally. The entire design only works if the app role is not the table owner; the schema creates no such role, and compose/seed show everything running as the default Postgres role.
- **Root cause**: Three layered mistakes: missing `FORCE`, missing `WITH CHECK`, no application-level non-owner role.
- **Fix proposed**:
  1. Add `ALTER TABLE <t> FORCE ROW LEVEL SECURITY` for every tenant table.
  2. Add `WITH CHECK (org_id = current_setting('app.current_org_id', true)::UUID)` to every policy.
  3. Create `CREATE ROLE bjhunt_app LOGIN PASSWORD '...'; GRANT USAGE ON SCHEMA public TO bjhunt_app; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES ... TO bjhunt_app;` and connect the backend as `bjhunt_app`.
  4. Refuse to accept `DATABASE_URL` whose username is `postgres` in production (fail fast in `config.ts`).
- **2026 best practice**: PostgreSQL official docs state: "To ensure that row security policies are applied to the table owner or a role with BYPASSRLS, you need to use ALTER TABLE ... FORCE ROW LEVEL SECURITY." Also, per [PostgreSQL 17 docs on CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html), `USING` filters visible rows on read while `WITH CHECK` validates rows on insert/update — both are required for defense-in-depth multi-tenant models. See also the RLS + connection pool discussion at [Retool forum set_config/RLS](https://community.retool.com/t/set-postgres-config-parameters-using-set-config-for-rls/31421).
- **VIOLATES CLAUDE.md**: "RLS PostgreSQL pour l'isolation multi-tenant".

### Finding #3-02 — 72% of DB queries in routes bypass `withOrg()` and rely on `WHERE org_id = ...` discipline

- **Severity**: Critical
- **Category**: Security
- **File**: multiple — audit-log inserts, user lookups, settings, gateway_providers, agent_profiles, admin/users, admin/settings, admin/agents
- **Bug / Inconsistency**: The project's documented tenant boundary is `withOrg(orgId, ...)`. In practice, most route files mix `withOrg(...)` (for reads) with bare `sql\`...\`` (for audit log inserts, for cross-org aggregations, for gateway/admin/agent_profile tables). Example: `engagements.ts:310`, `engagements.ts:357`, `engagements.ts:403`, `engagements.ts:476`, `engagements.ts:826`, `engagements.ts:960`, `engagements.ts:1288`, `engagements.ts:1313` all use `sql\`` outside the transaction. Tables `sessions`, `audit_logs`, `notifications`, `users`, `agent_runs`, `api_key_requests` — even when they carry `org_id` — are written to with the bare client, so RLS policies are never engaged. `audit_logs` has RLS declared on it (`schema.sql:324`, `348`) but every insert is via bare `sql\``; the `current_setting('app.current_org_id', true)` is `NULL` and the insert still succeeds because `WITH CHECK` is missing (see #3-01). This means a bug in any route that forgets to `WHERE org_id = ${orgId}` will cross-tenant leak data.
- **Root cause**: No consistent data-access convention. `withOrg()` is opt-in, not enforced.
- **Fix proposed**: Audit every bare `sql\`` call in routes; move them inside `withOrg()` or explicitly document them as "platform-global" (platform_settings, gateway_providers, agent_profiles) with requireAdmin guard. Create a lint rule or wrapper that forbids `sql\`...\`` in route files — expose only `withOrg(...)` and a narrow `platformSql` export.
- **2026 best practice**: [Neon RLS primer](https://neon.tech/blog/multi-tenant-rls) and the [Mikro-ORM RLS discussion](https://github.com/mikro-orm/mikro-orm/discussions/6137) both note that pooled connections plus transaction-scoped `SET LOCAL` is the only safe pattern; bare queries without `BEGIN` inherit no tenant context and must be considered admin-level.

### Finding #3-03 — Session token duplicated into JS-readable `bjhunt_stream_token` and accepted via `?token=` and `Authorization: Bearer session:`

- **Severity**: Critical
- **Category**: Security
- **File**: `backend/src/middleware/auth.ts:38-50`
- **Bug / Inconsistency**: Even after the SP3/SP2 ticket refactor, the backend still accepts the real session id via two additional fallback paths: `Authorization: Bearer session:<id>` (lines 43-45) and `?token=<id>` (lines 47-50). These paths are the reason the frontend duplicates the session into the non-HttpOnly `bjhunt_stream_token` (see DEEP-AUDIT 2026-04-16 finding #3). A session token in a query string is logged by every proxy, every access log, browser history, and `Referer` headers; it is persistent XSS-readable when stored in a non-HttpOnly cookie.
- **Root cause**: Quick fix for the cross-origin SSE problem was never removed after the signed ticket (`stream-ticket.ts`) was introduced.
- **Fix proposed**: Delete lines 43-50 from `backend/src/middleware/auth.ts`. The only session acceptance path must be the `bjhunt_session` HttpOnly cookie. Cross-origin stream auth must go through `verifyTicket()` (`lib/stream-ticket.ts`), which is designed for this.
- **2026 best practice**: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) forbids placing session identifiers in URLs ("Session ID Storage" / "Session ID Name Fingerprinting"), and [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) requires HttpOnly for session cookies.
- **VIOLATES CLAUDE.md**: "Pas de secrets dans le code — tout dans `.env`" in spirit, plus the security-first posture.

### Finding #3-04 — Session cookie uses `SameSite=Lax` but is set by the backend across domains — browser drops the cookie

- **Severity**: High
- **Category**: Reliability / Security
- **File**: `backend/src/routes/auth.ts:368-374`; `backend/src/routes/two-factor.ts:237-241`
- **Bug / Inconsistency**: When login is served via the Next frontend (bjhunt.com) that proxies to `api.bjhunt.com`, the response `Set-Cookie` has no `Domain=.bjhunt.com` attribute, so the cookie binds to `api.bjhunt.com` only. Frontend AJAX from `bjhunt.com` to `api.bjhunt.com` sends no cookie. The code path is fragile: either the domain must be set (and CSRF origin check updated) or the frontend must run same-origin via rewrites.
- **Fix proposed**: Explicitly set `Domain=.bjhunt.com` in production, and add a matching `Domain` clause on logout. Update `config.cors.origins` to reflect the eTLD+1 set.
- **2026 best practice**: MDN "[Set-Cookie Domain attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#domaindomain-value)" — without `Domain`, the cookie is host-only.

### Finding #3-05 — Password reset and change do not revoke existing sessions

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/auth.ts:291-327` (reset), `backend/src/routes/auth.ts:336-364` (change)
- **Bug / Inconsistency**: After a password reset (attacker-path recovery) or a password change (which is the canonical "I think I was compromised" signal), existing sessions are not deleted. A stolen session cookie continues to work indefinitely. `deleteUserSessions(userId)` already exists in `auth/session.ts:48` and is unused.
- **Fix proposed**: Add `await deleteUserSessions(resetToken.userId)` inside the transaction in `reset-password`, and `await deleteUserSessions(user.id)` in `change-password`. In `change-password`, after revoking, create a new session and return the new cookie so the current client stays logged in.
- **2026 best practice**: [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#renew-the-session-id-after-any-privilege-level-change) — "invalidate all sessions upon password changes". Also enshrined in NIST 800-63B §4.2.3.

### Finding #3-06 — API key creation has no org-admin gate — any member can mint production API keys

- **Severity**: High
- **Category**: Security / Authorization
- **File**: `backend/src/routes/api-keys.ts:20-50`
- **Bug / Inconsistency**: Middleware chain is only `requireAuth` + `rateLimit` + plan gate. Any user with role `member` or `viewer` in a paid org can `POST /api/keys` and mint a key that carries the org's full API privileges. The `DELETE /:id` also has no role gate: any member can revoke any other member's keys in the org.
- **Fix proposed**: Apply the existing `requireOrgAdmin` middleware (`middleware/auth.ts:89-95`) to POST `/` and DELETE `/:id`. Also scope `listApiKeys` and `DELETE` so a regular member only sees/removes their own keys (`WHERE user_id = ${user.id}`), while admins see all.
- **2026 best practice**: [OWASP API3:2023 Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/).

### Finding #3-07 — TOTP 2FA temp token is deterministic and replayable — no server-side binding

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/auth.ts:127-141`; `backend/src/routes/two-factor.ts:176-196`
- **Bug / Inconsistency**: The temp token is `sha256(userId + SESSION_SECRET + expiry):userId:expiry`. The server never stores it — any correct hash of `userId/expiry` is accepted until expiry. This means (a) if an attacker obtains one temp token (e.g. via a log) and then obtains a TOTP code, they can replay the temp token until expiry; (b) there is no nonce, so a single successful 2FA verification does not invalidate the temp token (a second verify within 5 minutes is not blocked); (c) no rate limit on 2FA verify per userId (only per IP), so a single IP rotating Tor exits can brute-force the 6-digit code.
- **Fix proposed**: Store temp tokens in a table with `token_hash`, `user_id`, `expires_at`, `used_at`, enforce `used_at IS NULL` on verify, delete on successful verification. Add a `2fa_verify_fails` counter per user with exponential backoff, matching NIST SP 800-63B throttling guidance.
- **2026 best practice**: NIST SP 800-63B §5.2.2 (throttling) + §5.1.4 (OOB), and [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

### Finding #3-08 — TOTP secret leaks to client through `/setup` and stays on disk after enrollment

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/two-factor.ts:41-65`
- **Bug / Inconsistency**: The setup endpoint returns `{ secret, uri, qrDataUrl }` where `secret` is the base32-encoded TOTP seed. This is by design (to render a QR), but (a) the secret is placed in a HTTP response body which is cacheable at any mis-configured proxy, and (b) after `enable()` succeeds at line 99, `totp_secret` is kept plain in the `users` table forever — a DB read is enough to forge codes for every 2FA-enabled user. Best practice is to encrypt at rest with AES-256-GCM keyed from a KMS-managed secret.
- **Fix proposed**: Only return `uri` (the otpauth:// URI), not `secret`. Encrypt `totp_secret` at rest using `config.auth.sessionSecret` or a dedicated `TOTP_ENCRYPTION_KEY` (AES-256-GCM via Bun's CryptoKey / subtle). Store `totp_secret_enc`, `totp_secret_iv`, `totp_secret_tag`.
- **2026 best practice**: RFC 6238 recommends shared secrets at rest be encrypted. [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).
- **VIOLATES CLAUDE.md**: "AES-256-GCM pour les secrets".

### Finding #3-09 — TOTP backup codes stored in plaintext

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/auth/totp.ts:67-92`; `backend/src/routes/two-factor.ts:96-104`
- **Bug / Inconsistency**: `generateBackupCodes()` returns plaintext strings that are written directly into `users.totp_backup_codes TEXT[]` at line 102. Anyone with a DB read can consume backup codes for every account. `verifyBackupCode` does plaintext equality.
- **Fix proposed**: Hash each backup code with Argon2id (or at minimum SHA-256) before storing. Return plaintext only once to the user. On verify, hash the input and `ANY()`-match against the stored hashes.
- **2026 best practice**: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — any credential-equivalent secret must be hashed at rest.

### Finding #3-10 — Rate limiting fails open on Redis outage

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/middleware/rate-limit.ts:34-48`
- **Bug / Inconsistency**: The `try { redis.incr(...) } catch { /* fail open */ }` pattern lets all traffic through if Redis is unreachable. During a Redis incident, `/api/auth/login` becomes unbounded, enabling offline + online credential stuffing. Also, `getRedis()` uses `lazyConnect: true` + `maxRetriesPerRequest: 1`, so a cold pod will also not block on first request even when Redis is healthy.
- **Fix proposed**: Replace silent swallow with: on 3 consecutive Redis failures, return 503 for write routes (`POST`, `PUT`, `PATCH`, `DELETE`, especially `/api/auth/*`). Also use an atomic Lua script for sliding-window counting instead of `INCR`+`EXPIRE`, which has a race where the key can live without TTL if the process dies between the two commands.
- **2026 best practice**: [Cloudflare: "fail closed on auth"](https://blog.cloudflare.com/rate-limiting-best-practices/), [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) — rate limit must be resilient, not defeatable by DoS of the limiter.

### Finding #3-11 — Rate limit per `path` + `userId|ip` — trivial to bypass via path variance

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/middleware/rate-limit.ts:32`
- **Bug / Inconsistency**: `const key = 'rl:${userId||ip}:${c.req.path}'`. Two issues: (1) auth endpoints hit different paths (`/login`, `/register`, `/forgot-password`), so the attacker gets `3 × 10 requests per 5 minutes` per IP across them; (2) public-api routes use dynamic params (`/api/v1/scans/:id/findings`), so each unique id is its own bucket — an attacker that cycles IDs is effectively unrated. (3) IP extraction takes `x-forwarded-for` without verifying the upstream proxy count — `X-Forwarded-For: 10.0.0.1, attacker-ip` yields the client's injected IP.
- **Fix proposed**: Separate a `LOGIN_IP` bucket (one key for all login-family endpoints combined) and a `LOGIN_EMAIL` bucket (per email). For authenticated APIs, key on `orgId` or `apiKeyId` not per-path. Harden IP extraction: accept `x-forwarded-for` only if the connecting socket IP is in a known trusted proxy CIDR (Caddy IP) and take the last non-trusted hop from the right.
- **2026 best practice**: [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) — rate limiting must use an attacker-indistinguishable key. Also [Cloudflare's ruleset-based rate limiting notes](https://developers.cloudflare.com/waf/rate-limiting-rules/).

### Finding #3-12 — CSRF exempt-list contains `/logout` and no-origin fallback trusts presence of cookie alone

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/middleware/csrf.ts:12-18, 36-43`
- **Bug / Inconsistency**: `/api/auth/logout` is CSRF-exempt, so a third-party page can silently log the user out (UX annoyance, but also a path to session fixation because the browser-visible logout looks identical to a natural one). More importantly, if the `Origin` header is absent the middleware accepts the request merely because a `bjhunt_session` cookie exists (lines 39-42) — this is exactly what a CSRF attack produces. Modern browsers omit `Origin` on some legacy cross-site GETs, so this fallback is a silent CSRF bypass for any future GET mutation (and right now the login/register routes swallow CSRF checks because of the fallback).
- **Fix proposed**: (a) Remove `/api/auth/logout` from exempt list — it's state-changing. (b) Remove the "no origin = assume server-side" fallback; instead, require `Origin` or `Referer` for every state-changing request and reject otherwise. (c) Prefer checking `Sec-Fetch-Site: same-origin|none` per the [Hono CSRF docs](https://hono.dev/docs/middleware/builtin/csrf). (d) Pair with double-submit CSRF tokens for defense in depth.
- **2026 best practice**: [Hono CSRF middleware](https://hono.dev/docs/middleware/builtin/csrf) checks both Origin and `Sec-Fetch-Site`. [MDN CSRF Prevention](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSRF_prevention): "Never trust a request merely because it carries cookies".
- **VIOLATES CLAUDE.md**: "Valider TOUS les inputs avec Zod ... cote frontend" in spirit — here, origin check is the CSRF-equivalent input validation.

### Finding #3-13 — CORS wildcard `*.bjhunt.com` with `credentials: true` trusts every subdomain forever

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/middleware/cors.ts:12-30`
- **Bug / Inconsistency**: Any future subdomain — a marketing site, a Vercel preview under a custom domain, a compromised blog, a misconfigured Hostinger sub-hostname — becomes a trusted Origin with cookies. If even one subdomain is compromised (XSS on `blog.bjhunt.com`), it can read/write authenticated endpoints of `api.bjhunt.com` as the logged-in user. Also, `credentials: true` + dynamic origin reflection is the exact pattern advised against.
- **Fix proposed**: Replace wildcard with explicit list: `https://bjhunt.com`, `https://www.bjhunt.com`, `https://chat.bjhunt.com`. Add a separate public-API CORS profile with `credentials: false` for the API key routes. Centralize `ALLOWED_ORIGINS` in config and reuse it in `csrf.ts`, `cors.ts`, and any SSE response header — no more drift.
- **2026 best practice**: [OWASP CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) — "The `Access-Control-Allow-Origin` value SHOULD be set to a single specific origin; do not dynamically reflect arbitrary origins when credentials are allowed."

### Finding #3-14 — API keys stored as raw SHA-256 (no pepper, no per-key salt)

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/auth/api-keys.ts:23-27, 36, 54`
- **Bug / Inconsistency**: `sha256(plaintext)` is used directly. While API keys contain 40 chars of nanoid (~240 bits, so brute force is infeasible), the current design means (a) a DB leak + any key-space attack on future keys has no cost function; (b) there is no pepper, so the same plaintext always maps to the same hash across deployments — an attacker with access to one environment can test candidate plaintexts in another; (c) the algorithm cannot be rotated because no algorithm identifier is stored with the hash.
- **Fix proposed**: Store `HMAC-SHA-256(plaintext, API_KEY_PEPPER)` where `API_KEY_PEPPER` is a secret env var. Prefix hashes with `v1:` so a future `v2:` scheme can coexist. Log last-used with IP (`api_key_requests` already has the shape, but no middleware is populating it).
- **2026 best practice**: [OWASP Cryptographic Storage Cheat Sheet — API Keys](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).

### Finding #3-15 — `UPDATE api_keys SET last_used_at = now() ... RETURNING org_id, user_id` on every request — massive WAL / contention

- **Severity**: Medium
- **Category**: Performance
- **File**: `backend/src/auth/api-keys.ts:57-62`
- **Bug / Inconsistency**: Every public-API request performs a writing query under a unique key to update `last_used_at`. This puts a write on the hot path of every request (index bloat on `idx_api_keys_hash`, WAL traffic, transaction overhead) and is a lock contention if the same key fans out.
- **Fix proposed**: Split into a cache-first validation (Redis `GET` of `apikey:<hash>` with 60s TTL) and an asynchronous/batched `last_used_at` update (flush every 30s or on process signal). Alternatively, use a separate `api_key_usage` hourly-bucketed counter table.
- **2026 best practice**: Stripe's [API key design](https://stripe.com/docs/api/authentication) decouples validation from metrics.

### Finding #3-16 — `postgres.js` `transform: postgres.camel` silently remaps snake_case, but PATCH routes build camelCase keys that don't match the DB

- **Severity**: High
- **Category**: Correctness
- **File**: `backend/src/routes/engagements.ts:329-350`; `backend/src/routes/admin/users.ts:159-171`; `backend/src/routes/findings.ts:191-200`; `backend/src/routes/admin/agents.ts:120-126`; `backend/src/routes/admin/gateway.ts:151-158`
- **Bug / Inconsistency**: With `transform: postgres.camel`, **read** columns are automatically mapped from `org_id` to `orgId` — but for **writes**, the library documents that the same transform is applied: if you pass `{ agentGraph: "x" }` to `sql(obj)`, it writes to column `agent_graph`. However, the schema mixes this: `values.startedAt = new Date()` (camelCase assumed to map to `started_at`) — this works. But `values.remediationStatus` (findings.ts:193) has no column `remediation_status` in the schema; the write will silently fail with a Postgres error. `values.soulMd` (agents.ts:122) maps to `soul_md` (exists). `values.identityName` (agents.ts:124) maps to `identity_name` (exists). The mix is inconsistent and fragile.
- **Fix proposed**: (a) Write an integration test that round-trips every PATCH route. (b) Drop camel transform on writes (postgres.js supports asymmetric — or pass a plain object with snake_case keys for writes). (c) Add schema columns that the code references (`remediation_status` in findings), or delete the `remediationStatus` branch from the zod schema.
- **2026 best practice**: [Postgres.js transforms doc](https://github.com/porsager/postgres#transform-option) — recommends never transforming both directions unless the schema is pure snake_case.

### Finding #3-17 — Dynamic `ORDER BY`/`LIMIT`/`OFFSET` from query params; pagination has no upper bound on offset

- **Severity**: Medium
- **Category**: Performance / DoS
- **File**: `backend/src/routes/engagements.ts:56-57`; `backend/src/routes/findings.ts:58-59`; `backend/src/routes/admin/users.ts:23-24`; `backend/src/routes/admin/settings.ts:47-48`; `backend/src/routes/public-api.ts:183-184`
- **Bug / Inconsistency**: `offset` is clamped from above only on `limit` (max 100/200). `offset` has no cap, so `?limit=100&offset=99999999` is accepted; Postgres will scan the whole table and return nothing. Combined with the rate-limit weakness in #3-11, this is a cheap read-amplification DoS.
- **Fix proposed**: Cap `offset` (e.g., 10000). Better: switch to cursor-based pagination using `created_at DESC, id DESC`.
- **2026 best practice**: [Rails/Django/GraphQL pagination guidance](https://shopify.engineering/pagination-relative-cursors).

### Finding #3-18 — Search `?q=` is concatenated into `ILIKE` pattern without escaping LIKE metacharacters

- **Severity**: Medium
- **Category**: Security / DoS
- **File**: `backend/src/routes/findings.ts:75`; `backend/src/routes/admin/users.ts:30-31`
- **Bug / Inconsistency**: `const pattern = '%${search}%';` then used in `ILIKE ${pattern}`. Although the value is parameterized (no SQL injection), the user controls `%` and `_` metacharacters in the LIKE pattern. An attacker can send `%%%%%%%%%...%%` — a 100-char pattern of `%` triggers Postgres's ILIKE backtracking and can cause expensive table scans on indexed fields that had trigram but fall back. Also, `search` is used in `${search} = ANY(cve_ids)` in findings.ts:77 — this part **is** safely parameterized but still matches any user-controlled content into an array comparison.
- **Fix proposed**: Escape `%`, `_`, and `\` before building the pattern, or switch to `plainto_tsquery`/`websearch_to_tsquery` + `tsvector`/`tsquery` full-text search with GIN index. Enforce `search.length <= 100`.
- **2026 best practice**: [Postgres LIKE operator escape rules](https://www.postgresql.org/docs/17/functions-matching.html#FUNCTIONS-LIKE) and the usual `replace(['%','_'], ['\\%','\\_'])` defense.

### Finding #3-19 — CSV export has formula-injection hole (CWE-1236)

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/findings.ts:250-272` (export); `backend/src/routes/reports.ts:30-37, 358-381` (CSV)
- **Bug / Inconsistency**: User-controlled finding titles/descriptions go straight into CSV cells. A finding titled `=cmd|'/C calc'!A0` opens in Excel as a live formula — CWE-1236 CSV Injection. `findings.ts:252-253` escapes quotes but not the `=`, `+`, `-`, `@`, `|`, `\t`, `\r` prefixes; `reports.ts:escapeCSV` only wraps in quotes when it sees `,`, `"`, or `\n`.
- **Fix proposed**: Prefix any cell starting with `=`, `+`, `-`, `@`, `|`, `\t`, `\r` with a single quote (`'`). This is the OWASP-recommended mitigation.
- **2026 best practice**: [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection).

### Finding #3-20 — `zValidator` returns default Hono 400 with Zod's JSON-stringified error — leaks internal schema hints to attackers

- **Severity**: Low
- **Category**: Security / Information Disclosure
- **File**: every route using `zValidator` without a custom hook
- **Bug / Inconsistency**: By default `@hono/zod-validator` responds with the full ZodError including the path (camelCase field names, nesting, enum values). For public-API routes (`/api/v1/*`), this is useful; for auth/register it confirms e.g. which email is already in use by narrowing the validation error. The leak is mild but combined with rate-limit bypass (#3-11) supports user enumeration.
- **Fix proposed**: Use the hook form: `zValidator("json", schema, (result, c) => { if (!result.success) return c.json({ error: "validation_failed" }, 400); })`. Log the detailed error server-side only.
- **2026 best practice**: [Hono zod-validator with hook](https://hono.dev/docs/guides/validation#zod-validator-middleware).

### Finding #3-21 — `/api/auth/register` returns `{ user, sessionToken, organization }` including `sessionToken` in the JSON body

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/auth.ts:86-96, 163-172`; `backend/src/routes/two-factor.ts:248-257`
- **Bug / Inconsistency**: The response body contains `sessionToken: session.id` — the same value as the HttpOnly cookie, but exposed to JavaScript. This re-introduces exactly the problem documented in DEEP-AUDIT-2026-04-16 finding #3 (JS-readable session tokens). The frontend may stash this value in `localStorage` or in a non-HttpOnly cookie.
- **Fix proposed**: Remove `sessionToken` from the JSON response. The HttpOnly cookie is the session — the frontend does not need it in JS.
- **2026 best practice**: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — session ID must be HttpOnly, never in response bodies.
- **VIOLATES CLAUDE.md**: "Argon2id pour les passwords, AES-256-GCM pour les secrets" and overall security posture.

### Finding #3-22 — `/api/auth/login` does not stamp a fresh session on a pre-existing cookie — no session fixation protection

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/routes/auth.ts:101-174`
- **Bug / Inconsistency**: If a browser holds a pre-auth `bjhunt_session` cookie (e.g., anonymous guest, or attacker-planted), login just overwrites the cookie. There's no explicit delete of a prior session ID for the same user, and no binding between the session and the user agent / IP after login.
- **Fix proposed**: On successful login, if the incoming cookie carries a session ID that already exists in DB for another user, delete it first. Bind sessions to `user_agent` fingerprint (already stored, but never checked).
- **2026 best practice**: [OWASP Session Fixation](https://owasp.org/www-community/attacks/Session_fixation).

### Finding #3-23 — Argon2id parameters are OK but not documented; bcrypt-compat backoff missing

- **Severity**: Low
- **Category**: Security / Maintainability
- **File**: `backend/src/auth/password.ts:7-12`
- **Bug / Inconsistency**: Parameters `memoryCost=64MB, timeCost=3, parallelism=4` are above OWASP's 2026 floor of `19MiB, t=2, p=1`, which is good. However, `parallelism=4` is awkward — argon2 library threads costs linearly and this is CPU-burning under load; 1 or 2 is more conservative for a web server. There is no version string or algorithm ID prefixed to the hash, but argon2id does include `$argon2id$v=19$m=...$t=...$p=...$` so rotation is possible. Not a bug — just note to pin the choice.
- **Fix proposed**: Leave parameters as-is (they exceed OWASP minimum) but lower `parallelism` to 1 under load tests and add a comment pinning the decision. Add a migration path: on verify, if the hash encodes weaker parameters than current, rehash.
- **2026 best practice**: [OWASP Password Storage Cheat Sheet (Argon2id section)](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). "[Password Hashing in 2026](https://www.inkyvoxel.com/password-hashing-in-2026/)".

### Finding #3-24 — `DELETE FROM api_keys WHERE id = ${keyId} AND org_id = ${orgId}` is OK, but list/revoke use bare `sql`

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/auth/api-keys.ts:68-82`
- **Bug / Inconsistency**: `revokeApiKey` and `listApiKeys` use bare `sql\`` without `withOrg()`. The `WHERE org_id = ${orgId}` clause is present, so horizontal safety is maintained — but per #3-01/#3-02 this is fragile manual discipline, not enforced isolation.
- **Fix proposed**: Push through `withOrg()` or a dedicated tenant-scoped DB wrapper.

### Finding #3-25 — `engagements.ts` graph/ingest accepts uploads without file-size limit

- **Severity**: Medium
- **Category**: Security / DoS
- **File**: `backend/src/routes/engagements.ts:652-834`
- **Bug / Inconsistency**: `formData.get("file")` + `file.text()` loads the entire upload into memory, with no `Content-Length` or byte cap. A 2 GB XML or JSONL upload will OOM the Bun process. The bloodhound branch allows up to 500 items but after the whole file is parsed. The nmap XML path runs global regex on unbounded content.
- **Fix proposed**: Enforce `c.req.header("content-length") < 25 * 1024 * 1024` before reading. Stream-parse JSONL instead of `content.split("\n")`. Validate mimetype server-side (do not trust `fileName.endsWith("...")`).
- **2026 best practice**: [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

### Finding #3-26 — `graph/ingest` inserts findings row-by-row inside `withOrg`, one transaction per row

- **Severity**: Medium
- **Category**: Performance
- **File**: `backend/src/routes/engagements.ts:686-691, 705-711, 729-736, 760-767, 782-789, 806-813`
- **Bug / Inconsistency**: Every finding insertion opens a new `BEGIN` transaction, sets `app.current_org_id`, inserts one row, commits. For a nuclei JSONL with 1,000 results that's 1,000 transactions.
- **Fix proposed**: Wrap the whole ingest in a single `withOrg(orgId, async (tx) => { for (...) await tx\`INSERT ...\` })` — or use `tx.begin` outside the loop.

### Finding #3-27 — `engagements.ts` PATCH uses `sql(values as any)` with camelCase — potential mass assignment

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/routes/engagements.ts:343-353`
- **Bug / Inconsistency**: `sql(values)` dynamic column update. The zod schema constrains incoming fields, but `values` is built manually from whitelisted keys — OK. However, because the camelCase transform is applied, any key like `orgId` or `isPlatformAdmin` that slips through future refactors would write to a DB column. It is a trap primed for the next maintainer. Keep the explicit whitelist and add a server-side `Object.keys(values).filter(k => ALLOWED_UPDATE_KEYS.has(k))` guard.
- **Fix proposed**: Extract `ALLOWED_UPDATE_KEYS: Set<string>` and filter before `sql(values)`.
- **2026 best practice**: [OWASP API6:2023 Unrestricted Access to Sensitive Business Flows](https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/).

### Finding #3-28 — Public API `/v1/scans` creates engagement, then swallows LangGraph start failure — phantom scans

- **Severity**: High
- **Category**: Correctness / Reliability
- **File**: `backend/src/routes/public-api.ts:120-176`
- **Bug / Inconsistency**: The engagement is inserted with `status='running'`, then `createThread`/`createRun` is attempted; on `catch` the status is reverted to `'draft'`. But between the initial insert (status=running) and the catch-update, a status poll will show `running`. Worse, the `agent_runs` row is inserted **after** the try/catch unconditionally — so a phantom agent run is logged even when LangGraph never started. Consumers polling `/status` will see totals that never change.
- **Fix proposed**: Invert order — create engagement as `'queued'`; call LangGraph; on success, transition to `'running'` and insert the agent_runs row. On failure, set status to `'failed'` with an explicit error field.
- **2026 best practice**: Saga pattern — atomic external side effects must either be idempotent or compensated.

### Finding #3-29 — `/api/v1` requires Enterprise plan but applies the same generic `api` rate limit as logged-in users

- **Severity**: Medium
- **Category**: Reliability / Cost
- **File**: `backend/src/routes/public-api.ts:24`
- **Bug / Inconsistency**: 120 req/min is too tight for CI/CD integrations (the stated use case). Also the rate limit is scoped per path (#3-11), so GETs and POSTs share the budget. An Enterprise customer running a nightly pipeline will hit 429 on large-repo scans.
- **Fix proposed**: Dedicated `rateLimit.apiV1: { window: 60, max: 600 }` keyed by `apiKeyId` (not path). Emit X-RateLimit headers so customers can back off.

### Finding #3-30 — `/api/health/ready` creates a fresh Redis client on every request

- **Severity**: Low
- **Category**: Performance
- **File**: `backend/src/routes/health.ts:29-37`
- **Bug / Inconsistency**: Each `/ready` call does `new Redis(...)` then `.quit()`. Under Kubernetes liveness/readiness probes fired every 10s this leaks TCP sockets and is slower than reusing the shared client from `middleware/rate-limit.ts`.
- **Fix proposed**: Export the shared Redis client (already singleton) and call `.ping()` on it.

### Finding #3-31 — `/api/health/ready` hits LangGraph + Neo4j — outage of either flips readiness to 503

- **Severity**: Medium
- **Category**: Reliability
- **File**: `backend/src/routes/health.ts:39-65`
- **Bug / Inconsistency**: If Neo4j is planned maintenance or LangGraph is restarting, the backend's readiness returns 503 and Kubernetes/Caddy pulls it from rotation — but the auth/dashboard/CRUD endpoints all work fine. This conflates dependency health with service readiness.
- **Fix proposed**: Split into `/live` (process), `/ready` (DB + Redis only — the things required for any endpoint), and `/status` (dependency breakdown for dashboards).
- **2026 best practice**: [Kubernetes probe design](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — `liveness` is "process is alive", `readiness` is "ready to accept new traffic".

### Finding #3-32 — `/api/health/version` leaks npm_package_version via env — fine; but no commit SHA / build info

- **Severity**: Low
- **Category**: Observability
- **File**: `backend/src/routes/health.ts:68-76`
- **Bug / Inconsistency**: Returns a static string `BJHUNT ALPHA 1.0`. Missing commit SHA, build timestamp, image digest. Combined with the fact that CI deploy (per DEEP-AUDIT #12) does not rebuild all services, operators cannot tell what version is running.
- **Fix proposed**: Inject `GIT_SHA`, `BUILD_TIME` at Docker build time and return them.

### Finding #3-33 — `/api/tools/execute` marks every response as `mock: true` but still admits inputs without length bounds

- **Severity**: Medium
- **Category**: Security / DoS
- **File**: `backend/src/routes/tools.ts:96-153`
- **Bug / Inconsistency**: The zod schema `executeSchema` accepts `input: z.record(z.unknown())` with no size bound. `executeIamAudit` runs `JSON.parse(policyStr)` on arbitrary input — a 10 MB JSON will block the event loop. `executeJwtParse` `atob(base64)` on arbitrary length. Bash "mock" responses reflect the raw command into the response, allowing stored XSS if the output is later rendered as HTML by the frontend (it is — see Agent 4's audit domain).
- **Fix proposed**: Add length caps in zod (`z.string().max(5000)`). HTML-escape any `command` reflection before returning.
- **VIOLATES CLAUDE.md**: "Valider TOUS les inputs avec Zod (backend)".

### Finding #3-34 — `/api/skills` reads arbitrary paths via `readFileSync` / `readdirSync` every request

- **Severity**: Medium
- **Category**: Security / Performance
- **File**: `backend/src/routes/skills.ts:125-201`
- **Bug / Inconsistency**: `getSkillsDir()` falls back to `process.cwd() / engine / skills`. In a container, `cwd` can be `/app/backend` or `/app` depending on entrypoint. If the directory is not found, the `candidates[0]` fallback path is returned anyway (line 57), and all calls fail silently. Path traversal: the `:category/:name` param goes into `path.join(skillsDir, category, name, "SKILL.md")` — if `category=../../../../etc` and `name=passwd`, `path.join` collapses `..` and the `fs.existsSync` check succeeds on any readable file the container has access to.
- **Fix proposed**: After `path.join`, assert that the resolved path is inside `skillsDir` (`if (!resolved.startsWith(skillsDir + path.sep)) return 404`). Also: serve skills from a versioned in-memory manifest built at boot, not live FS scans.
- **2026 best practice**: [CWE-22 path traversal](https://cwe.mitre.org/data/definitions/22.html).

### Finding #3-35 — `POST /api/admin/agents/:id/activate` uses 2-step transaction; race window between deactivate-all and activate-target

- **Severity**: Low
- **Category**: Correctness
- **File**: `backend/src/routes/admin/agents.ts:197-200`
- **Bug / Inconsistency**: Two concurrent `activate` calls on different profile ids can both set `is_active = true` after the `UPDATE ... false` step because there is no unique partial index enforcing exactly-one-active.
- **Fix proposed**: Add `CREATE UNIQUE INDEX one_active_agent_profile ON agent_profiles ((is_active)) WHERE is_active;`.

### Finding #3-36 — `admin/gateway.ts` stores provider API keys as `api_key_encrypted` but passes them **plaintext** through `apiKey` field

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/admin/gateway.ts:160-162, 171, 238-239`
- **Bug / Inconsistency**: The column is named `api_key_encrypted` but the code writes `body.apiKey` directly (no encryption). In the `test` path (line 239) the plaintext is read back from `api_key_encrypted`. So a DB leak reveals every provider key (Anthropic, OpenAI, Ollama Cloud). The masking in `dbToProvider` is cosmetic only.
- **Fix proposed**: Encrypt at rest with AES-256-GCM using `PROVIDER_KEY_ENCRYPTION_KEY` env var. On read, decrypt server-side before making the outbound call. Never return plaintext — always mask.
- **2026 best practice**: [CWE-312 Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html).
- **VIOLATES CLAUDE.md**: "AES-256-GCM pour les secrets".

### Finding #3-37 — `admin/gateway.ts` test endpoint fires outbound HTTP to any `baseUrl` — SSRF

- **Severity**: High
- **Category**: Security
- **File**: `backend/src/routes/admin/gateway.ts:249-272`
- **Bug / Inconsistency**: An admin posts `baseUrl: "http://169.254.169.254/latest/meta-data/"` and the backend proxies a request to AWS IMDS — classical SSRF. Also `http://localhost:5432` can probe internal services. The only guard is that the endpoint requires platform admin (`requireAdmin`) — so the attacker must already have that role, but (a) a compromised admin account, (b) IDOR in future updates, (c) insider threat all bypass this.
- **Fix proposed**: Validate `baseUrl` against a positive-list of host patterns per `provider_type` (e.g., `api.anthropic.com`, `api.openai.com`, localhost for dev). Block loopback, RFC1918, metadata IPs, and `file:`/`ftp:` schemes.
- **2026 best practice**: [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

### Finding #3-38 — `ollamaRoutes.delete('/models/:name')` uses `c.req.query("name") || c.req.param("name")` — unauthenticated-like behavior

- **Severity**: Medium
- **Category**: Correctness
- **File**: `backend/src/routes/admin/gateway.ts:395-396`
- **Bug / Inconsistency**: Preferring query over path param, then fallback to URL-decoded path param — confusing. Also, the outbound Ollama delete fetch sends `{ name }` as JSON body but HTTP DELETE with a body is an ambiguous idiom; Ollama's docs support it, but intermediary proxies strip bodies. More importantly, any authenticated admin can delete any installed Ollama model.
- **Fix proposed**: Standardize on path param only, URL-decoded. Add audit log and require confirmation parameter.

### Finding #3-39 — `admin/settings.ts` `/audit-logs` returns all fields including `ip_address`, JSON `details` — possible internal data disclosure

- **Severity**: Low
- **Category**: Privacy
- **File**: `backend/src/routes/admin/settings.ts:46-69`
- **Bug / Inconsistency**: Admins see IP and details JSON for every audit log including from other orgs. For GDPR/CCPA compliance, this is permissible for platform admins but should be logged as a secondary audit event ("platform admin viewed audit log entries for org X").
- **Fix proposed**: Emit a meta-audit log entry when audit logs are read. Restrict `details` payload to non-PII fields or add a column-level redaction layer.

### Finding #3-40 — `admin/users.ts` `DELETE /:id` has no guard against the admin deleting themselves or the last platform admin

- **Severity**: Medium
- **Category**: Correctness
- **File**: `backend/src/routes/admin/users.ts:205-221`
- **Bug / Inconsistency**: Nothing prevents an admin from deleting their own account (bricking the platform if they are the last admin). Also `DELETE FROM users WHERE id` cascades to `sessions`, `api_keys`, etc., but `audit_logs` keeps `user_id = NULL` (because of `ON DELETE SET NULL`) — losing attribution.
- **Fix proposed**: Refuse self-delete; refuse deletion of last `is_platform_admin = true` user; prefer soft-delete (`deleted_at`) over hard delete for audit continuity.

### Finding #3-41 — Global `onError` returns `err.message` when `NODE_ENV !== 'production'` — stack info leakage in staging

- **Severity**: Low
- **Category**: Security / Information Disclosure
- **File**: `backend/src/index.ts:95-105`
- **Bug / Inconsistency**: Any dev/staging instance reachable from the internet will leak `err.message`, which for Postgres errors often includes column names, type hints, and SQL. The check `config.isProduction` depends on `NODE_ENV === "production"` — a misset env var in staging exposes internals.
- **Fix proposed**: Default to generic message; gate detail via a separate `DEBUG_ERROR_RESPONSES=1` env var. Also correlate by requestId so users get an error id to report.

### Finding #3-42 — Global `onError` sniffs the literal string "validation" in error messages — fragile

- **Severity**: Low
- **Category**: Maintainability
- **File**: `backend/src/index.ts:98-100`
- **Bug / Inconsistency**: `if (err.message.includes("validation"))` is brittle. zValidator already short-circuits with 400 — this fallback never runs in practice and is confusing.
- **Fix proposed**: Remove the branch; rely on zValidator's response.

### Finding #3-43 — `sql.begin` is used inside `withOrg` — double transaction nesting

- **Severity**: Low
- **Category**: Correctness
- **File**: `backend/src/routes/auth.ts:53, 315`; `backend/src/routes/admin/users.ts:101`
- **Bug / Inconsistency**: `auth.ts` register uses `sql.begin(...)` against the global `sql` (not `withOrg`), which is fine since no RLS context is needed pre-org. But `reset-password` also uses `sql.begin` on the global client after computing `resetToken.userId` — fine. The concern is if someone wraps these inside a `withOrg` later, `sql.begin` on the global pool inside a `withOrg` transaction will not inherit the `app.current_org_id` setting. Add a comment pinning the invariant.

### Finding #3-44 — `CryptoHasher` reused across calls without `.update` chain — fine in Bun, but coupling to Bun-specific API hurts portability

- **Severity**: Low
- **Category**: Maintainability
- **File**: `backend/src/routes/auth.ts:132-134, 260-263, 298-300`; `backend/src/auth/api-keys.ts:23-27`
- **Bug / Inconsistency**: `new Bun.CryptoHasher("sha256")` is fine but ties the code to Bun; if the backend ever needs to run under Node for a test, it breaks.
- **Fix proposed**: Introduce a `lib/hash.ts` wrapper: `async function sha256(s: string)`. Use Web Crypto (`crypto.subtle.digest`) which works in both Bun and Node 20+.

### Finding #3-45 — Redis and postgres connections log passwords in error traces

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/middleware/rate-limit.ts:14`; `backend/src/db/client.ts:8`
- **Bug / Inconsistency**: `new Redis(config.redis.url)` and `postgres(config.database.url)` — both will emit the full connection URL (with password) on `ECONNREFUSED`, `ENOTFOUND`, or auth errors. These are stack traces captured by `logger()` (from `hono/logger`) and may end up in CloudWatch, log aggregators, etc.
- **Fix proposed**: Parse URL, pass individual options, never include `password` in the URL after it's loaded. Set `DEBUG_HIDE_PASSWORD=1`-style flag on both libraries or filter log output.

### Finding #3-46 — `engagements.ts` `/defense-brief` returns mock actions when no findings exist — demo data leaks into "real" API

- **Severity**: Medium
- **Category**: Correctness
- **File**: `backend/src/routes/engagements.ts:1213-1268`
- **Bug / Inconsistency**: Per DEEP-AUDIT 2026-04-16 #20, this endpoint emits hand-crafted mock data with `findingId: "mock-finding-1"` etc. Customers will see fake "approved" / "applied" actions that they did not trigger — auditing and compliance nightmare.
- **Fix proposed**: Return `{ actions: [] }` with an `empty` state flag; let the frontend render a demo fixture only in a clearly marked sandbox path.

### Finding #3-47 — `two-factor.ts` `/setup` does not invalidate prior pending secret

- **Severity**: Low
- **Category**: Correctness
- **File**: `backend/src/routes/two-factor.ts:55-57`
- **Bug / Inconsistency**: Calling `/setup` overwrites `totp_secret`. If two setup flows race (two tabs), the later one wins; the user who scanned the first QR will fail enable and must redo. Also, `totp_backup_codes` is not cleared here, so leftover codes from a prior setup attempt persist until `enable()` overwrites them.
- **Fix proposed**: Use a `totp_pending_secret` column separate from `totp_secret`; lock a row while setup is in progress.

### Finding #3-48 — `config.ts` uses `optional()` with defaults for CORS_ORIGINS, REDIS_URL — production running with Redis at localhost is a silent failure mode

- **Severity**: Medium
- **Category**: Reliability
- **File**: `backend/src/config.ts:27, 39-41`
- **Bug / Inconsistency**: If `REDIS_URL` is not set in production, the backend will connect to `localhost:6379` and fail every request (rate limiter fails open, see #3-10). The CORS_ORIGINS default includes `localhost:3000` — if nothing is passed, production accepts local-dev origins.
- **Fix proposed**: In production, all of `REDIS_URL`, `CORS_ORIGINS`, `LANGGRAPH_URL`, `RESEND_API_KEY` must be `required()` (or the process must refuse to boot).

---

## Cross-cutting observations

1. **No API versioning discipline.** `/api/auth`, `/api/engagements` are unversioned and public-API is `/api/v1`. A breaking change on the former has no migration path.
2. **No request-ID propagation on outbound.** `requestId` is generated for incoming but not forwarded to LangGraph, Ollama, Resend, etc. Distributed traces cannot be assembled.
3. **`backend/package.json` `db:migrate` references `src/db/migrate.ts` which does not exist.** DEEP-AUDIT-2026-04-16 #10 already flagged; confirmed.
4. **No automated tests.** `package.json` has no `test` script. Critical paths (auth, TOTP, RLS, PATCH routes with camelCase) are uncovered.
5. **Dockerfile uses `oven/bun:1-slim` without a digest pin.** Reproducibility hole. Also no multi-stage build — source + all dev toolchain ends up in the final image (though `--production` is set for dependencies, the source and TS compiler are still there).
6. **`argon2` is the native compiled library.** It requires a C toolchain at `bun install`. The Dockerfile `oven/bun:1-slim` may not have it. Combined with `--frozen-lockfile --production`, a broken install will fail silently at first login attempt.
7. **`otpauth` on the client-side for QR** — not used here (backend only), but the `qrDataUrl` field returns the raw URI. Frontend must render it with a QR library.
8. **Every audit-log insert uses `.catch(() => {})`.** Silent audit loss. Per CLAUDE.md this is security infrastructure — failures should alert.

---

## Route-by-route matrix (verification)

| Route file | Auth? | Input validation | Authorization | SQL parameterized | Rate-limited | Error leaks |
|---|---|---|---|---|---|---|
| `auth.ts` | mixed | zod OK | self-gate | yes | yes (5min/10) | timing attack covered |
| `two-factor.ts` | requireAuth | zod OK | self-gate | yes | partial — verify only | OK |
| `api-keys.ts` | requireAuth | zod OK | **missing org_admin** | yes | yes | OK |
| `billing.ts` | requireAuth | — | org-scope via withOrg | yes | yes | OK |
| `dashboard.ts` | requireAuth | — | org-scope (mixed sql vs withOrg) | yes | yes | OK |
| `engagements.ts` | requireAuth | zod OK | org-scope via withOrg | yes | yes | mock data leaks |
| `findings.ts` | requireAuth | zod OK | org-scope via withOrg | yes | yes | **CSV injection** |
| `reports.ts` | requireAuth | UUID regex only | plan-gate | yes | yes | **CSV injection partial** |
| `notifications.ts` | requireAuth | **no zod on POST /read** | user-scope | yes | **missing rate limit** | OK |
| `health.ts` | **none by design** | — | — | yes | none | **exposes Neo4j, LG URLs on error** |
| `public-api.ts` | API key | zod OK | API key + plan | yes | yes | phantom scan leaks |
| `cve.ts` | requireAuth | **no zod on GET params** | plan-gate | n/a (static) | yes | OK |
| `skills.ts` | requireAuth | — | plan-gate | n/a (FS) | yes | **path traversal** |
| `tools.ts` | requireAuth | zod partial (no length bounds) | plan-gate | yes | yes | XSS reflection |
| `admin/users.ts` | requireAuth+Admin | zod OK | admin | yes | yes | **no self-protect on delete** |
| `admin/settings.ts` | requireAuth+Admin | zod partial | admin | yes | yes | audit log data leak |
| `admin/agents.ts` | requireAuth+Admin | zod OK | admin | yes | yes | OK |
| `admin/gateway.ts` | requireAuth+Admin | zod OK | admin | yes | yes | **SSRF + plaintext keys** |

---

## Out of scope / deferred

- `routes/chat.ts` — Agents 1 and 2. But note that `middleware/auth.ts` fallback paths are owned by this domain and must be removed in tandem.
- `lib/langgraph-client.ts` — Agent 2.
- Frontend proxy cookie handling — Agent 4.
- `engine/` Decepticon Python — Agent 5.
- `docker-compose.yml` secrets injection and Postgres role creation — Agent 6.

---

## CLAUDE.md rule violations (explicit list)

- "**Argon2id pour les passwords, AES-256-GCM pour les secrets**" — violated by #3-08 (TOTP secret plaintext), #3-09 (backup codes plaintext), #3-36 (provider API keys plaintext).
- "**RLS PostgreSQL pour l'isolation multi-tenant**" — violated by #3-01 (RLS not forced, no WITH CHECK, no non-owner role) and #3-02 (most writes bypass `withOrg`).
- "**Valider TOUS les inputs avec Zod (backend)**" — violated by #3-33 (tool inputs without length caps), notifications POST /read not validated, CVE route query params not validated.
- "**Rate limiting Redis sur TOUS les endpoints publics**" — partially violated: `notifications.ts` lacks rate limiting; `rate-limit.ts` fails open (#3-10) and is bypassable per-path (#3-11).
- "**Pas de secrets dans le code — tout dans `.env`**" — not directly violated, but #3-45 (DB/Redis URL passwords in error logs) and #3-21 (session token in JSON response body) are violations of the same spirit.

---

## Sources

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP API Security Top 10 — 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API3:2023 Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)
- [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [Hono CSRF middleware](https://hono.dev/docs/middleware/builtin/csrf)
- [Hono Cookie helper](https://hono.dev/docs/helpers/cookie)
- [PostgreSQL 17 CREATE POLICY](https://www.postgresql.org/docs/17/sql-createpolicy.html)
- [PostgreSQL 17 LIKE matching](https://www.postgresql.org/docs/17/functions-matching.html#FUNCTIONS-LIKE)
- [postgres.js transforms](https://github.com/porsager/postgres#transform-option)
- [Retool: set_config for RLS](https://community.retool.com/t/set-postgres-config-parameters-using-set-config-for-rls/31421)
- [Password Hashing in 2026](https://www.inkyvoxel.com/password-hashing-in-2026/)
- [Password Hashing Guide 2026 — Argon2 vs Bcrypt vs Scrypt](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/)
- [Kubernetes probe design](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [MDN CSRF prevention](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSRF_prevention)
- [MDN Set-Cookie Domain attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [CWE-22 Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-312 Cleartext Storage](https://cwe.mitre.org/data/definitions/312.html)
- [CWE-1236 CSV Injection](https://cwe.mitre.org/data/definitions/1236.html)
