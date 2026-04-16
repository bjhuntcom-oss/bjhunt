# Design: Deep Audit Fixes — All 26 Findings + Addendum

**Date**: 2026-04-16
**Source**: `docs/DEEP-AUDIT-2026-04-16.md`
**Scope**: 26 original findings + 11 background-agent findings
**Constraint**: No Vercel Pro — stay on Hobby plan

---

## SP3 — Chat Streaming (P0)

**Findings addressed**: #5, #7, #8, #17, #18, addendum (cancel race, stop=error, history race)

### Architecture: Signed Stream Ticket

**Problem**: Vercel Hobby plan caps serverless functions at 10s. LangGraph runs take 10-50s. Cross-origin direct SSE is blocked by cached CORS preflights and SameSite=Lax cookies.

**Solution**: Two-phase flow — short REST call through proxy, then direct SSE with a signed ticket.

#### Phase 1: Prepare (via Vercel proxy, <1s)

```
POST /api/proxy/chat/prepare
Body: { message, engagementId, conversationId?, agentGraph? }
```

Backend handler:
1. Authenticate via HttpOnly cookie (same-origin proxy forwards it)
2. Sanitize message, create/reuse conversation, save user message to DB
3. Create LangGraph thread if needed, start the run
4. Sign a JWT ticket: `{ sessionId, orgId, conversationId, runId, exp: now+120s }`
5. Return `{ streamUrl, ticket, conversationId, runId }`

#### Phase 2: Stream (direct to backend, no timeout)

```
GET https://api.bjhunt.com/api/chat/stream/{runId}?ticket=<JWT>
```

- GET request with query param only — no preflight CORS (simple request)
- Backend verifies JWT, pipes LangGraph SSE to client
- Caddy `flush_interval -1` ensures no buffering
- `chat.bjhunt.com` Caddy entry added as alias for stream endpoint

#### Protocol simplification

Stop re-normalizing events. Backend passes LangGraph events with a thin wrapper:

```
event: values
data: {"messages": [...], "metadata": {...}}

event: custom  
data: {"type": "subagent_start", "data": {...}}

event: heartbeat
data: {}

event: done
data: {"tokensIn": 150, "tokensOut": 420}

event: error
data: {"message": "...", "code": "..."}
```

Frontend parser handles these 5 event types directly. No intermediate normalization layer.

#### Race condition fixes

- Each stream request gets a monotonic `requestId` ref. If conversation switches, the old `requestId` is stale and events are dropped.
- `abortRef.current?.abort()` called on every conversation switch BEFORE loading new history.
- Stop button sets a `userAborted` flag so the finally block does NOT show the empty-response error.

### Files changed

- `backend/src/routes/chat.ts` — new `/prepare` endpoint, refactored `/stream/{runId}` as GET
- `backend/src/lib/stream-ticket.ts` — new: JWT sign/verify for stream tickets
- `app/[locale]/dashboard/chat/page.tsx` — two-phase flow, simplified parser, race guards
- `app/api/proxy/[...path]/route.ts` — no SSE handling needed (prepare is fast REST)
- `ops/Caddyfile` — add `chat.bjhunt.com` entry

---

## SP2 — Auth/Session (P0)

**Findings addressed**: #3, #4, #6, addendum (password reset, TOTP login, 2FA panel, API keys)

### Changes

1. **Delete `bjhunt_stream_token` cookie** from `app/actions/auth.ts` — ticket system replaces it
2. **Delete auth fallbacks** from `backend/src/middleware/auth.ts` — remove `Bearer session:` and `?token=` paths. Only: HttpOnly cookie (same-origin) + JWT ticket (stream)
3. **Fix cookie secure flag**: `secure: process.env.NODE_ENV === 'production'` in `app/actions/auth.ts`
4. **Fix logout cookie clearing**: `app/api/proxy/[...path]/route.ts` must forward ALL `Set-Cookie` headers (currently only forwards the first one)
5. **Password reset revokes sessions**: add `DELETE FROM sessions WHERE user_id = ${userId}` in `backend/src/routes/auth.ts` after password change/reset
6. **2FA login flow**: 
   - Backend returns `{ requiresTwoFactor: true, tempToken }` on login
   - Frontend shows TOTP input step
   - Frontend sends `POST /api/auth/2fa/verify` with `{ tempToken, code }`
   - Backend verifies and returns full session
7. **2FA panel fix**: backend `/api/auth/me` returns `totpEnabled: boolean` from DB
8. **API key org-admin gate**: add `requireRole("org_admin")` middleware to POST/DELETE `/api/keys`

### Files changed

- `app/actions/auth.ts` — remove stream_token cookie, fix secure flag
- `backend/src/middleware/auth.ts` — remove fallback auth paths, add ticket verification
- `backend/src/routes/auth.ts` — revoke sessions on password change, return totpEnabled in /me
- `backend/src/routes/api-keys.ts` — add org_admin role check
- `app/api/proxy/[...path]/route.ts` — forward all Set-Cookie headers
- `app/[locale]/login/page.tsx` — handle requiresTwoFactor step

---

## SP4 — Multi-tenant RLS (P0)

**Findings addressed**: #2, addendum (chat history permissive, findings schema)

### Changes

1. **Force RLS** on all tenant tables:
   ```sql
   ALTER TABLE engagements FORCE ROW LEVEL SECURITY;
   ALTER TABLE findings FORCE ROW LEVEL SECURITY;
   ALTER TABLE chat_conversations FORCE ROW LEVEL SECURITY;
   ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;
   ALTER TABLE file_uploads FORCE ROW LEVEL SECURITY;
   ALTER TABLE agent_runs FORCE ROW LEVEL SECURITY;
   ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
   ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
   ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
   ```

2. **Add WITH CHECK** to all existing policies (prevents writes to wrong org)

3. **Create dedicated DB role** `bjhunt_app` that is NOT the table owner, so RLS applies:
   ```sql
   CREATE ROLE bjhunt_app LOGIN PASSWORD '...';
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO bjhunt_app;
   ```
   Backend connects as `bjhunt_app`, not as the owner role.

4. **Audit all `sql` usage**: grep for raw `sql` calls outside `withOrg()` in route files. Replace with `withOrg()` or verify the query is org-scoped.

5. **Chat history**: add `AND user_id = ${user.id}` filter to conversation listing endpoints

### Files changed

- `backend/src/db/schema.sql` — RLS force + WITH CHECK policies + app role
- `backend/src/db/client.ts` — connect as `bjhunt_app` role
- `backend/src/routes/chat.ts` — user_id filter on conversation queries
- All route files — audit and fix raw `sql` usage

---

## SP1 — Infra/Docker (P0-P2)

**Findings addressed**: #1, #9, #16, #21, #23, #24

### Changes

1. **Remove Docker socket mount** from `langgraph` in both compose files. The engine uses `docker_sandbox.py` which needs Docker access — use Docker-over-TCP with TLS instead of socket mount:
   ```yaml
   environment:
     - DOCKER_HOST=tcp://host.docker.internal:2376
     - DOCKER_TLS_VERIFY=1
   ```
   Or: create a dedicated Docker proxy container with limited permissions.

2. **SafeCommand bypass fix**: in `safe_command.py`, inspect `is_input=True` payloads for dangerous patterns too (at minimum: `rm -rf`, `dd`, shell metacharacters)

3. **Neo4j network isolation**: remove `bjhunt-sandbox-net` from Neo4j, keep only `bjhunt-net`

4. **LangGraph Dockerfile**: pin `uv` to specific version tag, change `langgraph dev` to `langgraph up`

5. **install.sh cleanup**: rebrand references, remove `curl | bash` pattern, document manual install

### Files changed

- `docker-compose.yml` — remove socket mount, fix Neo4j networks
- `engine/docker-compose.yml` — same
- `engine/decepticon/middleware/safe_command.py` — inspect input payloads
- `engine/containers/langgraph.Dockerfile` — pin uv, use `up`
- `engine/scripts/install.sh` — rebrand + security

---

## SP5 — CI/CD + Scripts (P1)

**Findings addressed**: #10, #11, #12, #13, #26, addendum (CSV injection, camelCase)

### Changes

1. **Root package.json scripts**:
   - `lint`: `next lint` (ensure it works or switch to `eslint .`)
   - `typecheck`: `tsc --noEmit` (delete reference to missing script)

2. **Backend scripts**: install `@biomejs/biome` or replace with `tsc --noEmit` only

3. **CI workflow** (`ci.yml`):
   - Remove all `|| true` swallowing
   - Add backend lint + typecheck step
   - Add Python lint step that fails on error
   - Pin Python dependency install with lockfile check

4. **Deploy workflow** (`deploy-vps.yml`):
   - `docker compose up -d --build` (rebuilds ALL changed services)
   - Restart Caddy if Caddyfile changed
   - Health check after deploy

5. **Update deps**: `next` to latest, `next-intl` to latest

6. **CSV injection**: prefix cells starting with `=`, `+`, `-`, `@` with `'` in reports.ts and findings.ts export

7. **camelCase fix**: audit PATCH routes in engagements.ts and admin/users.ts — use snake_case keys matching DB columns

8. **Next.js middleware.ts**: evaluate proxy.ts migration (may defer if breaking)

### Files changed

- `package.json` — fix scripts
- `backend/package.json` — fix scripts, add biome
- `.github/workflows/ci.yml` — real failure enforcement
- `.github/workflows/deploy-vps.yml` — full rebuild
- `backend/src/routes/reports.ts` — CSV injection fix
- `backend/src/routes/findings.ts` — CSV injection fix
- `backend/src/routes/engagements.ts` — camelCase fix
- `backend/src/routes/admin/users.ts` — camelCase fix

---

## SP6 — CORS/CSRF/Cleanup (P1-P2)

**Findings addressed**: #14, #15, #20, #22, #25, addendum (message actions)

### Changes

1. **Unified origin whitelist**: single `ALLOWED_ORIGINS` array used by CORS, CSRF, and SSE response headers. No more origin reflection.

2. **Rate limit fail-closed**: if Redis is down, return `503 Service Unavailable` instead of letting requests through

3. **Remove mock/demo fallbacks** from production routes:
   - engagements.ts: remove `generateDefaultObjectives()` fallback
   - engagements.ts: remove mock defense actions generator
   - tools.ts: clearly mark all responses as `mock: true` (already done)

4. **Neo4j health endpoint**: strip URI/user/database from response — return only `{ status: "ok" | "error" }`

5. **In-memory rate limit on public routes**: add a comment documenting the limitation, or migrate to a shared store

6. **Message actions**: either wire `onRegenerate` (re-send last message), `onFeedback` (POST to audit_logs), or remove the buttons from MessageBubble

### Files changed

- `backend/src/middleware/cors.ts` + `csrf.ts` — shared origins
- `backend/src/middleware/rate-limit.ts` — fail-closed
- `backend/src/routes/engagements.ts` — remove mock fallbacks
- `engine/decepticon/tools/research/health.py` — strip Neo4j metadata
- `app/[locale]/dashboard/chat/page.tsx` — wire or remove message action callbacks

---

## Implementation Order

1. **SP3** (chat streaming ticket) — unblocks the product
2. **SP2** (auth cleanup) — security critical, tied to SP3
3. **SP4** (RLS) — data isolation
4. **SP5** (CI/CD) — pipeline trust
5. **SP1** (infra) — container security
6. **SP6** (cleanup) — polish

---

## Success Criteria

- Chat works end-to-end on Vercel Hobby plan (no timeout)
- No JS-readable session tokens
- All tenant data isolated via enforced RLS
- CI fails on real lint/typecheck/test errors
- Deploy workflow rebuilds all changed services
- No mock data in production routes without explicit flag
- Zero `|| true` in CI
