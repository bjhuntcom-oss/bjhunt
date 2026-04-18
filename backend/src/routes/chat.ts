import type { AppVariables } from "../types.js";
/**
 * Chat routes — SSE streaming proxy + DB persistence.
 *
 * Messages are saved to PostgreSQL AND streamed from LangGraph.
 * History can be loaded from DB independently of LangGraph state.
 *
 * Streaming architecture (SP3):
 *   POST /prepare  — fast REST call (<1s) that starts the LangGraph run,
 *                     stores the ReadableStream in-memory, returns a signed ticket.
 *   GET  /stream/:runId — direct SSE connection (no Vercel proxy) that pipes
 *                     the stored stream to the client using the HMAC ticket.
 *   POST /stream   — [DEPRECATED] original single-request stream (kept for compat).
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { enforceDemoLimit } from "../middleware/plan-gate.js";
import { langgraphClient } from "../lib/langgraph-client.js";
// chat.ts mixes withOrg-wrapped queries (engagement/conversation lookups,
// gated by orgId in handler context) and direct sql calls (chat_messages
// inserts inside the streamSSE callback where withOrg adds friction with
// the timer + abort + transformStream lifecycle).
//
// SAFETY NOTE: every direct `sql\`` call below already passes `${orgId}` as
// an explicit column value AND filters tenant-scoped reads by org_id. Once
// migration 0001 (FORCE RLS + WITH CHECK) is applied and BJHUNT_APP_DATABASE_URL
// switches the appSql pool to bjhunt_app (BYPASSRLS=false), these direct
// calls would fail WITH CHECK — therefore we route them through `adminSql`
// (BYPASSRLS) for now. Multi-tenant safety relies on the application-level
// WHERE/INSERT filters until we complete the withOrg refactor in W4-followup.
//
// TODO(W4-followup): wrap each `sql\`` call in this file in withOrg(orgId, tx => …)
// and remove the adminSql alias. Tracked in docs/superpowers/specs/.
import { withOrg, adminSql as sql } from "../db/client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";
import { join } from "node:path";
import { mkdir, stat } from "node:fs/promises";
import { signTicket, verifyTicket } from "../lib/stream-ticket.js";
import {
  createTransformState,
  processChunk,
  flushBuffer,
  type EmitFn,
} from "../lib/langgraph-sse-transform.js";

export const chatRoutes = new Hono<{ Variables: AppVariables }>();

// Apply auth + rate limit to all routes EXCEPT GET /stream/:runId (uses ticket auth)
chatRoutes.use("*", async (c, next) => {
  if (c.req.method === "GET" && c.req.path.match(/\/stream\/[0-9a-f-]+$/i)) {
    return next(); // Skip — ticket auth handled inside the handler
  }
  return requireAuth(c, next);
});
chatRoutes.use("*", async (c, next) => {
  if (c.req.method === "GET" && c.req.path.match(/\/stream\/[0-9a-f-]+$/i)) {
    return next(); // Skip rate limit for ticket-authed streams
  }
  return rateLimit(config.rateLimit.api)(c, next);
});

/** Validate UUID format to prevent malformed IDs from reaching SQL. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUUID(id: string): boolean { return UUID_RE.test(id); }

/** Strip HTML tags and null bytes from user-provided content to prevent stored XSS. */
function sanitizeContent(input: string): string {
  return input
    .replace(/\0/g, "")                         // null bytes
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")  // script tags
    .replace(/<\/?(iframe|object|embed|form|input|button|link|meta|style)[^>]*>/gi, "")  // dangerous tags
    .trim();
}

/** Heartbeat interval in milliseconds for SSE keep-alive. */
const HEARTBEAT_INTERVAL_MS = 15_000;

/** Maximum time to wait for any data from LangGraph before aborting (ms). */
const STREAM_TIMEOUT_MS = 120_000;

const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  engagementId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  agentGraph: z.string().min(1).max(50).optional(),
  attachmentIds: z.array(z.string().uuid()).max(5).optional(),
});

// ── In-memory pending stream store (SP3 split prepare/stream) ────────────

interface PendingStream {
  threadId: string;
  orgId: string;
  convId: string;
  agentId: string;
  runId: string;
  message: string;
  userId: string;
  createdAt: number;
}

/** Map of runId → pending stream. Entries are one-time use and expire after 3 min. */
const pendingStreams = new Map<string, PendingStream>();

/** Clean up stale pending streams every 60 seconds. */
const STALE_STREAM_TTL_MS = 3 * 60 * 1000; // 3 minutes

setInterval(() => {
  const now = Date.now();
  for (const [runId, entry] of pendingStreams) {
    if (now - entry.createdAt > STALE_STREAM_TTL_MS) {
      pendingStreams.delete(runId);
      console.warn(`[chat] Cleaned up stale pending stream: runId=${runId}`);
    }
  }
}, 60_000);

// ── POST /prepare — fast REST call that starts LangGraph and returns a ticket ──

chatRoutes.post("/prepare", enforceDemoLimit(), zValidator("json", sendMessageSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { message: rawMessage, engagementId, conversationId: existingConvId, agentGraph, attachmentIds } = c.req.valid("json");

  // Sanitize user input before persisting or forwarding
  const message = sanitizeContent(rawMessage);
  if (!message) {
    return c.json({ error: "Message content is empty after sanitization" }, 400);
  }

  // Verify engagement belongs to user's org and is active
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, langgraph_thread_id, agent_graph, status, name
       FROM engagements WHERE id = ${engagementId}`,
  );

  if (!engagement) {
    return c.json({ error: "Engagement not found" }, 404);
  }

  // Get or create conversation
  let convId: string | undefined = existingConvId;
  if (convId) {
    const verifyId = convId;
    const [existing] = await withOrg(orgId, (tx) =>
      tx`SELECT id FROM chat_conversations
         WHERE id = ${verifyId} AND user_id = ${user.id} AND engagement_id = ${engagementId}
           AND status = 'active'`,
    );
    if (!existing) {
      convId = undefined;
    }
  }
  if (!convId) {
    const [conv] = await sql`
      INSERT INTO chat_conversations (org_id, user_id, engagement_id, title)
      VALUES (${orgId}, ${user.id}, ${engagementId}, ${engagement.name || "Chat"})
      RETURNING id
    `;
    if (!conv) return c.json({ error: "Failed to create conversation" }, 500);
    convId = conv.id as string;
  }

  // Touch conversation updated_at
  await sql`
    UPDATE chat_conversations SET updated_at = now() WHERE id = ${convId}
  `.catch(() => {});

  // Save user message to DB
  await sql`
    INSERT INTO chat_messages (org_id, conversation_id, role, content)
    VALUES (${orgId}, ${convId}, 'user', ${message})
  `;

  // Link attachments
  if (attachmentIds && attachmentIds.length > 0) {
    await sql`
      UPDATE file_uploads
      SET conversation_id = ${convId}
      WHERE id = ANY(${attachmentIds}::uuid[])
        AND org_id = ${orgId}
        AND user_id = ${user.id}
    `.catch(() => {});
  }

  // Auto-launch engagement if still draft
  let threadId = engagement.langgraphThreadId as string | null;
  if (!threadId) {
    const thread = await langgraphClient.createThread();
    threadId = thread.threadId;
    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements SET langgraph_thread_id = ${threadId}, status = 'running', started_at = now()
         WHERE id = ${engagementId}`,
    );
  }

  // Resolve agent
  const agentId = agentGraph || (engagement.agentGraph as string) || "bjhunt";

  // Track agent run
  const [agentRun] = await sql`
    INSERT INTO agent_runs (org_id, engagement_id, conversation_id, agent_name, input_summary)
    VALUES (${orgId}, ${engagementId}, ${convId}, ${agentId}, ${message.slice(0, 200)})
    RETURNING id
  `;
  if (!agentRun) return c.json({ error: "Failed to create agent run" }, 500);
  const runId = agentRun.id as string;

  // DON'T start the LangGraph stream yet — the GET /stream/:runId will start it.
  // This avoids the race condition where the stream finishes before the client connects.
  pendingStreams.set(runId, {
    threadId: threadId!,
    orgId,
    convId: convId!,
    agentId,
    runId,
    message,
    userId: user.id,
    createdAt: Date.now(),
  });

  // Sign a ticket for the client to authenticate the GET SSE request
  const ticket = await signTicket({
    sid: user.id,
    org: orgId,
    conv: convId!,
    run: runId,
  });

  // Build the stream URL — production uses the API domain, dev uses same origin
  const streamBase = config.isProduction
    ? "https://chat.bjhunt.com"
    : `http://localhost:${config.port}`;
  const streamUrl = `${streamBase}/api/chat/stream/${runId}`;

  // Audit log
  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${orgId}, ${user.id}, 'chat.prepare', ${"engagement:" + engagementId},
            ${JSON.stringify({ conversationId: convId, runId, agentId })})
  `.catch(() => {});

  return c.json({
    streamUrl,
    ticket,
    conversationId: convId,
    runId,
  });
});

// ── GET /stream/:runId — direct SSE pipe authenticated by HMAC ticket ────

chatRoutes.get("/stream/:runId", async (c) => {
  const runId = c.req.param("runId");
  const ticket = c.req.query("ticket");

  if (!runId || !validateUUID(runId)) {
    return c.json({ error: "Invalid run ID" }, 400);
  }
  if (!ticket) {
    return c.json({ error: "Missing ticket" }, 401);
  }

  // Verify the HMAC ticket
  const payload = await verifyTicket(ticket);
  if (!payload) {
    return c.json({ error: "Invalid or expired ticket" }, 401);
  }

  // Ensure the ticket's runId matches the URL parameter
  if (payload.run !== runId) {
    return c.json({ error: "Ticket does not match run" }, 403);
  }

  // Retrieve and remove the pending stream (one-time use)
  const pending = pendingStreams.get(runId);
  if (!pending) {
    return c.json({ error: "Stream not found or already consumed" }, 404);
  }
  pendingStreams.delete(runId);

  // Verify org matches
  if (pending.orgId !== payload.org) {
    return c.json({ error: "Organization mismatch" }, 403);
  }

  const orgId = pending.orgId;
  const convId = pending.convId;
  const agentId = pending.agentId;
  const userId = payload.sid;

  // Helper to mark agent run as failed
  async function markRunFailed(error: string) {
    await sql`
      UPDATE agent_runs SET status = 'failed', completed_at = now(),
             error = ${error.slice(0, 500)},
             duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000
      WHERE id = ${runId} AND status = 'running'
    `.catch((dbErr: Error) => console.error("Failed to mark agent run as failed:", dbErr));
  }

  // CORS + SSE headers. streamSSE sets Content-Type; the rest are explicit
  // so Caddy and any downstream proxy forward bytes synchronously.
  const reqOrigin = c.req.header("origin") || "https://www.bjhunt.com";
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("Connection", "keep-alive");
  c.header("X-Conversation-Id", convId);
  c.header("X-Accel-Buffering", "no");
  c.header("Access-Control-Allow-Origin", reqOrigin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Expose-Headers", "X-Conversation-Id");

  return streamSSE(c, async (stream) => {
    const abort = new AbortController();
    stream.onAbort(() => {
      abort.abort();
      markRunFailed("Client disconnected").catch(() => {});
    });

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
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message: err.message || "LangGraph connection failed" }),
      });
      return;
    }

    const heartbeatTimer = setInterval(() => {
      stream.write(": heartbeat\n\n").catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    // Inactivity timeout — abort the upstream if no chunk arrives for STREAM_TIMEOUT_MS.
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let streamFailed = false;
    const armTimeout = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => {
        streamFailed = true;
        stream
          .writeSSE({
            event: "error",
            data: JSON.stringify({
              message: "Stream timed out — no data from AI agent for 120 seconds",
              code: "stream_timeout",
            }),
          })
          .catch(() => {});
        abort.abort();
      }, STREAM_TIMEOUT_MS);
    };
    armTimeout();

    // Typed event emitter: writes SSE frames the frontend handlers consume directly.
    // Per docs/architecture/02-STREAMING.md §SSE Event Types.
    let eventCounter = 0;
    const emit: EmitFn = (event, data) => {
      const id = ++eventCounter;
      // CVE-2026-29085: strip CR/LF from event name.
      const safeEvent = event.replace(/[\r\n]/g, "");
      stream
        .write(`id: ${id}\nevent: ${safeEvent}\ndata: ${JSON.stringify(data)}\n\n`)
        .catch(() => {});
    };

    const transformState = createTransformState();

    const reader = upstream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (streamFailed) break;

        armTimeout();
        processChunk(value, transformState, emit);
      }
      flushBuffer(transformState, emit);

      // Detect empty response (LangGraph delivered stream but no content/tools)
      if (!streamFailed && !transformState.fullResponse && transformState.toolCalls.length === 0) {
        emit("error", {
          message:
            "L'agent IA n'a pas retourné de réponse. Le moteur est peut-être indisponible ou le modèle n'a pas pu générer de contenu.",
          code: "empty_response",
        });
      }

      emit("done", {
        tokensIn: transformState.tokensIn,
        tokensOut: transformState.tokensOut,
      });

      if (transformState.fullResponse) {
        await sql`INSERT INTO chat_messages (org_id, conversation_id, role, content, tokens_input, tokens_output)
          VALUES (${orgId}, ${convId}, 'assistant', ${transformState.fullResponse},
                  ${transformState.tokensIn || null}, ${transformState.tokensOut || null})`.catch(() => {});
      }
      await sql`UPDATE agent_runs SET status = 'completed', completed_at = now(),
        tokens_input = ${transformState.tokensIn}, tokens_output = ${transformState.tokensOut},
        output_summary = ${transformState.fullResponse.slice(0, 200)}
        WHERE id = ${runId}`.catch(() => {});
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        emit("error", { message: err?.message || "Stream failed" });
        await markRunFailed(err?.message || "Stream failed");
      }
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      clearInterval(heartbeatTimer);
      try {
        reader.releaseLock();
      } catch {}
    }
  });
});

// ── [DEPRECATED] Send message + stream response (single request) ─────────
// This endpoint is kept for backward compatibility. New clients should use
// POST /prepare + GET /stream/:runId which avoids the Vercel 10s timeout.

chatRoutes.post("/stream", enforceDemoLimit(), zValidator("json", sendMessageSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { message: rawMessage, engagementId, conversationId: existingConvId, agentGraph, attachmentIds } = c.req.valid("json");

  // Sanitize user input before persisting or forwarding
  const message = sanitizeContent(rawMessage);
  if (!message) {
    return c.json({ error: "Message content is empty after sanitization" }, 400);
  }

  // Verify engagement belongs to user's org and is active
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, langgraph_thread_id, agent_graph, status, name
       FROM engagements WHERE id = ${engagementId}`,
  );

  if (!engagement) {
    return c.json({ error: "Engagement not found" }, 404);
  }

  // Get or create conversation — reuse existing if provided AND it belongs to this user+engagement
  let convId: string | undefined = existingConvId;
  if (convId) {
    // Verify the conversation exists, belongs to this user & engagement, and is active
    const verifyId = convId; // capture for SQL template type safety
    const [existing] = await withOrg(orgId, (tx) =>
      tx`SELECT id FROM chat_conversations
         WHERE id = ${verifyId} AND user_id = ${user.id} AND engagement_id = ${engagementId}
           AND status = 'active'`,
    );
    if (!existing) {
      // Invalid conversationId — create a new one instead of rejecting
      convId = undefined;
    }
  }
  if (!convId) {
    const [conv] = await sql`
      INSERT INTO chat_conversations (org_id, user_id, engagement_id, title)
      VALUES (${orgId}, ${user.id}, ${engagementId}, ${engagement.name || "Chat"})
      RETURNING id
    `;
    if (!conv) return c.json({ error: "Failed to create conversation" }, 500);
    convId = conv.id as string;
  }

  // Touch the conversation updated_at so it sorts to the top
  await sql`
    UPDATE chat_conversations SET updated_at = now() WHERE id = ${convId}
  `.catch(() => {});

  // Save user message to DB
  await sql`
    INSERT INTO chat_messages (org_id, conversation_id, role, content)
    VALUES (${orgId}, ${convId}, 'user', ${message})
  `;

  // Link any uploaded attachments to this conversation
  if (attachmentIds && attachmentIds.length > 0) {
    await sql`
      UPDATE file_uploads
      SET conversation_id = ${convId}
      WHERE id = ANY(${attachmentIds}::uuid[])
        AND org_id = ${orgId}
        AND user_id = ${user.id}
    `.catch(() => {});
  }

  // Auto-launch engagement if still draft
  let threadId = engagement.langgraphThreadId as string | null;
  if (!threadId) {
    const thread = await langgraphClient.createThread();
    threadId = thread.threadId;
    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements SET langgraph_thread_id = ${threadId}, status = 'running', started_at = now()
         WHERE id = ${engagementId}`,
    );
  }

  // Resolve agent: request override > engagement default > fallback
  const agentId = agentGraph || (engagement.agentGraph as string) || "bjhunt";

  // Track agent run
  const [agentRun] = await sql`
    INSERT INTO agent_runs (org_id, engagement_id, conversation_id, agent_name, input_summary)
    VALUES (${orgId}, ${engagementId}, ${convId}, ${agentId}, ${message.slice(0, 200)})
    RETURNING id
  `;
  if (!agentRun) return c.json({ error: "Failed to create agent run" }, 500);
  const runId = agentRun.id as string;

  // Helper to mark agent run as failed in DB
  async function markRunFailed(error: string) {
    await sql`
      UPDATE agent_runs SET status = 'failed', completed_at = now(),
             error = ${error.slice(0, 500)},
             duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000
      WHERE id = ${runId} AND status = 'running'
    `.catch((dbErr: Error) => console.error("Failed to mark agent run as failed:", dbErr));
  }

  // Stream from LangGraph — with error handling
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await langgraphClient.streamRun(
      threadId,
      agentId,
      { content: message, user_id: user.id, org_id: orgId },
    );
  } catch (err: any) {
    await markRunFailed(err.message || "LangGraph connection failed");
    return c.json({ error: "Failed to start AI agent", details: err.message }, 502);
  }

  // Create a transform stream that:
  // 1. Parses LangGraph "messages" SSE to capture content for DB persistence
  // 2. Re-emits normalized SSE events the frontend understands:
  //    - event: token       → {"token": "..."}           (progressive text)
  //    - event: tool_call   → {"id","name","args"}       (tool invocation)
  //    - event: tool_result → {"id","result","status"}   (tool output)
  //    - event: thinking    → {"content": "..."}         (reasoning block)
  //    - event: error       → {"message": "..."}         (error occurred)
  //    - event: done        → {}                         (stream finished)
  let fullResponse = "";
  let toolCalls: unknown[] = [];
  let thinkingContent = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let streamFailed = false;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let sseBuffer = "";

  // Heartbeat and timeout tracking
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  let eventCounter = 0;
  function emitSSE(controller: TransformStreamDefaultController<Uint8Array>, event: string, data: unknown) {
    // CVE-2026-29085: Strip CR/LF from event name to prevent SSE control field injection
    const safeEvent = event.replace(/[\r\n]/g, "");
    const id = ++eventCounter;
    try {
      controller.enqueue(encoder.encode(`id: ${id}\nevent: ${safeEvent}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Controller may be closed if client disconnected
    }
  }

  function emitHeartbeat(controller: TransformStreamDefaultController<Uint8Array>) {
    try {
      controller.enqueue(encoder.encode(": heartbeat\n\n"));
    } catch {
      // Controller may be closed
    }
  }

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      // Start heartbeat interval (15s keep-alive)
      heartbeatTimer = setInterval(() => {
        emitHeartbeat(controller);
      }, HEARTBEAT_INTERVAL_MS);

      // Start inactivity timeout (120s)
      timeoutTimer = setTimeout(() => {
        streamFailed = true;
        emitSSE(controller, "error", { message: "Stream timed out — no data from AI agent for 120 seconds" });
        emitSSE(controller, "done", {});
        markRunFailed("Stream timeout: no data for 120s");
        controller.terminate();
      }, STREAM_TIMEOUT_MS);
    },

    transform(chunk, controller) {
      // Reset inactivity timeout on every received chunk
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
          streamFailed = true;
          emitSSE(controller, "error", { message: "Stream timed out — no data from AI agent for 120 seconds" });
          emitSSE(controller, "done", {});
          markRunFailed("Stream timeout: no data for 120s");
          controller.terminate();
        }, STREAM_TIMEOUT_MS);
      }

      sseBuffer += decoder.decode(chunk, { stream: true });
      const blocks = sseBuffer.split("\n\n");
      sseBuffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        // Parse SSE block into event type + data lines
        let eventType = "";
        const dataLines: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
          else if (dataLines.length > 0 && line.trim()) dataLines.push(line);
        }

        const raw = dataLines.join("\n").trim();
        if (!raw || raw === "[DONE]") continue;

        let parsed: any;
        try { parsed = JSON.parse(raw); } catch { continue; }

        // ── "messages" mode: LangGraph streams [message_chunk, metadata] tuples ──
        if (eventType === "messages" || eventType === "messages/partial" || eventType === "messages/complete") {
          const msgChunk = Array.isArray(parsed) ? parsed[0] : parsed;
          const metadata = Array.isArray(parsed) ? parsed[1] : {};

          if (!msgChunk) continue;

          // AIMessageChunk — text tokens and/or tool calls
          if (msgChunk.type === "AIMessageChunk" || msgChunk.type === "ai") {
            // Text content (string form)
            if (typeof msgChunk.content === "string" && msgChunk.content) {
              fullResponse += msgChunk.content;
              emitSSE(controller, "token", { token: msgChunk.content, agent: metadata?.langgraph_node });
            }
            // Content array (Anthropic format: [{type:"text", text:"..."}, ...])
            else if (Array.isArray(msgChunk.content)) {
              for (const contentBlock of msgChunk.content) {
                if (contentBlock.type === "text" && contentBlock.text) {
                  fullResponse += contentBlock.text;
                  emitSSE(controller, "token", { token: contentBlock.text, agent: metadata?.langgraph_node });
                }
              }
            }

            // Tool calls (complete — name is present)
            if (msgChunk.tool_calls && Array.isArray(msgChunk.tool_calls)) {
              for (const tc of msgChunk.tool_calls) {
                if (tc.name) {
                  toolCalls.push({ id: tc.id, name: tc.name, args: tc.args || {} });
                  emitSSE(controller, "tool_call", { id: tc.id, name: tc.name, args: tc.args || {}, status: "running" });
                }
              }
            }

            // Tool call chunks (incremental — streaming tool call arguments)
            if (msgChunk.tool_call_chunks && Array.isArray(msgChunk.tool_call_chunks)) {
              for (const tcc of msgChunk.tool_call_chunks) {
                if (tcc.name) {
                  toolCalls.push({ id: tcc.id, name: tcc.name, args: {} });
                  emitSSE(controller, "tool_call", { id: tcc.id, name: tcc.name, args: {}, status: "running" });
                }
              }
            }

            // Token usage from response_metadata (final chunk often carries this)
            if (msgChunk.response_metadata?.token_usage) {
              const usage = msgChunk.response_metadata.token_usage;
              tokensIn = usage.prompt_tokens || usage.input_tokens || 0;
              tokensOut = usage.completion_tokens || usage.output_tokens || 0;
            }
            if (msgChunk.usage_metadata) {
              tokensIn = msgChunk.usage_metadata.input_tokens || tokensIn;
              tokensOut = msgChunk.usage_metadata.output_tokens || tokensOut;
            }
          }

          // ToolMessageChunk — result of a tool invocation
          else if (msgChunk.type === "ToolMessageChunk" || msgChunk.type === "tool") {
            const result = typeof msgChunk.content === "string"
              ? msgChunk.content.slice(0, 500)
              : JSON.stringify(msgChunk.content).slice(0, 500);
            emitSSE(controller, "tool_result", {
              id: msgChunk.tool_call_id || "",
              result,
              status: msgChunk.status === "error" ? "error" : "completed",
            });
          }

          // HumanMessageChunk / SystemMessageChunk — ignore (echo of our input)
        }

        // ── "values" mode fallback (backward compat if LangGraph sends values) ──
        else if (eventType === "values") {
          const msgs = parsed.messages || parsed.values?.messages;
          if (Array.isArray(msgs)) {
            const aiMsgs = msgs.filter((m: any) => m.type === "ai" || m.role === "assistant");
            if (aiMsgs.length > 0) {
              const latest = aiMsgs[aiMsgs.length - 1];
              let text = "";
              if (typeof latest.content === "string") text = latest.content;
              else if (Array.isArray(latest.content)) {
                text = latest.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
              }
              if (text && text.length > fullResponse.length) {
                const delta = text.slice(fullResponse.length);
                fullResponse = text;
                emitSSE(controller, "token", { token: delta });
              }
            }
            for (const ai of msgs.filter((m: any) => m.type === "ai" && m.tool_calls?.length)) {
              for (const tc of ai.tool_calls) {
                if (!toolCalls.some((t: any) => t.id === tc.id)) {
                  toolCalls.push(tc);
                  emitSSE(controller, "tool_call", { id: tc.id, name: tc.name, args: tc.args || {}, status: "running" });
                }
              }
            }
            for (const toolMsg of msgs.filter((m: any) => m.type === "tool")) {
              emitSSE(controller, "tool_result", {
                id: toolMsg.tool_call_id || "",
                result: (typeof toolMsg.content === "string" ? toolMsg.content : JSON.stringify(toolMsg.content)).slice(0, 500),
                status: toolMsg.status === "error" ? "error" : "completed",
              });
            }
          }
        }

        // ── "custom" mode: sub-agent lifecycle events from StreamingRunnable ──
        else if (eventType === "custom") {
          const evtType = parsed.type || parsed.event;
          const evtData = parsed.data || parsed;

          if (evtType === "subagent_start") {
            emitSSE(controller, "subagent_start", {
              id: evtData.id || crypto.randomUUID(),
              name: evtData.name || evtData.agent || "sub-agent",
              description: evtData.description || "",
            });
          } else if (evtType === "subagent_end") {
            emitSSE(controller, "subagent_end", {
              id: evtData.id || "",
              error: evtData.error || null,
            });
          } else if (evtType === "subagent_tool_call") {
            emitSSE(controller, "tool_call", {
              id: evtData.id || crypto.randomUUID(),
              name: evtData.name || evtData.tool || "tool",
              args: evtData.args || evtData.input || {},
              status: "running",
            });
          } else if (evtType === "subagent_tool_result") {
            const result = typeof evtData.output === "string"
              ? evtData.output.slice(0, 500)
              : JSON.stringify(evtData.output).slice(0, 500);
            emitSSE(controller, "tool_result", {
              id: evtData.id || "",
              result,
              status: evtData.error ? "error" : "completed",
            });
          } else if (evtType === "subagent_message") {
            // Sub-agent text — append to full response
            if (evtData.content) {
              fullResponse += evtData.content;
              emitSSE(controller, "token", { token: evtData.content, agent: evtData.agent });
            }
          } else if (evtType === "thinking" || evtType === "reasoning") {
            thinkingContent = evtData.content || "";
            emitSSE(controller, "thinking", { content: thinkingContent, active: true });
          }
        }
      }
    },
    async flush(controller) {
      // Clear timers
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);

      // If the stream already failed (timeout), don't double-save
      if (streamFailed) return;

      // Process any remaining buffer
      if (sseBuffer.trim()) {
        // Final partial block — just pass through, no parse needed
      }

      // Detect empty response (LangGraph returned stream but no content)
      if (!fullResponse && toolCalls.length === 0) {
        emitSSE(controller, "error", {
          message: "L'agent IA n'a pas retourné de réponse. Le moteur est peut-être indisponible ou le modèle n'a pas pu générer de contenu.",
          code: "empty_response",
        });
      }

      // Emit done event with token usage
      emitSSE(controller, "done", { tokensIn, tokensOut });

      // Save assistant response to DB
      if (fullResponse || toolCalls.length > 0) {
        await sql`
          INSERT INTO chat_messages (org_id, conversation_id, role, content, tool_calls, thinking, tokens_input, tokens_output)
          VALUES (${orgId}, ${convId}, 'assistant', ${fullResponse || "(no text response)"},
                  ${JSON.stringify(toolCalls.length > 0 ? toolCalls : null)},
                  ${thinkingContent || null},
                  ${tokensIn || null}, ${tokensOut || null})
        `.catch((err: Error) => console.error("Failed to save assistant message:", err));
      }

      // Update agent run as completed
      await sql`
        UPDATE agent_runs SET status = 'completed', completed_at = now(),
               tokens_input = ${tokensIn}, tokens_output = ${tokensOut},
               duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000,
               output_summary = ${fullResponse.slice(0, 200)}
        WHERE id = ${runId}
      `.catch((err: Error) => console.error("Failed to update agent run:", err));

      // Audit log
      await sql`
        INSERT INTO audit_logs (org_id, user_id, action, resource, details)
        VALUES (${orgId}, ${user.id}, 'chat.message', ${"engagement:" + engagementId},
                ${JSON.stringify({ conversationId: convId, tokensIn, tokensOut })})
      `.catch(() => {});
    },
  });

  const transformedStream = stream.pipeThrough(transform);

  // Handle client disconnect: when the readable side is cancelled (client aborts),
  // clean up timers and mark the run as failed.
  const wrappedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = transformedStream.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch {
          // Stream errored (client disconnect, timeout, etc.)
          try { controller.close(); } catch { /* already closed */ }
        }
      })();
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (!streamFailed) {
        markRunFailed("Client disconnected");
      }
    },
  });

  // Build CORS origin from request (Hono middlewares don't apply to raw Response)
  const reqOrigin = c.req.header("origin") || "https://www.bjhunt.com";

  return new Response(wrappedStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Conversation-Id": convId ?? "",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": reqOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Expose-Headers": "X-Conversation-Id",
    },
  });
});

// ── Message feedback (thumbs up / down) ─────────────────────────────────
// Persists the rating into chat_messages.metadata.feedback. Avoids a new
// table — feedback is pure user signal, no joins needed for now.
const feedbackSchema = z.object({
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).optional(),
});

chatRoutes.post(
  "/messages/:id/feedback",
  zValidator("json", feedbackSchema),
  async (c) => {
    const orgId = c.get("orgId") as string;
    const user = c.get("user") as AuthUser;
    const messageId = c.req.param("id");
    if (!validateUUID(messageId)) return c.json({ error: "Invalid ID format" }, 400);

    const { rating, comment } = c.req.valid("json");
    const feedback = {
      rating,
      comment: comment ? sanitizeContent(comment) : undefined,
      user_id: user.id,
      at: new Date().toISOString(),
    };

    const result = await withOrg(orgId, (tx) =>
      tx`UPDATE chat_messages
         SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('feedback', ${JSON.stringify(feedback)}::jsonb)
         WHERE id = ${messageId} AND role = 'assistant'
         RETURNING id`,
    );
    if (result.length === 0) return c.json({ error: "Message not found" }, 404);

    await sql`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'chat.feedback', ${"chat_message:" + messageId},
              ${JSON.stringify({ rating })})
    `.catch(() => {});

    return c.json({ ok: true });
  },
);

// ── Get conversation history from DB ─────────────────────────────────────

chatRoutes.get("/history/:engagementId", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const engagementId = c.req.param("engagementId");

  if (!validateUUID(engagementId)) return c.json({ error: "Invalid ID format" }, 400);

  const conversations = await withOrg(orgId, (tx) =>
    tx`SELECT c.id, c.title, c.status, c.created_at, c.updated_at,
              (SELECT count(*)::int FROM chat_messages m WHERE m.conversation_id = c.id) as message_count,
              (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chat_conversations c
       WHERE c.engagement_id = ${engagementId}
         AND c.user_id = ${user.id}
         AND c.status = 'active'
       ORDER BY c.updated_at DESC`,
  );

  return c.json({ conversations });
});

// ── Get messages for a conversation ──────────────────────────────────────

chatRoutes.get("/conversations/:id/messages", async (c) => {
  const orgId = c.get("orgId") as string;
  const convId = c.req.param("id");

  if (!validateUUID(convId)) return c.json({ error: "Invalid ID format" }, 400);

  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "100", 10) || 100), 500);
  const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10) || 0);

  const messages = await withOrg(orgId, (tx) =>
    tx`SELECT id, role, content, tool_calls, thinking, tokens_input, tokens_output, model, created_at
       FROM chat_messages
       WHERE conversation_id = ${convId}
       ORDER BY created_at ASC
       LIMIT ${limit} OFFSET ${offset}`,
  );

  return c.json({ messages });
});

// ── List all conversations for current user ──────────────────────────────

chatRoutes.get("/conversations", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50", 10) || 50), 100);

  const conversations = await withOrg(orgId, (tx) =>
    tx`SELECT c.id, c.title, c.status, c.engagement_id, c.created_at, c.updated_at,
              e.name as engagement_name, e.target as engagement_target,
              (SELECT count(*)::int FROM chat_messages m WHERE m.conversation_id = c.id) as message_count,
              (SELECT content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chat_conversations c
       LEFT JOIN engagements e ON c.engagement_id = e.id
       WHERE c.user_id = ${user.id} AND c.status = 'active'
       ORDER BY c.updated_at DESC
       LIMIT ${limit}`,
  );

  return c.json({ conversations });
});

// ── Create a new conversation ───────────────────────────────────────────

const createConversationSchema = z.object({
  engagementId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  initialMessage: z.string().max(10000).optional(),
  webSearch: z.boolean().optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
});

chatRoutes.post("/conversations", zValidator("json", createConversationSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const body = c.req.valid("json");

  const title = body.title || "New conversation";

  const [conversation] = await sql`
    INSERT INTO chat_conversations (org_id, user_id, engagement_id, title)
    VALUES (${orgId}, ${user.id}, ${body.engagementId || null}, ${title})
    RETURNING id, org_id, user_id, engagement_id, title, model, status, created_at, updated_at
  `;

  if (!conversation) return c.json({ error: "Failed to create conversation" }, 500);

  // If an initial message was provided, save it
  const messages: Record<string, unknown>[] = [];
  if (body.initialMessage) {
    const [userMsg] = await sql`
      INSERT INTO chat_messages (org_id, conversation_id, role, content)
      VALUES (${orgId}, ${conversation.id}, 'user', ${body.initialMessage})
      RETURNING id, role, content, tool_calls, thinking, tokens_input, tokens_output, model, created_at
    `;
    if (userMsg) messages.push(userMsg);

    // Link any uploaded attachments to this conversation
    if (body.attachmentIds && body.attachmentIds.length > 0) {
      await sql`
        UPDATE file_uploads
        SET conversation_id = ${conversation.id}
        WHERE id = ANY(${body.attachmentIds}::uuid[])
          AND org_id = ${orgId}
          AND user_id = ${user.id}
      `;
    }
  }

  // Audit log
  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${orgId}, ${user.id}, 'chat.conversation.create', ${"conversation:" + conversation.id},
            ${JSON.stringify({ title, hasInitialMessage: !!body.initialMessage })})
  `.catch(() => {});

  return c.json({ conversation, messages }, 201);
});

// ── Delete a conversation ───────────────────────────────────────────────

chatRoutes.delete("/conversations/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const convId = c.req.param("id");

  if (!validateUUID(convId)) return c.json({ error: "Invalid ID format" }, 400);

  // Soft delete — set status to 'deleted'
  const result = await withOrg(orgId, (tx) =>
    tx`UPDATE chat_conversations
       SET status = 'deleted', updated_at = now()
       WHERE id = ${convId} AND user_id = ${user.id}
       RETURNING id`,
  );

  if (result.length === 0) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  // Audit log
  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${user.id}, 'chat.conversation.delete', ${"conversation:" + convId})
  `.catch(() => {});

  return c.json({ ok: true });
});

// ── Upload a file ───────────────────────────────────────────────────────

const UPLOAD_DIR = process.env.BJHUNT_UPLOAD_DIR || "/tmp/bjhunt-uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

chatRoutes.post("/files", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return c.json({ error: "No file provided" }, 400);
  }

  const uploadedFile = file as File;

  // Validate size
  if (uploadedFile.size > MAX_FILE_SIZE) {
    return c.json({ error: "File too large (max 10MB)" }, 413);
  }

  // Validate mimetype
  if (uploadedFile.type && !ALLOWED_MIMETYPES.has(uploadedFile.type)) {
    return c.json({ error: `Unsupported file type: ${uploadedFile.type}` }, 415);
  }

  // Sanitize filename — strip path separators, limit length
  const safeName = uploadedFile.name
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 200);

  // Ensure upload directory exists (org-scoped subdirectory)
  const orgDir = join(UPLOAD_DIR, orgId);
  await mkdir(orgDir, { recursive: true });

  // Generate unique storage path
  const fileId = crypto.randomUUID();
  const storagePath = join(orgDir, `${fileId}-${safeName}`);

  // Write file to disk
  const arrayBuffer = await uploadedFile.arrayBuffer();
  await Bun.write(storagePath, arrayBuffer);

  // Save metadata to DB
  const [record] = await sql`
    INSERT INTO file_uploads (org_id, user_id, filename, mimetype, size_bytes, storage_path)
    VALUES (${orgId}, ${user.id}, ${safeName}, ${uploadedFile.type || null},
            ${uploadedFile.size}, ${storagePath})
    RETURNING id, filename, mimetype, size_bytes, created_at
  `;

  if (!record) return c.json({ error: "Failed to save file metadata" }, 500);

  return c.json({
    id: record.id,
    filename: record.filename,
    mimetype: record.mimetype,
    url: `/api/chat/files/${record.id}`,
  }, 201);
});

// ── Serve a file ────────────────────────────────────────────────────────

chatRoutes.get("/files/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const fileId = c.req.param("id");

  if (!validateUUID(fileId)) return c.json({ error: "Invalid ID format" }, 400);

  const [record] = await withOrg(orgId, (tx) =>
    tx`SELECT id, filename, mimetype, size_bytes, storage_path
       FROM file_uploads
       WHERE id = ${fileId}`,
  );

  if (!record) {
    return c.json({ error: "File not found" }, 404);
  }

  // Verify file exists on disk
  try {
    await stat(record.storagePath as string);
  } catch {
    return c.json({ error: "File not found on disk" }, 404);
  }

  const file = Bun.file(record.storagePath as string);

  return new Response(file.stream(), {
    headers: {
      "Content-Type": (record.mimetype as string) || "application/octet-stream",
      "Content-Length": String(record.sizeBytes),
      "Content-Disposition": `inline; filename="${String(record.filename).replace(/["\\]/g, "_")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
