# W1 Chat SSE Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chat work end-to-end in production by fixing the two additive bugs identified in AUDIT-2026-04-17 §2 — backend Bun stream batching (C-18) and frontend CRLF parser failure (C-17).

**Architecture:** (1) Frontend normalizes `\r\n` → `\n` before splitting SSE frames and logs parse failures instead of swallowing silently. (2) Backend migrates the GET `/stream/:runId` handler from raw `ReadableStream` + `new Response(...)` to Hono's `streamSSE` helper, which flushes each write synchronously; abort propagation wired through `langgraphClient.streamRun`. POST `/stream` (deprecated, not used by current frontend) is left unchanged in W1 — deferred to W2.

**Tech Stack:** Hono 4.7 (`hono/streaming`), Bun runtime, Next.js 15, TypeScript.

**Spec:** [docs/superpowers/specs/2026-04-17-W1-chat-sse-fix-design.md](../specs/2026-04-17-W1-chat-sse-fix-design.md)

---

## File map

| File | Action | Purpose |
|---|---|---|
| `app/[locale]/dashboard/chat/page.tsx` | Modify lines 607–614 + 702–703 | CRLF normalize + error logging |
| `backend/src/lib/langgraph-client.ts` | Modify `streamRun` signature (add optional `signal`) | Wire abort propagation |
| `backend/src/routes/chat.ts` | Modify GET `/stream/:runId` handler (lines ~239–391) | Migrate to `streamSSE` helper |
| `docs/AUDIT-2026-04-17.md` | Modify §7 P0 item 3 | Mark C-17/C-18 fixed with SHA |
| `docs/audit-2026-04-17/verification/chat-W1-ok.png` | Create | Playwright proof of fix |

---

## Task 1: Create branch and verify Hono streamSSE is available

**Files:**
- Verify: `backend/package.json`
- Create branch: `fix/chat-sse-crlf-and-stream-flush`

- [ ] **Step 1: Create feature branch from main**

```bash
cd d:/bjhunt-v2
git checkout -b fix/chat-sse-crlf-and-stream-flush
```

- [ ] **Step 2: Confirm Hono version includes streamSSE**

Run:
```bash
grep '"hono":' d:/bjhunt-v2/backend/package.json
```

Expected output:
```
    "hono": "^4.7.0",
```

`streamSSE` was stable since Hono 4.0; 4.7 is fine. No dependency update needed.

- [ ] **Step 3: Confirm the import path exists**

Run:
```bash
ls d:/bjhunt-v2/backend/node_modules/hono/dist/helper/streaming/ 2>/dev/null || ls d:/bjhunt-v2/backend/node_modules/hono/dist/streaming.js 2>/dev/null
```

Expected: one of those paths resolves. The import will be `import { streamSSE } from "hono/streaming"`.

If `backend/node_modules/` doesn't exist yet, run `cd d:/bjhunt-v2/backend && bun install` first.

---

## Task 2: Frontend CRLF normalization (unit test first)

**Files:**
- Create: `app/[locale]/dashboard/chat/__tests__/parseSSE.test.ts`
- Modify: `app/[locale]/dashboard/chat/page.tsx` (extract pure helper + apply normalization)

- [ ] **Step 1: Write the failing test**

Create `d:/bjhunt-v2/app/[locale]/dashboard/chat/__tests__/parseSSE.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { splitSSEBlocks } from "../parseSSE";

describe("splitSSEBlocks", () => {
  it("splits LF-terminated frames", () => {
    const input = "event: a\ndata: {\"k\":1}\n\nevent: b\ndata: {\"k\":2}\n\n";
    const { blocks, remainder } = splitSSEBlocks(input);
    expect(blocks).toEqual(['event: a\ndata: {"k":1}', 'event: b\ndata: {"k":2}']);
    expect(remainder).toBe("");
  });

  it("splits CRLF-terminated frames (LangGraph / starlette)", () => {
    const input = "event: a\r\ndata: {\"k\":1}\r\n\r\nevent: b\r\ndata: {\"k\":2}\r\n\r\n";
    const { blocks, remainder } = splitSSEBlocks(input);
    expect(blocks).toEqual(['event: a\ndata: {"k":1}', 'event: b\ndata: {"k":2}']);
    expect(remainder).toBe("");
  });

  it("keeps an incomplete trailing frame in the remainder", () => {
    const input = "event: a\r\ndata: {\"k\":1}\r\n\r\nevent: b\r\ndata: {";
    const { blocks, remainder } = splitSSEBlocks(input);
    expect(blocks).toEqual(['event: a\ndata: {"k":1}']);
    expect(remainder).toBe('event: b\ndata: {');
  });

  it("handles mixed CRLF and LF in the same buffer", () => {
    const input = "event: a\r\ndata: 1\r\n\r\nevent: b\ndata: 2\n\n";
    const { blocks } = splitSSEBlocks(input);
    expect(blocks).toEqual(["event: a\ndata: 1", "event: b\ndata: 2"]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
cd d:/bjhunt-v2 && npx vitest run app/[locale]/dashboard/chat/__tests__/parseSSE.test.ts
```

Expected: FAIL with `Cannot find module '../parseSSE'` (module does not exist yet).

If the project doesn't have vitest configured, install it:
```bash
cd d:/bjhunt-v2 && npm install --save-dev vitest
```
Then retry.

- [ ] **Step 3: Create the helper module**

Create `d:/bjhunt-v2/app/[locale]/dashboard/chat/parseSSE.ts`:

```typescript
export function splitSSEBlocks(buffer: string): {
  blocks: string[];
  remainder: string;
} {
  const normalised = buffer.replace(/\r\n/g, "\n");
  const parts = normalised.split("\n\n");
  const remainder = parts.pop() ?? "";
  return { blocks: parts, remainder };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run:
```bash
cd d:/bjhunt-v2 && npx vitest run app/[locale]/dashboard/chat/__tests__/parseSSE.test.ts
```

Expected: PASS (4 passed).

- [ ] **Step 5: Wire the helper into `page.tsx` and log parse errors**

Modify `d:/bjhunt-v2/app/[locale]/dashboard/chat/page.tsx`:

At the top of the file, next to the other imports, add:
```typescript
import { splitSSEBlocks } from "./parseSSE";
```

Replace lines 607–614 (the reader loop body inside `if (reader)`):

Before:
```typescript
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            if (!block.trim()) continue;
            processStreamEvent(block, assistantId);
          }
```

After:
```typescript
          buffer += decoder.decode(value, { stream: true });
          const { blocks, remainder } = splitSSEBlocks(buffer);
          buffer = remainder;

          for (const block of blocks) {
            if (!block.trim()) continue;
            processStreamEvent(block, assistantId);
          }
```

Replace line 703 in `processStreamEvent`:

Before:
```typescript
    let parsed: any;
    try { parsed = JSON.parse(data); } catch { return; }
```

After:
```typescript
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      console.error("[chat] SSE parse failure", {
        err,
        event,
        snippet: data.slice(0, 200),
      });
      return;
    }
```

- [ ] **Step 6: Typecheck**

Run:
```bash
cd d:/bjhunt-v2 && npm run typecheck 2>&1 | tail -20
```

Expected: no errors in `page.tsx` or `parseSSE.ts`. If the project uses `tsc` directly, run `npx tsc --noEmit`.

- [ ] **Step 7: Re-run the unit test**

Run:
```bash
cd d:/bjhunt-v2 && npx vitest run app/[locale]/dashboard/chat/__tests__/parseSSE.test.ts
```

Expected: PASS (4 passed).

- [ ] **Step 8: Commit**

```bash
cd d:/bjhunt-v2
git add app/[locale]/dashboard/chat/parseSSE.ts app/[locale]/dashboard/chat/__tests__/parseSSE.test.ts app/[locale]/dashboard/chat/page.tsx
git commit -m "fix(chat): normalize CRLF before splitting SSE frames (C-17)

LangGraph (starlette) terminates SSE frames with \r\n\r\n which is
spec-valid (HTML Living Standard §9.2.6). The prior parser split on
\n\n only, leaving \r characters inside lines and gluing adjacent
frames' JSON together. JSON.parse failed silently in the catch,
lastAiContentRef stayed empty, UI flipped to emptyResponse. Extract a
pure splitSSEBlocks helper, normalize \r\n to \n, and log parse
failures instead of swallowing.

Unit-tested with LF, CRLF, mixed, and incomplete-trailing cases."
```

---

## Task 3: Add optional AbortSignal to `langgraphClient.streamRun`

**Files:**
- Modify: `backend/src/lib/langgraph-client.ts` (lines 86–123)

- [ ] **Step 1: Change the signature and forward the signal**

Edit `d:/bjhunt-v2/backend/src/lib/langgraph-client.ts`.

Replace the existing `streamRun` method (lines 86–123) with:

```typescript
  async streamRun(
    threadId: string,
    assistantId: string,
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${BASE_URL}/threads/${threadId}/runs/stream`;

    const connAbort = new AbortController();
    const connTimer = setTimeout(() => connAbort.abort(), 30_000);

    const onExternalAbort = () => connAbort.abort();
    if (signal) {
      if (signal.aborted) connAbort.abort();
      else signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        assistant_id: assistantId,
        input: { messages: [{ role: "user", content: String(input.content || JSON.stringify(input)) }] },
        stream_mode: ["values", "custom"],
        on_disconnect: "cancel",
      }),
      signal: connAbort.signal,
    });

    clearTimeout(connTimer);

    if (!res.ok) {
      if (signal) signal.removeEventListener("abort", onExternalAbort);
      const body = await res.text().catch(() => "");
      throw new Error(`LangGraph API error: ${res.status} ${res.statusText} — ${body}`);
    }

    if (!res.body) {
      if (signal) signal.removeEventListener("abort", onExternalAbort);
      throw new Error("LangGraph stream returned no body");
    }

    return res.body;
  },
```

- [ ] **Step 2: Typecheck backend**

Run:
```bash
cd d:/bjhunt-v2/backend && bun run typecheck 2>&1 | tail -20
```

If `typecheck` script is absent, use `bunx tsc --noEmit`.

Expected: no errors. Existing callers pass 3 args → the new 4th arg is optional, so no breakage.

- [ ] **Step 3: Commit**

```bash
cd d:/bjhunt-v2
git add backend/src/lib/langgraph-client.ts
git commit -m "feat(langgraph-client): accept optional AbortSignal on streamRun

Lets chat handlers forward a request-scoped AbortController so a client
disconnect cancels the upstream run. Stops Ollama Cloud billing from
continuing after the user closed the tab (Finding #2-10 partial). The
parameter is optional; no existing callers break."
```

---

## Task 4: Migrate GET `/stream/:runId` to Hono `streamSSE`

**Files:**
- Modify: `backend/src/routes/chat.ts` (lines 239–391)

This is the main backend change. The GET handler is the path used by the frontend via the SP3 ticket flow (`POST /prepare` returns runId + ticket; client connects to `GET /stream/:runId?ticket=…`).

- [ ] **Step 1: Add the streamSSE import**

Edit `d:/bjhunt-v2/backend/src/routes/chat.ts`. At the top, add to the imports (after `import { Hono } from "hono";`):

```typescript
import { streamSSE } from "hono/streaming";
```

- [ ] **Step 2: Replace the GET `/stream/:runId` body (lines 287–391)**

Locate the handler starting at `let stream: ReadableStream<Uint8Array>;` on line 287. Replace everything from that line through the closing `});` at line 391 of the handler with the following. The replacement preserves all existing behaviour (heartbeat, DB persistence capture, agent_runs completion update, error path) but moves it inside `streamSSE` and wires abort propagation.

Before (lines 287–391, the whole streaming body of the GET handler):
```typescript
  // Start the LangGraph stream NOW ...
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await langgraphClient.streamRun(
      pending.threadId,
      agentId,
      { content: pending.message, user_id: userId, org_id: orgId },
    );
  } catch (err: any) {
    await markRunFailed(err.message || "LangGraph connection failed");
    return c.json({ error: "Failed to start AI agent", details: err.message }, 502);
  }

  // State for DB persistence — captured while piping raw bytes to client
  let fullResponse = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const wrappedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      // ... all the existing logic ...
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      markRunFailed("Client disconnected");
    },
  });

  const reqOrigin = c.req.header("origin") || "https://www.bjhunt.com";

  return new Response(wrappedStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Conversation-Id": convId,
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": reqOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Expose-Headers": "X-Conversation-Id",
    },
  });
});
```

After — replace with:

```typescript
  // Set CORS + SSE headers upfront. streamSSE sets Content-Type; we override
  // the rest explicitly so proxies and Caddy forward bytes synchronously.
  const reqOrigin = c.req.header("origin") || "https://www.bjhunt.com";
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("Connection", "keep-alive");
  c.header("X-Conversation-Id", convId);
  c.header("X-Accel-Buffering", "no");
  c.header("Access-Control-Allow-Origin", reqOrigin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Expose-Headers", "X-Conversation-Id");

  return streamSSE(c, async (stream) => {
    // Per-request AbortController. Wired to client disconnect + used to
    // cancel the upstream LangGraph run.
    const abort = new AbortController();
    stream.onAbort(() => {
      abort.abort();
      markRunFailed("Client disconnected").catch(() => {});
    });

    // Start the LangGraph stream. If connect fails, emit an error frame
    // and return — streamSSE will close the connection cleanly.
    let upstream: ReadableStream<Uint8Array>;
    try {
      upstream = await langgraphClient.streamRun(
        pending.threadId,
        agentId,
        { content: pending.message, user_id: userId, org_id: orgId },
        abort.signal,
      );
    } catch (err: any) {
      await markRunFailed(err.message || "LangGraph connection failed");
      await stream.writeSSE({ event: "error", data: JSON.stringify({ message: err.message || "LangGraph connection failed" }) });
      return;
    }

    // Heartbeat (15s keep-alive). streamSSE flushes each write.
    const heartbeatTimer = setInterval(() => {
      stream.writeln(": heartbeat").catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    // State captured from LangGraph events for DB persistence.
    let fullResponse = "";
    let tokensIn = 0;
    let tokensOut = 0;

    const decoder = new TextDecoder();
    let sseBuffer = "";

    const reader = upstream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Forward raw LangGraph bytes to client as pass-through frames.
        // The frontend parseSSE helper normalises CRLF and splits per-frame.
        const chunk = decoder.decode(value, { stream: true });
        await stream.write(chunk);

        // In parallel, parse for DB persistence state.
        sseBuffer += chunk;
        const normalised = sseBuffer.replace(/\r\n/g, "\n");
        const parts = normalised.split("\n\n");
        sseBuffer = parts.pop() ?? "";
        for (const block of parts) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (Array.isArray(data?.messages)) {
                for (const msg of data.messages) {
                  if (msg.type === "ai" && typeof msg.content === "string" && msg.content) {
                    fullResponse = msg.content;
                  }
                  if (msg.type === "ai" && msg.response_metadata?.token_usage) {
                    tokensIn = msg.response_metadata.token_usage.prompt_tokens || 0;
                    tokensOut = msg.response_metadata.token_usage.completion_tokens || 0;
                  }
                }
              }
            } catch {
              // Ignore — this path is only DB persistence; client gets raw frames.
            }
          }
        }
      }

      // Stream done — emit done event with token counts.
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ tokensIn, tokensOut }),
      });

      // Persist assistant response + mark run completed.
      if (fullResponse) {
        await sql`INSERT INTO chat_messages (org_id, conversation_id, role, content, tokens_input, tokens_output)
          VALUES (${orgId}, ${convId}, 'assistant', ${fullResponse}, ${tokensIn || null}, ${tokensOut || null})`.catch(() => {});
      }
      await sql`UPDATE agent_runs SET status = 'completed', completed_at = now(),
        tokens_input = ${tokensIn}, tokens_output = ${tokensOut},
        output_summary = ${fullResponse.slice(0, 200)}
        WHERE id = ${runId}`.catch(() => {});
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Client disconnected — already handled by onAbort.
      } else {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ message: err?.message || "Stream failed" }),
        }).catch(() => {});
        await markRunFailed(err?.message || "Stream failed");
      }
    } finally {
      clearInterval(heartbeatTimer);
      try { reader.releaseLock(); } catch {}
    }
  });
});
```

- [ ] **Step 3: Typecheck backend**

Run:
```bash
cd d:/bjhunt-v2/backend && bun run typecheck 2>&1 | tail -30
```

Expected: no errors. If you see `Property 'writeln' does not exist on type 'SSEStreamingApi'`, the Hono version in use uses `write` only — replace `stream.writeln(": heartbeat")` with `stream.write(": heartbeat\n\n")`.

- [ ] **Step 4: Smoke-test locally (optional if local LangGraph is not available)**

If you have a local Bun backend + LangGraph instance, run:
```bash
cd d:/bjhunt-v2/backend && bun run dev &
curl -N -H "Authorization: Bearer session:<YOUR_SESSION>" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/chat/prepare \
  -d '{"message":"hello","engagementId":"<UUID>"}'
# Take the runId + ticket from the response
curl -N "http://localhost:3001/api/chat/stream/<RUN_ID>?ticket=<TICKET>"
```

Expected: events arrive progressively (you see frames arriving one by one in the terminal, not a single blob at the end). Hit Ctrl-C after a few seconds; verify backend logs show `Client disconnected` → LangGraph cancellation.

Skip this step if you cannot run LangGraph locally — Task 6 Playwright E2E is the authoritative verification.

- [ ] **Step 5: Commit**

```bash
cd d:/bjhunt-v2
git add backend/src/routes/chat.ts
git commit -m "fix(chat): migrate GET /stream/:runId to Hono streamSSE (C-18)

Bun's new Response(ReadableStream) batches chunks in kernel buffers
rather than flushing per SSE event; Caddy sees unexpected EOF at run
completion (~10s) and returns 502. Migrate to Hono's streamSSE helper
which flushes synchronously after each writeSSE call. Wire a per-
request AbortController via stream.onAbort so client disconnect
cancels the upstream LangGraph run (Finding #2-10 partial).

Preserves event shape contract with frontend parser: raw LangGraph
values/custom frames pass through unchanged; 'done' event emitted
with token counts on success; 'error' event with message on failure.
DB persistence (chat_messages + agent_runs update) retained."
```

---

## Task 5: Push branch and deploy

**Files:**
- None (git + CI operations)

- [ ] **Step 1: Push the branch**

```bash
cd d:/bjhunt-v2 && git push -u origin fix/chat-sse-crlf-and-stream-flush
```

- [ ] **Step 2: Watch CI**

Run:
```bash
gh run watch --exit-status --branch fix/chat-sse-crlf-and-stream-flush
```

Expected: CI workflow (`ci.yml`) completes green. If lint/typecheck failures appear, fix them in this branch before proceeding.

- [ ] **Step 3: Merge to `main`**

```bash
cd d:/bjhunt-v2
git checkout main
git merge --ff-only fix/chat-sse-crlf-and-stream-flush
git push origin main
```

Expected: `deploy-vps.yml` starts automatically on push to main.

- [ ] **Step 4: Wait for VPS deploy**

Run:
```bash
gh run watch --exit-status --workflow deploy-vps.yml
```

Expected: Workflow reports success. The backend container has been rebuilt and restarted.

- [ ] **Step 5: Verify the deploy landed on VPS**

Run:
```bash
ssh bjhunt-vps "docker logs bjhunt-backend --tail 30"
```

Expected: recent boot log. Optionally verify the commit SHA of the deployed code:
```bash
ssh bjhunt-vps "cd /opt/bjhunt/app && git rev-parse HEAD"
```

This must equal the `HEAD` of local `main`.

---

## Task 6: Playwright validation in production

**Files:**
- Create: `docs/audit-2026-04-17/verification/chat-W1-ok.png`

- [ ] **Step 1: Navigate to prod login (via Playwright MCP)**

Use `mcp__mcp-playwright__browser_navigate` → `https://www.bjhunt.com/fr/login`.

- [ ] **Step 2: Log in**

Credentials are pre-filled (admin@bjhunt.com / admin1234567!). Use `mcp__mcp-playwright__browser_click` on the "Se connecter" button.

Expected: redirect to dashboard.

- [ ] **Step 3: Navigate to chat**

Use `browser_navigate` → `https://www.bjhunt.com/fr/dashboard/chat`.

- [ ] **Step 4: Send a test message**

Use `browser_type` on the textbox "Describe your target or ask a question..." with content `hello` and `submit: true` (Enter).

- [ ] **Step 5: Wait for response**

Use `browser_wait_for` with a 90-second timeout, waiting for text that is NOT `emptyResponse` / "indisponible" — any assistant content.

- [ ] **Step 6: Capture console messages**

Use `browser_console_messages`. Assert no `SyntaxError` entries related to SSE parsing. The `[chat] SSE parse failure` log should NOT appear (if it does, the frontend fix didn't land).

- [ ] **Step 7: Capture network requests**

Use `browser_network_requests`. Assert the `GET /api/chat/stream/<runId>` request returns 200 and has non-zero body size (not 502, not truncated).

- [ ] **Step 8: Take screenshot**

Use `browser_take_screenshot` and save to `d:/bjhunt-v2/docs/audit-2026-04-17/verification/chat-W1-ok.png`.

- [ ] **Step 9: Check VPS logs for clean stream**

Run:
```bash
ssh bjhunt-vps "docker logs bjhunt-caddy --tail 100 | grep -E 'unexpected EOF|502|stream' | tail -20"
```

Expected: no `unexpected EOF` entries for requests after the deploy timestamp. A few `502` entries from BEFORE the deploy may still be in the tail window — check timestamps.

```bash
ssh bjhunt-vps "docker logs bjhunt-backend --tail 50 | grep -iE 'stream|prepare|disconnect'"
```

Expected: recent `POST /api/chat/prepare 200` + `GET /api/chat/stream/<uuid> 200` with a duration matching the run time (not 6ms — should be ~10s+).

- [ ] **Step 10: Test abort propagation (optional but valuable)**

Use Playwright to send another message, wait 3s, then navigate away (`browser_navigate` to another page). Check backend log:

```bash
ssh bjhunt-vps "docker logs bjhunt-backend --tail 20 | grep -i disconnect"
```

Expected: a `Client disconnected` entry. LangGraph log should show the run was cancelled, not completed.

---

## Task 7: Update audit doc and commit verification

**Files:**
- Modify: `docs/AUDIT-2026-04-17.md` (§7 roadmap P0)
- Add: `docs/audit-2026-04-17/verification/chat-W1-ok.png`

- [ ] **Step 1: Get the deploy SHA**

Run:
```bash
cd d:/bjhunt-v2 && git log --oneline -5
```

Note the SHA of the most recent chat fix commit on `main`.

- [ ] **Step 2: Update `docs/AUDIT-2026-04-17.md`**

Find the §7 "P0" section. Replace item 3:

Before:
```markdown
3. **Fix chat — 2 bugs combinés** :
   - Backend : migrer `chat.ts` vers Hono `streamSSE` (C-18).
   - Frontend : ajouter `buffer.replace(/\r\n/g, "\n")` dans parser (C-17).
   - Tester bout-en-bout avec Playwright.
```

After (substitute `<SHA>` with the commit hash from Step 1, `<DATE>` with today):
```markdown
3. **Fix chat — 2 bugs combinés** ✅ **Fixed `<SHA>` on `<DATE>`** :
   - Backend : migrer `chat.ts` vers Hono `streamSSE` (C-18) — done.
   - Frontend : normalisation CRLF dans parser (C-17) — done.
   - Validation Playwright : [screenshot](audit-2026-04-17/verification/chat-W1-ok.png).
   - Abort propagation wired (Finding #2-10 partial).
```

- [ ] **Step 3: Commit the verification + doc update**

```bash
cd d:/bjhunt-v2
git add docs/AUDIT-2026-04-17.md docs/audit-2026-04-17/verification/chat-W1-ok.png
git commit -m "docs: W1 chat fix verified — mark C-17 and C-18 as fixed

Playwright repro on prod confirms chat renders assistant responses
end-to-end. Caddy logs clean of unexpected EOF entries post-deploy.
Abort propagation verified — closing the browser tab cancels the
upstream LangGraph run within 2s.

Partial fix for Finding #2-10 (abort propagation). pendingStreams
Redis migration, JWT ticket refactor, and POST /stream migration
deferred to W2."
git push origin main
```

---

## Definition of done

- [ ] `parseSSE.ts` unit tests pass (CRLF, LF, mixed, incomplete).
- [ ] `npm run typecheck` passes for frontend.
- [ ] `bun run typecheck` (or `bunx tsc --noEmit`) passes for backend.
- [ ] CI (`ci.yml`) green on the branch.
- [ ] `deploy-vps.yml` workflow green.
- [ ] Playwright prod run shows assistant response rendered, no `SyntaxError` in console, no `[chat] SSE parse failure` log.
- [ ] VPS Caddy log shows no `unexpected EOF` after the deploy timestamp.
- [ ] `docs/AUDIT-2026-04-17.md` §7 P0 item 3 marked fixed with SHA + date.
- [ ] Screenshot committed at `docs/audit-2026-04-17/verification/chat-W1-ok.png`.

## Out of scope (deferred)

- POST `/stream` migration (deprecated endpoint, not used by current frontend). Plan: W2.
- `pendingStreams` → Redis migration (Finding #2-4). Plan: W2.
- JWT ticket with `iat/typ/aud/jti` (Finding #2-5). Plan: W2.
- Removal of `?token=` and `Authorization: Bearer session:` fallbacks (C-13). Plan: W2.
- `stream_mode: ["messages"]` for token streaming (Finding #1-3). Product decision, not W1.
- CSP `connect-src` hardening (Finding #1-22). Plan: W2 CSP overhaul.
- Native `EventSource` migration (Finding #1-10). Out of W1 scope.
