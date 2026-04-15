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
import { langgraphClient } from "../lib/langgraph-client.js";
import { withOrg, sql } from "../db/client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";

export const chatRoutes = new Hono<{ Variables: AppVariables }>();

chatRoutes.use("*", requireAuth);
chatRoutes.use("*", rateLimit(config.rateLimit.api));

const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  engagementId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

// ── Send message + stream response (with DB persistence) ─────────────────

chatRoutes.post("/stream", zValidator("json", sendMessageSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { message, engagementId, conversationId: existingConvId } = c.req.valid("json");

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

  // Track agent run
  const [agentRun] = await sql`
    INSERT INTO agent_runs (org_id, engagement_id, conversation_id, agent_name, input_summary)
    VALUES (${orgId}, ${engagementId}, ${convId}, ${engagement.agentGraph || "bjhunt"}, ${message.slice(0, 200)})
    RETURNING id
  `;
  const runId = agentRun!.id as string;

  // Stream from LangGraph
  const stream = await langgraphClient.streamRun(
    threadId,
    (engagement.agentGraph as string) || "bjhunt",
    { content: message, user_id: user.id, org_id: orgId },
  );

  // Create a transform stream that saves the response to DB when complete
  let fullResponse = "";
  let toolCalls: unknown[] = [];
  let thinkingContent = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Parse SSE events to capture content for DB save
      const text = new TextDecoder().decode(chunk);
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) fullResponse += data.content;
            if (data.tool_calls) toolCalls.push(...data.tool_calls);
            if (data.thinking) thinkingContent = data.thinking;
            if (data.usage) {
              tokensIn += data.usage.input_tokens || 0;
              tokensOut += data.usage.output_tokens || 0;
            }
          } catch {
            // Non-JSON — text delta
            const trimmed = line.slice(6).trim();
            if (trimmed && trimmed !== "[DONE]") fullResponse += trimmed;
          }
        }
      }
      controller.enqueue(chunk);
    },
    async flush() {
      // Save assistant response to DB
      if (fullResponse || toolCalls.length > 0) {
        await sql`
          INSERT INTO chat_messages (org_id, conversation_id, role, content, tool_calls, thinking, tokens_input, tokens_output)
          VALUES (${orgId}, ${convId}, 'assistant', ${fullResponse || "(no text response)"},
                  ${JSON.stringify(toolCalls.length > 0 ? toolCalls : null)},
                  ${thinkingContent || null},
                  ${tokensIn || null}, ${tokensOut || null})
        `.catch((err) => console.error("Failed to save assistant message:", err));
      }

      // Update agent run as completed
      await sql`
        UPDATE agent_runs SET status = 'completed', completed_at = now(),
               tokens_input = ${tokensIn}, tokens_output = ${tokensOut},
               duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000,
               output_summary = ${fullResponse.slice(0, 200)}
        WHERE id = ${runId}
      `.catch((err) => console.error("Failed to update agent run:", err));

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
