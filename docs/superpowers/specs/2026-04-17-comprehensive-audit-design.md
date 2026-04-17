# Comprehensive BJHUNT Audit — 2026-04-17

## Goal

Produce a single consolidated audit report at `docs/AUDIT-2026-04-17.md` that documents every bug, inconsistency, and security weakness across the BJHUNT platform, with 2026 best-practice citations and a priority-ordered fix roadmap.

## Motivation

- Chat SSE has been through ~15 iterations of fixes and is still broken in production (Vercel 10s timeout + Chrome CORS preflight cache 24h).
- Yesterday's partial audit (`docs/DEEP-AUDIT-2026-04-16.md`) covered part of the surface but not all of it.
- Before adding new features, the team needs a complete, fresh, prioritized view of what's broken and why.

## Scope

Six parallel audit domains, each owned by one Opus 4.7 subagent. All agents are **read-only** on the repo and on the VPS. Findings are written to partial files; the parent consolidates.

| # | Domain | Primary artifacts |
|---|---|---|
| 1 | Chat SSE — frontend | `app/[locale]/dashboard/chat/`, `app/api/proxy/[...path]/`, `lib/backend-client.ts`, EventSource, SP3 ticket flow (browser side), CSP, CORS preflight cache behaviour |
| 2 | Chat SSE — backend | `backend/src/routes/chat.ts`, `backend/src/lib/langgraph-client.ts`, signed ticket issuer, LangGraph `/threads/{id}/runs/stream`, TransformStream, Caddy `flush_interval` |
| 3 | Backend API (non-chat) | `backend/src/routes/*` except `chat.ts`, Lucia auth, middleware (cors, csrf, auth, rate-limit, plan-gate), DB schema, RLS, admin routes, health endpoints |
| 4 | Frontend (non-chat) | Marketing pages, auth flows, dashboard non-chat, i18n FR/EN, CSP nonce, server actions, `app/api/*` except proxy, `middleware.ts`, accessibility |
| 5 | Engine Decepticon | `engine/decepticon/` (agents, tools, middleware, LLM), `engine/config/litellm.yaml`, `engine/langgraph.json`, Dockerfiles, known vulnerabilities C1/C2/C3/H1-H4/M1-M3 from CLAUDE.md |
| 6 | Infra VPS + security | `docker-compose.yml`, `ops/Caddyfile`, `.github/workflows/*`, `.env.example`, secrets, UFW, sslh, TLS, Trivy/gitleaks posture, GitHub 2FA deadline, Copilot opt-out |

### Resource allocation
- **Playwright MCP**: monopolized by Agent 1 (browser testing the chat).
- **SSH to `bjhunt-vps`**: read-only, allowed for Agents 1, 2, 6 only. Allowed commands: `docker logs`, `docker ps`, `docker exec ... env|grep`, `curl localhost:*`, `cat /opt/bjhunt/app/.env | grep -v secret`, `cat ops/Caddyfile`, `ss -tlnp`, `ufw status`, `journalctl --no-pager -n 200`. **Forbidden**: `docker compose up/down/restart`, `git pull`, any write to VPS filesystem.
- **Web research**: unrestricted for all agents — cite 2026 best practices for each finding.
- **Timebox**: none. Agents work until comprehensive.

### Read-only constraint
No agent modifies repo files (except writing their own partial markdown). No agent modifies VPS state. Fix implementation happens in a separate post-audit phase.

## Output format

Each agent writes to `docs/audit-2026-04-17/partial/agent-<N>-<domain>.md` with this structure:

```markdown
# Agent <N> — <Domain> — Audit Report

## Summary
<bullet list of what was examined, scope, method>

## Findings

### Finding #<N>-<M> — <Title>
- **Severity**: Critical | High | Medium | Low
- **Category**: Security | Correctness | Performance | Reliability | Maintainability | UX
- **File**: `path/to/file.ts:line` (or multiple)
- **Bug / Inconsistency**: <description>
- **Root cause**: <technical explanation>
- **Fix proposed**: <diff or description>
- **2026 best practice**: <recommendation + source URL>

## Out of scope / deferred
<things noticed but outside this agent's domain>
```

## Consolidation

After all 6 agents finish, the parent session:
1. Reads the 6 partial files
2. Deduplicates findings (same bug surfaced by two agents)
3. Groups by severity (Critical → Low)
4. Writes `docs/AUDIT-2026-04-17.md` with:
   - Executive summary (top 5 critical issues, plain-language)
   - **Why the chat is broken** — definitive answer with reproduction evidence
   - All findings sorted by severity
   - Fix roadmap (ordered, with effort estimate and dependency graph)
   - Appendix: links to partial reports
5. Commit both the partials and the consolidated report

## Success criteria

- `docs/AUDIT-2026-04-17.md` exists and is comprehensive.
- The chat failure root cause is identified with reproducible evidence (Playwright screenshots + browser console + network trace + backend logs + LangGraph logs).
- Every Critical and High finding has a concrete fix path.
- No agent performed a write operation on the repo (outside their partial file) or on the VPS.
