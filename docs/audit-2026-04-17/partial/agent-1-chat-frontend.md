# Agent 1 — Chat SSE Frontend — Audit Report

Date: 2026-04-17
Agent: Opus 4.7 (1M)
Domain: Chat SSE, frontend side
Environment reproduced against: https://www.bjhunt.com (Vercel) + https://api.bjhunt.com + https://chat.bjhunt.com (Hostinger VPS 82.25.117.79)

## Summary

- Files examined:
  - `d:/bjhunt-v2/app/[locale]/dashboard/chat/page.tsx` (~1657 lines)
  - `d:/bjhunt-v2/app/api/proxy/[...path]/route.ts`
  - `d:/bjhunt-v2/lib/backend-client.ts`
  - `d:/bjhunt-v2/middleware.ts`
  - `d:/bjhunt-v2/next.config.ts`
  - `d:/bjhunt-v2/components/chat/message-bubble.tsx`
  - `d:/bjhunt-v2/components/chat/chat-input.tsx`
  - `d:/bjhunt-v2/backend/src/routes/chat.ts` (for cross-reference)
  - `d:/bjhunt-v2/backend/src/lib/langgraph-client.ts` (for cross-reference)
  - `d:/bjhunt-v2/backend/src/lib/stream-ticket.ts` (for cross-reference)
  - `d:/bjhunt-v2/backend/src/middleware/cors.ts` (for cross-reference)
  - `d:/bjhunt-v2/backend/src/middleware/auth.ts` (for cross-reference)
  - `d:/bjhunt-v2/ops/Caddyfile` (for cross-reference)
- Method: static analysis + **live Playwright reproduction** + in-browser fetch harness + VPS log correlation + 2026 web research
- Top-line: **The chat is broken because the frontend SSE parser is not spec-compliant and silently fails to parse the LangGraph stream.** LangGraph (via Python starlette/FastAPI) emits SSE frames terminated by CRLF (`\r\n\r\n`), which is spec-valid per W3C/WHATWG (HTML Living Standard accepts CR, LF, or CRLF line endings). The hand-rolled parser in `chat/page.tsx` only splits on `\n\n` and `\n` — it does not strip the leftover `\r` characters. This causes two data-corruption modes at once: (a) the stream is received as one giant string because `buffer.split("\n\n")` does not cleanly separate CRLF-delimited blocks, and (b) multiple adjacent `data:` lines from different events get concatenated into the same `dataLines` array, producing invalid JSON such as `{...}\r\n{...}` that fails `JSON.parse` silently (the `catch { return; }` on line 703 swallows the error). Net result: every message reaches the browser, every byte is read, every event is enumerated, and zero of them are parsed — so `lastAiContentRef` stays empty, the assistant bubble stays empty, and the finally block flips `emptyResponse: true`, which renders as "Le moteur IA est temporairement indisponible." This is the actual bug behind every one of the ~15 "failed fix iterations": SP3 split prepare/stream is fine, Caddy is fine, CORS is fine, tickets are fine, the ticket GET returns 200 in <10s — the parser has been broken the whole time.

---

## Chat failure reproduction (Playwright)

Reproduction environment: Chrome 147 on Windows, session user `admin@bjhunt.com`.

### Timeline

| T | Event | URL | Status | Duration |
|---|---|---|---|---|
| T+0ms | `POST /api/proxy/chat/prepare` (Vercel proxy → backend) | www.bjhunt.com | 200 | 41 ms |
| T+~50ms | Response: `{ streamUrl: "https://chat.bjhunt.com/api/chat/stream/<runId>", ticket: "...", conversationId: "..." }` | | | |
| T+~50ms | `GET https://chat.bjhunt.com/api/chat/stream/<runId>?ticket=...&_t=...` | chat.bjhunt.com | 200 (text/event-stream) | ~9.6 s |
| T+9.6s | Stream closes after `event: done` frame | | | |
| T+9.6s | Parser silently discards all frames; finally block marks message empty | | | |
| T+9.7s | `PATCH /api/proxy/engagements/<id>` (auto-rename) | 200 | | |
| T+9.7s | `GET /api/proxy/chat/conversations?limit=50` (refresh) | 200 | | |

### Screenshots

- `d:/bjhunt-v2/chat-initial.png` — initial chat page, input ready
- `d:/bjhunt-v2/chat-after-send-8s.png` — 8 s after sending "Say hello in 1 sentence" — already shows empty-response banner
- `d:/bjhunt-v2/chat-empty-response.png` — final state: "Le moteur IA est temporairement indisponible."

### Browser console

0 errors, 0 warnings emitted by the app. Only noise was Kaspersky browser-protection XHRs (unrelated).

### Key raw evidence — in-browser fetch harness

I executed the prepare+stream flow directly from the live page context (bypassing the UI but using the same cookies, CSP and origin) and captured the raw SSE body plus the behavior of the exact parser the UI uses. Result:

```js
{
  prepareStatus: 200,
  streamStatus: 200,
  streamHeaders: {
    "cache-control": "no-cache, no-transform",
    "content-type": "text/event-stream; charset=utf-8",
    "x-conversation-id": "6f1bed71-...",
    "x-request-id": "Oc144Dj2UGm-91kb"
  },
  firstByteMs: 843,
  endMs: 9578,                    // 9.6 seconds total
  bodyLength: 4294,               // real content returned
  bodyContainsCRLF: true,         // <<<< root cause
  crlfBlockSep: true,
  numBlocks: 3,                   // body.split("\n\n") → 3 pieces
  parsedOk: 0,                    // <<<< NO events parsed
  parseErrors: [
    {
      event: "values",
      err: "SyntaxError: Unexpected non-whitespace character after JSON at position 63 (line 2 column 1)",
      rawStart: "{\"run_id\":\"019d99d4-e28f-...\"...}\r\n{\"messages\":[{...}]}",
      rawHasCR: true
    },
    {
      event: "done",
      err: "SyntaxError: Unexpected non-whitespace character after JSON at position 2749 (...)",
      rawStart: "{\"messages\":[{\"content\":\"Say hello in 1 sentence\"...",
      rawHasCR: true
    }
  ]
}
```

The server genuinely returned a valid LangGraph stream containing two `event: values` frames (one with the first AI reply, one with an additional reply from the orchestrator) and a final `event: done` frame. The stream is correct. The parser is not.

### Exact point of rupture

`d:/bjhunt-v2/app/[locale]/dashboard/chat/page.tsx:608` — `buffer.split("\n\n")` produces blocks whose interior still contains `\r\n` line terminators. The inner loop on line 692 (`block.split("\n")`) produces lines with trailing `\r`, and multiple `data:` lines from distinct SSE frames are glued into one JSON string on line 699 (`dataLines.join("\n")`), which then fails `JSON.parse` at line 703. The `catch { return; }` on the same line eats the error. No event ever reaches the React state, so no token is ever displayed, so the assistant bubble flips to "emptyResponse" in the finally block at line 656.

---

## Findings

### Finding #1-1 — Frontend SSE parser mishandles CRLF line endings (ROOT CAUSE)

- **Severity**: Critical
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:608-704`
- **Bug / Inconsistency**: The handwritten SSE parser only handles LF-separated frames. LangGraph (starlette) emits CRLF, which is spec-valid per [HTML Living Standard §9.2.6 "Interpreting an event stream"](https://html.spec.whatwg.org/multipage/server-sent-events.html) — "a U+000D CARRIAGE RETURN U+000A LINE FEED (CRLF) character pair, a single U+000A LINE FEED (LF) character not preceded by a U+000D CARRIAGE RETURN (CR) character, and a single U+000D CARRIAGE RETURN (CR) character not followed by a U+000A LINE FEED (LF) character being the ways in which a line can end."
- **Root cause**: `buffer.split("\n\n")` can land on the `\n\n` inside a `\r\n\r\n` separator but leaves the preceding `\r` attached to the previous block's last line, AND joins multiple `data:` lines from different frames when the block boundary is missed. `JSON.parse` then fails silently (caught at line 703).
- **Fix proposed** (minimal, 2 lines): normalise line endings before splitting, and split on a regex that accepts all three spec-valid separators:
  ```ts
  // Inside handleSend's reader loop, after buffer += decoder.decode(value, { stream: true }):
  const normalised = buffer.replace(/\r\n|\r/g, "\n");
  const blocks = normalised.split(/\n\n/);
  buffer = blocks.pop() ?? "";
  ```
  Or better: swap the hand-rolled parser for `eventsource-parser` (the de-facto industry SSE parser used by OpenAI, Anthropic and Vercel AI SDK clients).
- **2026 best practice**: Use a spec-compliant SSE parser. Per [eventsource-parser npm docs](https://www.npmjs.com/package/eventsource-parser) and [parse-sse by sindresorhus](https://github.com/sindresorhus/parse-sse), the recommended pattern in 2026 is `response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream())` — both libraries handle CR, LF, and CRLF variants correctly and handle UTF-8 boundary chunks.
  - References: <https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream>, <https://www.npmjs.com/package/eventsource-parser>, <https://github.com/sindresorhus/parse-sse>.

### Finding #1-2 — Parser silently swallows every JSON parse error

- **Severity**: High
- **Category**: Reliability / Observability
- **File**: `app/[locale]/dashboard/chat/page.tsx:703`
- **Bug**: `try { parsed = JSON.parse(data); } catch { return; }` — the `catch { return; }` has no logging. This is how a 100 %-broken parser has survived ~15 fix iterations: every frame silently disappears, and the engineer has no way to know without opening the Network tab and reading the raw body.
- **Root cause**: Defensive `catch` added without diagnostics.
- **Fix proposed**: At minimum, `catch (e) { if (process.env.NODE_ENV !== "production") console.warn("[chat] SSE parse failed", { event, data: data.slice(0, 200), error: e }); return; }`. Even better: bubble the error up to a dev-only toast or a hidden debug panel.
- **2026 best practice**: Emit structured client-side telemetry (Sentry, Datadog RUM, or a `/api/telemetry` endpoint) for every parser-level error. Vercel's [Introduction to Streaming](https://vercel.com/blog/an-introduction-to-streaming-on-the-web) explicitly recommends reporting stream parsing anomalies.

### Finding #1-3 — Token streaming never activates because only `values` frames are emitted

- **Severity**: High
- **Category**: UX / Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:707-722` and backend `backend/src/lib/langgraph-client.ts:104`
- **Bug**: The backend calls LangGraph with `stream_mode: ["values", "custom"]`. `values` emits the entire state snapshot each step; it does NOT emit token-by-token `messages` mode. Even once the CRLF bug is fixed, the frontend `case "token":` branch will never fire, because the backend never emits `token` frames. The UI falls back to `case "values":` (line 812), which hard-sets `content = text` and therefore cannot show progressive streaming. The `streamSpeed` indicator and `Ready/Streaming` states will snap from 0 to full.
- **Root cause**: Two incompatible streaming philosophies coexist in the code. The `values` branch rewrites the content on each snapshot; the `token` branch is dead code.
- **Fix proposed**: Switch LangGraph `stream_mode` to `["messages"]` (token-level) and remove the `values` branch — or keep `values` only for final-state reconciliation on the `done` event. The official LangGraph streaming guide (see below) recommends `messages` for chat UIs.
- **2026 best practice**: Per [LangChain LangGraph streaming docs](https://docs.langchain.com/oss/python/langgraph/streaming), use `stream_mode="messages"` for chat UIs and `stream_mode="updates"` for plan/state side-panels. `values` is appropriate only for low-frequency UI refreshes and wastes bandwidth by re-serialising the entire message array on every step.

### Finding #1-4 — UTF-8 multi-byte characters can be split across chunks

- **Severity**: Medium
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:590-615`
- **Bug**: The code uses `new TextDecoder()` (not `TextDecoderStream`) and decodes inside the reader loop. It does pass `{ stream: true }` which is correct, but concatenates the resulting strings into a single `buffer` that is split by `"\n\n"`. If the backend ever writes a 4-byte UTF-8 emoji that straddles a chunk, the `{ stream: true }` flag prevents character-level corruption; however the subsequent `.split()` on `buffer` still sees the same risk if a `\n` is split across chunks — currently mitigated because `\n` is single-byte.
- **Root cause**: Hand-rolled buffering fragile to future edge cases (e.g., heartbeats, comments, multi-data frames).
- **Fix proposed**: Migrate to `response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream())`. This gives you an AsyncIterable of cleanly parsed events and eliminates the hand-rolled buffer entirely.
- **2026 best practice**: [MDN TextDecoderStream](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream) is the recommended primitive for binary-to-text stream decoding in 2026 because it handles UTF-8 boundary splits natively.

### Finding #1-5 — SSE heartbeat `: heartbeat` frames are ignored correctly but reset the thinking indicator

- **Severity**: Low
- **Category**: UX
- **File**: `app/[locale]/dashboard/chat/page.tsx:695` and backend `chat.ts:314`
- **Bug**: The frontend recognises `line.startsWith(":")` as a comment and ignores it — correct per [HTML SSE spec §9.2.6](https://html.spec.whatwg.org/multipage/server-sent-events.html). However the heartbeat does NOT feed an SSE event, so the frontend never learns "server still alive, agent still thinking." The thinking-indicator can disappear on its own via the `token` branch (line 720), but since that branch is dead (see Finding #1-3), the thinking indicator depends on `values` frames only, and there's no liveness signal between LangGraph steps.
- **Fix proposed**: Add a proper `event: heartbeat` frame alongside the comment (or emit an empty `event: ping`). On the frontend, treat it as a "still alive" signal to keep the thinking dots animating.
- **2026 best practice**: [Vercel AI SDK data streams](https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-data-stream) use explicit `type: "heartbeat"` frames for this reason.

### Finding #1-6 — `split(":")` on the `event:` prefix is fragile

- **Severity**: Low
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:693`
- **Bug**: `if (line.startsWith("event: ")) event = line.slice(7).trim();` — assumes exactly one space after the colon. Per [HTML SSE spec](https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation), the first U+0020 SPACE is OPTIONAL and the rest of the line is the value. Clients should accept `event:heartbeat` (no space) and `event:  foo` (two spaces).
- **Fix proposed**: Parse with `/^event:\s*(.*)$/` or simply `line.startsWith("event:") ? line.slice(6).trimStart()`.
- **2026 best practice**: Spec-compliant line parsing as above.

### Finding #1-7 — `line.startsWith("data: ")` mis-handles spec-legal `data:` (no space)

- **Severity**: Medium
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:694`
- **Bug**: Same class of issue as #1-6 — rejects `data:{"foo":1}` which is spec-legal.
- **Fix proposed**: `line.startsWith("data:") ? line.slice(5).replace(/^ /, "") : ...`.

### Finding #1-8 — Parser's `dataLines.push(line)` continuation fallback is backwards

- **Severity**: Medium
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:696`
- **Bug**: `else if (dataLines.length > 0 && line.trim()) dataLines.push(line);` — treats any non-empty line after a `data:` line as a continuation. That is NOT the SSE protocol: multi-line `data` must each start with `data:`. A real continuation is a subsequent `data:` line in the same frame, joined with `\n`. This fallback will silently accept corrupt input (such as the `\r` leftovers from Finding #1-1) AND silently ignore legitimate `id:` / `retry:` fields.
- **Fix proposed**: Remove the fallback. Parse strictly.

### Finding #1-9 — `id:` and `retry:` SSE fields are ignored

- **Severity**: Medium
- **Category**: Reliability
- **File**: `app/[locale]/dashboard/chat/page.tsx:692-697`
- **Bug**: The parser does not read `id:` or `retry:` fields. `id:` enables `Last-Event-ID` reconnection (browsers set this header automatically when `EventSource` reconnects, but bespoke `fetch`-based parsers must do so manually). `retry:` tells the client how long to wait before reconnecting.
- **Impact**: On network blip during a 50 s agent run, the stream dies with no resumption. No reconnection logic exists in the frontend.
- **Fix proposed**: Either switch to native `EventSource` (with the caveat that it can't send custom headers, but ticket is already in the URL) or add `id:` tracking and a reconnection path with `Last-Event-ID`.
- **2026 best practice**: [MDN EventSource docs](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) and the [LangGraph Platform SSEDecoder](https://deepwiki.com/langchain-ai/langgraph/7.4-streaming-and-events) both implement reconnection via `Last-Event-ID`.

### Finding #1-10 — `EventSource` is the natural primitive but can't be used because of ticket handling

- **Severity**: Medium
- **Category**: Architecture
- **File**: `app/[locale]/dashboard/chat/page.tsx:580`
- **Bug**: The GET URL carries the ticket in the query string (`?ticket=...&_t=...`). `EventSource` could be used here — it doesn't need custom headers, and it would give browser-native parsing and automatic reconnection. But the choice to use `fetch()` means the app has to reimplement everything `EventSource` does, and is getting it wrong (see #1-1, #1-6 through #1-9).
- **Fix proposed**: Replace `fetch(streamUrl, ...)` with `new EventSource(streamUrl)` and attach `addEventListener("values", ...)`, `addEventListener("custom", ...)`, `addEventListener("done", ...)` etc. Keep the signed ticket in the URL.
- **Caveat**: You lose the ability to abort cleanly with `AbortController`. Instead, store the EventSource and call `.close()` on the ref. Tradeoff is acceptable.
- **2026 best practice**: [MDN Using SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) states: prefer `EventSource` unless you specifically need POST bodies or custom headers — neither of which applies to the GET phase of SP3.

### Finding #1-11 — Cache-busting `_t` param is a hack that masks the real CORS issue, and is ineffective

- **Severity**: Medium
- **Category**: Correctness / Tech debt
- **File**: `app/[locale]/dashboard/chat/page.tsx:580`
- **Bug**: `&_t=${Date.now()}` was added (commit 2a438c2) to "defeat the Chrome CORS preflight cache." Two issues:
  1. CORS preflight cache is keyed by `(origin, method, headers, URL without query string)` — query-string changes do NOT invalidate it. The `_t` param has no effect on the preflight cache.
  2. Chrome clamps `Access-Control-Max-Age` to **7200 s (2 h)** since Chromium v76, not 24 h. Firefox caps at 24 h. The backend sets `maxAge: 86400`; Chrome silently reduces this to 7200. Per [MDN Access-Control-Max-Age](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age) and [Chromium dev thread](https://groups.google.com/a/chromium.org/g/security-dev/c/Z2L3Oy_sNmo).
- **Fix proposed**: Remove `_t=`. Rely on the backend's correct CORS headers (which I verified work via curl: `access-control-allow-origin: https://www.bjhunt.com`, credentials true, 204 preflight).
- **2026 best practice**: Cap `Access-Control-Max-Age` at 7200 for cross-browser consistency; use `credentials: "include"` only where required.

### Finding #1-12 — Stream GET has no `credentials` policy set

- **Severity**: Low
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:580-582`
- **Bug**: `await fetch(streamUrl, { signal: abortRef.current.signal })` — no `credentials`. Default is `"same-origin"`, so on a cross-site GET from www.bjhunt.com to chat.bjhunt.com, no cookies are sent. That's actually DESIRED here (the ticket carries auth), but the intent should be explicit: `credentials: "omit"`.
- **Fix proposed**: `fetch(streamUrl, { signal, credentials: "omit" })`.

### Finding #1-13 — `AbortController` is never cleared on success, only on error

- **Severity**: Low
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:641`
- **Bug**: `abortRef.current = null;` is set in `finally`, but the handler for `done` doesn't exist — the stream just ends when the reader finishes, and the `done` event (line 907) just updates token count. Works but fragile.

### Finding #1-14 — `requestIdRef` race-condition guard fires too late

- **Severity**: Medium
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:605`
- **Bug**: `if (requestIdRef.current !== currentRequestId) break;` — the check happens AFTER `reader.read()` returns, i.e., after a chunk has already arrived. If the user switches conversations mid-stream, the previous stream still writes one chunk of state (via `setMessages`) into the new conversation's React state before the break fires. The `assistantId` closure means old frames go into the old message ID, so cross-thread bleed is partial — but the old stream's last frame still lands.
- **Fix proposed**: On conversation switch, call `abortRef.current?.abort()` first, THEN reset state. Currently `loadConversation` (line 346) clears state but does not abort.
- **2026 best practice**: Explicit stream lifecycle: abort before switch.

### Finding #1-15 — `activeConversationId` vs `activeEngagement?.id` coupling is ambiguous

- **Severity**: Medium
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:552-553, 576`
- **Bug**: On line 552 the code sends `conversationId` only if one is already active. Line 576: `if (returnedConvId) setActiveConversationId(returnedConvId);` — when this fires *after* `handleSend` has already moved on, the NEXT message will reuse an old conversation ID that was set by the returned promise for the previous message. This sometimes works, sometimes creates a new conversation per message (see sidebar screenshot: duplicate "Say hello" entries).
- **Fix proposed**: Set `activeConversationId` once, after the first successful prepare, and never reset until the user explicitly creates a new conversation.

### Finding #1-16 — `emptyResponse` fallback masks real parse failures

- **Severity**: High
- **Category**: UX / Observability
- **File**: `app/[locale]/dashboard/chat/page.tsx:655-657`
- **Bug**: In the `finally` block: `if (!resolvedContent && !streamError) return { ...m, content: "", isStreaming: false, emptyResponse: true }`. This is the UX symptom of the real bug — it tells users "Le moteur IA est temporairement indisponible" even when the engine responded perfectly. The user-facing French text in `components/chat/message-bubble.tsx:214-219` specifically suggests "LangGraph n'est pas encore démarré" — misdirection.
- **Fix proposed**: Once the parser is fixed, distinguish three states: (1) stream ended with content, (2) stream ended with no content and no frames seen (true engine silence), (3) stream ended with frames received but parser failed (dev bug). Show different messaging accordingly. Consider instrumenting a `[chat] frames_parsed=N` counter and emitting that instead of a generic error.

### Finding #1-17 — `requestBody` `agentGraph` sometimes sent, sometimes not; ignored by backend `values` branch

- **Severity**: Low
- **Category**: Correctness / Tech debt
- **File**: `app/[locale]/dashboard/chat/page.tsx:547-557`
- **Bug**: `agentGraph: selectedAgent` is always sent. Backend uses it in `/prepare` but then the GET stream path uses `pending.agentId` which was resolved from either the passed `agentGraph` or the engagement's stored `agent_graph`. Fine — but the frontend settings panel also has its own `modelSettings.systemPrompt`, `temperature`, `maxTokens`, `topP`, `streamResponse`, `webSearch` — **none** of these are passed in `requestBody`. The settings panel is decorative.
- **Fix proposed**: Wire the settings through, or remove them.
- **Cross-reference**: Already flagged in the 2026-04-16 audit as finding #18.

### Finding #1-18 — Proxy route `/api/proxy/[...path]` sets `maxDuration = 60` but Hobby plan caps at 10 s

- **Severity**: Medium (already mitigated by SP3 split)
- **Category**: Reliability
- **File**: `app/api/proxy/[...path]/route.ts:5`
- **Bug**: `export const maxDuration = 60` — `vercel/serverless-functions` on the Hobby plan caps this at 10 s regardless of the export value. The 60 value is only valid on Pro. This is correctly bypassed by SP3 (the long GET goes direct to chat.bjhunt.com), but the comment on line 5 is misleading ("Vercel Pro: 300s" — actually 60 s for Edge, 300 s for Serverless Pro).
- **Fix proposed**: Update comment to reflect Hobby vs Pro reality and make clear SP3 bypasses this.
- **Reference**: [Vercel Functions duration limits](https://vercel.com/docs/functions/runtimes#max-duration).

### Finding #1-19 — Proxy drops non-`text/event-stream` content-type Set-Cookie and multiple headers

- **Severity**: Medium
- **Category**: Correctness
- **File**: `app/api/proxy/[...path]/route.ts:60-67`
- **Bug**: When proxying non-SSE responses, only ONE `Set-Cookie` header is forwarded (`backendRes.headers.get("set-cookie")` — single value). Node/Next `Headers.get` merges multi-value cookies into one comma-joined string, which browsers reject. If the backend ever sets two cookies (login + CSRF), the browser receives a malformed single cookie header.
- **Fix proposed**: Use `backendRes.headers.getSetCookie()` (Web Platform API, Node 20+) to iterate all cookies and set them individually on the response.
- **2026 best practice**: [MDN Headers.getSetCookie](https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie) is the standard since 2023.

### Finding #1-20 — Proxy strips `X-Conversation-Id` on non-SSE paths (breaks some chat REST flows)

- **Severity**: Low
- **Category**: Correctness
- **File**: `app/api/proxy/[...path]/route.ts:60-67`
- **Bug**: Non-SSE branch only forwards `content-type`, `cache-control`, `set-cookie`. It drops `X-Conversation-Id`, `X-Request-ID`, and every other header the backend sets.
- **Fix proposed**: Explicitly forward an allowlist: `["content-type", "set-cookie", "cache-control", "x-conversation-id", "x-request-id"]`.

### Finding #1-21 — `processStreamEvent` `case "values":` short-circuits token counting from actual usage metadata

- **Severity**: Low
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:830-838`
- **Bug**: On each `values` frame, the code computes `approxTokens = Math.ceil(delta.length / 4)` and adds to `tokenCount`, THEN also reads `latest.response_metadata.token_usage.total_tokens` if present and SETS `tokenCount` to that absolute value. The race means the counter jumps around: incremented by delta, overwritten by absolute.
- **Fix proposed**: When `token_usage.total_tokens` is present, it's authoritative — skip the delta math for that frame.

### Finding #1-22 — CSP `strict-dynamic` nonce works; no `connect-src` means fetches to chat.bjhunt.com are allowed

- **Severity**: Low (actually fine, but worth documenting)
- **Category**: Security / Architecture
- **File**: `middleware.ts:52-54`
- **Observation**: Current CSP is `script-src 'nonce-<X>' 'strict-dynamic'; object-src 'none'; base-uri 'none';` — no `connect-src` directive. Per [MDN CSP connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src), a missing `connect-src` falls back to `default-src`, which is also missing, which means "allow everything." Good for the chat (cross-origin fetch to chat.bjhunt.com works), bad for defence-in-depth.
- **Fix proposed**: Add `connect-src 'self' https://api.bjhunt.com https://chat.bjhunt.com` once the chat is verified working.
- **2026 best practice**: [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) recommends explicit `connect-src` in production.

### Finding #1-23 — Middleware creates a new NextRequest with `method` and `body` options (can break streaming)

- **Severity**: Medium
- **Category**: Correctness
- **File**: `middleware.ts:42-48`
- **Bug**: `new NextRequest(request.url, { headers: ..., method: ..., body: request.body })` — the body is a ReadableStream and must be flagged with `duplex: "half"` in fetch/Request init per [WHATWG Fetch spec](https://fetch.spec.whatwg.org/#dom-requestinit-duplex). Without `duplex`, Node warns and under some conditions drops the body. Also, the matcher excludes `/api`, so this code path is only relevant for HTML pages, but it still applies to all matched routes.
- **Fix proposed**: Drop the re-construction entirely; use `request.headers.set("x-nonce", nonce)` via the mutable-headers API, or propagate via `response.headers`. The current `NextResponse.next({ request: { headers: requestHeadersWithNonce } })` pattern is the canonical one.
- **Reference**: [Next.js middleware setting request headers](https://nextjs.org/docs/app/api-reference/file-conventions/middleware#setting-headers).

### Finding #1-24 — Middleware deprecated — Next 16 asks for `proxy.ts`

- **Severity**: Low (already noted in 2026-04-16 audit)
- **Category**: Tech debt
- **File**: `middleware.ts:35`
- **Reference**: [Next.js middleware-to-proxy migration note](https://nextjs.org/docs/messages/middleware-to-proxy).

### Finding #1-25 — `rewrites()` in `next.config.ts` rewrites /api/chat/* to backend directly, bypassing proxy

- **Severity**: Medium
- **Category**: Correctness / Security
- **File**: `next.config.ts:36-42`
- **Bug**: `rewrites()` sends `/api/chat/:path*` directly to `backend:3001` at the edge. But `lib/backend-client.ts:22-23` rewrites `/api/...` to `/api/proxy/...`. Two different paths, two different behaviors:
  - If a dev hand-codes `fetch("/api/chat/prepare", ...)` they'll hit the `rewrites()` path — bypassing the proxy logic (cookie forwarding, SSE piping).
  - `browserBackendFetch("/api/chat/prepare")` goes through `/api/proxy/chat/prepare` — the correct path.
- **Fix proposed**: Remove the `rewrites()` for chat/admin/settings; consolidate to the proxy. Or remove the proxy and rely on rewrites (simpler, but still has Hobby 10 s SSE cap).

### Finding #1-26 — `lib/backend-client.ts` env var fallback cascade is duplicated in `next.config.ts` but with reversed precedence

- **Severity**: Low
- **Category**: Correctness
- **File**: `lib/backend-client.ts:2-4` vs `next.config.ts:5-8`
- **Bug**:
  - `backend-client.ts`: `NEXT_PUBLIC_BACKEND_URL || BACKEND_API_URL || default`.
  - `next.config.ts`: `BACKEND_API_URL || NEXT_PUBLIC_BACKEND_URL || default`.
- **Impact**: On environments where both vars are set to different values, the proxy path and the rewrites path resolve to different backends.
- **Fix proposed**: Pick one precedence order, use it everywhere.

### Finding #1-27 — No stream timeout on the frontend

- **Severity**: Medium
- **Category**: Reliability
- **File**: `app/[locale]/dashboard/chat/page.tsx:580-615`
- **Bug**: The reader loop has no timeout. If the connection hangs after first byte (TCP half-open, bad network), the user is stuck with "streaming…" forever. The backend's `STREAM_TIMEOUT_MS = 120_000` doesn't help the client.
- **Fix proposed**: Wrap the reader in a per-chunk timeout using `AbortSignal.timeout(...)` or a manual setTimeout that resets on every chunk.

### Finding #1-28 — `lastAiContentRef` is a string ref rather than state, so re-renders drop it

- **Severity**: Low
- **Category**: Correctness
- **File**: `app/[locale]/dashboard/chat/page.tsx:180`
- **Observation**: `lastAiContentRef.current = text;` in `case "values":` (line 825) is fine for the "final content on error" path, but the dual tracking (message state + ref) is brittle. Keeping only the messages array as source of truth would be simpler.

### Finding #1-29 — `browser_network_requests` shows Kaspersky browser-protection interception

- **Severity**: N/A (test environment)
- **Category**: Observation
- **File**: n/a
- **Observation**: The reproduction browser had Kaspersky active. It intercepts some requests before they leave the machine. Mentioning this so the caller is not surprised; it did not affect the chat flow (the chat requests reached chat.bjhunt.com cleanly, confirmed by backend logs).

### Finding #1-30 — Chat page "Fix 5: Capture the active conversation ID" has a typo and inconsistent numbering

- **Severity**: Low
- **Category**: Code hygiene
- **File**: `app/[locale]/dashboard/chat/page.tsx` many lines — "Fix 4", "Fix 5", "Fix 6", "Fix 7", "Fix 8", "Fix 9", "Fix 10" comments appear out of sequence and "Fix 5" appears twice (line 156, line 309). The file has clearly accumulated layers of patches.
- **Fix proposed**: Refactor into smaller components (message list, input, sidebar). 1657 lines in one file is too much.

---

## Out of scope / deferred

Observations that belong to other agents (noted so they aren't lost):

- **Backend (Agent 2)**: `chat.ts:314` heartbeat emits `": heartbeat\n\n"` — fine — but should also emit an `event: heartbeat\ndata: {}\n\n` since some proxies strip comment lines. The `langgraphClient.streamRun` in `backend/src/lib/langgraph-client.ts:104` requests `stream_mode: ["values", "custom"]`. Switching to `["messages"]` or adding `"messages"` would enable token-level streaming end-to-end.
- **Backend (Agent 2)**: The in-memory `pendingStreams` Map in `chat.ts:87` does not scale horizontally. If the backend ever runs more than one replica, GET /stream/:runId will 404 half the time because the ticket can arrive at a different replica than /prepare. For now bjhunt-backend is a single container, so OK, but it's a hidden scaling landmine.
- **Backend (Agent 2)**: The `cancel()` on the wrappedStream (line 370) calls `markRunFailed("Client disconnected")` but does NOT call `reader.cancel()` on the upstream LangGraph reader. The upstream run keeps burning LLM tokens after client disconnect — previously flagged in the 2026-04-16 background audit.
- **Backend (Agent 2)**: `chat.ts:386` sets `Access-Control-Allow-Origin` by reflecting the request header (`const reqOrigin = c.req.header("origin") || "https://www.bjhunt.com"`). That bypasses the whitelist in `middleware/cors.ts`. Any origin hitting this endpoint will get back a matching ACAO header. With credentials=true that's a minor concern but the ticket-based auth limits the blast radius.
- **Infra (Agent 6)**: `chat.bjhunt.com` reaches the VPS at 82.25.117.79 via Caddy on port 443. TLS cert is valid. DNS resolves correctly. No changes needed there.
- **Infra (Agent 6)**: The Caddy error log shows a pre-fix failure (duration 8.9s, status 502, `unexpected EOF`) at 2026-04-16 13:35 — this was before SP3 hardening. Post-fix logs show clean 200s. Not a live issue.
- **Engine (Agent 3)**: LangGraph emits CRLF line endings. Confirm this is starlette's default and whether a LangGraph Platform / langgraph-cli config option exists to force LF. Even if yes, the frontend parser should still be CRLF-safe per spec.
- **DB / multi-tenant (Agent 5)**: Not inspected here.
- **Session / auth (Agent 4)**: `auth.ts:47-50` still accepts `?token=` in query string. The chat flow has moved to HMAC tickets so this fallback is only used for legacy `/api/chat/stream` (line 397). It should be removed once legacy route is deleted.

---

## Recommended immediate fix

One-line patch that makes chat work today:

```ts
// app/[locale]/dashboard/chat/page.tsx, inside the reader loop (~line 607)
buffer += decoder.decode(value, { stream: true });
const normalised = buffer.replace(/\r\n/g, "\n");   // <-- ADD
const blocks = normalised.split("\n\n");
buffer = blocks.pop() ?? "";
```

That alone will turn every one of the existing broken conversations green. Verified by running the same body through the same parser with and without the normalisation step in the live browser — without: 0 frames parsed, with: all frames parsed correctly.

Ship that, then address findings #1-2 (logging) and #1-3 (switch to `messages` stream mode for true token-level streaming), then progressively migrate to `EventSource` (#1-10) or `eventsource-parser` (#1-1 fix suggestion). Track toward the 2026 best-practice target architecture in the 2026-04-16 audit's "Chat and SSE best practices" section.

---

## References (2026)

- [HTML Living Standard § 9.2 Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [MDN TextDecoderStream](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream)
- [MDN Access-Control-Max-Age](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age) — confirms Chrome clamps to 7200 s
- [MDN Headers.getSetCookie()](https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie)
- [MDN CSP connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [Chromium security-dev discussion on Access-Control-Max-Age default](https://groups.google.com/a/chromium.org/g/security-dev/c/Z2L3Oy_sNmo)
- [eventsource-parser (npm)](https://www.npmjs.com/package/eventsource-parser)
- [parse-sse (Sindre Sorhus)](https://github.com/sindresorhus/parse-sse)
- [Vercel — An Introduction to Streaming on the Web](https://vercel.com/blog/an-introduction-to-streaming-on-the-web)
- [LangChain LangGraph streaming docs](https://docs.langchain.com/oss/python/langgraph/streaming)
- [LangGraph SSEDecoder reference](https://deepwiki.com/langchain-ai/langgraph/7.4-streaming-and-events)
- [Vercel AI SDK createDataStream](https://ai-sdk.dev/docs/reference/ai-sdk-ui/create-data-stream)
- [Next.js Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [Next.js middleware → proxy migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Vercel function max duration](https://vercel.com/docs/functions/runtimes#max-duration)
- [WHATWG Fetch — RequestInit.duplex](https://fetch.spec.whatwg.org/#dom-requestinit-duplex)
- [Next.js middleware — setting request headers](https://nextjs.org/docs/app/api-reference/file-conventions/middleware#setting-headers)
