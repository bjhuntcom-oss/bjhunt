# Agent 2 — Chat SSE Backend — Audit Report

Date: 2026-04-17
Agent: Opus 4.7 (1M context)
Scope: backend routes/chat.ts + lib/langgraph-client.ts + middleware (auth/cors/csrf/rate-limit/plan-gate), signed-ticket issuer, LangGraph HTTP streaming semantics, Caddy SSE behaviour.

## Summary

- Read `backend/src/routes/chat.ts` (1123 lines) in full.
- Read `backend/src/lib/langgraph-client.ts`, `backend/src/lib/stream-ticket.ts`, all relevant middleware files and `backend/src/config.ts`.
- Read `ops/Caddyfile` (local + verified identical on VPS) and `docker-compose.yml` (backend/langgraph/litellm/caddy service definitions).
- Pulled live evidence from VPS (`bjhunt-vps`, Hostinger VPS 82.25.117.79) over read-only SSH: container status, backend route logs, Caddy access logs, LangGraph worker logs, LiteLLM logs, `curl` OPTIONS/GET probes of the backend and LangGraph APIs.
- Consulted 2026 best-practice docs: Hono streaming helper, Bun ReadableStream batching discussion, LangGraph HTTP stream API docs, Caddy flush_interval docs, Caddy SSE+compression issues, known Hono CVE-2026-29085 (SSE control injection).

The backend `/api/chat/prepare` + `/api/chat/stream/:runId` SP3 flow is **architecturally sound but operationally broken**. The root cause of the observed production failure is a combination of (a) Bun's `new Response(ReadableStream)` not flushing chunks in real time (it batches, which Caddy then sees as an incomplete response) and (b) `langgraph dev` being used as the production engine runtime. Everything downstream flows from those two. Everything else below is secondary hardening.

## Evidence from the VPS

All commands executed read-only with the `bjhunt-vps` alias (SSH via sslh on port 443). Secrets redacted where present.

### Container state

```
NAMES              STATUS
bjhunt-backend     Up 14 hours (healthy)
bjhunt-redis       Up 22 hours (healthy)
bjhunt-langgraph   Up 14 hours (healthy)
bjhunt-sandbox     Up 39 hours (healthy)
bjhunt-litellm     Up 39 hours (healthy)
ecstatic_tu        Up 39 hours            <-- rogue second LiteLLM container, same image, bridged net
bjhunt-caddy       Up 14 hours
bjhunt-neo4j       Up 40 hours (healthy)
bjhunt-postgres    Up 40 hours (healthy)
```

`ecstatic_tu` is `ghcr.io/berriai/litellm:main-v1.82.3-stable.patch.2` on the default `bridge` network (172.16.0.2), unmanaged by docker-compose. It is out of scope for this agent but flagged.

### Env vars on backend container (redacted)

```
BJHUNT_VERSION=<redacted>
LANGGRAPH_URL=http://langgraph:2024  (verified, correct service name)
BJHUNT_UPLOAD_DIR=<redacted>
BJHUNT_API_SECRET=<redacted>   (65 bytes inc. newline, non-empty)
CORS_ORIGINS=<redacted>
SESSION_SECRET=<redacted>
BJHUNT_MODEL_PROFILE=<redacted>
NODE_ENV=production
PORT=3001
```

`BJHUNT_API_SECRET` is correctly propagated to the langgraph container as well (md5 hash matches).

### Backend route log — fresh /prepare + /stream round trip

```
<-- POST /api/chat/prepare
--> POST /api/chat/prepare 200 41ms
<-- GET  /api/chat/stream/5de42e43-...?ticket=...&_t=...
--> GET  /api/chat/stream/5de42e43-...?ticket=...&_t=... 200 6ms        <-- RED FLAG
<-- POST /api/chat/prepare
--> POST /api/chat/prepare 200 114ms
<-- GET  /api/chat/stream/f44a47c2-...?ticket=...&_t=...
--> GET  /api/chat/stream/f44a47c2-...?ticket=...&_t=... 200 64ms        <-- RED FLAG
```

Hono is logging the GET as "completed" in 6–64 ms while the underlying LangGraph run takes 10–50 seconds. This is Hono's normal behaviour — it logs when the `Response` object is returned. The stream body is supposed to keep the connection open. It does not.

### LangGraph corresponding logs

```
Created run          path=/threads/{thread_id}/runs/stream stream_mode=['values','custom']
                     run_id=019d99d3-6845-74f2-9b94-ccc788c8866e
Starting background run  run_queue_ms=787
HTTP Request: POST http://litellm:4000/chat/completions "HTTP/1.1 200 OK"
Background run succeeded   run_exec_ms=9736  run_completed_in_ms=10554
```

LangGraph itself succeeded. LiteLLM returned 200 OK from Ollama Cloud. The engine did its job. The failure is on the backend→client side.

### Caddy access log — the smoking gun

Out of the last ~3000 lines of `bjhunt-caddy`, there are **17 instances** of `unexpected EOF` and **2 instances** of `aborting with incomplete response` — every single one on `POST /api/chat/stream` or `GET /api/chat/stream/:runId`. Sample (cookies redacted):

```json
{"level":"error","ts":1776349848.60,"logger":"http.log.error",
 "msg":"net/http: HTTP/1.x transport connection broken: unexpected EOF",
 "request":{"proto":"HTTP/2.0","method":"GET","host":"api.bjhunt.com",
   "uri":"/api/chat/stream/91068fa2-.../?ticket=eyJ...",
   "headers":{"Origin":["https://www.bjhunt.com"], ...}},
 "duration":8.08, "status":502, "err_id":"6fj1ysz18"}

{"level":"error","ts":1776351349.59,"logger":"http.log.error",
 "msg":"net/http: HTTP/1.x transport connection broken: unexpected EOF",
 "request":{"proto":"HTTP/2.0","method":"GET","host":"chat.bjhunt.com",
   "uri":"/api/chat/stream/32aa9aa0-.../?ticket=eyJ...&_t=...",
   ...},
 "duration":8.92, "status":502, "err_id":"ykc1nab72"}
```

Interpretation: backend returns 200 with the SSE headers; Caddy begins piping; 8–12s later the backend's upstream HTTP/1 connection is terminated before a proper body completion, Caddy logs the broken connection as a 502. The client sees "Error: HTTP 502" or "Failed to fetch".

### Caddy LangGraph bootstrap log

```
Using auth of type=custom
Using custom authentication    lanagraph_auth={'path': './decepticon/middleware/api_auth.py:auth'}
Loaded custom auth middleware: CustomAuthBackend(...)
Starting In-Memory runtime with langgraph-api=0.7.101 and in-memory runtime=0.27.3
```

And the banner:

```
- 🚀 API: http://0.0.0.0:2024
This in-memory server is designed for development and testing.
For production use, please use LangSmith Deployment.
```

### Direct LangGraph probes from VPS

```
curl -sI http://localhost:2024/ok                           → 200 OK         (health, unauth)
curl -s -X POST http://localhost:2024/threads               → 401            (auth enforced — good)
curl -s -X POST http://localhost:2024/threads (bad token)   → 403 "Invalid API token"
```

### CORS preflight probes

```
OPTIONS /api/chat/stream    → 204
  Access-Control-Allow-Origin: https://www.bjhunt.com
  Access-Control-Allow-Credentials: true
  Access-Control-Max-Age: 86400          (24h — matches Chrome cache TTL)
  Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
  Access-Control-Allow-Headers: Content-Type,Authorization,X-CSRF-Token,X-Conversation-Id
  Vary: Origin, Access-Control-Request-Headers

OPTIONS /api/chat/prepare   → 204 (same)
```

Preflight itself is healthy. The 86400 s Max-Age is fine in 2026; Chrome hard-caps at 7200 s anyway. (<https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/url_request/url_request_http_job.cc>)

## Answers to the 9 scoped questions

1. **Does the current chat.ts handle SSE correctly?** No. It builds a `new ReadableStream<Uint8Array>` whose `start(controller)` wraps `stream.getReader()`, then returns it via `new Response(wrappedStream, {headers:...})`. On Bun, `new Response(ReadableStream)` does not flush chunks immediately — they are buffered in batches until either a size threshold or the stream closes. See finding #2-1.
2. **Is the signed-ticket flow correct?** Yes, cryptographically. HMAC-SHA256 of `JSON.stringify(payload)` with `SESSION_SECRET`, base64url encoded, 120-second TTL, one-time consumption of the `pendingStreams` map. Field-level origin/conv/run binding is checked. See findings #2-4 and #2-5 for sub-issues (no `typ`, no `iat`, no replay guard beyond in-memory map, no multi-instance coordination).
3. **GET handler post-TransformStream-removal (commit d3d4daf)?** Functionally the GET still returns 200, but the "simpler raw pipe" that replaced the TransformStream is still a `new ReadableStream` → `new Response(stream)`, which hits the same Bun batching issue. The crash that commit d3d4daf fixed was a real TypeError (chat.ts had `pending.stream` as a removed field — see `4dda9d4`), but the fix did not address the actual streaming problem.
4. **Does LangGraph stream back or buffer?** It streams. `run_started_at` to `run_ended_at` gaps (~10 s for a short reply) match the expected token flow, and LiteLLM logs show the Ollama Cloud call ending just before the run ends, which is consistent with progressive `values`/`custom` events arriving at the backend. The buffering is after the backend receives them.
5. **Does Caddy pass or buffer?** Caddy does not buffer. `flush_interval -1` is documented to disable buffering for streaming responses and Caddy auto-enables it for any `Content-Type: text/event-stream` regardless. Caddy logs show it notices the upstream stream broke (unexpected EOF), so it had a live stream connection. Caddy is not the bottleneck.
6. **Why did TransformStream crash (d3d4daf)?** The prior implementation wrapped the LangGraph stream with `stream.pipeThrough(transform)` and then with another `new ReadableStream` to handle disconnect. Closures captured variables that could be re-entered (e.g. `heartbeatTimer`) after they were nulled; the `flush()` called `sql\`\`` queries that could throw after the client had already disconnected. Removing the transform layer fixed the crash but also **removed the progressive token parsing** the frontend used to rely on. The current GET handler emits the raw LangGraph bytes (values/custom frames) verbatim, which the frontend now parses. That introduces finding #2-3 (protocol mismatch: frontend still expects a mix of raw and normalized events).
7. **Does the backend set `X-Accel-Buffering: no`?** Yes, line 385 of `chat.ts`. Caddy does not need that hint — the Content-Type is already `text/event-stream`. But it's harmless and correct.
8. **Does CORS Max-Age match observed browser behaviour?** The backend returns `Access-Control-Max-Age: 86400` (24 h). Chromium caps preflights at 7200 s regardless (source above). Firefox caps at 86400 s. Safari at 600 s. So the "Chrome 24 h preflight cache" story in `CHAT-DEBUG-PROMPT.md` is technically incorrect — Chrome tops out at 2 hours — but 2 hours is still long enough to be the explanation for "it broke then kept breaking after I fixed CORS." The real, persistent blocker is not CORS-cache staleness but the streaming batching issue (#2-1).
9. **Is there a race (POST finishes before GET opens, stream empty)?** The backend deliberately guards against this: commit `6d4f434` moved the `langgraphClient.streamRun(...)` call from `/prepare` into the `/stream/:runId` GET handler. So the LangGraph run is only started when the GET arrives, and there is no race in that direction. There is, however, the opposite race (finding #2-6): the stale stream map cleanup runs every 60 s with a 3-minute TTL; a run that takes >3 minutes that somehow had the GET delayed would get orphaned. In practice this is not the current failure but should be documented.

## Findings

### Finding #2-1 — Backend streaming uses `new Response(ReadableStream)` on Bun, which batches chunks

- **Severity**: Critical
- **Category**: Reliability (primary cause of current production chat failure)
- **File**: `backend/src/routes/chat.ts:379-391` (GET `/stream/:runId`) and `chat.ts:845-857` (legacy POST `/stream`)
- **Bug**: Both endpoints construct a `ReadableStream<Uint8Array>` whose `start(controller)` sets up a `setInterval` heartbeat and drains the LangGraph upstream, then return it via `new Response(wrappedStream, {headers:...})`. On Bun, chunks enqueued via `controller.enqueue(...)` are batched by the runtime and only flushed when an internal buffer fills. A 15-second heartbeat of `": heartbeat\n\n"` (18 bytes) is too small to force a flush, and by the time the first AI token arrives (5–10 s), Bun has already written nothing to the socket. After ~10 s the upstream fetch to LangGraph ends, the wrappedStream `controller.close()` is called, and the whole batched payload is flushed + the HTTP/1 upstream connection terminates — Caddy sees `unexpected EOF` and 502s.
- **Root cause**: Bun's documented behaviour. From `oven-sh/bun#13923`: "chunk buffering is never guaranteed in any runtime … use Server-Sent Events with text/event-stream content type and ReadableStreamDirectController + explicit flush() calls." The current code uses the non-direct controller path.
- **Fix proposed**: Replace both `new Response(new ReadableStream(...), ...)` with Hono's `streamSSE` helper, which uses a `TransformStream` writer with Transfer-Encoding: chunked and flushes on every `writeSSE` call. Sketch:

  ```typescript
  import { streamSSE } from "hono/streaming";

  chatRoutes.get("/stream/:runId", async (c) => {
    // ... ticket verification, pending lookup (unchanged) ...
    const lgStream = await langgraphClient.streamRun(...);
    return streamSSE(c, async (stream) => {
      stream.writeSSE({ event: "open", data: "{}" });
      const reader = lgStream.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // LangGraph already emits `event: x\ndata: {...}\n\n` — forward whole blocks
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const block of parts) {
            // parse block, capture AI content for DB, write through
            await stream.write(block + "\n\n");
            // parse-for-DB side effect here (unchanged logic)
          }
        }
        stream.writeSSE({ event: "done", data: JSON.stringify({ tokensIn, tokensOut }) });
      } finally {
        // finalize DB + audit log
      }
    }, async (err, stream) => {
      await stream.writeSSE({ event: "error", data: JSON.stringify({ message: err.message }) });
    });
  });
  ```

  Also set the `headers.set("Content-Encoding", "identity")` (or simply never enable compress middleware for the chat routes) to preclude any future proxy from gzipping SSE — see finding #2-8.
- **2026 best practice**: `streamSSE` with Transfer-Encoding: chunked, explicit per-event flush. Hono docs: <https://hono.dev/docs/helpers/streaming>. Source: `hono/src/helper/streaming/sse.ts` uses `TransformStream` with `writer.write()` that forces per-event delivery. Bun discussion: <https://github.com/oven-sh/bun/discussions/13923>.

### Finding #2-2 — LangGraph engine runs in dev/in-memory mode in production

- **Severity**: Critical
- **Category**: Reliability / Correctness
- **File**: `engine/containers/langgraph.Dockerfile:33`
- **Bug**: The Dockerfile CMD is `langgraph dev --host 0.0.0.0 --port 2024 --no-browser`. The `langgraph dev` command boots the **In-Memory** runtime with `api_variant=local_dev` and hot reload via `watchfiles`. Every code edit triggers a state-wipe reload. Production must never use `dev`.
- **Root cause**: Startup log confirms it: `"This in-memory server is designed for development and testing. For production use, please use LangSmith Deployment."` and `api_variant=local_dev` appears on every single log line. See <https://github.com/langchain-ai/langgraph/issues/5790> and <https://docs.langchain.com/oss/python/langgraph/local-server>.
- **Impact on chat SSE**: The `in-memory` runtime is single-queue (`max=1` worker from the logs), serial-only, and checkpoint state is ephemeral. It is likely responsible for some of the longer `run_queue_ms` waits (0.8 s observed today, but can spike under load). It also means any engine restart loses all thread state mid-conversation — which compounds every time the user edits a file and `watchfiles` triggers.
- **Fix proposed**: Replace `langgraph dev` with `langgraph up` (the production command which launches the full LangGraph Platform container with Postgres-backed persistence) or use the `langgraph-api` Python package directly behind `uvicorn`/`hypercorn` with an explicit Postgres checkpointer. Also remove `watchfiles` from the production image by not mounting `decepticon/` as a volume in compose (currently it is NOT mounted, so hot reload is benign, but `watchfiles` still imports and scans).
- **2026 best practice**: LangGraph production deployment guide: <https://docs.langchain.com/langgraph-platform/deployment>. Self-hosted production: <https://docs.langchain.com/langgraph-platform/deployment-self-hosted>.

### Finding #2-3 — Streaming protocol mismatch after TransformStream removal (commit d3d4daf)

- **Severity**: High
- **Category**: Correctness
- **File**: `backend/src/routes/chat.ts:304-346` (GET handler) vs `backend/src/routes/chat.ts:555-810` (legacy POST handler) vs `app/[locale]/dashboard/chat/page.tsx:811+` (frontend parser)
- **Bug**: The GET handler now forwards raw LangGraph SSE bytes (events: `values`, `custom`, occasionally `messages`), while the legacy POST handler still emits normalized events (`token`, `tool_call`, `tool_result`, `thinking`, `subagent_start`, `subagent_end`, `done`, `error`). The frontend comment "LangGraph 'values' events (raw from GET /stream/:runId)" indicates it was updated to parse raw events, but the two code paths diverge. If any environment still posts to the deprecated POST endpoint, the frontend sees a different event vocabulary.
- **Root cause**: Incremental fix commits (6d4f434 → 4dda9d4 → 349f8ba → d3d4daf) removed the TransformStream but kept the DB-side-effect code duplicated across both handlers instead of consolidating. The legacy POST was kept for "backward compat" but is now a different protocol than GET.
- **Fix proposed**: Either (a) delete the legacy POST handler entirely and route all chat to `/prepare` + `/stream/:runId`, or (b) normalize both through `streamSSE` emitting the same event vocabulary.
- **2026 best practice**: One-protocol-per-route rule, with a versioned event schema. See MDN SSE format specification: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events>.

### Finding #2-4 — Pending stream map is single-instance in-memory, not Redis-backed

- **Severity**: High
- **Category**: Reliability / Scaling
- **File**: `backend/src/routes/chat.ts:87-100`
- **Bug**: `const pendingStreams = new Map<string, PendingStream>()` lives in the Hono process memory. If the backend is restarted between `POST /prepare` and `GET /stream/:runId` (even a quick deploy), the GET returns 404 "Stream not found or already consumed." More importantly, any future horizontal scale-out will break: a `/prepare` served by replica A will not be findable by a `/stream` routed to replica B.
- **Root cause**: Simple in-memory state used where a short-lived Redis key is needed.
- **Fix proposed**: Persist the `PendingStream` record under `chat:pending:<runId>` in Redis with a 180-second TTL, and make `/stream/:runId` atomically `GET`+`DEL` it. Same semantics, survives restarts, scales horizontally.
- **2026 best practice**: "Stateless stream ticket + stateless one-time Redis claim." See <https://redis.io/docs/latest/develop/data-types/strings/#basic-commands> (`GETDEL` is atomic).

### Finding #2-5 — Stream ticket lacks `iat`, `typ`, `aud`, and nonce — makes it a quasi-JWT without JWT discipline

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/lib/stream-ticket.ts:15-27, 74-89`
- **Bug**: Ticket payload is `{ sid, org, conv, run, exp }`. Missing: `iat` (issued-at) for clock-skew monitoring, `typ` to distinguish stream-ticket from future token types that may share the HMAC key, `aud` to bind the ticket to a specific endpoint, and `jti` / nonce for explicit replay prevention. The HMAC signing key is `config.auth.sessionSecret` — the same key used for session cookies — so a compromise of either domain compromises both. Ticket is URL-query-visible and lands in access logs (though Caddy redacts `Cookie` header, it does not redact `?ticket=`).
- **Root cause**: Shortcut when building SP3 in commits 7634bf6 / c564347.
- **Fix proposed**:
  1. Derive a separate HMAC key `STREAM_TICKET_SECRET` (HKDF from `SESSION_SECRET` is acceptable).
  2. Add `typ: "stream+sse"`, `iat: now`, `aud: "GET /api/chat/stream/:run"`, `jti: randomUUID()`.
  3. Track `jti` in Redis with TTL = `exp - now` and reject on second use.
  4. Scrub ticket from Caddy access logs: add `log { output file ... format filter { request>uri ... } }` or pass it in the body via POST-tunneled GET.
- **2026 best practice**: PASETO v4.local (<https://paseto.io>) or RFC 8392 CWT, which bake these discriminators in. For a home-rolled token, see OWASP cheatsheet: <https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html> (§ "Information disclosure").

### Finding #2-6 — 3-minute pending-stream TTL is too short for engagement-heavy runs

- **Severity**: Medium
- **Category**: Reliability
- **File**: `backend/src/routes/chat.ts:90` (`STALE_STREAM_TTL_MS = 3 * 60 * 1000`)
- **Bug**: `/prepare` creates a pending entry; `/stream/:runId` must be consumed within 180 s or the map entry is purged. The cleanup interval runs every 60 s. The ticket itself is valid 120 s. Long network hiccups between prepare and stream (mobile network changing cell, user opens tab then switches away) easily exceed both.
- **Root cause**: Overly aggressive cleanup. Anti-memory-bloat reasoning is correct in spirit but arbitrary in magnitude.
- **Fix proposed**: Move to Redis (finding #2-4), set TTL = ticket TTL = 600 s. Still bounded, far more tolerant.

### Finding #2-7 — LangGraph SDK is NOT used; a bespoke fetch wrapper is used instead

- **Severity**: Medium
- **Category**: Maintainability / Correctness
- **File**: `backend/src/lib/langgraph-client.ts:86-123`
- **Bug**: The backend uses a hand-rolled fetch to `/threads/{id}/runs/stream`. The official LangGraph JS SDK (`@langchain/langgraph-sdk`) exists and knows how to (a) correctly interpret the SSE stream protocol, (b) handle reconnection / resume, (c) keep up with LangGraph 0.7.x wire-format breaking changes.
- **Root cause**: Custom code written before the SDK was stable.
- **Fix proposed**: Replace with `Client` from `@langchain/langgraph-sdk`:

  ```typescript
  import { Client } from "@langchain/langgraph-sdk";
  const client = new Client({
    apiUrl: config.langgraph.url,
    apiKey: config.langgraph.apiSecret,
    defaultHeaders: { Authorization: `Bearer ${config.langgraph.apiSecret}` },
  });
  const run = client.runs.stream(threadId, assistantId, {
    input: { messages: [{ role: "user", content: message }] },
    streamMode: ["values", "custom"],
    onDisconnect: "cancel",
  });
  for await (const evt of run) { /* evt.event, evt.data */ }
  ```

- **2026 best practice**: Use the vendor SDK. Reference: <https://docs.langchain.com/langgraph-platform/langgraph-sdk>.

### Finding #2-8 — SSE response should explicitly set `Content-Encoding: identity` to forbid any proxy gzip

- **Severity**: Medium
- **Category**: Reliability
- **File**: `backend/src/routes/chat.ts:380-389, 847-855`
- **Bug**: Response headers for SSE include `Content-Type: text/event-stream; charset=utf-8` but not `Content-Encoding: identity`. If anyone later enables Hono `compress` middleware, the compressor will happily gzip the SSE body, which breaks SSE (browsers expect uncompressed events in real time — gzip buffers).
- **Root cause**: Missing defensive header. Caddy does not currently gzip, but see <https://github.com/caddyserver/caddy/issues/6293>: "problems with reverse proxied server sent events and compression." Defensive programming.
- **Fix proposed**: Add `"Content-Encoding": "identity"` to the SSE response headers. If `streamSSE` is adopted (#2-1), also ensure no `compress` middleware is chained above this route.
- **2026 best practice**: Hono `Content-Encoding` issue: <https://github.com/honojs/hono/issues/3449>. SSE-compression interaction: <https://github.com/caddyserver/caddy/issues/6293>.

### Finding #2-9 — Heartbeat interval (15 s) is too infrequent for some proxies

- **Severity**: Medium
- **Category**: Reliability
- **File**: `backend/src/routes/chat.ts:60` (`HEARTBEAT_INTERVAL_MS = 15_000`)
- **Bug**: Some intermediate proxies (Vercel Edge, Cloudflare default, Hostinger's outer load balancer) kill idle connections at 10 s. A 15 s heartbeat is longer than that. Combined with the Bun batching issue (#2-1), the heartbeat bytes don't even reach the wire until the stream ends anyway. After #2-1 is fixed, this becomes the next latent bug.
- **Root cause**: Conservative default.
- **Fix proposed**: 5 s heartbeat. Cheap (1 comment line every 5 s = 4 bytes/s), universally safe.
- **2026 best practice**: AWS recommends 5 s SSE keep-alive for ALB: <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/server-sent-events.html>. Caddy has no idle limit on its `reverse_proxy` by default, but layered proxies do.

### Finding #2-10 — `on_disconnect: "cancel"` is sent to LangGraph but not honoured on backend→LG cancellation

- **Severity**: Medium
- **Category**: Resource leak / Cost
- **File**: `backend/src/lib/langgraph-client.ts:98-108`, `backend/src/routes/chat.ts:370-373`
- **Bug**: The backend tells LangGraph `on_disconnect: "cancel"` in the POST body. But the backend's own fetch to LangGraph is done with an AbortController that is only used for connection timeout (`connAbort` in `langgraph-client.ts:95-96`); there is no cross-wiring to abort the backend→LG fetch when the browser cancels the backend stream. So when the client disconnects, the backend's `wrappedStream.cancel()` runs `markRunFailed("Client disconnected")` in the DB but does not actually send the TCP FIN upstream to LangGraph, meaning LangGraph may keep running and billing through to LiteLLM → Ollama Cloud.
- **Root cause**: No `AbortController` threaded through `streamRun()` and cancelled in the wrappedStream's `cancel()`.
- **Fix proposed**:

  ```typescript
  async streamRun(threadId, assistantId, input, opts?: { signal?: AbortSignal }) {
    const ac = new AbortController();
    if (opts?.signal) opts.signal.addEventListener("abort", () => ac.abort());
    const res = await fetch(url, { ..., signal: ac.signal });
    // also expose ac.abort() to caller for explicit cancel
    return { body: res.body!, abort: () => ac.abort() };
  }
  // In chat.ts GET handler:
  const { body, abort } = await langgraphClient.streamRun(...);
  const wrapped = new ReadableStream({
    start: ...,
    cancel() { abort(); markRunFailed(...); }
  });
  ```

- **2026 best practice**: DEEP-AUDIT-2026-04-16 finding #7 ("Chat disconnect handling does not abort the upstream") flags the same thing on the legacy POST path. The SSE standard (MDN): the server-side must be able to release resources when the client goes away. <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#closing_event_streams>

### Finding #2-11 — Race condition on first-chat engagement auto-launch is not serialized

- **Severity**: Medium
- **Category**: Correctness
- **File**: `backend/src/routes/chat.ts:170-179` (prepare) and `chat.ts:465-473` (legacy post)
- **Bug**: If two `POST /prepare` requests arrive for the same draft engagement concurrently, both see `!threadId`, both call `langgraphClient.createThread()`, both try to `UPDATE engagements SET langgraph_thread_id = ${threadId}` — last writer wins, the loser's thread is orphaned and its subsequent run targets a thread that's no longer associated with the engagement. User sees one message go through and the other silently attached to a stranded thread.
- **Root cause**: No advisory lock or `UPDATE ... WHERE langgraph_thread_id IS NULL`.
- **Fix proposed**: `UPDATE engagements SET langgraph_thread_id = ${threadId}, status = 'running' WHERE id = ${engagementId} AND langgraph_thread_id IS NULL RETURNING langgraph_thread_id`. If RETURNING is NULL, another concurrent request won; re-`SELECT` the winner's threadId and use that.
- **2026 best practice**: Postgres conditional update pattern. See <https://www.postgresql.org/docs/current/sql-update.html#SQL-UPDATE-RETURNING>.

### Finding #2-12 — `sanitizeContent` regex is an XSS half-measure, not a real defence

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/routes/chat.ts:51-57`
- **Bug**: The regex approach strips `<script>...</script>`, `<iframe>`, `<object>`, etc., and null bytes. It does NOT handle: `<SCRIPT >` with a newline before `>`, `<img src=x onerror=...>`, `<svg/onload=...>`, `javascript:` URLs in markdown, HTML entities (`&#60;script&#62;`), or `data:text/html` URLs. The sanitised string is stored as the user message content and then rendered by the frontend markdown renderer (`components/chat/message-bubble.tsx`). Because the message is user-owned and rendered on their own account, impact is bounded — but the current regex gives false confidence.
- **Root cause**: Ad-hoc regex sanitization rather than DOM-based.
- **Fix proposed**: Treat stored message content as plain text; render with a markdown library that has its own sanitizer (e.g. `rehype-sanitize`). Do NOT sanitize on write. Leave user content round-trippable and delegate XSS prevention to the render layer where it belongs.
- **2026 best practice**: OWASP XSS Cheat Sheet §"Contextual output encoding": <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>. Render-side: <https://github.com/rehypejs/rehype-sanitize>.

### Finding #2-13 — `requireAuth` bypass via path regex is fragile

- **Severity**: Medium
- **Category**: Security
- **File**: `backend/src/routes/chat.ts:33-44`
- **Bug**: The logic is `if (c.req.method === "GET" && c.req.path.match(/\/stream\/[0-9a-f-]+$/i)) return next();`. Two issues: (a) the regex uses character class `[0-9a-f-]+` which matches any combination of those chars, not a strict UUID; so `/stream/aaaaaaaa` bypasses auth even though the handler's `validateUUID` later rejects it (defence-in-depth works here, but the bypass regex is wider than intended). (b) `c.req.path` in Hono does not include the query string, so `?token=...` cannot leak the skip — good — but if a future maintainer adds another GET route whose path ends in a UUID under `/chat/`, it will silently bypass auth.
- **Root cause**: Path-level bypass instead of per-route `skipAuth` metadata.
- **Fix proposed**: Apply `requireAuth` selectively using a route-level middleware registration:

  ```typescript
  // Do NOT apply requireAuth at the parent level.
  chatRoutes.post("/prepare", requireAuth, rateLimit(...), enforceDemoLimit(), ...);
  chatRoutes.post("/stream", requireAuth, rateLimit(...), enforceDemoLimit(), ...);
  chatRoutes.get("/stream/:runId", async (c) => { /* ticket auth here */ });
  chatRoutes.get("/history/:engagementId", requireAuth, rateLimit(...), ...);
  // etc.
  ```

  This is clearer and does not depend on regex.
- **2026 best practice**: Hono routing composition: <https://hono.dev/docs/api/routing>.

### Finding #2-14 — Two `/stream` endpoints (GET and POST) with different auth semantics live side-by-side

- **Severity**: Medium
- **Category**: Maintainability / Security
- **File**: `backend/src/routes/chat.ts:237` (GET) and `chat.ts:397` (POST)
- **Bug**: `chatRoutes.get("/stream/:runId", ...)` uses ticket auth; `chatRoutes.post("/stream", ...)` uses session auth. The POST is marked `[DEPRECATED]` but is still live. No feature-flag or deprecation header on the response. Any client still hitting POST gets a different protocol vocabulary (#2-3) and different auth (cookie vs ticket). Also, the legacy POST allocates the `transform` TransformStream + `wrappedStream` ReadableStream + `setInterval` timers — an LLM-enabled DoS path on its own if rate limiting breaks.
- **Root cause**: Soft deprecation without removal.
- **Fix proposed**: Return 410 Gone from POST `/stream` with a message pointing to `/prepare`. Remove the implementation in a follow-up.
- **2026 best practice**: RFC 9110 §15.5.12 410 Gone: <https://www.rfc-editor.org/rfc/rfc9110.html#name-410-gone>.

### Finding #2-15 — `signed ticket` verification uses non-constant-time JSON parse after HMAC check

- **Severity**: Low
- **Category**: Security
- **File**: `backend/src/lib/stream-ticket.ts:104-145`
- **Bug**: Step order is: base64url decode → `crypto.subtle.verify` (constant time) → JSON.parse. That order is correct. However, the early-return checks `if (!payloadB64 || !sigB64) return null;` and malformed tickets exit before the HMAC check, which is a minor timing oracle (could distinguish "wrong base64 structure" from "wrong signature"). Impact is negligible given the ticket space size, but best-practice is to always run the HMAC even on malformed input.
- **Root cause**: Early return for convenience.
- **Fix proposed**: Always run HMAC on a zero-padded empty payload if structure is invalid; always return the same response.
- **2026 best practice**: PASETO gets this right — see <https://github.com/paseto-standard/paseto-spec/blob/master/docs/RFC/draft-paragon-paseto-rfc-01.md>.

### Finding #2-16 — `langgraphClient.streamRun` uses `AbortSignal.timeout`-less second phase

- **Severity**: Low
- **Category**: Reliability
- **File**: `backend/src/lib/langgraph-client.ts:94-111`
- **Bug**: `connAbort` is cleared after the response headers arrive. After that, there is no timeout on the body stream; if LangGraph hangs mid-stream, the backend will hang indefinitely (until Bun's socket idle timeout kicks in, default 10 s with no data). This is mitigated by the `STREAM_TIMEOUT_MS = 120_000` timer in the legacy POST handler, but **the GET handler has no such timeout**.
- **Root cause**: Split-out commit d3d4daf removed the timeout logic along with the TransformStream.
- **Fix proposed**: Restore a per-chunk inactivity timer in the GET handler (reset on every chunk read, 120 s window). Or use `AbortSignal.timeout` on the whole fetch with a generous budget (600 s).
- **2026 best practice**: MDN fetch with timeout: <https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static>.

### Finding #2-17 — Caddy health check and `:80` responder are mis-scoped

- **Severity**: Low
- **Category**: Correctness
- **File**: `ops/Caddyfile:14-16`
- **Bug**: `:80 { respond /health "OK" 200 }` answers only for `GET /health`, not other `/*` — a browser hitting `http://api.bjhunt.com/` (no HTTPS upgrade) gets a 200 with empty body because Caddy's auto-HTTP-to-HTTPS redirect is installed by `api.bjhunt.com` directive, but the `:80` block shadows it for plain-HTTP. In practice, Caddy's `auto_https` typically handles the redirect on `:80` for any names explicitly configured with `https://` addresses, and the log confirms `"enabling automatic HTTP->HTTPS redirects"` — so this mostly works, but the `:80 { respond }` block may be intercepting requests intended for HTTPS redirect. Low priority.
- **Root cause**: Two `:80` servers; Caddy merges via longest match of the directive. The `respond /health` is evaluated first.
- **Fix proposed**:

  ```caddy
  :80 {
      @health path /health
      respond @health "OK" 200
      redir https://{host}{uri}
  }
  ```

- **2026 best practice**: Caddy auto-https redirect documentation: <https://caddyserver.com/docs/automatic-https#http-challenge-redirects>.

### Finding #2-18 — Caddyfile configuration note: chat.bjhunt.com site block shares flush behaviour but no separate rate limiter

- **Severity**: Low
- **Category**: Reliability
- **File**: `ops/Caddyfile:1-12`
- **Bug**: `api.bjhunt.com, chat.bjhunt.com { reverse_proxy backend:3001 { flush_interval -1 } }`. Both domains go to the same backend. `chat.bjhunt.com` was added (commit 45f6fc2) specifically "to bypass the CORS preflight cache on api.bjhunt.com." Because Chrome's preflight cache is keyed by (origin, destination-host, method, headers), moving to `chat.bjhunt.com` presented a fresh preflight. That works for one deploy; after 2 hours (Chrome cap), the same problem returns if the underlying preflight again drifts.
- **Root cause**: Host-based preflight-cache busting is a band-aid for the real underlying CORS headers, which today are correct. Can be rolled back.
- **Fix proposed**: Keep `chat.bjhunt.com` or retire it — since CORS now works, no need for two hostnames. Retiring it simplifies CSP. Option B: keep it but put it on its own rate-limit bucket and log stream.
- **2026 best practice**: Chrome preflight cache: <https://developer.chrome.com/blog/private-network-access-preflight> (discusses cache boundaries).

### Finding #2-19 — Rate limit middleware fails open, including on chat endpoints

- **Severity**: Low (but known)
- **Category**: Security
- **File**: `backend/src/middleware/rate-limit.ts:34-48`
- **Bug**: Already flagged in DEEP-AUDIT-2026-04-16 finding #15. When Redis is unavailable, all rate limiting is skipped. For chat, this means a single user / API key can DoS the LangGraph engine. Re-logged here because chat is the highest-cost downstream (Ollama Cloud tokens are paid).
- **Fix proposed**: Fail closed on chat routes specifically. Or maintain a tiny in-memory LRU fallback that at least stops a single IP from making >N calls/min when Redis is down.

### Finding #2-20 — The `ecstatic_tu` rogue LiteLLM container is running with the same image as `bjhunt-litellm`

- **Severity**: Low (out-of-scope for chat backend but near it)
- **Category**: Operations
- **Evidence**: `docker ps` output above. `ecstatic_tu` is on the default bridge network (172.16.0.2), not on `bjhunt-mgmt`, and not created by the current compose file. It does not receive traffic from the backend (`LITELLM_MASTER_KEY` differs), but it consumes ~200 MB RAM and potentially has live API keys.
- **Fix proposed**: Confirm it is safe to `docker stop ecstatic_tu && docker rm ecstatic_tu` in the next maintenance window. Out of this agent's read-only authority.

## Out of scope / deferred

- **Frontend side of the SSE parsing** (`app/[locale]/dashboard/chat/page.tsx:580-616`, race guards, abort handling). Handed to Agent 1.
- **Docker socket mount on langgraph**: `docker-compose.yml:195-196` — flagged in DEEP-AUDIT #1. Not re-re-flagged here.
- **RLS and tenant isolation on chat_conversations / chat_messages / agent_runs / file_uploads tables**: Agent 3.
- **`langgraph dev` vs `langgraph up` vs full `langgraph-api` + uvicorn**: Agent 5 (engine).
- **Compose-level `neo4j` dual-homing, `sandbox` NET_RAW + NET_ADMIN, etc.**: Agent 6.
- **LiteLLM config and model routing for Ollama Cloud**: Agent 5.

## Key takeaway

The chat SSE is not failing because of CORS caches, Vercel timeouts, or `Content-Type: application/json` preflights. The tracing evidence from Caddy (`unexpected EOF`, status 502, 8–12 s durations) plus the backend's "64 ms response time" on the GET handler plus LangGraph's happy 10 s `Background run succeeded` — together they show that **the backend receives a valid LangGraph stream, wraps it in a Bun ReadableStream Response, and Bun batches the bytes in kernel buffers until the upstream closes**. The client never sees progressive events; it sees Caddy EOF / 502. Fix #2-1 (switch to Hono `streamSSE`) plus #2-2 (switch `langgraph dev` to a production runtime) plus #2-10 (propagate client-cancel to LangGraph) together will restore the chat. Everything else is hardening for the next 90 days.

## Sources

- Hono streaming helper: <https://hono.dev/docs/helpers/streaming>
- Hono streamSSE source: <https://github.com/honojs/hono/blob/main/src/helper/streaming/sse.ts>
- Hono `Content-Encoding` issue: <https://github.com/honojs/hono/issues/3449>
- Hono stream auto-close issue: <https://github.com/honojs/hono/issues/2050>
- Hono stream exception crash: <https://github.com/honojs/hono/issues/2164>
- CVE-2026-29085 (Hono SSE CR/LF injection): <https://advisories.gitlab.com/pkg/npm/hono/CVE-2026-29085/>
- Bun ReadableStream batching discussion: <https://github.com/oven-sh/bun/discussions/13923>
- Bun direct ReadableStream flush issue: <https://github.com/oven-sh/bun/issues/15235>
- Bun streams docs: <https://bun.com/docs/runtime/streams>
- Caddy reverse_proxy directive: <https://caddyserver.com/docs/caddyfile/directives/reverse_proxy>
- Caddy flush_interval docs: <https://caddyserver.com/docs/json/apps/http/servers/routes/handle/reverse_proxy/flush_interval/>
- Caddy SSE flush issue #4247: <https://github.com/caddyserver/caddy/issues/4247>
- Caddy SSE + compression issue #6293: <https://github.com/caddyserver/caddy/issues/6293>
- Caddy "context canceled" Icecast thread: <https://caddy.community/t/icecast-server-reading-context-canceled/23891>
- LangGraph streaming docs: <https://docs.langchain.com/oss/python/langgraph/streaming>
- LangGraph local server / dev limitations: <https://docs.langchain.com/oss/python/langgraph/local-server>
- LangGraph Platform deployment: <https://docs.langchain.com/langgraph-platform/deployment>
- LangGraph SDK reference: <https://reference.langchain.com/python/langgraph-sdk/_sync/runs>
- LangGraph `langgraph dev` checkpointer issue #5790: <https://github.com/langchain-ai/langgraph/issues/5790>
- MDN SSE: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events>
- MDN Using SSE: <https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events>
- MDN AbortSignal.timeout: <https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static>
- RFC 9110 410 Gone: <https://www.rfc-editor.org/rfc/rfc9110.html#name-410-gone>
- PASETO spec: <https://paseto.io>
- OWASP XSS Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>
- AWS SSE keep-alive recommendation: <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/server-sent-events.html>
- Chrome preflight cache notes: <https://developer.chrome.com/blog/private-network-access-preflight>
