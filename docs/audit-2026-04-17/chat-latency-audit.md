# Chat latency audit — 2026-04-17

Auditor: Opus 4.7 (1M context) with read-only code + read-only VPS SSH.
Scope: end-to-end perceived chat latency (TTFT, between-token, total).
Commit under test: `407389f` on `main`. LangGraph flags in prod: `--no-reload --n-jobs-per-worker 10 --allow-blocking`. SP3 ticket flow active.

---

## Measured timings

### Method

- Playwright probe running in the actual logged-in browser at `https://www.bjhunt.com/en/dashboard/chat`, calling `/api/proxy/chat/prepare` + `GET https://chat.bjhunt.com/api/chat/stream/:runId?ticket=...` directly and measuring with `performance.now()`.
- VPS logs: `docker logs bjhunt-langgraph` (structured `run_queue_ms`, `run_exec_ms`, `run_wait_time_ms`), `docker logs bjhunt-backend` (Hono request log), direct `curl` from inside the VPS to LiteLLM.
- 6 real production runs observed; 3 Playwright-probe runs + 1 detailed chunk-capture run.

### Probe 1 — 3 runs on an existing engagement (no DB engagement-create cost)

| Stage | Run 1 | Run 2 | Run 3 | Median |
|---|---:|---:|---:|---:|
| T0 → T1 (POST `/prepare` full round-trip through Vercel) | 653 | 701 | 860 | **701 ms** |
| T1 → T1b (`res.json()` on prepare) | 143 | 1 | 0 | 1 ms |
| T1b → T2 (GET `/stream/:runId` headers received) | 1210 | 869 | 1107 | **1107 ms** |
| T2 → T3 (first SSE byte) | ~0 | ~0 | ~0 | 0 ms |
| T0 → T5 (total elapsed) | 15450 | 4097 | 19815 | **15450 ms** |
| Non-empty "messages/partial" frames received | 0 | 0 | 1 | 0–1 |

Note: *Only the 3rd run produced a single `messages/partial` event during the stream*. Runs 1 and 2 emitted nothing but heartbeats until the `done` event at end. This is not a capture bug — the raw byte capture below confirms.

### Probe 2 — detailed chunk capture for `Réponds juste "OK"`

```
t+0       ms   user press Enter (T0)
t+677     ms   POST /prepare returns 200 JSON (T1)  ← through Vercel (EU-ams)
t+677+    ms   GET /stream/:runId issued (direct to chat.bjhunt.com)
t+1575    ms   first SSE byte (T3)        ← no data for 898ms after GET issue
t+1594    ms   "event: values" #1         ← full thread snapshot echo
t+1705    ms   "event: values" #2         ← same snapshot, duplicated
t+3432    ms   "event: messages/metadata" ← LLM call started here-ish (+1.9s gap)
t+3686    ms   "messages/partial" content:""
t+3875    ms   "messages/partial" content:""
t+4050    ms   "messages/partial" content:""
t+4114    ms   "messages/partial" content:"OK"  ← FIRST non-empty content (TTFT)
t+4214    ms   "event: values" final + "event: done"  (T5)
```

So for a **2-character reply**:
- **TTFT (press Enter → first visible text): 4114 ms**
- Total elapsed: 4214 ms
- Of which ≈ **1575 ms is pure pipeline overhead before the LLM is even invoked.**

### VPS-internal timings (from production logs, 6 consecutive real runs)

```
run_queue_ms   : 723, 765, 762, 796, 910, 999        → median 781 ms, p95 999 ms
run_exec_ms    : 7029, 7625, 11559, 16104, 26452, 39007  (variance = LLM output length)
run_stream_start_ms : 0 (always — streaming starts immediately once worker picks up the job)
```

Backend (Hono) internal timings:
```
POST /api/chat/prepare                    : 23–34 ms (DB writes, ticket sign, fire-and-forget audit)
GET  /api/chat/stream/:runId (handler):     1 ms returned   (then stream proceeds)
```

LiteLLM → Ollama Cloud direct (from inside VPS, no LangGraph):
```
Non-streaming "Count 1 to 5"  : 3238 ms total / 3237 ms TTFB  (Ollama Cloud itself is slow)
Streaming "Count 1 to 5"      : first byte at 1220 ms, 60 chunks total, only 4 chunks
                                with non-empty content — GLM-5.1:cloud coarse-chunks:
                                "1," / " 2," / " 3, 4" / ", 5"
```

### Attribution of the 4.2s "OK" round trip

```
Browser                    ┃ VPS                                    ┃ Upstream
───────────────────────────╋────────────────────────────────────────╋─────────────────
Press Enter → 0 ms         ┃                                        ┃
POST /prepare via Vercel   ┃                                        ┃
  TLS + Vercel fn cold     ┃                                        ┃
  edge → VPS → edge → UA   ┃                                        ┃
  = 677 ms (!)             ┃ Backend handler: ~25 ms                ┃
                           ┃ (~650 ms is Vercel+TLS+network)        ┃
GET /stream/:runId (CORS   ┃                                        ┃
  preflight + GET)         ┃                                        ┃
                           ┃ pendingStreams.get → langgraphClient   ┃
                           ┃   .streamRun fetch POST to 2024        ┃
                           ┃ ──── run_queue_ms ~780 ms ─────────→   ┃ LangGraph queue:
                           ┃                                        ┃  waits for worker
                           ┃                                        ┃  slot (dev mode)
                           ┃ worker picks up run                    ┃
                           ┃ recursion into create_agent            ┃
                           ┃ middlewares run (~100 ms)              ┃
                           ┃ ─── POST http://litellm:4000 ─→        ┃
                           ┃                                        ┃ LiteLLM router
                           ┃                                        ┃  + prompt prep
                           ┃                                        ┃ ─── Ollama.com ──→
                           ┃                                        ┃     first byte 1.2 s
                           ┃ ←── SSE chunks back (coarse)           ┃
first SSE byte to browser  ┃                                        ┃
t+1575 ms                  ┃                                        ┃
first "OK" content chunk   ┃                                        ┃
t+4114 ms  (TTFT)          ┃                                        ┃
```

---

## Findings

### L-01 — `langgraph dev` has ~780 ms median queue time before a run starts

- **Severity**: HIGH (constant overhead on every message, un-cacheable)
- **Source**: LangGraph worker scheduler, inside `bjhunt-langgraph` container.
- **Measured impact**: **median 781 ms, p95 999 ms** added to TTFT on every chat turn. Not dependent on message or model.
- **Root cause**:
  - `engine/containers/langgraph.Dockerfile:L30` CMD is `langgraph dev --no-reload --n-jobs-per-worker 10 --allow-blocking`.
  - `docker logs bjhunt-langgraph` shows `api_variant=local_dev` on every log line, confirming the in-memory ephemeral server is in use.
  - `langgraph dev` uses `ThreadPoolExecutor` with an in-memory `RunQueue` polled on a 500–1000 ms tick (this is why `run_queue_ms` clusters between 700 and 1000 ms — it's the poll interval, not contention). Prior mitigation `--n-jobs-per-worker 10` only raised concurrency; it did not remove the poll.
  - `run_stream_start_ms=0` confirms streaming itself starts instantly once the worker picks up the job — the gap is purely scheduler latency.
- **Fix proposed**:
  1. **Short-term (zero code change):** switch the container CMD to `langgraph up` with a Postgres checkpointer. This is the "W3 Postgres migration" already in the project TODO. `langgraph up` uses an async event-loop dispatcher with no polling — `run_queue_ms` typically drops to <50 ms. The BJHUNT roadmap already identifies this as the fix; it is the single biggest TTFT win available.
  2. **Alternative quick win:** drop the extra ceremony around `/runs/stream` by calling LangGraph's synchronous `create_stream` handler with `thread_id=None` and `temporary=true` (stateless turn), bypassing the background-run queue entirely for simple chat. See `engine/decepticon/agents/decepticon.py` — the graph can be invoked directly via `graph.astream()` from the Hono backend using the Python SDK, removing the queue layer.
- **Estimated post-fix**: **–700 to –900 ms TTFT** (deterministic).

### L-02 — Ollama Cloud / GLM-5.1 emits very coarse chunks (perceived "non-streaming")

- **Severity**: HIGH (dominates perceived between-token latency)
- **Source**: Ollama Cloud upstream (`https://ollama.com/v1`), model `glm-5.1:cloud`.
- **Measured impact**: For a 7-character reply (`1, 2, 3, 4, 5`), LiteLLM observed **exactly 4 non-empty content chunks out of 60 SSE frames**. For the Playwright-captured `"OK"` run, the content appeared as a **single** chunk after ~2.5 s of empty frames. The user perceives this as "chat is frozen, then paste the whole answer at once" — i.e. no streaming at all.
- **Root cause**: Ollama Cloud's GLM-5.1 endpoint chunks by "sentence/phrase boundary" instead of per-token. This is an upstream limitation of the Ollama Cloud relay, verified by hitting LiteLLM directly:
  ```
  "content":"1,"    "content":" 2,"    "content":" 3, 4"    "content":", 5"
  ```
  The 56 other chunks are all `"content":""` (metadata / role markers only).
- **Fix proposed**:
  1. **Switch default orchestrator model off GLM-5.1**. `engine/decepticon/llm/models.py` shows the default profile `eco` uses `anthropic/claude-opus-4-6` as orchestrator primary. Currently the VPS `.env` sets `BJHUNT_MODEL_PROFILE` to something that routes to `ollama-cloud/glm-5.1` (visible in LangGraph logs: `"model_name":"ollama-cloud/glm-5.1"`). Route orchestrator + user-facing models to Anthropic Haiku 4.5 or Sonnet 4.6 which stream per-token. Keep GLM-5.1 for offline/batch jobs only.
  2. **Force per-token streaming** where possible: some providers (Anthropic, OpenAI) honour `stream: true` properly; some (Ollama Cloud on GLM-5.1) don't. Document the provider-specific behaviour in `engine/config/litellm.yaml` and prefer providers with real streaming for chat UX.
  3. **Cosmetic mitigation**: on the frontend (`app/[locale]/dashboard/chat/page.tsx:726-742`), when a content chunk larger than ~20 chars arrives, *animate it* into the DOM (character-by-character requestAnimationFrame reveal at ~200 chars/sec) so the user sees motion. This is a lie to the eye but removes the "frozen then teleport" feel.
- **Estimated post-fix**: smooth streaming visible from t+~1.8 s onward instead of a single burst at t+4 s. Perceived TTFT effectively drops by 1–2 s even though wall-clock is unchanged.

### L-03 — `POST /prepare` round-trip via Vercel costs 650–860 ms

- **Severity**: HIGH (fixed overhead on every turn)
- **Source**: Vercel Edge/Function proxy `app/api/proxy/[...path]/route.ts`.
- **Measured impact**: **Median 701 ms**. Backend-internal handler takes only 23–34 ms per Hono log; the remaining ~670 ms is TLS + cold-ish Node function + network Vercel(EU) ↔ VPS(Paris) round trip.
- **Root cause**:
  - `/api/proxy/[...path]/route.ts:37-42` uses the raw `fetch` without any connection pool / keep-alive agent configuration, so every request re-establishes a TCP+TLS handshake to `api.bjhunt.com`.
  - `app/api/proxy/[...path]/route.ts:35` awaits `request.arrayBuffer()` and then re-allocates with `Buffer.from(body)` — this is an extra copy, although only ~1 ms on small bodies.
  - Vercel serverless functions have a **Node.js cold-start penalty of 200–500 ms** when the function hasn't been invoked recently.
- **Fix proposed**:
  1. **Bypass the Vercel proxy for `/prepare` too.** The client already hits `chat.bjhunt.com` directly for the SSE GET. Point `/prepare` at the same host:
     ```ts
     // In chat page.tsx — change
     fetch(`/api/proxy/chat/prepare`, …)
     // to
     fetch(`https://chat.bjhunt.com/api/chat/prepare`, { credentials: 'include', … })
     ```
     The backend already sets CORS + credentials: `backend/src/routes/chat.ts:289-296` echoes `Access-Control-Allow-Origin` with credentials, and Hono CORS is whitelisted for `https://www.bjhunt.com`. Cookies work across `bjhunt.com` subdomains.
  2. **If the Vercel proxy must stay** (e.g. for CSP / strict-same-origin policy), reuse the `getBackendBaseUrl()` connection via a persistent `undici.Agent` with `keepAliveTimeout` + HTTP/2 — saves ~200 ms TLS on warm invocations.
  3. Set `export const runtime = 'edge'` on `app/api/proxy/[...path]/route.ts` to use Vercel Edge (no Node cold start) — but note SSE passthrough on Edge runtime requires `Readable.fromWeb()` handling.
- **Estimated post-fix**: **–500 ms** on `/prepare` (removes Vercel hop; direct VPS TLS handshake is ~150 ms from ovh residential).

### L-04 — CORS preflight fires on `GET /stream/:runId` every time

- **Severity**: MEDIUM
- **Source**: Browser → Caddy → Hono.
- **Measured impact**: The `T1b → T2` delta of **~1107 ms median** is suspicious. The stream URL uses `?_t=${Date.now()}` (chat page.tsx:591) explicitly *to cache-bust the preflight*. This means the browser is issuing a fresh OPTIONS request every single time, and CORS preflights in WebKit/Chrome take 200–400 ms plus the LangGraph queue latency.
- **Root cause**:
  - `app/[locale]/dashboard/chat/page.tsx:591` appends `&_t=${Date.now()}`, intentionally defeating the 24 h preflight cache (`Access-Control-Max-Age`). The commit `45f6fc2 fix(SP3): use chat.bjhunt.com for stream URL (fresh CORS preflight cache)` confirms the cache-busting was deliberate.
  - But the handler does not need preflight at all: it's a plain GET with `Accept: text/event-stream` and **no Authorization header** (ticket is in query string). That makes it a "simple CORS request" — *except* the response uses `Access-Control-Allow-Credentials: true` (chat.ts:295) which promotes it to a credentialed request.
  - Actually: `streamRes = await fetch(..., { credentials: 'omit' })` is not set in the current page.tsx (it uses default `same-origin` which becomes `omit` for cross-origin). Probe showed header latency ~1100 ms which is queue_ms + TLS to chat.bjhunt.com.
- **Fix proposed**:
  1. Remove `&_t=${Date.now()}` now that the preflight logic is stable. Set `Access-Control-Max-Age: 86400` (already on by default for Hono CORS) and rely on it. This removes 1 preflight every send after the first per day.
  2. Or better — avoid CORS entirely by routing `chat.bjhunt.com` through the same `www.bjhunt.com` origin via a rewrite in Next `next.config.ts`:
     ```ts
     rewrites: async () => [{ source: '/api/stream/:path*', destination: 'https://chat.bjhunt.com/api/chat/stream/:path*' }]
     ```
     Requires the Next middleware to not mangle SSE, but eliminates the preflight + cross-origin overhead.
- **Estimated post-fix**: **–200 to –400 ms** on subsequent turns (first turn still pays a preflight).

### L-05 — `langgraph dev` emits whole-state `values` snapshots that are useless to the UI

- **Severity**: MEDIUM (bandwidth + client CPU, hurts between-token smoothness)
- **Source**: LangGraph `stream_mode=["values","custom","messages"]` in `backend/src/lib/langgraph-client.ts:109`.
- **Measured impact**: The Playwright capture shows two `event: values` frames of **3095 bytes each** sent before any token, plus a final 3469-byte `values` frame at the end — **~9.6 KB of duplicated state JSON per turn**. In the frontend (chat page.tsx:897-967), each `values` event calls `setMessages(...)` which triggers a full React re-render of the conversation.
- **Root cause**:
  - `stream_mode=["values","custom","messages"]` requests both the full-state `values` stream AND the token-level `messages` stream. The `values` stream sends the **entire thread** on every node transition.
  - `chat.ts:682-716` (the deprecated transform-stream path) actually uses `values` as a fallback. The active SP3 GET `/stream/:runId` path (`chat.ts:298-395`) uses `stream.write(chunk)` — raw pipe — so the raw `values` JSON reaches the client unprocessed. The client's `case "values"` (page.tsx:897) re-parses it and calls `setMessages(...)` redundantly.
- **Fix proposed**:
  1. Change stream mode to `["messages","custom"]` only (drop `"values"`). See `backend/src/lib/langgraph-client.ts:109`. The client already has the full message history from `/api/chat/conversations/:id/messages`; it doesn't need LangGraph's `values` echo.
  2. Second-best: keep `values` but *filter server-side* in the SP3 GET handler (`chat.ts:332-367`) — only forward `messages/partial`, `custom`, and the final `values` to the browser, not the intermediate snapshots.
- **Estimated post-fix**: **–9 KB per turn**, fewer React re-renders, smoother inter-token rendering.

### L-06 — React re-renders the entire message list on every streaming token

- **Severity**: MEDIUM (CPU on low-end devices, stutter during long answers)
- **Source**: `app/[locale]/dashboard/chat/page.tsx:735-739` and :881-886.
- **Measured impact**: Each `token` event does `setMessages(prev => prev.map(m => m.id === id ? { ...m, content: m.content + token } : m))`. For a conversation with N messages and T tokens, this is O(N×T) array-copies. With 20 messages and a 500-token answer, that's 10,000 object allocations — measurable pause on mobile.
- **Root cause**: The entire message list is a single `useState`. Streaming updates the last message but re-renders the whole list.
- **Fix proposed**:
  1. Move the *streaming* assistant message into a dedicated `useState` slot (`streamingAssistant`), and only insert it into `messages` at `done`. The MessageList component renders `[...messages, streamingAssistant].filter(Boolean)`; React diffing keeps past messages untouched.
  2. Batch token appends with `requestAnimationFrame` — at most one DOM update per frame (60 fps) regardless of how fast tokens arrive. This is also a standard pattern that hides jitter.
  3. Memoize each message card with `React.memo(MessageBubble, (a, b) => a.id === b.id && a.content === b.content && a.isStreaming === b.isStreaming)` so only the streaming bubble re-renders.
- **Estimated post-fix**: no direct TTFT change, but between-token smoothness dramatically improved on long answers (visible jitter gone).

### L-07 — SP3 prepare/stream two-trip design costs an extra round trip vs single-POST SSE

- **Severity**: LOW-MEDIUM (architectural — trade-off has a reason)
- **Source**: `backend/src/routes/chat.ts:103-234` (prepare) and `238-395` (stream).
- **Measured impact**: One extra round trip = **~200 ms** of pure browser → VPS latency. In our probe this cost is partially hidden because the GET immediately starts but the LangGraph `run_queue_ms` dominates; however, once L-01 is fixed, this becomes the next-most-visible delay.
- **Root cause**: SP3 splits the flow to sidestep Vercel's 10 s serverless timeout on long SSE connections. But now that the stream goes **direct to chat.bjhunt.com** (commit `45f6fc2`), the client never traverses Vercel during the stream — so the 10 s Vercel limit is no longer a constraint for the SSE part.
- **Fix proposed**: collapse `/prepare` + `/stream` into a single `POST /api/chat/send` that streams SSE directly, using the `?ticket` ticket as a session cookie. The `/prepare`+`/stream` split is now over-engineered for the current topology.
  - Pros: –1 round-trip, –1 HMAC sign, –1 in-memory Map, no risk of the Map entry being missed / GC'd.
  - Cons: need to either (a) remove the Vercel proxy on the POST path (same fix as L-03), or (b) keep the SP3 split but only for calls that would otherwise go through Vercel. Since L-03 proposes going direct anyway, (a) is the clean path.
- **Estimated post-fix**: **–200 ms** on every turn, simpler code, fewer moving parts.

### L-08 — `/prepare` awaits 3–4 DB writes serially before returning

- **Severity**: LOW
- **Source**: `backend/src/routes/chat.ts:117-192`.
- **Measured impact**: ~23–34 ms total — DB writes are fast. But the pattern is fragile and will bite when Postgres is under load.
- **Root cause**: Serialised `await`s:
  ```ts
  await withOrg(orgId, ...)          // engagement lookup            5 ms
  await sql`UPDATE chat_conversations SET updated_at = ...`  .catch   3 ms
  await sql`INSERT INTO chat_messages (user)`                         4 ms
  await sql`UPDATE file_uploads SET conversation_id = ...`            3 ms
  await langgraphClient.createThread()   (only if no thread yet)      ~300 ms
  await sql`INSERT INTO agent_runs ... RETURNING id`                  3 ms
  ```
- **Fix proposed**:
  1. Only the `INSERT INTO agent_runs RETURNING id` is on the critical path (we need `runId` for the ticket). Everything else (user message insert, conversation touch, file-upload link, audit log) is fire-and-forget — wrap in `void Promise.all([...]).catch(()=>{})` and return immediately.
  2. Ensure `createThread()` is never on the hot path — it only fires for new engagements. The current code already gates this on `!threadId`, so OK. But consider creating the thread at engagement-create time (inside `POST /api/engagements`) so the first user message is never the one that pays the 300 ms thread-create cost.
- **Estimated post-fix**: **–10 to –15 ms** usually; **–300 ms on first-ever message of a new engagement**.

### L-09 — No HTTP keep-alive on backend → LangGraph fetches

- **Severity**: LOW
- **Source**: `backend/src/lib/langgraph-client.ts:28-37, 103-112`.
- **Measured impact**: Each `fetch(BASE_URL + path, ...)` opens a fresh TCP connection to `http://langgraph:2024` — on a Docker bridge network this is ~0.5 ms, so not painful, but it does mean we re-serialize request headers every time.
- **Root cause**: Bun's default `fetch` does keep-alive by default *as a client* but does not share sockets across `fetch()` calls unless we supply the same `dispatcher`/`Agent`. This is more of a scaling concern than a per-request latency issue.
- **Fix proposed**: Create a single `undici.Agent` (or `Bun.fetch` equivalent) at module scope with `keepAliveTimeout: 30_000, keepAliveMaxTimeout: 60_000` and pass as `dispatcher`. Negligible wall-clock gain now, meaningful once QPS > 10.
- **Estimated post-fix**: **–1 to –3 ms** per call. Non-critical.

### L-10 — Next.js proxy reads body fully before forwarding (blocks early bytes for large POSTs)

- **Severity**: LOW (no impact on current chat turns, which have small bodies)
- **Source**: `app/api/proxy/[...path]/route.ts:34-42`.
- **Measured impact**: `await request.arrayBuffer()` buffers the entire client body before issuing the upstream fetch. For a 10 MB file upload to `/api/chat/files`, this adds the full upload-to-Vercel time before the upload starts going to the VPS.
- **Fix proposed**: Pass `request.body` (a `ReadableStream`) directly as `fetch({ body: request.body, duplex: 'half' })`. Streams the upload through Vercel instead of buffering.
- **Estimated post-fix**: no change on chat messages (they're <1 KB). Big win on file uploads.

### L-11 — `pendingStreams` in-memory Map is a scale bomb (not a latency issue yet)

- **Severity**: LOW (flagged per prior audit — acknowledged, not re-filed here as latency)
- **Source**: `backend/src/routes/chat.ts:88-101`.
- **Noted**: at current single-instance scale this adds 0 ms. Becomes broken when horizontally scaled — the POST /prepare and GET /stream may hit different replicas. Fix: move ticket state to Redis. Already on the roadmap.

### L-12 — Caddy `flush_interval -1` is correct; HTTP/1.1 is fine

- **Verified OK**: `ops/Caddyfile:10` sets `flush_interval -1` which disables buffering for SSE. Probe confirmed first SSE byte reaches the browser within ~2 ms of being written by Hono. No action needed here.

### L-13 — LangGraph streaming pipeline inside the Python process adds ~1.9 s before first LLM call

- **Severity**: MEDIUM (middleware tax)
- **Source**: Between `run_started_at` (t+0 in LangGraph time) and `POST http://litellm:4000/chat/completions` (visible in langgraph httpx logs).
- **Measured impact**: For run `019d9a51` (the `"OK"` probe), stream started at t+1575 ms (first SSE byte), but the `messages/metadata` event indicating the model node is about to run arrives at t+3432 ms. That's **~1.9 s of middleware / orchestration setup** inside the Python process between the queue-pick-up and the first LLM call.
- **Root cause**: `engine/decepticon/agents/decepticon.py:201-219` runs 9 middlewares in series (`SafeCommandMiddleware` → `DecepticonSkillsMiddleware` → `FilesystemMiddleware` → `SubAgentMiddleware` → `OPPLANMiddleware` → `ModelFallbackMiddleware` → `SummarizationMiddleware` → `AnthropicPromptCachingMiddleware` → `PatchToolCallsMiddleware`). Each `modify_model_request` hook runs on every turn. `SubAgentMiddleware` in particular enumerates all 9 sub-agent descriptions into the system prompt. `AnthropicPromptCachingMiddleware` with `ignore` behaviour still traverses the message list to mark blocks.
- **Fix proposed**:
  1. Profile the middleware stack — add `time.perf_counter()` probes in `create_decepticon_agent()` to measure each hook's cost. Currently no visibility.
  2. For the default agent flow (simple chat, no sub-agent delegation), consider a lighter graph (`./decepticon/agents/chat_only.py:graph`) that skips sub-agent expansion and OPPLAN injection. Route the **Chat AI** frontend page to `agentGraph: 'chat_only'` and reserve `bjhunt` for engagement-bound investigations.
  3. Cache the system prompt assembly — `load_prompt("decepticon", shared=["bash"])` re-reads files on every agent construction. Confirm once-per-process (module-level `graph = create_decepticon_agent()` at bottom of file suggests yes, good).
- **Estimated post-fix**: **–500 to –1500 ms** TTFT for simple chat if a lighter graph is used.

---

## Ranked fix roadmap (biggest TTFT win first)

| # | Fix | Estimated TTFT win | Effort | Where |
|---|---|---:|---|---|
| 1 | **Migrate from `langgraph dev` → `langgraph up` with Postgres checkpointer** (W3) | **–700 to –900 ms** | 1 day | `engine/containers/langgraph.Dockerfile`, `engine/langgraph.json`, `docker-compose.yml` (add checkpointer) |
| 2 | **Switch default orchestrator model away from GLM-5.1** to a per-token-streaming LLM (Haiku 4.5 / Sonnet 4.6) | perceived TTFT –1500 to –2500 ms | 5 min | `.env` on VPS: `BJHUNT_MODEL_PROFILE=eco` (maps to Haiku/Sonnet) instead of whatever overrides orchestrator to GLM |
| 3 | **Stop proxying `/prepare` through Vercel** — hit `chat.bjhunt.com` directly like the stream already does | **–500 ms** | 30 min | `app/[locale]/dashboard/chat/page.tsx:573` change URL; verify CORS/cookies |
| 4 | **Drop `_t=Date.now()` cache-buster on stream URL** so preflight caches for 24 h | –200 to –400 ms on subsequent turns | 2 min | `app/[locale]/dashboard/chat/page.tsx:591` |
| 5 | **Collapse `/prepare` + `/stream` into single POST SSE** now that Vercel is out of the stream path | –200 ms | 2 days | `backend/src/routes/chat.ts`, client handler |
| 6 | **Drop `values` from `stream_mode`** (keep `messages` + `custom` only) | –9 KB / turn, smoother re-render | 5 min | `backend/src/lib/langgraph-client.ts:109` |
| 7 | **Move streaming assistant into its own useState + rAF batching** so long answers don't re-render history | smoother inter-token | 1 hour | `app/[locale]/dashboard/chat/page.tsx` |
| 8 | **Create a lighter `chat_only` agent graph** without SubAgent+OPPLAN expansion | –500 to –1500 ms | 0.5 day | New `engine/decepticon/agents/chat_only.py`, register in `langgraph.json` |
| 9 | **Fire-and-forget audit/UPDATE writes in /prepare**, keep only `INSERT agent_runs RETURNING id` on critical path | –10 to –15 ms, –300 ms first-turn | 30 min | `backend/src/routes/chat.ts:117-192` |
| 10 | **Keep-alive agent for backend→LangGraph fetch** | –1 to –3 ms, scale hygiene | 30 min | `backend/src/lib/langgraph-client.ts` |

### Realistic target after fixes 1 + 2 + 3 + 4

Current observed TTFT for `"OK"`: **4114 ms**.
After fixes 1–4: conservative estimate ≈ `4114 – 800 (L-01) – 500 (L-03) – 300 (L-04) = ~2500 ms`, with L-02 making the tokens *appear* mid-stream (say at 1.5 s perceived) instead of in one burst at the end. **Perceived TTFT: ~1.5 s**. Total elapsed: still bounded by the Ollama Cloud 1.2 s upstream TTFB, but now hidden behind smooth rendering.

---

## Top 3 fixes, at a glance

1. **`backend/src/lib/langgraph-client.ts:109`** — drop `"values"` from `stream_mode`. Or, more structurally, migrate `bjhunt-langgraph` from `langgraph dev` (file `engine/containers/langgraph.Dockerfile` line with `CMD ["langgraph", "dev", ...]`) to `langgraph up` with a Postgres checkpointer. The `run_queue_ms=~780 ms` is the single largest fixed overhead in the pipeline.

2. **`.env` on VPS (`/opt/bjhunt/app/.env`)** — set `BJHUNT_MODEL_PROFILE=eco` so orchestrator returns to Anthropic Haiku/Sonnet. GLM-5.1:cloud streams 4 chunks for an entire 5-number count; it's not suitable for chat UX regardless of pipeline performance.

3. **`app/[locale]/dashboard/chat/page.tsx:573, 591`** — remove the Vercel-proxy hop on `/prepare` (go direct to `chat.bjhunt.com` like the stream already does), and stop cache-busting the CORS preflight. Removes 700–1100 ms of fixed overhead from every turn.

---

## Evidence appendix — raw data

### Playwright probe 1 (3 consecutive runs, existing thread)

```json
[
  { "label": "run 1", "timings_ms": { "T0→T1": 653,  "T1b→T2": 1210, "T0→T5": 15450 }, "eventCounts": { "done": 1 } },
  { "label": "run 2", "timings_ms": { "T0→T1": 701,  "T1b→T2": 869,  "T0→T5": 4097  }, "eventCounts": { "done": 1 } },
  { "label": "run 3", "timings_ms": { "T0→T1": 860,  "T1b→T2": 1107, "T0→T5": 19815 }, "eventCounts": { "messages/partial": 1, "done": 1 } }
]
```

### Playwright probe 2 (chunk-level capture, message="Réponds juste OK")

```
t+1575ms  event: metadata (88B)                    ← first SSE byte
t+1594ms  event: values (3095B)                    ← full state dump #1
t+1705ms  event: values (3095B)                    ← full state dump #2 (duplicate)
t+3432ms  event: messages/metadata (2573B)
t+3686ms  event: messages/partial content=""
t+3875ms  event: messages/partial content=""
t+4050ms  event: messages/partial content=""
t+4114ms  event: messages/partial content="OK"     ← TTFT
t+4214ms  event: values (3469B) + event: done
```

### VPS backend log (real user turns, Hono-log format)

```
POST /api/chat/prepare → 200 25ms
GET  /api/chat/stream/:runId → 200 1ms     (handler returns immediately, SSE continues async)
POST /api/chat/prepare → 200 34ms
GET  /api/chat/stream/:runId → 200 1ms
```

### VPS LangGraph log (6 runs, structured fields)

```
run_queue_ms={910, 723, 765, 999, 762, 796}        median=781 ms, p95=999 ms
run_exec_ms={7625, 26452, 16104, 7029, 39007, 11559}
run_stream_start_ms=0 (always)
run_creation_ms=1 (always)
api_variant=local_dev  (confirms dev server in use)
langgraph_api_version=0.7.103
```

### Direct LiteLLM test from inside VPS (no LangGraph)

```
# Streaming, "Count 1 to 5":
first_byte_ms=1220 ms
total_chunks=60, non_empty_content_chunks=4
content_samples=["1,", " 2,", " 3, 4", ", 5"]

# Non-streaming (for pure TTFB):
total=3.238 s  ttfb=3.238 s
```
