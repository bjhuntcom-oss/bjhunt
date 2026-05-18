# 12 — SSE Event Types (Actual Wire Format)

> **DRAFT** — This document reflects the ACTUAL event shapes emitted by the backend and engine as of 2026-05-18. It supersedes the idealized schema in [03-STREAMING.md](03-STREAMING.md) which documented 12 events that were never implemented as written. Differences are noted inline.

## Wire format

```
id: {chat_id}:{ulid}
event: <type>
data: <json_payload>

```

- `id` field uses `{chat_id}:{ulid}` (not `{run_id}:{seq}` as documented in 03-STREAMING). The chat-only collapse (Phase 1.13.c) renamed `run_id` → `chat_id` throughout.
- Client uses `addEventListener('<type>', handler)` to route events.
- `Last-Event-ID` sent automatically by `EventSource` on reconnect.

## 14 event types — actual JSON shapes

### 1. `run.started`

**Emitted by**: engine (sandbox relay) on audit start.

**From engine**:
```json
{
  "session_id": "string",
  "turn": 1,
  "ts": "2026-05-18T10:00:00.000Z"
}
```

**From orchestrator** (backend bridge synthetic):
```json
{
  "session_id": "string",
  "model": "glm-5.1",
  "tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "..."],
  "cwd": "/workspace",
  "ts": "2026-05-18T10:00:00.000Z"
}
```

> **Diff from 03-STREAMING**: Old doc had `done` event with `{runId, summary, totalFindings, durationMs}`. This was never implemented — `run.started` is closer, and `run.completed` replaces `done`.

### 2. `agent.started`

```json
{
  "agent_id": "recon-osint",
  "agent_type": "recon-osint",
  "model": "glm-5.1",
  "ts": "2026-05-18T10:00:01.000Z"
}
```

> **Diff from 03-STREAMING**: Old doc called this `subagent_start` with `{agent, parentAgent, objective}`. Renamed to `agent.started` and `parentAgent`/`objective` dropped from wire shape (the coordinator dispatches agents internally; the frontend doesn't need parent info).

### 3. `agent.thinking`

```json
{
  "agent_id": "web-pentester",
  "agent_type": "web-pentester",
  "text": "Analyzing HTTP headers for misconfigurations...",
  "ts": "2026-05-18T10:00:05.000Z"
}
```

> **Diff from 03-STREAMING**: Old doc had `{agent, content}`. Actual shape uses `text` (not `content`) and adds `agent_type`.

### 4. `agent.tool_call`

```json
{
  "agent_id": "web-pentester",
  "agent_type": "web-pentester",
  "tool": "Bash",
  "tool_label": "nmap -sT -p 443 target.com",
  "tool_use_id": "toolu_01ABC123",
  "input": "nmap -sT -p 443 target.com",
  "ts": "2026-05-18T10:00:10.000Z"
}
```

- `tool_label` is the human-readable pre-redacted label (added Wave A of Phase 2.10). Falls back to `tool` name if not provided.
- `input` contains the raw tool input (may contain secrets before hook redaction).

> **Diff from 03-STREAMING**: Old doc had `{agent, toolName, toolId, input}`. Actual: `tool` (not `toolName`), `tool_use_id` (not `toolId`), and `tool_label` is a new field.

### 5. `agent.tool_result`

```json
{
  "agent_id": "web-pentester",
  "tool": "Bash",
  "tool_use_id": "toolu_01ABC123",
  "ok": true,
  "summary": "443/tcp open https",
  "ts": "2026-05-18T10:00:15.000Z"
}
```

- `ok` is boolean. `summary` is a truncated/redacted version of the full output.
- Full output is captured by `evidence-capture.cjs` hook and stored in the evidence ledger, not streamed in full over SSE.

> **Diff from 03-STREAMING**: Old doc had `{toolId, output, exitCode, durationMs}`. Actual shape completely different — `ok`/`summary` instead of `output`/`exitCode`/`durationMs`.

### 6. `agent.finding`

```json
{
  "agent_id": "web-pentester",
  "finding_id": "f_01JH...",
  "ts": "2026-05-18T10:00:20.000Z",
  "severity": "high",
  "title": "TLS certificate expired",
  "cvss": 7.5,
  "epss": 0.12,
  "kev": false,
  "compliance": ["owasp-top10-2024:A6", "pci-dss-v4:4.1"],
  "remediation": "Renew the TLS certificate immediately.",
  "evidence_ids": ["e_01JH..."]
}
```

- Fields beyond `agent_id`, `finding_id`, and `ts` are "fenced JSON" — the engine emits them as structured data within the event payload, and the frontend renders them as finding cards.
- `compliance` is an array of `{framework:ref}` strings for chip display.
- `evidence_ids` links to `evidence.captured` events.

> **Diff from 03-STREAMING**: Old doc had `{id, severity, title, evidence, cve?, remediation}`. Actual adds `cvss`, `epss`, `kev`, `compliance`, `evidence_ids`, `finding_id` (not `id`).

### 7. `agent.canvas`

```json
{
  "agent_id": "report-pci-dss-v4",
  "canvas_id": "canvas_01JH...",
  "html": "<h1>PCI DSS v4.0 Assessment Report</h1>...",
  "ts": "2026-05-18T10:00:25.000Z"
}
```

- New event (Phase 2.9). Not in old doc at all.
- Supports collaborative canvas where the engine writes markdown/HTML and the user can edit in parallel (optimistic-lock by revision).

### 8. `secret.redacted`

```json
{
  "agent_id": "web-pentester",
  "redacted_fields": ["Authorization", "Set-Cookie", "AWS_ACCESS_KEY_ID"],
  "ts": "2026-05-18T10:00:12.000Z"
}
```

- Emitted by `redact-secrets.cjs` hook (UserPromptSubmit) or `evidence-capture.cjs` (PostToolUse) when secrets are detected and stripped.
- Informs the user that secrets were removed from the transcript without revealing them.

> **Diff from 03-STREAMING**: No equivalent in old doc. This is a new event from the BJHUNT hooks pipeline.

### 9. `evidence.captured`

```json
{
  "id": "e_01JH...",
  "chat_id": "01JH...",
  "agent_id": "recon-osint",
  "tool": "Bash",
  "sha256": "a1b2c3d4...",
  "bytes": 4096,
  "truncated": false,
  "redactions_applied": 2,
  "captured_at": "2026-05-18T10:00:15.000Z"
}
```

- Emitted by `evidence-capture.cjs` hook after each tool call that matches `Bash|PowerShell|WebFetch`.
- `sha256` is computed before redaction (chain-of-custody integrity).
- `redactions_applied` counts how many secret patterns were stripped.
- `truncated` indicates if output exceeded 10 MB cap.

> **Diff from 03-STREAMING**: No direct equivalent. Old doc's `finding.evidence` was a string field; this is a separate typed event for chain-of-custody.

### 10. `dream.diary_entry`

```json
{
  "agent_id": "dream-keeper",
  "entry_id": "d_01JH...",
  "title": "Reconnaissance Phase — Target X",
  "narrative_md": "## Findings So Far\n\n...",
  "ts": "2026-05-18T10:05:00.000Z"
}
```

- Emitted by the `dream-keeper` agent at intervals during long-running audits.
- `narrative_md` is a markdown narrative summarizing progress, for the final report annex.

> **Diff from 03-STREAMING**: No equivalent. New event from BJHUNT Dream Diary pattern.

### 11. `agent.completed`

```json
{
  "agent_id": "web-pentester",
  "ts": "2026-05-18T10:10:00.000Z"
}
```

- Marks the end of an agent's turn. No `summary` or `findings` field — those are emitted separately as `agent.finding` events.

> **Diff from 03-STREAMING**: Old doc called this `subagent_end` with `{agent, summary, findings?}`. Renamed and simplified.

### 12. `run.completed`

**From engine** (terminal event):
```json
{
  "outcome": "completed",
  "exit_code": 0,
  "signal": null,
  "ts": "2026-05-18T10:30:00.000Z"
}
```

**From orchestrator** (backend bridge synthetic):
```json
{
  "outcome": "completed",
  "ts": "2026-05-18T10:30:00.000Z"
}
```

- `outcome` is one of: `completed`, `aborted`, `failed`, `expired`.
- Engine shape includes `exit_code` and `signal` (process-level). Backend shape omits them.
- This event closes the SSE stream. The backend also triggers `terminateSandbox()` and updates chat status.

> **Diff from 03-STREAMING**: Old doc had `done` event (not `run.completed`) with `{runId, summary, totalFindings, durationMs}`. None of those fields exist in the actual implementation.

### 13. `error.scope_violation`

```json
{
  "agent_id": "web-pentester",
  "blocked_target": "192.168.1.0/24",
  "reason": "Target not in engagement scope (in_scope: [10.0.0.0/16], out_of_scope: [192.168.0.0/16])",
  "ts": "2026-05-18T10:00:08.000Z"
}
```

- Emitted by `scope-guard.cjs` hook (PreToolUse) when a tool call targets a host/CIDR outside the engagement scope.
- Fail-closed: if `engagement.scope` is absent or unparseable, ALL tool calls are blocked.

> **Diff from 03-STREAMING**: Old doc had `interrupt` event with `{reason, requiredAction, options[]}` for human approval. `error.scope_violation` replaces this with automatic fail-closed blocking instead of interactive interrupt.

### 14. `error.runtime`

```json
{
  "message": "Sandbox execution timeout after 4h",
  "ts": "2026-05-18T14:00:00.000Z"
}
```

- General runtime error. Emitted by the backend bridge or engine relay on unrecoverable errors.
- Old doc's generic `error` had `{code, message, fatal}`. Actual shape simplifies to just `message` + `ts`.

## Events NOT in old 03-STREAMING.md (new)

| Event | Source |
|---|---|
| `agent.canvas` | Phase 2.9 — collaborative canvas |
| `secret.redacted` | BJHUNT hooks pipeline |
| `evidence.captured` | BJHUNT hooks pipeline |
| `dream.diary_entry` | BJHUNT Dream pattern |

## Events from 03-STREAMING.md that were REMOVED or RENAMED

| Old event | Current equivalent | Change |
|---|---|---|
| `token` | `agent.thinking` | Streaming tokens aggregated into thinking text blocks |
| `subagent_start` | `agent.started` | Renamed + fields changed |
| `subagent_end` | `agent.completed` | Renamed + simplified (no summary field) |
| `objective_update` | — | Removed (no progress bar in current UI) |
| `graph_update` | — | Removed (attack graph panel removed in Phase 2.6 UX redesign) |
| `interrupt` | `error.scope_violation` | Replaced by fail-closed scope guard |
| `done` | `run.completed` | Renamed + completely different shape |
| `ping` | (internal) | Still used as keepalive but not a typed event in the engine pipeline |

## Persistence

### Redis Streams (live tail)
```
XADD stream:{org_id}:{chat_id} * event <type> data <json>
```
TTL 7 jours (`MAXLEN ~ 10000`). Uses `redis.duplicate()` connection for XREAD blocking (isolated from healthcheck ping).

### Postgres mirror (durable replay)
```sql
CREATE TABLE stream_events (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  ulid TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  ts TIMESTAMPTZ DEFAULT now(),
  UNIQUE (chat_id, ulid)
);
ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON stream_events
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);
```

- All writes go through `withTenant(orgId, userId, tx => ...)` to set RLS GUCs.
- `Last-Event-ID` replay reads from Postgres via Drizzle `tx.select().from(streamEvents).where(...)` inside a tenant-scoped transaction.

## Auth — SSE ticket

- JWT signed with `JWT_SECRET_TICKET`, 5 min TTL, audience `bjhunt-sse`, scope `sse`.
- `POST /api/chat/prepare` issues ticket; frontend auto-refreshes at `(expires_in - 30) * 1000` ms.
- `GET /api/chat/stream/:chatId?ticket=<jwt>` validates ticket, extracts `org_id` + `user_id` (never trusts URL param for tenant).
- Share endpoint uses admin DB connection (`POSTGRES_URL_ADMIN`) to bypass RLS for authorized cross-tenant access.

## History replay

- `GET /api/chats/:id/history?after=&limit=` — reads `stream_events` mirror PG, keyset paginated, max 5000 events per request.
- Frontend uses `historyMode` flag in `useEngagementStream` to one-shot fetch instead of SSE for completed chats (avoids generating stale tickets).