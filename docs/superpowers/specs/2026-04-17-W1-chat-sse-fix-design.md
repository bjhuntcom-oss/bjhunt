# W1 — Chat SSE fix — 2026-04-17

## Goal

Make the chat work end-to-end in production by fixing the two additive bugs identified in [AUDIT-2026-04-17](../../AUDIT-2026-04-17.md) §2: backend Bun stream batching (Caddy 502) and frontend CRLF parser failure (silent JSON.parse).

## Motivation

The chat has been broken in production for weeks across ~15 failed fix iterations documented in `docs/CHAT-DEBUG-PROMPT.md`. Prior hypotheses (Vercel 10s timeout + Chrome CORS preflight cache) were wrong; Agents 1 & 2 of the 2026-04-17 audit established the real root causes with reproduction evidence:

- **Backend (C-18, Finding #2-1):** `new Response(new ReadableStream(...))` on Bun buffers chunks in kernel memory rather than flushing per SSE event. Caddy sees `unexpected EOF` at ~10 s and returns 502. Live logs show 17 occurrences of this pattern in the last 3000 Caddy log lines.
- **Frontend (C-17, Finding #1-1):** the hand-rolled parser at `app/[locale]/dashboard/chat/page.tsx:608` splits on `\n\n` only. LangGraph (Python starlette) emits frames terminated by `\r\n\r\n` — spec-valid per HTML Living Standard §9.2.6. The resulting `\r` contamination makes every `JSON.parse` fail; the surrounding `catch { return; }` swallows each error silently, so `lastAiContentRef` stays empty and the UI flips to "emptyResponse".

Both bugs must be fixed together. Fixing only one still leaves the chat broken.

## Scope

### In scope

1. **Backend:** migrate the `GET /stream/:runId` handler in `backend/src/routes/chat.ts` from raw `ReadableStream` to Hono's `streamSSE` helper so every event is flushed synchronously to the socket. This is the path used by the current frontend via the SP3 ticket flow (`POST /prepare` → `GET /stream/:runId`). The `POST /stream` handler is deprecated, not used by the current frontend, and its 500+ lines of `TransformStream` event-normalisation logic warrant a dedicated migration — deferred to W2.
2. **Frontend:** normalize CRLF to LF in the SSE parser before splitting on `\n\n`, and replace the silent `catch` with a structured log that surfaces future parser regressions.
3. **Abort propagation:** wire `c.req.raw.signal` into `langgraphClient.streamRun` so a client disconnect cancels the upstream LangGraph run (partial fix for Finding #2-10 — prevents Ollama spend continuing after user closed the tab).
4. **Validation:** Playwright end-to-end test using the existing auth flow, screenshot evidence committed to `docs/audit-2026-04-17/verification/`.
5. **Audit status:** mark C-17 and C-18 as fixed with commit SHA in `docs/AUDIT-2026-04-17.md`.

### Out of scope — deferred to W2 or later

- **Migrating `POST /stream` to `streamSSE`** — deprecated handler, not exercised by current frontend (which uses `POST /prepare` + `GET /stream/:runId`). Its 500+ line `TransformStream` event-normalisation layer warrants its own plan.
- Migrating `pendingStreams` from in-memory `Map` to Redis (Finding #2-4) — belongs with the broader session/ticket refactor.
- Replacing the homegrown signed ticket with a proper JWT (`iat`, `typ`, `aud`, `jti`, separate signing key) (Finding #2-5).
- Removing the `?token=` and `Authorization: Bearer session:<id>` fallbacks in `backend/src/middleware/auth.ts` (C-13) — W2 security wave.
- Switching LangGraph `stream_mode` to include `"messages"` for token-by-token streaming (Finding #1-3) — UX decision, not a correctness fix.
- Replacing the fetch-based reader with native `EventSource` (Finding #1-10) — larger refactor; current fetch-based approach must support ticket bearer so `EventSource` would need a custom polyfill.
- CSP `connect-src` hardening (Finding #1-22) — belongs with CSP overhaul in W2.
- `Access-Control-Max-Age` tuning / cache-buster removal (Finding #1-11) — no longer load-bearing once backend streams correctly.

## Architecture

Before:
```
Browser fetch → Vercel proxy → Caddy → Hono → new Response(ReadableStream)
                                               ↓ writes to stream controller
                                               ↓ (no flush) Bun batches
                                        [EOF on LangGraph close]
                                        ↓ Caddy sees unexpected EOF
                                     502 Bad Gateway
```

After:
```
Browser fetch → Vercel proxy → Caddy → Hono → streamSSE(c, handler)
                                               ↓ await stream.writeSSE({event, data})
                                               ↓ (flush each event immediately)
                                        Caddy forwards chunks live (flush_interval -1)
                                        Browser parses CRLF-normalized frames → UI updates
```

Frontend parser flow becomes:
```
fetch → ReadableStreamDefaultReader
buffer += decoder.decode(value, { stream: true })
const normalised = buffer.replace(/\r\n/g, "\n")   // NEW
blocks = normalised.split("\n\n")
parse each block; log parse failures with snippet
```

## Changes

### C1 — Backend migrate to `streamSSE` — `backend/src/routes/chat.ts`

- Replace the `new Response(new ReadableStream({ start(controller) { ... } }))` pattern in the `GET /stream/:runId` handler with Hono's `streamSSE` helper. `POST /stream` (deprecated, unused by current frontend) is left untouched in W1 — its migration is deferred to W2.
- All prior `controller.enqueue(encoder.encode("..."))` calls become `await stream.writeSSE({ event, data })`.
- Preserve existing headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`.
- Add `X-Accel-Buffering: no` to harden against any future proxy that buffers without honoring `flush_interval`.
- Call `stream.onAbort(() => { /* cancel LangGraph run */ })` and pass `c.req.raw.signal` into `langgraphClient.streamRun` so upstream cancellation is wired through.
- Keep the heartbeat comment frames (`: heartbeat`) but emit them via `await stream.writeln(": heartbeat")` on the 15 s interval.
- Do NOT change the event-shape contract (event names, data JSON structure) — Agent 1 will verify the frontend parser remains compatible.

### C2 — Frontend CRLF normalization + logging — `app/[locale]/dashboard/chat/page.tsx`

Around line 608 (the reader loop):
```ts
// BEFORE
buffer += decoder.decode(value, { stream: true });
const blocks = buffer.split("\n\n");
buffer = blocks.pop() ?? "";

// AFTER
buffer += decoder.decode(value, { stream: true });
const normalised = buffer.replace(/\r\n/g, "\n");
const blocks = normalised.split("\n\n");
buffer = blocks.pop() ?? "";
```

Around line 703 (the parse-error swallower):
```ts
// BEFORE
} catch {
  return;
}

// AFTER
} catch (err) {
  const snippet = dataLines.join("\n").slice(0, 200);
  console.error("[chat] SSE parse failure", { err, snippet, event: currentEvent });
  return;
}
```

No other chat page logic changes. UTF-8 chunk splitting (#1-4), UI threading, AbortController lifecycle (#1-13) all deferred.

### C3 — Abort propagation — `backend/src/routes/chat.ts` + `backend/src/lib/langgraph-client.ts`

- Expose an optional `signal: AbortSignal` parameter on `langgraphClient.streamRun(...)` that is passed as the `signal` to the underlying `fetch` to LangGraph `/threads/{id}/runs/stream`.
- In the `streamSSE` handler, call `stream.onAbort(() => controller.abort())` where `controller` is a per-request `AbortController` whose signal is forwarded to `langgraphClient.streamRun`.
- Verify: client closes tab at 5 s → backend log shows `client disconnected, cancelling LangGraph run` → LangGraph log shows cancellation → Ollama stops billing.

### C4 — Validation & docs

- Playwright script reproducing the flow from `docs/CHAT-DEBUG-PROMPT.md` §Playwright MCP: login, navigate to chat, send message, wait up to 70 s, assert assistant message rendered and console has no unhandled errors.
- Save screenshot to `docs/audit-2026-04-17/verification/chat-W1-ok.png`.
- Append to `docs/AUDIT-2026-04-17.md` §7 P0 item 3 the commit SHA and date.

## Data flow

No schema changes. No new env vars. No new routes. No new dependencies (Hono already supplies `streamSSE` in `hono/streaming`).

## Error handling

- **Backend** `streamSSE` handler wraps the LangGraph fetch in try/catch; on error, emit `event: error` frame with `{code, message}` (same contract as today) and let `streamSSE` close the connection.
- **Frontend** parse failures are now logged (no behavior change) but still swallow to avoid crashing the reader on a single malformed frame.
- **Abort** client disconnects propagate to LangGraph; if LangGraph returns 499 / closes, backend emits `event: done` and closes cleanly.

## Testing

- **Manual Playwright repro** is the authoritative test for this wave (E2E).
- Existing unit tests in `backend/src/routes/chat.test.ts` (if present) must still pass. If Bun test infra covers SSE handlers, add a test that asserts the response is chunked and flushed (not buffered); if infra doesn't cover streaming, rely on E2E only.

## Rollout

1. Branch: `fix/chat-sse-crlf-and-stream-flush`
2. Local dev: Bun backend + Next.js frontend pointing at local or staging LangGraph → verify with Playwright locally.
3. Commit backend change (C1 + C3). Commit frontend change (C2). Commit docs (C4).
4. Push → Vercel auto-deploy frontend, GitHub Actions `deploy-vps.yml` deploys backend to VPS.
5. Run Playwright against prod URL; if green, done. If red, revert both commits (single branch revert is atomic).

## Success criteria

- [ ] POST chat message → assistant response renders fully in the browser, no "emptyResponse" banner.
- [ ] Browser console shows zero `SyntaxError` on SSE frames.
- [ ] VPS Caddy log shows no `unexpected EOF` entries for `/api/chat/stream*` during the test window.
- [ ] LangGraph log shows `Background run succeeded` and the run output matches what the browser rendered.
- [ ] Closing the browser tab at 5 s into a run triggers cancellation in LangGraph logs within 2 s.
- [ ] `docs/AUDIT-2026-04-17.md` §7 P0 item 3 updated with commit SHA.
- [ ] Screenshot saved at `docs/audit-2026-04-17/verification/chat-W1-ok.png`.

## Risks

- **Hono `streamSSE` event-name contract mismatch** — if the helper prefixes `data: ` differently than the current manual implementation, frontend parser could break. Mitigation: inspect `hono/streaming` source and match output byte-for-byte; add a small integration test.
- **Abort propagation races** — `onAbort` handler firing during event emission could double-close. Mitigation: guard with a `cancelled` flag.
- **LangGraph `dev` mode in production (C-09) is unrelated** — C-09 sits upstream of this work. W1 does not fix it; if LangGraph crashes mid-run W1 won't prevent the chat from breaking that way. That belongs to W3.
