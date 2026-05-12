# Audit BJHUNT deep pass - 2026-05-01

Scope covered:
- Local repos: `D:\bjhunt-v2`, `D:\bjhunt-engine`, `D:\bjhunt-backend`, `D:\bjhunt-app`, `D:\bjhunt-assistant-ui`, plus legacy `D:\bjhunt`.
- GitHub inventory via configured remotes / `gh repo list`.
- VPS read-only over SSH host `bjhunt-vps`.
- Web research: OpenClaude upstream and official Claude Code docs.

No application files were modified by this audit. Secrets and private key contents were not read intentionally. VPS env/compose values were redacted where commands printed configuration.

## External references used

- OpenClaude upstream: https://github.com/Gitlawb/openclaude
- Claude Code "How Claude Code works": https://code.claude.com/docs/en/how-claude-code-works
- Claude Code hooks reference: https://code.claude.com/docs/en/hooks
- Claude Code security: https://code.claude.com/docs/en/security
- Claude Code permissions: https://code.claude.com/docs/en/permissions
- Claude Code sandboxing: https://code.claude.com/docs/en/sandboxing
- Claude Code Agent SDK secure deployment: https://code.claude.com/docs/en/agent-sdk/secure-deployment
- Claude Code CLI reference: https://code.claude.com/docs/en/cli-reference

Key doc alignment:
- Claude Code is a terminal agentic harness with tools for file ops, shell, web, and external services.
- Official docs present permissions, hooks, and OS/network sandboxing as complementary layers.
- `bypassPermissions` / `--dangerously-skip-permissions` skips permission prompts and is only suitable inside isolated containers/VMs.
- Reliable enterprise deployments should use least privilege, network restriction, credential proxying, and defense in depth.

## Repo map

Active repos found locally:
- `D:\bjhunt-v2`: public marketing frontend and `/labs/audit` POC. Remote `bjhuntcom-oss/bjhunt`, branch `main`, clean.
- `D:\bjhunt-engine`: OpenClaude fork / BJHUNT pack. Remote private, branch `feat/bjhunt-v2.1-pack`, dirty: modified `bjhunt/docker/bjhunt-kali.Dockerfile`, untracked `e2b.toml`.
- `D:\bjhunt-backend`: Hono/Bun backend. Branch `main`, dirty: modified `src/lib/e2b.ts`.
- `D:\bjhunt-app`: authenticated Next dashboard. Branch `main`, clean.
- `D:\bjhunt-assistant-ui`: assistant-ui fork. Branch `feat/bjhunt-pack`, clean.
- `D:\bjhunt`: legacy v1 repo, dirty and ahead 2. Treat as archive / migration risk, not active v2 source.

GitHub inventory also shows `bjhunt-legacy-engine`, but it is not present locally.

## Executive summary

The main issue is not one isolated bug. The whole v2 stack is currently split across at least four competing contracts:

1. the E2B template artifact,
2. the OpenClaude fork runtime,
3. the backend event/DB model,
4. the frontend multi-agent/audit UI model.

Those four layers are not synchronized. The result is a system that can look alive from the UI and DB while the real engine inside the sandbox is not actually executing the contract the product claims.

## Critical architecture findings

### P0 - The E2B template copies engine source, but does not build the engine artifact it later executes

The sandbox image copies source files only:
- `D:\bjhunt-engine\bjhunt\docker\bjhunt-kali.Dockerfile:85-90`
- installs deps at `:86`
- copies `src`, `bjhunt`, `bin`, `tsconfig.json`
- does not run `bun run build`
- does not copy `dist/`

But the launcher executed in the sandbox requires `dist/cli.mjs`:
- `D:\bjhunt-engine\bin\openclaude:6-7`
- `D:\bjhunt-engine\bin\openclaude:21-27`

The relay spawns that launcher by default:
- `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:53`
- `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:160-161`

Impact:
- the template embeds the engine repo, but not the built CLI it expects to run;
- the relay can boot and expose `:8090`, while the actual engine process is dead or immediately exits;
- this fits the VPS symptom of `running` chats with almost no runtime events.

This is the strongest concrete explanation for "le engine se retrouve dans le template de la sandbox" plus "les trucs ne sont pas synchro".

### P0 - The engine is baked into a mutable sandbox template alias, not versioned as a first-class deployable

The build script explicitly says the template is rebuilt with "current engine HEAD":
- `D:\bjhunt-engine\bjhunt\scripts\build-e2b-template.sh:2`

It also reuses the same alias / ID:
- `D:\bjhunt-engine\bjhunt\scripts\build-e2b-template.sh:13-16`
- `D:\bjhunt-engine\e2b.toml:18-19`

At template build time, the image also bakes:
- persona files into `.claude/agents`: `D:\bjhunt-engine\bjhunt\scripts\build-claude-agents.sh:5`, `:35`
- hook wiring from `settings.template.json`: `D:\bjhunt-engine\bjhunt\scripts\build-claude-agents.sh:6`, `:42`, `:58`
- a sourced runtime env file: `D:\bjhunt-engine\bjhunt\scripts\build-claude-agents.sh:61`, `:77`
- this build step runs inside the Docker image build: `D:\bjhunt-engine\bjhunt\docker\bjhunt-kali.Dockerfile:103`

Impact:
- one template rebuild silently changes engine code, prompts, hooks, agent pack, and settings wiring at once;
- the backend stores only a sandbox ID / template reference, not an immutable engine artifact version;
- there is no per-chat provenance for "which engine commit / template build / prompt pack actually ran".

This is not just deployment smell. It means runtime behavior depends on opaque template freshness rather than explicit release synchronization.

### P0 - There is no single source of truth for lifecycle and chat events

The backend writes `run.started` itself before the bridge even begins:
- `D:\bjhunt-backend\src\routes\chats.ts:194`
- bridge starts after at `D:\bjhunt-backend\src\routes\chats.ts:204`

The relay also emits `run.started` from the engine init frame:
- `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:249`

The backend writes `run.completed` itself on delete/stop flows:
- `D:\bjhunt-backend\src\routes\chats.ts:334`
- `D:\bjhunt-backend\src\routes\chats.ts:404`

The relay also emits `run.completed`:
- child exit fallback: `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:218-225`
- terminal result translation: `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:362`
- kill action: `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:449`

The backend writes operator messages as `agent.thinking`:
- `D:\bjhunt-backend\src\routes\chats.ts:541`

Then relay `inject_message` also pushes the operator turn as `agent.thinking`:
- `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:470`
- `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:490-527`

Impact:
- if the engine is dead, the system still looks partially alive because backend-generated events exist;
- if the engine works, semantic duplicates become possible for `run.started`, `run.completed`, and user-message echoes;
- stream history stops representing a trustworthy execution trace.

This is one of the main structural incoherences in the current flow.

### P0 - The documented BJHUNT event model is much richer than the executable protocol

Docs and prompts claim a 12-event typed audit protocol:
- `D:\bjhunt-engine\bjhunt\README.md:18`, `:54-57`
- `D:\bjhunt-engine\bjhunt\STREAMING_EVENTS.md:92`, `:121`, `:133`, `:162`, `:226-236`
- `D:\bjhunt-engine\src\constants\bjhuntIdentity.ts:99-103`, `:115`

But the active relay implementation only truly translates:
- `run.started`
- `agent.started`
- `agent.thinking`
- `agent.tool_call`
- `agent.tool_result`
- `agent.completed`
- `run.completed`
- plus hook-originated `evidence.captured` / `error.scope_violation` / `error.runtime`

Evidence:
- event list comments at `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:35-38`
- actual translation branches at `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:244-362`
- recursive search under `D:\bjhunt-engine\bjhunt` found no executable emission site for `agent.finding`, `agent.handoff`, `agent.progress`, or `dream.diary_entry`; those names only appear in docs/prompts/comments.

Impact:
- a large part of the product's claimed runtime contract is currently aspirational, not executable;
- the UI and DB are built for a richer system than the relay/engine currently produce.

### P0/P1 - Frontend, backend schema, and docs are one generation ahead of the runtime

Frontend consumes and renders:
- `agent.finding`, `agent.progress`, `agent.handoff`, `dream.diary_entry`, `evidence.captured` in `D:\bjhunt-app\hooks\use-engagement-stream.ts:17-23`, `:176-220`, `:304-305`
- inline thread rendering for those types in `D:\bjhunt-app\lib\bjhunt-runtime.ts`
- timeline projection in `D:\bjhunt-app\components\chat\audit-timeline-panel.tsx`
- multi-agent status panel in `D:\bjhunt-app\components\chat\agents-active-panel.tsx`

Backend schema persists rich audit objects:
- `findings` table at `D:\bjhunt-backend\src\db\schema.ts:105-132`
- `evidence` table at `D:\bjhunt-backend\src\db\schema.ts:136-149`

But active runtime evidence path is still local-hook-centric:
- `evidence-capture.cjs` writes local files and `ledger.jsonl`, then emits SSE: `D:\bjhunt-engine\bjhunt\hooks\evidence-capture.cjs`
- recursive search in backend `src` found no active insert path into `findings` or `evidence` during runtime.

Impact:
- the UI can present "audit-grade" surfaces that are not yet backed by the engine protocol or persistence path;
- the DB schema suggests capabilities that the current live execution path does not actually materialize.

### P1 - OpenClaude's native sandbox architecture exists in the fork, but BJHUNT bypasses it

OpenClaude fork contains a substantial sandbox subsystem:
- type/schema layer: `D:\bjhunt-engine\src\entrypoints\sandboxTypes.ts:95-99`
- adapter / policy conversion: `D:\bjhunt-engine\src\utils\sandbox\sandbox-adapter.ts`
- startup enforcement / `failIfUnavailable`: `D:\bjhunt-engine\src\cli\print.ts:592-600`

At the same time, BJHUNT relay forces:
- `--dangerously-skip-permissions` at `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:156`

Impact:
- the product ships an engine that already has a proper sandbox/permissions substrate;
- BJHUNT currently routes around that substrate and replaces it with hooks + E2B + best-effort egress, which are incomplete and currently buggy.

This is a major architectural incoherence, not just a security hardening gap.

### P1 - Live settings and scope mutation are split across incompatible paths

Runtime entrypoint writes scope from env to file:
- `D:\bjhunt-engine\bjhunt\docker\run-engagement.sh:40-42`

Entrypoint also mutates personas at boot from env:
- agent selection at `D:\bjhunt-engine\bjhunt\docker\run-engagement.sh:83-85`
- model override logic at `D:\bjhunt-engine\bjhunt\docker\run-engagement.sh:97-109`

Relay later persists runtime updates to `/chat/scope.json` and `/chat/settings.json`:
- `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:530-574`

But current hook logic still prefers stale inline env over updated file:
- `D:\bjhunt-engine\bjhunt\hooks\scope-guard.cjs:94-98`

Impact:
- "live update" is not a single coherent mechanism;
- some changes are file-based, some env-based, some persona-file rewrites, some next-spawn only;
- scope updates are especially fragile because the active guard path is already known to be inconsistent.

## Security and control findings

### P0 - Engine scope guard receives the wrong scope shape

Backend sends raw scope:
- `D:\bjhunt-backend\src\routes\chats.ts` sets `BJHUNT_CHAT_SCOPE_JSON: JSON.stringify(chat.scope)`

Hook then reads JSON and expects `eng.scope`:
- `D:\bjhunt-engine\bjhunt\hooks\scope-guard.cjs:94-98`
- `D:\bjhunt-engine\bjhunt\hooks\scope-guard.cjs:204`

Verified locally:
- backend shape `{"in_scope":["e2e.test"],"out_of_scope":[]}` was denied;
- wrapped shape `{"scope":{"in_scope":["e2e.test"],"out_of_scope":[]}}` was allowed.

### P0 - File tool hooks use non-existent OpenClaude tool names

`scope-guard.cjs` still checks:
- `FileWrite`, `FileEdit`, `FileRead` at `D:\bjhunt-engine\bjhunt\hooks\scope-guard.cjs:150-151`

Verified locally:
- a `Write` payload targeting a path outside `/chat` was allowed.

### P0 - Backend logs leak SSE JWT tickets in production

Request logger:
- `D:\bjhunt-backend\src\index.ts:31`

VPS logs contained full stream URLs with `ticket=<jwt>`.

### P0/P1 - In-sandbox `/control` is unauthenticated

Relay accepts:
- `kill`, `cancel`, `update_settings`, `inject_message`
- entrypoint at `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs:442-472`

No token or signature check is present.

### P1 - E2B fallback URL generation is inconsistent and wrong

Canonical host form in backend:
- `D:\bjhunt-backend\src\lib\e2b.ts:93-100`

Wrong fallback still used in:
- `D:\bjhunt-backend\src\routes\chats.ts:554`, `:603`
- `D:\bjhunt-backend\src\lib\engine-bridge.ts:155`

### P1 - Backend bridge state is memory-only

Only live registry:
- `D:\bjhunt-backend\src\lib\engine-bridge.ts:36`

No boot-time bridge reattachment path was found in backend startup.

### P1 - Egress filter is not the hard boundary the product narrative implies

Boot order:
- egress first, then scope file: `D:\bjhunt-engine\bjhunt\docker\run-engagement.sh:40-42`

This means network policy and scope policy are not derived from one authoritative runtime state.

## Product/runtime drift findings

### P1 - Manual SSE replay path is broken

Frontend reconnect query:
- `D:\bjhunt-app\hooks\use-engagement-stream.ts:296-299`

Backend stream route only reads header:
- `D:\bjhunt-backend\src\routes\chat-stream.ts:26`

### P1 - Completed chats cannot be reopened through the live prepare flow

Prepare route rejects terminal chats:
- `D:\bjhunt-backend\src\routes\chat-prepare.ts:37-38`

So "history viewing" and "live stream ticketing" are still coupled.

### P1 - User messages can be displayed as sent even when injection fails

Backend writes SSE first and only then attempts relay control:
- `D:\bjhunt-backend\src\routes\chats.ts:541`
- control forward at `D:\bjhunt-backend\src\routes\chats.ts:554-560`

The catch path logs and still returns OK.

### P1 - Evidence and redaction claims are ahead of the active persistence path

Docs say evidence goes to R2 + DB:
- `D:\bjhunt-engine\bjhunt\README.md:65-66`

Active hook still writes local artifact files and local JSONL ledger:
- `D:\bjhunt-engine\bjhunt\hooks\evidence-capture.cjs`

### P1 - Production Postgres blast radius is too broad

On the VPS, BJHUNT app tables and LiteLLM tables share the same database/schema/user.

### P1 - Migration `0004_chats.sql` is destructive

It drops earlier tables with `CASCADE`, which is acceptable only as a bootstrap migration, not as a model for forward production evolution.

## Medium findings

### P2 - `e2b.toml` is currently misleading and likely unusable as written

It contains a Windows-like start command:
- `D:\bjhunt-engine\e2b.toml:16`

```toml
start_cmd = "C:/Program Files/Git/opt/bjhunt-engine/bjhunt/docker/run-engagement.sh"
```

But the actual build script passes the Linux path:
- `D:\bjhunt-engine\bjhunt\scripts\build-e2b-template.sh:39`

### P2 - Docker image build remains weakly reproducible

Current image still depends on moving inputs:
- `kalilinux/kali-rolling:latest`
- remote Bun installer
- Typst latest download
- nuclei template update at build

### P2 - Runtime container hardening is still weak

On the VPS backend container:
- writable rootfs
- default user
- no cap drop
- no `no-new-privileges`

### P2 - Docs and code remain materially out of sync

Examples:
- audit docs promise typed event semantics the relay does not emit;
- README promises evidence into DB/R2 from the active runtime path;
- architecture descriptions still imply a more mature multi-agent orchestration layer than is actually wired.

## VPS findings

VPS host:
- Ubuntu 24.04.4 LTS, host `srv1295179`, user `root`.
- Docker stack healthy: `bjhunt-backend`, `bjhunt-litellm`, `bjhunt-postgres`, `bjhunt-redis`.
- Backend/Postgres/Redis/LiteLLM bind to `127.0.0.1`.
- Coolify exposes port 8000 publicly; coolify realtime exposes 6001/6002 publicly.
- WireGuard UDP 51820 is open.
- `ufw` command not available, but iptables contains UFW chains and Docker rules.

Production app state:
- `/api/health` returns OK with db/redis OK.
- DB has 5 `running` chats.
- `stream_events` had `run.started|5` and `agent.thinking|2`; no terminal events observed.
- Backend logs repeatedly include SSE URLs with JWT query strings.
- Compose uses one Postgres DB/schema for BJHUNT and LiteLLM.

## Verification run locally

Passed:
- `npm.cmd run typecheck` in `D:\bjhunt-backend`
- `npm.cmd run typecheck` in `D:\bjhunt-app`
- `npm.cmd run typecheck` in `D:\bjhunt-v2`

Blocked:
- `bun run typecheck` / `bun test`: Bun is not installed locally.
- `npm.cmd test` in backend delegates to `bun test`, so backend tests did not run.
- `npm.cmd run typecheck` in engine failed because local `tsc` was not installed/found.

Manual hook tests:
- Backend scope shape denied in-scope URL: confirmed.
- Wrapped scope shape allowed same URL: confirmed.
- Real `Write` tool outside `/chat` was allowed: confirmed.

## Recommended remediation order

1. Fix `scope-guard.cjs` shape and tool names; add regression tests.
2. Remove or gate `--dangerously-skip-permissions` until defense-in-depth is real.
3. Add auth to sandbox `/control` and `/events`.
4. Redact SSE tickets from logs and stop putting bearer tokens in URLs where possible.
5. Persist/reconcile bridge state and correct E2B endpoint generation everywhere.
6. Make SSE replay and terminal chat history work.
7. Harden egress, container users, capabilities, and read-only filesystems.
8. Split LiteLLM and BJHUNT DB/schema/users.
9. Align docs with actual v2 chat architecture and mark legacy repos as archived.
10. Add CI that runs hook contract tests, backend tests, and app/backend typechecks.
