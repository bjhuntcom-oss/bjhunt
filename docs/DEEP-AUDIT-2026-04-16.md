# BJHUNT Deep Audit

Date: 2026-04-16
Repo: `D:\bjhunt-v2`
Scope: frontend Next.js, backend Hono+Bun, engine Decepticon/Python, Docker/infra, CI/CD, chat SSE, auth/session, multi-tenant isolation

## Executive Summary

The repo is not production-safe yet.

The two most serious security problems are:

1. `langgraph` can reach the host Docker daemon through the mounted Docker socket.
2. The database isolation story is not trustworthy yet: RLS is only partially defined, not forced, and runtime queries often use the global SQL client outside the tenant wrapper.

The main chat reliability blockers are:

1. The chat stream still passes through a Next.js proxy route with a hard duration cap.
2. Auth/session handling duplicates the session token into a JS-readable cookie and also accepts session tokens in query/header fallbacks.
3. The streaming pipeline is too custom and brittle: LangGraph state snapshots -> backend SSE normalization -> frontend custom parser.

The delivery pipeline is also not trustworthy yet:

1. Root lint/typecheck scripts are broken.
2. Backend lint/typecheck are not green.
3. CI intentionally ignores important failures.
4. VPS deploy does not actually rebuild and redeploy the whole stack.

## Validation Performed

Commands run locally during the audit:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm audit --json`
- `npm outdated --json`
- `bun run lint` in `backend/`
- `bun run typecheck` in `backend/`
- `bun outdated --json` in `backend/`
- direct source inspection across `app/`, `backend/`, `engine/`, `ops/`, `.github/workflows/`

Observed runtime/tooling results:

- `npm run build` passes on Next.js `16.1.3`, but emits the Next warning that `middleware.ts` is deprecated in favor of `proxy.ts`.
- `npm run lint` fails because the root script still uses `next lint`.
- `npm run typecheck` fails because `scripts/run-root-typecheck.mjs` does not exist.
- `bun run lint` fails because `biome` is not installed.
- `bun run typecheck` fails with real backend TypeScript errors.
- `npm audit` reports vulnerable `next` and `next-intl` versions.
- `engine/uv.lock` is missing.
- `uv` and `pytest` are not available locally, so the Python test path is not reproducible from this workstation as-is.

## Findings

### Critical

#### 1. Docker socket mounted into the engine

- Root compose: [docker-compose.yml](../docker-compose.yml)
  - lines 177-196
- Engine compose: [engine/docker-compose.yml](../engine/docker-compose.yml)
  - lines 122-141

`langgraph` mounts `/var/run/docker.sock` read-only, but read-only access to the Docker socket is still host-daemon access. Any compromise of the engine container can inspect or manage sibling containers and extract environment secrets.

Impact:

- container breakout path
- secret exposure
- collapse of the sandbox trust boundary

#### 2. Tenant isolation is not trustworthy yet

- DB client: [backend/src/db/client.ts](../backend/src/db/client.ts)
  - lines 8-27
- Schema: [backend/src/db/schema.sql](../backend/src/db/schema.sql)
  - lines 320-364
- Root compose Postgres runtime user: [docker-compose.yml](../docker-compose.yml)
  - lines 43-52

RLS is enabled on some tables, but:

- it is not forced
- policies only use `USING`, not `WITH CHECK`
- several sensitive tables are not covered
- many runtime queries still use the global `sql` client rather than `withOrg(...)`

I infer that org isolation is not robust enough to treat as production-grade multi-tenant security.

### High

#### 3. Session token is duplicated into JS-readable state

- Cookie setting: [app/actions/auth.ts](../app/actions/auth.ts)
  - lines 33-52
  - lines 75-92
- Logout only clears one cookie: [app/actions/auth.ts](../app/actions/auth.ts)
  - line 115
- Backend auth fallback: [backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts)
  - lines 38-50

The same session ID is stored in:

- `bjhunt_session` as `HttpOnly`
- `bjhunt_stream_token` as non-`HttpOnly`

The backend also accepts session tokens via:

- `Authorization: Bearer session:...`
- `?token=...`

Impact:

- much larger XSS blast radius
- token leakage into logs, history, or referrers
- logout mismatch because the non-`HttpOnly` token cookie is not cleared by the server action

#### 4. Auth cookies are forced `secure: true`

- [app/actions/auth.ts](../app/actions/auth.ts)
  - lines 36-43
  - lines 77-84

This breaks authentication outside HTTPS, especially:

- localhost
- previews
- non-final staging hosts

That makes local and preview chat/auth behavior diverge from production.

#### 5. Main chat stream still goes through a capped Next.js proxy

- Chat page: [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
  - lines 558-568
- Proxy route: [app/api/proxy/[...path]/route.ts](../app/api/proxy/%5B...path%5D/route.ts)
  - lines 4-5
  - lines 44-55

The comments already admit the issue, but the implementation still routes long SSE traffic through the Next proxy layer.

Impact:

- tool-heavy runs can be cut mid-stream
- chat may "start working" then fail under real workloads
- deployment behavior depends on hosting/runtime limits instead of the backend contract

#### 6. Logout is broken through the browser proxy path

- Frontend logout call: [components/dashboard/dashboard-shell.tsx](../components/dashboard/dashboard-shell.tsx)
  - lines 237-246
- Proxy drops cookie clearing: [app/api/proxy/[...path]/route.ts](../app/api/proxy/%5B...path%5D/route.ts)
  - lines 65-67
- Backend tries to clear session: [backend/src/routes/auth.ts](../backend/src/routes/auth.ts)
  - lines 178-187

The browser path to logout does not reliably propagate the backend cookie clearing behavior. Users can be redirected to login while residual cookies still exist.

#### 7. Chat stream protocol is too custom and brittle

- LangGraph client: [backend/src/lib/langgraph-client.ts](../backend/src/lib/langgraph-client.ts)
  - lines 86-123
- Backend normalization layer: [backend/src/routes/chat.ts](../backend/src/routes/chat.ts)
  - lines 170-440
- Frontend parser: [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
  - lines 670-760
- Engine streaming mode: [engine/decepticon/core/subagent_streaming.py](../engine/decepticon/core/subagent_streaming.py)
  - lines 316-332

Current chain:

- LangGraph streams `values` and `custom`
- backend converts that into custom SSE events
- frontend parses that custom event contract manually

This works only while all three layers stay perfectly aligned. It is hard to evolve safely and does not represent a clean 2026 chat streaming design.

#### 8. Stream cancellation is not wired cleanly on conversation changes

- [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
  - thread-switch/reset logic around lines 345 and 412
  - abort creation at line 542

Conversation changes clear parts of UI state, but in-flight stream lifecycle is not consistently aborted first. That can leak old stream updates into the wrong thread state.

#### 9. `SafeCommandMiddleware` can be bypassed with interactive input

- Middleware skip: [engine/decepticon/middleware/safe_command.py](../engine/decepticon/middleware/safe_command.py)
  - lines 313-329
- Bash tool forwards input: [engine/decepticon/tools/bash/bash.py](../engine/decepticon/tools/bash/bash.py)
  - lines 229-234
- Tmux execution path: [engine/decepticon/backends/docker_sandbox.py](../engine/decepticon/backends/docker_sandbox.py)
  - lines 243-250

If `is_input=True`, the guard does not inspect the payload, but the payload is still sent into tmux. That is a real bypass path.

#### 10. Root scripts and backend scripts are broken

- Root scripts: [package.json](../package.json)
  - lines 5-11
- Backend scripts: [backend/package.json](../backend/package.json)
  - lines 6-11

Problems confirmed:

- root `lint` still uses `next lint`
- root `typecheck` points to a missing file
- backend `lint` depends on missing `biome`
- backend `db:migrate` points to `src/db/migrate.ts`, which does not exist

#### 11. CI does not enforce quality gates

- [ci.yml](../.github/workflows/ci.yml)
  - lines 27-31
  - lines 83-95

Problems:

- lint failures are swallowed with `|| true`
- backend checks are missing
- Python lint path is non-blocking
- Python dependency install is not reproducible if no lockfile exists

#### 12. VPS deploy workflow does not redeploy the whole stack

- [deploy-vps.yml](../.github/workflows/deploy-vps.yml)
  - lines 35-45

It only rebuilds `backend` and restarts `langgraph`.

Impact:

- engine code changes may never be rebuilt
- Caddy or compose changes may not roll out
- deployment behavior diverges from what the workflow name suggests

#### 13. Frontend dependencies are behind on known fixes

- [package.json](../package.json)
  - lines 29-33

Observed during audit:

- `next` installed as `16.1.3`, outdated to `16.2.4`
- `next-intl` installed as `4.7.0`, outdated to `4.9.1`
- `npm audit` currently flags both chains

### Medium

#### 14. CSRF, CORS, and auth trust rules are inconsistent

- CSRF: [backend/src/middleware/csrf.ts](../backend/src/middleware/csrf.ts)
  - lines 36-47
- CORS: [backend/src/middleware/cors.ts](../backend/src/middleware/cors.ts)
  - lines 11-30
- SSE CORS headers: [backend/src/routes/chat.ts](../backend/src/routes/chat.ts)
  - lines 501-514

Problems:

- missing `Origin` + cookie is treated as trustworthy
- CSRF and CORS origin policies drift
- SSE response reflects request origin directly

#### 15. Rate limiting fails open

- [backend/src/middleware/rate-limit.ts](../backend/src/middleware/rate-limit.ts)
  - lines 34-48

If Redis is unavailable, throttling disappears entirely.

#### 16. Sandbox/network isolation drifts from the documented target model

- Root compose networks: [docker-compose.yml](../docker-compose.yml)
  - lines 139-141
  - lines 157-158
  - lines 255-259

`neo4j` is dual-homed across management and sandbox networks, and the overall boundary is looser than the architecture described in `AGENTS.md`.

#### 17. `chat.bjhunt.com` is missing from Caddy

- [ops/Caddyfile](../ops/Caddyfile)
  - lines 1-16

The documented direct chat entrypoint is absent. Today the config exposes only `api.bjhunt.com` plus a port 80 health responder.

#### 18. Chat UI contains drift and no-op controls

- [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
  - request body around lines 546-556
- Agent/model settings state around line 147
- tool rendering around line 1382

Observed issues:

- some model/streaming controls do not affect the backend payload
- tool-call history is not anchored cleanly to each turn
- chat state file is large and heavily patched, with multiple "fix" comments

#### 19. Reports/findings routes do not typecheck and contain weak assumptions

- [backend/src/middleware/plan-gate.ts](../backend/src/middleware/plan-gate.ts)
  - line 121
- [backend/src/routes/findings.ts](../backend/src/routes/findings.ts)
  - line 44
- [backend/src/routes/reports.ts](../backend/src/routes/reports.ts)
  - lines 128-237

These are not cosmetic errors: the backend typecheck currently fails on them.

#### 20. Demo/mock behavior is mixed into "real" backend routes

- OPPLAN fallback: [backend/src/routes/engagements.ts](../backend/src/routes/engagements.ts)
  - lines 108-118
- Mock defensive actions: [backend/src/routes/engagements.ts](../backend/src/routes/engagements.ts)
  - lines 1212-1267

This can make the platform appear functional when the underlying orchestration is not actually producing data.

#### 21. Defender agent is pointed at the offensive sandbox

- [engine/decepticon/agents/defender.py](../engine/decepticon/agents/defender.py)
  - lines 61-83

The file itself documents that defense actions currently target the same sandbox container as offensive execution.

#### 22. Engine health tooling leaks internal Neo4j metadata

- [engine/decepticon/tools/research/health.py](../engine/decepticon/tools/research/health.py)
  - lines 19-23

The health payload exposes URI, user, and database details that do not need to leave the trusted control plane.

#### 23. Engine image/runtime is still dev-oriented

- [engine/containers/langgraph.Dockerfile](../engine/containers/langgraph.Dockerfile)
  - lines 15-16
  - line 33

Problems:

- pulls `uv:latest`
- runs `langgraph dev` in the container

That is not a production-hardened runtime setup.

#### 24. Installer path still carries supply-chain and branding drift

- [engine/scripts/install.sh](../engine/scripts/install.sh)
  - lines 3-7
  - lines 17-20
  - lines 130-145

It still documents `curl | bash`, points at the upstream Decepticon repo, and keeps legacy naming/paths.

#### 25. Public form endpoints still use in-memory rate limiting

- [app/api/beta/route.ts](../app/api/beta/route.ts)
  - lines 23-42
- [app/api/contact/route.ts](../app/api/contact/route.ts)
  - lines 23-42

This matches the repo notes: limits reset on restart and do not scale across instances.

#### 26. Next.js migration is incomplete

- Runtime warning confirmed by `npm run build`
- [middleware.ts](../middleware.ts)
  - lines 35-62

`middleware.ts` is still used, while current Next guidance is to move to `proxy.ts`. The app still builds, but the migration debt is now explicit.

## Chat And SSE Best Practices For 2026

Based on official platform docs and current implementation drift, the clean target architecture is:

1. one stable streaming protocol end-to-end
2. direct backend chat origin for long-running SSE
3. `HttpOnly` session cookies for browser auth when same-origin
4. short-lived signed stream tickets if cross-origin is truly required
5. backend-owned stream lifecycle
6. token deltas as the primary UX primitive
7. tool events, thinking events, and terminal events as explicit typed side channels
8. idempotent conversation/run IDs for retries and reconnection
9. heartbeat plus explicit `done` and `error`
10. zero reliance on query-string session tokens

For BJHUNT specifically, the recommended direction is:

- move the long-running stream to the VPS/backend boundary
- stop exposing session tokens to JS
- request native message-oriented streaming from LangGraph instead of mainly `values`
- keep the frontend parser as thin as possible

## Official References Consulted

- MDN SSE: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>
- MDN MessageEvent: <https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent>
- AI SDK `streamText`: <https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text>
- AI SDK `createDataStream`: <https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-data-stream>
- LangGraph Graph API and streaming: <https://docs.langchain.com/oss/python/langgraph/use-graph-api>
- Next.js install/migration notes: <https://nextjs.org/docs/pages/getting-started/installation>
- Next.js middleware -> proxy migration note: <https://nextjs.org/docs/messages/middleware-to-proxy>

## Recommended Next Steps

### P0

- remove Docker socket access from `langgraph`
- fix session architecture so browser chat does not require JS-readable session tokens
- move long-running chat streaming off the Next proxy bottleneck
- lock down multi-tenant isolation and rework DB access around enforced tenant boundaries

### P1

- make all lint/typecheck scripts real and green
- make CI fail on real failures
- make deploy rebuild the actual changed services
- remove demo/mock backend fallbacks from production-facing routes

### P2

- finish Next 16 migration cleanup
- harden CORS/CSRF origin policy consistency
- separate defender execution from offensive sandbox
- clean installer/runtime/dependency drift

## Background Agents

Additional audits were relaunched in background after this report was drafted:

- `019d95a2-29db-7851-9a92-66fab2305364` - frontend/chat/Next.js deep follow-up
- `019d95a2-3fab-7ed1-9bfd-c76dc38cd57c` - backend/auth/RLS deep follow-up
- `019d95a2-551f-74c3-a678-d61507563830` - engine/infra/CI deep follow-up

## Background Agent Addendum

The background agents did return additional findings.

### Additional High

- Public API launch flow can create phantom scans/jobs when LangGraph startup fails:
  - [backend/src/routes/public-api.ts](../backend/src/routes/public-api.ts)
    - around line 128
- Chat disconnect handling does not abort the upstream LangGraph stream, so engine work can continue after the browser disconnects:
  - [backend/src/routes/chat.ts](../backend/src/routes/chat.ts)
    - lines 475-492
- Google/Gemini LiteLLM credential naming is inconsistent across config, env template, and installer:
  - [engine/config/litellm.yaml](../engine/config/litellm.yaml)
    - line 51
  - [engine/.env.example](../engine/.env.example)
    - line 10
  - [engine/scripts/install.sh](../engine/scripts/install.sh)
    - line 162
- Chat history access is too permissive inside an org, and conversation/engagement binding is weak:
  - [backend/src/routes/chat.ts](../backend/src/routes/chat.ts)
    - lines 543-557
    - lines 571-577
    - lines 602-605
- Password reset and password change do not revoke existing sessions:
  - [backend/src/routes/auth.ts](../backend/src/routes/auth.ts)
    - lines 291-318
    - lines 336-362
- TOTP enrollment state is retained unnecessarily after 2FA enablement:
  - [backend/src/routes/two-factor.ts](../backend/src/routes/two-factor.ts)
    - lines 99-104
- Any authenticated paid-org member can mint and revoke API keys; no org-admin gate is enforced:
  - [backend/src/routes/api-keys.ts](../backend/src/routes/api-keys.ts)
    - lines 20-50
- Frontend login does not handle the backend `requiresTwoFactor` branch, so TOTP-enabled accounts cannot complete login from the current UI:
  - [backend/src/routes/auth.ts](../backend/src/routes/auth.ts)
    - around line 124
  - [app/actions/auth.ts](../app/actions/auth.ts)
    - line 14
  - [app/[locale]/login/page.tsx](../app/%5Blocale%5D/login/page.tsx)
    - line 44
- The 2FA settings panel reads a `totpEnabled` field that `/api/auth/me` does not return, so the UI falls back to a false disabled state after refresh:
  - [app/[locale]/dashboard/settings/two-factor-panel.tsx](../app/%5Blocale%5D/dashboard/settings/two-factor-panel.tsx)
    - line 24
  - [backend/src/routes/auth.ts](../backend/src/routes/auth.ts)
    - lines 194-210
- Stopping the chat can be rendered as a backend failure because an aborted stream falls through to the empty-response UI path:
  - [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
    - line 606
  - [components/chat/message-bubble.tsx](../components/chat/message-bubble.tsx)
    - line 210
- Conversation switching still has a race condition because history loading has no latest-request guard:
  - [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
    - lines 291 and 345

### Additional Medium

- 2FA login temp tokens are deterministic and replayable until expiry:
  - [backend/src/routes/two-factor.ts](../backend/src/routes/two-factor.ts)
    - lines 176-191
- Engine image reproducibility is weakened by `ghcr.io/astral-sh/uv:latest`:
  - [engine/containers/langgraph.Dockerfile](../engine/containers/langgraph.Dockerfile)
    - line 16
- Several PATCH/update paths appear broken because camelCase keys are used against snake_case DB columns:
  - [backend/src/routes/engagements.ts](../backend/src/routes/engagements.ts)
    - lines 329-350
  - [backend/src/routes/admin/users.ts](../backend/src/routes/admin/users.ts)
    - lines 155-170
- Findings route and schema disagree on allowed statuses and fields:
  - [backend/src/routes/findings.ts](../backend/src/routes/findings.ts)
    - lines 180-203
  - [backend/src/db/schema.sql](../backend/src/db/schema.sql)
    - lines 108-126
- LangGraph startup/DB status transitions are not atomic in some engagement and public API flows:
  - [backend/src/routes/engagements.ts](../backend/src/routes/engagements.ts)
    - lines 368-401
  - [backend/src/routes/public-api.ts](../backend/src/routes/public-api.ts)
    - lines 128-176
- CSV exports are vulnerable to spreadsheet formula injection:
  - [backend/src/routes/findings.ts](../backend/src/routes/findings.ts)
    - lines 248-264
  - [backend/src/routes/reports.ts](../backend/src/routes/reports.ts)
    - lines 358-373
- New-conversation resets do not clear all derived chat state, so errors, objectives, and other UI residues can leak between threads:
  - [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
    - lines 412, 452, and 834
- Several message actions are mostly decorative because the parent does not wire persistence/regenerate/feedback callbacks:
  - [components/chat/message-bubble.tsx](../components/chat/message-bubble.tsx)
    - around line 151
  - [app/[locale]/dashboard/chat/page.tsx](../app/%5Blocale%5D/dashboard/chat/page.tsx)
    - around line 1377

This file now includes both the original deep audit and the first background-agent pass.
