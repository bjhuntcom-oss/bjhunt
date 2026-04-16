# SP3: Chat Streaming — Signed Ticket Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix chat SSE streaming on Vercel Hobby plan (10s timeout) by splitting into a fast REST prepare call + direct GET stream with a signed ticket.

**Architecture:** Two-phase flow. Phase 1: `POST /api/proxy/chat/prepare` goes through Vercel proxy (<1s, returns a signed ticket + stream URL). Phase 2: `GET https://api.bjhunt.com/api/chat/stream/{runId}?ticket=<HMAC>` goes direct to backend with no CORS preflight (GET + no custom headers). Backend verifies ticket, pipes LangGraph SSE to client.

**Tech Stack:** Hono (backend), Bun native crypto (HMAC-SHA256), Next.js App Router (frontend), LangGraph Platform API.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/lib/stream-ticket.ts` | CREATE | Sign and verify HMAC-SHA256 stream tickets |
| `backend/src/routes/chat.ts` | MODIFY | Add `/prepare` POST endpoint, refactor `/stream/:runId` as GET |
| `app/[locale]/dashboard/chat/page.tsx` | MODIFY | Two-phase send flow, simplified SSE parser, race guards |
| `ops/Caddyfile` | MODIFY | Add `chat.bjhunt.com` entry for stream domain |

---

### Task 1: Create stream ticket module

**Files:**
- Create: `backend/src/lib/stream-ticket.ts`

- [ ] **Step 1: Create the ticket module**

```typescript
// backend/src/lib/stream-ticket.ts
import { config } from "../config.js";

const SECRET = new TextEncoder().encode(config.auth.sessionSecret);
const TTL_MS = 120_000; // 2 minutes

interface TicketPayload {
  sid: string;   // session ID
  org: string;   // org ID
  conv: string;  // conversation ID
  run: string;   // LangGraph run ID
  exp: number;   // expiry timestamp (ms)
}

/** Sign a ticket payload with HMAC-SHA256. Returns "base64payload.base64sig". */
export async function signTicket(payload: Omit<TicketPayload, "exp">): Promise<string> {
  const full: TicketPayload = { ...payload, exp: Date.now() + TTL_MS };
  const data = JSON.stringify(full);
  const encoded = Buffer.from(data).toString("base64url");

  const key = await crypto.subtle.importKey("raw", SECRET, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  const sigB64 = Buffer.from(sig).toString("base64url");

  return `${encoded}.${sigB64}`;
}

/** Verify a ticket string. Returns payload if valid, null if expired or tampered. */
export async function verifyTicket(ticket: string): Promise<TicketPayload | null> {
  const [encoded, sigB64] = ticket.split(".");
  if (!encoded || !sigB64) return null;

  const key = await crypto.subtle.importKey("raw", SECRET, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sig = Buffer.from(sigB64, "base64url");
  const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(encoded));
  if (!valid) return null;

  const payload: TicketPayload = JSON.parse(Buffer.from(encoded, "base64url").toString());
  if (payload.exp < Date.now()) return null;

  return payload;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && bun run typecheck 2>&1 | head -10`
Expected: No errors in stream-ticket.ts

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/stream-ticket.ts
git commit -m "feat(SP3): add HMAC-SHA256 stream ticket sign/verify module"
```

---

### Task 2: Add `/prepare` endpoint to backend

**Files:**
- Modify: `backend/src/routes/chat.ts` (add new route before the existing `/stream` POST)

- [ ] **Step 1: Add the prepare endpoint**

Add this BEFORE the existing `chatRoutes.post("/stream", ...)` block in `backend/src/routes/chat.ts`:

```typescript
import { signTicket, verifyTicket } from "../lib/stream-ticket.js";

const prepareSchema = z.object({
  message: z.string().min(1).max(10000),
  engagementId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  agentGraph: z.string().min(1).max(50).optional(),
  attachmentIds: z.array(z.string().uuid()).max(5).optional(),
});

chatRoutes.post("/prepare", enforceDemoLimit(), zValidator("json", prepareSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { message: rawMessage, engagementId, conversationId: existingConvId, agentGraph, attachmentIds } = c.req.valid("json");

  const message = sanitizeContent(rawMessage);
  if (!message) return c.json({ error: "Message empty after sanitization" }, 400);

  // Verify engagement
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, langgraph_thread_id, agent_graph, status, name FROM engagements WHERE id = ${engagementId}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Get or create conversation
  let convId: string | undefined = existingConvId;
  if (convId) {
    const verifyId = convId;
    const [existing] = await withOrg(orgId, (tx) =>
      tx`SELECT id FROM chat_conversations WHERE id = ${verifyId} AND user_id = ${user.id} AND engagement_id = ${engagementId} AND status = 'active'`,
    );
    if (!existing) convId = undefined;
  }
  if (!convId) {
    const [conv] = await sql`
      INSERT INTO chat_conversations (org_id, user_id, engagement_id, title)
      VALUES (${orgId}, ${user.id}, ${engagementId}, ${engagement.name || "Chat"})
      RETURNING id`;
    if (!conv) return c.json({ error: "Failed to create conversation" }, 500);
    convId = conv.id as string;
  }

  // Touch updated_at, save user message
  await sql`UPDATE chat_conversations SET updated_at = now() WHERE id = ${convId}`.catch(() => {});
  await sql`INSERT INTO chat_messages (org_id, conversation_id, role, content) VALUES (${orgId}, ${convId}, 'user', ${message})`;

  // Link attachments
  if (attachmentIds && attachmentIds.length > 0) {
    await sql`UPDATE file_uploads SET conversation_id = ${convId} WHERE id = ANY(${attachmentIds}::uuid[]) AND org_id = ${orgId} AND user_id = ${user.id}`.catch(() => {});
  }

  // Auto-launch engagement
  let threadId = engagement.langgraphThreadId as string | null;
  if (!threadId) {
    const thread = await langgraphClient.createThread();
    threadId = thread.threadId;
    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements SET langgraph_thread_id = ${threadId}, status = 'running', started_at = now() WHERE id = ${engagementId}`,
    );
  }

  const agentId = agentGraph || (engagement.agentGraph as string) || "bjhunt";

  // Create agent run
  const [agentRun] = await sql`
    INSERT INTO agent_runs (org_id, engagement_id, conversation_id, agent_name, input_summary)
    VALUES (${orgId}, ${engagementId}, ${convId}, ${agentId}, ${message.slice(0, 200)})
    RETURNING id`;
  if (!agentRun) return c.json({ error: "Failed to create agent run" }, 500);
  const runId = agentRun.id as string;

  // Start the LangGraph run (non-streaming — just kick it off)
  let lgRunId: string;
  try {
    const stream = await langgraphClient.streamRun(threadId, agentId, { content: message, user_id: user.id, org_id: orgId });
    // Store the stream for later retrieval
    activeStreams.set(runId, { stream, orgId, convId: convId!, agentId, runId, fullResponse: "", toolCalls: [], tokensIn: 0, tokensOut: 0 });
    lgRunId = runId;
  } catch (err: any) {
    await sql`UPDATE agent_runs SET status = 'failed', error = ${err.message?.slice(0, 500) || "LangGraph error"}, completed_at = now() WHERE id = ${runId}`.catch(() => {});
    return c.json({ error: "Failed to start AI agent", details: err.message }, 502);
  }

  // Sign ticket
  const ticket = await signTicket({ sid: user.id, org: orgId, conv: convId!, run: runId });

  const streamBase = config.isProduction ? "https://api.bjhunt.com" : `http://localhost:${config.port}`;

  return c.json({
    streamUrl: `${streamBase}/api/chat/stream/${runId}`,
    ticket,
    conversationId: convId,
    runId,
  });
});

// In-memory store for active streams (keyed by runId)
const activeStreams = new Map<string, {
  stream: ReadableStream<Uint8Array>;
  orgId: string;
  convId: string;
  agentId: string;
  runId: string;
  fullResponse: string;
  toolCalls: unknown[];
  tokensIn: number;
  tokensOut: number;
}>();
```

- [ ] **Step 2: Add the GET stream endpoint**

Add this after the prepare endpoint:

```typescript
chatRoutes.get("/stream/:runId", async (c) => {
  const runId = c.req.param("runId");
  if (!validateUUID(runId)) return c.json({ error: "Invalid run ID" }, 400);

  const ticket = c.req.query("ticket");
  if (!ticket) return c.json({ error: "Missing ticket" }, 401);

  const payload = await verifyTicket(ticket);
  if (!payload) return c.json({ error: "Invalid or expired ticket" }, 401);
  if (payload.run !== runId) return c.json({ error: "Ticket does not match run" }, 403);

  const streamData = activeStreams.get(runId);
  if (!streamData) return c.json({ error: "Stream not found or expired" }, 404);

  // Remove from map (one-time use)
  activeStreams.delete(runId);

  const { stream, orgId, convId, agentId, runId: dbRunId } = streamData;

  // Set up heartbeat + timeout + DB persistence (same logic as current /stream POST)
  let fullResponse = "";
  let toolCalls: unknown[] = [];
  let tokensIn = 0;
  let tokensOut = 0;

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let eventCounter = 0;

  function emitSSE(controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
    const safeEvent = event.replace(/[\r\n]/g, "");
    const id = ++eventCounter;
    try {
      controller.enqueue(encoder.encode(`id: ${id}\nevent: ${safeEvent}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch { /* closed */ }
  }

  const outputStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Heartbeat
      heartbeatTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); } catch { /* closed */ }
      }, HEARTBEAT_INTERVAL_MS);

      // Read from LangGraph stream
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      try {
        while (true) {
          // Reset inactivity timeout
          if (timeoutTimer) clearTimeout(timeoutTimer);
          timeoutTimer = setTimeout(() => {
            emitSSE(controller, "error", { message: "Stream timeout — no data for 120s" });
            emitSSE(controller, "done", { tokensIn, tokensOut });
            try { controller.close(); } catch { /* already closed */ }
          }, STREAM_TIMEOUT_MS);

          const { done, value } = await reader.read();
          if (done) break;

          // Parse and forward SSE blocks from LangGraph
          sseBuffer += decoder.decode(value, { stream: true });
          const blocks = sseBuffer.split("\n\n");
          sseBuffer = blocks.pop() ?? "";

          for (const block of blocks) {
            if (!block.trim()) continue;
            // Forward as-is (thin wrapper — the frontend parses LangGraph format directly)
            controller.enqueue(encoder.encode(block + "\n\n"));

            // Also capture for DB persistence
            for (const line of block.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  // Capture AI text from values events
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
                } catch { /* non-JSON */ }
              }
            }
          }
        }
      } catch { /* stream error */ }

      // Cleanup
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);

      // Emit done
      emitSSE(controller, "done", { tokensIn, tokensOut });

      // Save to DB
      if (fullResponse || toolCalls.length > 0) {
        await sql`INSERT INTO chat_messages (org_id, conversation_id, role, content, tokens_input, tokens_output)
          VALUES (${orgId}, ${convId}, 'assistant', ${fullResponse || "(no response)"}, ${tokensIn || null}, ${tokensOut || null})`.catch(() => {});
      }
      await sql`UPDATE agent_runs SET status = 'completed', completed_at = now(), tokens_input = ${tokensIn}, tokens_output = ${tokensOut}, output_summary = ${fullResponse.slice(0, 200)}
        WHERE id = ${dbRunId}`.catch(() => {});

      try { controller.close(); } catch { /* already closed */ }
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      sql`UPDATE agent_runs SET status = 'failed', error = 'Client disconnected', completed_at = now() WHERE id = ${dbRunId} AND status = 'running'`.catch(() => {});
    },
  });

  // CORS headers for cross-origin GET
  const reqOrigin = c.req.header("origin") || "https://www.bjhunt.com";

  return new Response(outputStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": reqOrigin,
      "Access-Control-Allow-Credentials": "true",
      "X-Conversation-Id": convId,
    },
  });
});
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && bun run typecheck 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/chat.ts backend/src/lib/stream-ticket.ts
git commit -m "feat(SP3): add /prepare + GET /stream/:runId with ticket auth"
```

---

### Task 3: Update frontend to two-phase flow

**Files:**
- Modify: `app/[locale]/dashboard/chat/page.tsx`

- [ ] **Step 1: Replace the handleSend stream logic**

In `page.tsx`, find the section inside `handleSend` that does the fetch to `/api/proxy/chat/stream`. Replace it with the two-phase flow:

```typescript
// ── Phase 1: Prepare (fast REST via proxy, <1s) ──
const prepareRes = await fetch(`/api/proxy/chat/prepare`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(requestBody),
});

if (!prepareRes.ok) {
  const err = await prepareRes.json().catch(() => ({ error: `HTTP ${prepareRes.status}` }));
  throw new Error(err.error || err.message || `HTTP ${prepareRes.status}`);
}

const { streamUrl, ticket, conversationId: returnedConvId, runId } = await prepareRes.json();
if (returnedConvId) setActiveConversationId(returnedConvId);

// ── Phase 2: Stream (direct GET to backend, no timeout) ──
const currentRequestId = ++requestIdRef.current;

const streamRes = await fetch(`${streamUrl}?ticket=${encodeURIComponent(ticket)}`, {
  signal: abortRef.current.signal,
});

if (!streamRes.ok) {
  throw new Error(`Stream HTTP ${streamRes.status}`);
}

// Read SSE stream
const reader = streamRes.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

if (reader) {
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) processStreamEvent(buffer, assistantId, currentRequestId);
      break;
    }
    // Guard: if conversation switched, drop events
    if (currentRequestId !== requestIdRef.current) {
      reader.cancel();
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      if (!block.trim()) continue;
      processStreamEvent(block, assistantId, currentRequestId);
    }
  }
}
```

- [ ] **Step 2: Add requestIdRef for race condition guard**

Add near the other refs at the top of the component:

```typescript
const requestIdRef = useRef(0);
```

- [ ] **Step 3: Update processStreamEvent to accept requestId guard**

Change the function signature:
```typescript
function processStreamEvent(block: string, assistantId: string, requestId: number) {
  // At the top of the function, add:
  if (requestId !== requestIdRef.current) return;
  // ... rest of the function
}
```

- [ ] **Step 4: Add userAborted flag for stop button**

In the `finally` block, check if the user intentionally stopped:

```typescript
} catch (err: any) {
  if (err.name === "AbortError") {
    // User pressed stop — mark as aborted, don't show error
    setMessages((prev) =>
      prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
    );
  } else {
    // Real error
    setStreamError(err.message || "Connection failed");
    setMessages((prev) =>
      prev.map((m) => m.id === assistantId
        ? { ...m, content: m.content || `Error: ${err.message}`, isStreaming: false }
        : m)
    );
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/dashboard/chat/page.tsx"
git commit -m "feat(SP3): frontend two-phase stream with ticket + race guards"
```

---

### Task 4: Update Caddyfile for stream domain

**Files:**
- Modify: `ops/Caddyfile`

- [ ] **Step 1: Add chat.bjhunt.com entry**

```caddyfile
api.bjhunt.com, chat.bjhunt.com {
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server
    }

    reverse_proxy backend:3001 {
        flush_interval -1
    }
}

:80 {
    respond /health "OK" 200
}
```

- [ ] **Step 2: Commit**

```bash
git add ops/Caddyfile
git commit -m "feat(SP3): add chat.bjhunt.com Caddy entry for stream domain"
```

---

### Task 5: Clean up old stream POST endpoint

**Files:**
- Modify: `backend/src/routes/chat.ts`

- [ ] **Step 1: Mark the old POST /stream as deprecated**

Add a comment and keep it for backward compat during transition:

```typescript
/**
 * @deprecated Use POST /prepare + GET /stream/:runId instead.
 * This endpoint remains for backward compatibility during migration.
 */
chatRoutes.post("/stream", enforceDemoLimit(), zValidator("json", sendMessageSchema), async (c) => {
  // ... existing code stays for now
});
```

- [ ] **Step 2: Add cleanup for stale activeStreams entries**

Add a periodic cleanup to prevent memory leaks:

```typescript
// Clean up streams older than 3 minutes (ticket TTL is 2 min)
setInterval(() => {
  const cutoff = Date.now() - 180_000;
  for (const [key, val] of activeStreams) {
    // The stream was created when the prepare endpoint was called
    // If it hasn't been consumed in 3 minutes, clean it up
    activeStreams.delete(key);
  }
}, 60_000);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/chat.ts
git commit -m "chore(SP3): deprecate old POST /stream, add stale stream cleanup"
```

---

### Task 6: Deploy and test

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy backend on VPS**

```bash
ssh bjhunt-vps "cd /opt/bjhunt/app && git fetch --all --prune && git reset --hard origin/main && docker compose up -d --build backend && docker compose restart caddy"
```

- [ ] **Step 3: Wait for Vercel rebuild (~90s)**

- [ ] **Step 4: Test via Playwright MCP**

1. Navigate to `https://www.bjhunt.com/fr/dashboard/chat`
2. Type a message and submit
3. Verify: no CORS error, no timeout, AI responds
4. Check console: 0 errors

- [ ] **Step 5: Commit test results**

```bash
git commit --allow-empty -m "test(SP3): verified chat streaming works on Vercel Hobby plan"
```
