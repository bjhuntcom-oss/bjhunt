import type { AppVariables } from "../types.js";
/**
 * Chat routes — SSE streaming proxy + DB persistence.
 *
 * Messages are saved to PostgreSQL AND streamed from LangGraph.
 * History can be loaded from DB independently of LangGraph state.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { enforceDemoLimit } from "../middleware/plan-gate.js";
import { langgraphClient } from "../lib/langgraph-client.js";
import { withOrg, sql } from "../db/client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";
import { join } from "node:path";
import { mkdir, stat } from "node:fs/promises";

export const chatRoutes = new Hono<{ Variables: AppVariables }>();

chatRoutes.use("*", requireAuth);
chatRoutes.use("*", rateLimit(config.rateLimit.api));

const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  engagementId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  agentGraph: z.string().min(1).max(50).optional(),
});

// ── Send message + stream response (with DB persistence) ─────────────────

chatRoutes.post("/stream", enforceDemoLimit(), zValidator("json", sendMessageSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { message, engagementId, conversationId: existingConvId, agentGraph } = c.req.valid("json");

  // Verify engagement belongs to user's org and is active
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, langgraph_thread_id, agent_graph, status, name
       FROM engagements WHERE id = ${engagementId}`,
  );

  if (!engagement) {
    return c.json({ error: "Engagement not found" }, 404);
  }

  // Get or create conversation
  let convId = existingConvId;
  if (!convId) {
    const [conv] = await sql`
      INSERT INTO chat_conversations (org_id, user_id, engagement_id, title)
      VALUES (${orgId}, ${user.id}, ${engagementId}, ${engagement.name || "Chat"})
      RETURNING id
    `;
    convId = conv!.id as string;
  }

  // Save user message to DB
  await sql`
    INSERT INTO chat_messages (org_id, conversation_id, role, content)
    VALUES (${orgId}, ${convId}, 'user', ${message})
  `;

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
  const runId = agentRun!.id as string;

  // Stream from LangGraph
  const stream = await langgraphClient.streamRun(
    threadId,
    agentId,
    { content: message, user_id: user.id, org_id: orgId },
  );

  // Create a transform stream that:
  // 1. Parses LangGraph "events" SSE to capture content for DB persistence
  // 2. Re-emits normalized SSE events the frontend understands:
  //    - event: token       → {"token": "..."}           (progressive text)
  //    - event: tool_call   → {"id","name","args"}       (tool invocation)
  //    - event: tool_result → {"id","result","status"}   (tool output)
  //    - event: thinking    → {"content": "..."}         (reasoning block)
  //    - event: done        → {}                         (stream finished)
  let fullResponse = "";
  let toolCalls: unknown[] = [];
  let thinkingContent = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let sseBuffer = "";

  function emitSSE(controller: TransformStreamDefaultController<Uint8Array>, event: string, data: unknown) {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  }

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      sseBuffer += decoder.decode(chunk, { stream: true });
      const blocks = sseBuffer.split("\n\n");
      sseBuffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;

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

        // LangGraph "events" stream mode emits { event: "on_...", data: {...} }
        const lgEvent = parsed.event || eventType;

        if (lgEvent === "on_chat_model_stream") {
          // Token-by-token streaming from the LLM
          const chunk = parsed.data?.chunk;
          let token = "";
          if (chunk) {
            if (typeof chunk.content === "string") {
              token = chunk.content;
            } else if (Array.isArray(chunk.content)) {
              token = chunk.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join("");
            }
          }
          if (token) {
            fullResponse += token;
            emitSSE(controller, "token", { token });
          }
        } else if (lgEvent === "on_tool_start") {
          const runInfo = parsed.data;
          if (runInfo) {
            const tc = {
              id: runInfo.run_id || crypto.randomUUID(),
              name: runInfo.name || "tool",
              args: runInfo.input || {},
            };
            toolCalls.push(tc);
            emitSSE(controller, "tool_call", { ...tc, status: "running" });
          }
        } else if (lgEvent === "on_tool_end") {
          const runInfo = parsed.data;
          if (runInfo) {
            const result = typeof runInfo.output === "string"
              ? runInfo.output.slice(0, 500)
              : JSON.stringify(runInfo.output).slice(0, 500);
            emitSSE(controller, "tool_result", {
              id: runInfo.run_id || "",
              result,
              status: runInfo.error ? "error" : "completed",
              duration: runInfo.duration,
            });
          }
        } else if (lgEvent === "on_chain_end") {
          // Final chain output — may contain token usage
          const output = parsed.data?.output;
          if (output?.response_metadata?.token_usage) {
            const usage = output.response_metadata.token_usage;
            tokensIn = usage.prompt_tokens || usage.input_tokens || 0;
            tokensOut = usage.completion_tokens || usage.output_tokens || 0;
          }
        } else if (lgEvent === "on_chat_model_start") {
          // Thinking indicator
          emitSSE(controller, "thinking", { content: "", active: true });
        }
        // Forward "values" events too (backward compat if LangGraph falls back)
        else if (eventType === "values" || lgEvent === "values") {
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
      }
    },
    async flush(controller) {
      // Process any remaining buffer
      if (sseBuffer.trim()) {
        // Final partial block — just pass through, no parse needed
      }

      // Emit done event
      emitSSE(controller, "done", {});

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

  return new Response(transformedStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Conversation-Id": convId!,
    },
  });
});

// ── Get conversation history from DB ─────────────────────────────────────

chatRoutes.get("/history/:engagementId", async (c) => {
  const orgId = c.get("orgId") as string;
  const engagementId = c.req.param("engagementId");

  const conversations = await withOrg(orgId, (tx) =>
    tx`SELECT id, title, status, created_at, updated_at
       FROM chat_conversations
       WHERE engagement_id = ${engagementId}
       ORDER BY created_at DESC`,
  );

  return c.json({ conversations });
});

// ── Get messages for a conversation ──────────────────────────────────────

chatRoutes.get("/conversations/:id/messages", async (c) => {
  const orgId = c.get("orgId") as string;
  const convId = c.req.param("id");
  const limit = Math.min(parseInt(c.req.query("limit") || "100", 10), 500);
  const offset = parseInt(c.req.query("offset") || "0", 10);

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
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);

  const conversations = await withOrg(orgId, (tx) =>
    tx`SELECT c.id, c.title, c.status, c.engagement_id, c.created_at, c.updated_at,
              e.name as engagement_name, e.target as engagement_target,
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

  // If an initial message was provided, save it
  const messages: Record<string, unknown>[] = [];
  if (body.initialMessage) {
    const [userMsg] = await sql`
      INSERT INTO chat_messages (org_id, conversation_id, role, content)
      VALUES (${orgId}, ${conversation!.id}, 'user', ${body.initialMessage})
      RETURNING id, role, content, tool_calls, thinking, tokens_input, tokens_output, model, created_at
    `;
    messages.push(userMsg!);

    // Link any uploaded attachments to this conversation
    if (body.attachmentIds && body.attachmentIds.length > 0) {
      await sql`
        UPDATE file_uploads
        SET conversation_id = ${conversation!.id}
        WHERE id = ANY(${body.attachmentIds}::uuid[])
          AND org_id = ${orgId}
          AND user_id = ${user.id}
      `;
    }
  }

  // Audit log
  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${orgId}, ${user.id}, 'chat.conversation.create', ${"conversation:" + conversation!.id},
            ${JSON.stringify({ title, hasInitialMessage: !!body.initialMessage })})
  `.catch(() => {});

  return c.json({ conversation, messages }, 201);
});

// ── Delete a conversation ───────────────────────────────────────────────

chatRoutes.delete("/conversations/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const convId = c.req.param("id");

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

  return c.json({
    id: record!.id,
    filename: record!.filename,
    mimetype: record!.mimetype,
    url: `/api/chat/files/${record!.id}`,
  }, 201);
});

// ── Serve a file ────────────────────────────────────────────────────────

chatRoutes.get("/files/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const fileId = c.req.param("id");

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
      "Content-Disposition": `inline; filename="${record.filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});
