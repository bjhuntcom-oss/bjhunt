/**
 * LangGraph → BJHUNT SSE event transform.
 *
 * Per docs/architecture/02-STREAMING.md §SSE Event Types:
 * Backend transforms raw LangGraph events (`values`, `custom`, `messages*`)
 * into typed events the frontend already has handlers for.
 *
 * Emitted typed events:
 *   - token           {token, agent?}
 *   - tool_call       {id, name, args, status:"running"}
 *   - tool_result     {id, result, status:"completed"|"error"}
 *   - thinking        {content, active:boolean}
 *   - subagent_start  {id, name, description}
 *   - subagent_end    {id, error?}
 *   - objective       {...}                  (forwarded from custom event)
 *   - graph_update    {nodes, edges, stats}  (forwarded from custom event)
 *   - error           {message, code?}       (caller emits separately)
 *   - done            {tokensIn, tokensOut}  (caller emits at end)
 *
 * Caller is responsible for:
 *   - emitting `error` and `done` events
 *   - heartbeats and timeouts
 *   - persisting `state.fullResponse` and tokens to DB
 */

export interface TransformState {
  /** Partial SSE block carried across chunk boundaries. */
  sseBuffer: string;
  /** Accumulated AI text content (used for DB persistence). */
  fullResponse: string;
  /** Tool calls emitted so far (deduped). */
  toolCalls: Array<{ id?: string; name: string; args: unknown }>;
  /** Latest token usage from response_metadata or usage_metadata. */
  tokensIn: number;
  tokensOut: number;
  /** Thinking trace content (for collapsible UI). */
  thinkingContent: string;
}

export type EmitFn = (event: string, data: unknown) => void;

export function createTransformState(): TransformState {
  return {
    sseBuffer: "",
    fullResponse: "",
    toolCalls: [],
    tokensIn: 0,
    tokensOut: 0,
    thinkingContent: "",
  };
}

const decoder = new TextDecoder();

/**
 * Parse one upstream byte chunk and emit any typed events that result.
 * Idempotent w.r.t. partial blocks (kept in `state.sseBuffer`).
 */
export function processChunk(
  chunk: Uint8Array,
  state: TransformState,
  emit: EmitFn,
): void {
  state.sseBuffer += decoder.decode(chunk, { stream: true });
  const blocks = state.sseBuffer.split("\n\n");
  state.sseBuffer = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;
    processBlock(block, state, emit);
  }
}

/** Flush logic — call once when upstream is done. */
export function flushBuffer(state: TransformState, emit: EmitFn): void {
  if (state.sseBuffer.trim()) {
    processBlock(state.sseBuffer, state, emit);
    state.sseBuffer = "";
  }
}

function processBlock(block: string, state: TransformState, emit: EmitFn): void {
  let eventType = "";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) eventType = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    else if (dataLines.length > 0 && line.trim()) dataLines.push(line);
  }

  const raw = dataLines.join("\n").trim();
  console.log(`[xform-block] event=${eventType} rawLen=${raw.length} rawPreview=${raw.slice(0, 80).replace(/\n/g, '\\n')}`);
  if (!raw || raw === "[DONE]") return;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  // ── "messages" mode: LangGraph streams [AIMessageChunk, metadata] tuples ──
  if (
    eventType === "messages" ||
    eventType === "messages/partial" ||
    eventType === "messages/complete"
  ) {
    const msgChunk = Array.isArray(parsed) ? parsed[0] : parsed;
    const metadata = Array.isArray(parsed) ? parsed[1] : {};
    console.log(`[xform] event=${eventType} type=${msgChunk?.type} contentType=${typeof msgChunk?.content} contentPreview=${typeof msgChunk?.content === 'string' ? msgChunk.content.slice(0, 30) : '?'}`);
    if (!msgChunk) return;

    if (msgChunk.type === "AIMessageChunk" || msgChunk.type === "ai") {
      // Text content (string form)
      if (typeof msgChunk.content === "string" && msgChunk.content) {
        state.fullResponse += msgChunk.content;
        emit("token", { token: msgChunk.content, agent: metadata?.langgraph_node });
      }
      // Content array (Anthropic format)
      else if (Array.isArray(msgChunk.content)) {
        for (const contentBlock of msgChunk.content) {
          if (contentBlock.type === "text" && contentBlock.text) {
            state.fullResponse += contentBlock.text;
            emit("token", { token: contentBlock.text, agent: metadata?.langgraph_node });
          } else if (contentBlock.type === "thinking" && contentBlock.thinking) {
            state.thinkingContent += contentBlock.thinking;
            emit("thinking", { content: state.thinkingContent, active: true });
          }
        }
      }

      // Tool calls (complete — name is present)
      if (Array.isArray(msgChunk.tool_calls)) {
        for (const tc of msgChunk.tool_calls) {
          if (tc.name && !state.toolCalls.some((t) => t.id === tc.id)) {
            state.toolCalls.push({ id: tc.id, name: tc.name, args: tc.args || {} });
            emit("tool_call", {
              id: tc.id,
              name: tc.name,
              args: tc.args || {},
              status: "running",
            });
          }
        }
      }

      // Tool call chunks (incremental)
      if (Array.isArray(msgChunk.tool_call_chunks)) {
        for (const tcc of msgChunk.tool_call_chunks) {
          if (tcc.name && !state.toolCalls.some((t) => t.id === tcc.id)) {
            state.toolCalls.push({ id: tcc.id, name: tcc.name, args: {} });
            emit("tool_call", {
              id: tcc.id,
              name: tcc.name,
              args: {},
              status: "running",
            });
          }
        }
      }

      // Token usage
      if (msgChunk.response_metadata?.token_usage) {
        const usage = msgChunk.response_metadata.token_usage;
        state.tokensIn = usage.prompt_tokens || usage.input_tokens || state.tokensIn;
        state.tokensOut = usage.completion_tokens || usage.output_tokens || state.tokensOut;
      }
      if (msgChunk.usage_metadata) {
        state.tokensIn = msgChunk.usage_metadata.input_tokens || state.tokensIn;
        state.tokensOut = msgChunk.usage_metadata.output_tokens || state.tokensOut;
      }

      // End of thinking trace (next non-thinking content arrived) — close it
      if (state.thinkingContent && typeof msgChunk.content === "string" && msgChunk.content) {
        emit("thinking", { content: state.thinkingContent, active: false });
        state.thinkingContent = "";
      }
    }

    // ToolMessageChunk — result of a tool invocation
    else if (msgChunk.type === "ToolMessageChunk" || msgChunk.type === "tool") {
      const result =
        typeof msgChunk.content === "string"
          ? msgChunk.content.slice(0, 500)
          : JSON.stringify(msgChunk.content).slice(0, 500);
      emit("tool_result", {
        id: msgChunk.tool_call_id || "",
        result,
        status: msgChunk.status === "error" ? "error" : "completed",
      });
    }
    // HumanMessage / SystemMessage chunks — ignore (echo of our input)
    return;
  }

  // ── "values" mode fallback (state-snapshot reconciliation) ──
  if (eventType === "values") {
    const msgs = parsed.messages || parsed.values?.messages;
    if (Array.isArray(msgs)) {
      const aiMsgs = msgs.filter((m: any) => m.type === "ai" || m.role === "assistant");
      if (aiMsgs.length > 0) {
        const latest = aiMsgs[aiMsgs.length - 1];
        let text = "";
        if (typeof latest.content === "string") text = latest.content;
        else if (Array.isArray(latest.content)) {
          text = latest.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("");
        }
        if (text && text.length > state.fullResponse.length) {
          const delta = text.slice(state.fullResponse.length);
          state.fullResponse = text;
          emit("token", { token: delta });
        }
      }
      for (const ai of msgs.filter((m: any) => m.type === "ai" && m.tool_calls?.length)) {
        for (const tc of ai.tool_calls) {
          if (!state.toolCalls.some((t) => t.id === tc.id)) {
            state.toolCalls.push(tc);
            emit("tool_call", {
              id: tc.id,
              name: tc.name,
              args: tc.args || {},
              status: "running",
            });
          }
        }
      }
      for (const toolMsg of msgs.filter((m: any) => m.type === "tool")) {
        const result =
          typeof toolMsg.content === "string"
            ? toolMsg.content.slice(0, 500)
            : JSON.stringify(toolMsg.content).slice(0, 500);
        emit("tool_result", {
          id: toolMsg.tool_call_id || "",
          result,
          status: toolMsg.status === "error" ? "error" : "completed",
        });
      }
    }
    return;
  }

  // ── "custom" mode: sub-agent lifecycle, objective, graph_update ──
  if (eventType === "custom") {
    const evtType = parsed.type || parsed.event;
    const evtData = parsed.data || parsed;

    switch (evtType) {
      case "subagent_start":
        emit("subagent_start", {
          id: evtData.id || crypto.randomUUID(),
          name: evtData.name || evtData.agent || "sub-agent",
          description: evtData.description || "",
        });
        return;

      case "subagent_end":
        emit("subagent_end", { id: evtData.id || "", error: evtData.error || null });
        return;

      case "subagent_tool_call":
        emit("tool_call", {
          id: evtData.id || crypto.randomUUID(),
          name: evtData.name || evtData.tool || "tool",
          args: evtData.args || evtData.input || {},
          status: "running",
        });
        return;

      case "subagent_tool_result": {
        const result =
          typeof evtData.output === "string"
            ? evtData.output.slice(0, 500)
            : JSON.stringify(evtData.output).slice(0, 500);
        emit("tool_result", {
          id: evtData.id || "",
          result,
          status: evtData.error ? "error" : "completed",
        });
        return;
      }

      case "subagent_message":
        if (evtData.content) {
          state.fullResponse += evtData.content;
          emit("token", { token: evtData.content, agent: evtData.agent });
        }
        return;

      case "thinking":
      case "reasoning":
        state.thinkingContent = evtData.content || "";
        emit("thinking", { content: state.thinkingContent, active: true });
        return;

      case "objective":
        emit("objective", evtData);
        return;

      case "graph_update":
        emit("graph_update", {
          nodes: evtData.nodes || [],
          edges: evtData.edges || [],
          stats: evtData.stats || {},
        });
        return;
    }
  }
}
