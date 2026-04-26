/**
 * useChatStream — refonte 2026 / B5.
 *
 * Owns the SP3 ticket flow + SSE consumption + ALL event handlers.
 *
 * Logic preserved verbatim from the legacy 1986-LOC page.tsx:
 *   - prepare() returns ticket → stream via GET (no cookies on /stream).
 *   - identity guard via requestIdRef (CHAT-P0-1).
 *   - sanitised event-type parsing (CHAT-P0-3).
 *   - delta-vs-cumulative detection for messages chunks.
 *   - speed moving-average over 5 samples.
 *   - submit-during-stream aborts the active stream (ChatGPT pattern).
 *
 * Events handled (don't touch the order):
 *   token, tool_call, tool_result, thinking,
 *   subagent_start, subagent_end,
 *   objective, graph_update,
 *   messages, messages/partial, messages/complete,
 *   values, custom, error, done, metadata, default (debug log).
 */
"use client";

import { useCallback, useRef, useState } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import type { ChatMessage } from "@/components/chat/message-bubble";
import type { ToolCall } from "@/components/chat/tool-call-block";
import type { SubAgentSession } from "@/components/chat/sub-agent-card";
import type { Objective } from "@/components/chat/opplan-panel";
import type {
  GraphNode,
  GraphEdge,
  GraphStats,
} from "@/components/chat/knowledge-graph-panel";
import type { ModelSettings } from "@/components/chat/model-settings-panel";
import type { PendingFile } from "@/components/chat/file-upload-zone";
import type { Engagement } from "../_components/types";
import { errorToString } from "../_components/sidebar-helpers";
import { splitSSEBlocks } from "../parseSSE";

interface PrepareArgs {
  text: string;
  files: PendingFile[];
  engagementId: string;
  conversationId: string | null;
  selectedAgent: string;
  activeEngagement: Engagement | null;
  webSearch: boolean;
  modelSettings: ModelSettings;
}

interface Hooks {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setToolCalls: React.Dispatch<React.SetStateAction<Map<string, ToolCall>>>;
  setSubAgents: React.Dispatch<React.SetStateAction<Map<string, SubAgentSession>>>;
  setObjectives: React.Dispatch<React.SetStateAction<Objective[]>>;
  setGraphNodes: React.Dispatch<React.SetStateAction<GraphNode[]>>;
  setGraphEdges: React.Dispatch<React.SetStateAction<GraphEdge[]>>;
  setGraphStats: React.Dispatch<React.SetStateAction<GraphStats>>;
  setThinking: React.Dispatch<React.SetStateAction<{ content: string; active: boolean }>>;
  setStreamError: (s: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
}

const DEFAULT_MODEL_SETTINGS: Pick<ModelSettings, "temperature" | "maxTokens" | "topP"> = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
};

function isDefaultModelSettings(s: ModelSettings): boolean {
  return (
    s.temperature === DEFAULT_MODEL_SETTINGS.temperature &&
    s.maxTokens === DEFAULT_MODEL_SETTINGS.maxTokens &&
    s.topP === DEFAULT_MODEL_SETTINGS.topP &&
    !s.systemPrompt?.trim()
  );
}

export function useChatStream(hooks: Hooks) {
  const {
    setMessages,
    setToolCalls,
    setSubAgents,
    setObjectives,
    setGraphNodes,
    setGraphEdges,
    setGraphStats,
    setThinking,
    setStreamError,
    setActiveConversationId,
  } = hooks;

  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [streamSpeed, setStreamSpeed] = useState(0);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastAiContentRef = useRef<string>("");
  const requestIdRef = useRef<number>(0);
  const streamStartTimeRef = useRef<number>(0);
  const tokensSoFarRef = useRef<number>(0);
  const speedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedSamplesRef = useRef<number[]>([]);

  const abort = useCallback(() => abortRef.current?.abort(), []);

  const startStream = useCallback(
    async (args: PrepareArgs, onComplete?: (finalContent: string) => void) => {
      const {
        text,
        engagementId,
        conversationId,
        selectedAgent,
        activeEngagement,
        webSearch,
        modelSettings,
      } = args;

      // Submit-during-stream → abort the active one (ChatGPT pattern)
      if (isStreaming) {
        abortRef.current?.abort();
        await new Promise((r) => setTimeout(r, 100));
      }

      setIsStreaming(true);
      setStreamError(null);
      setThinking({ content: "", active: true });
      lastAiContentRef.current = "";

      setTokenCount(0);
      setStreamSpeed(0);
      setActiveAgent(null);
      tokensSoFarRef.current = 0;
      streamStartTimeRef.current = Date.now();
      speedSamplesRef.current = [];

      speedIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - streamStartTimeRef.current) / 1000;
        if (elapsed > 0 && tokensSoFarRef.current > 0) {
          const raw = tokensSoFarRef.current / elapsed;
          speedSamplesRef.current.push(raw);
          if (speedSamplesRef.current.length > 5) speedSamplesRef.current.shift();
          const avg =
            speedSamplesRef.current.reduce((a, b) => a + b, 0) /
            speedSamplesRef.current.length;
          setStreamSpeed(Math.round(avg));
        }
      }, 500);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          isStreaming: true,
          createdAt: new Date().toISOString(),
        },
      ]);

      const currentRequestId = ++requestIdRef.current;
      const isCurrent = () => requestIdRef.current === currentRequestId;

      try {
        abortRef.current = new AbortController();

        // Conversation may have been wired with a specific agent — that
        // takes precedence over the picker (CHAT-P1-2).
        const resolvedAgent =
          (activeEngagement?.agentGraph as string | undefined) || selectedAgent;
        const requestBody: Record<string, unknown> = {
          message: text,
          engagementId: engagementId || "",
          agentGraph: resolvedAgent,
        };
        if (conversationId) requestBody.conversationId = conversationId;
        if (webSearch) requestBody.webSearch = true;
        // KILL-BUG: only send modelSettings when non-default.
        if (!isDefaultModelSettings(modelSettings)) {
          requestBody.modelSettings = {
            temperature: modelSettings.temperature,
            maxTokens: modelSettings.maxTokens,
            topP: modelSettings.topP,
            ...(modelSettings.systemPrompt?.trim()
              ? { systemPrompt: modelSettings.systemPrompt.trim() }
              : {}),
          };
        }

        const prepareRes = await fetch(`/api/proxy/chat/prepare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(requestBody),
          signal: abortRef.current.signal,
        });

        if (!prepareRes.ok) {
          const err = await prepareRes
            .json()
            .catch(() => ({ error: `HTTP ${prepareRes.status}` }));
          throw new Error(errorToString(err) || `Prepare failed (${prepareRes.status})`);
        }

        const { streamUrl, ticket, conversationId: returnedConvId } =
          await prepareRes.json();
        if (returnedConvId) setActiveConversationId(returnedConvId);

        const streamRes = await fetch(
          `${streamUrl}?ticket=${encodeURIComponent(ticket)}`,
          { signal: abortRef.current.signal },
        );
        if (!streamRes.ok) throw new Error(`Stream HTTP ${streamRes.status}`);

        const reader = streamRes.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer.trim() && isCurrent()) {
                processStreamEvent(buffer, assistantId, currentRequestId);
              }
              break;
            }
            if (!isCurrent()) break;
            buffer += decoder.decode(value, { stream: true });
            const { blocks, remainder } = splitSSEBlocks(buffer);
            buffer = remainder;
            for (const block of blocks) {
              if (!block.trim()) continue;
              if (!isCurrent()) break;
              processStreamEvent(block, assistantId, currentRequestId);
            }
          }
        }
      } catch (err: any) {
        if (!isCurrent()) {
          // Newer request has taken over — silently bail.
        } else if (err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
          );
        } else {
          const errMsg = err.message || "Connection failed";
          setStreamError(errMsg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Error: ${errMsg}`, isStreaming: false }
                : m,
            ),
          );
        }
      } finally {
        if (isCurrent()) {
          setIsStreaming(false);
          setThinking((prev) => ({ ...prev, active: false }));
          setStreamSpeed(0);
          setActiveAgent(null);
          abortRef.current = null;
          if (speedIntervalRef.current) {
            clearInterval(speedIntervalRef.current);
            speedIntervalRef.current = null;
          }
          const finalContent = lastAiContentRef.current;
          lastAiContentRef.current = "";
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const resolvedContent = m.content || finalContent;
              if (!resolvedContent) {
                return { ...m, content: "", isStreaming: false, emptyResponse: true };
              }
              return { ...m, content: resolvedContent, isStreaming: false };
            }),
          );
          onComplete?.(finalContent);
        }
      }
    },
    // The closures below are stable (refs + setters), but exhaustive-deps
    // would force a recreate on every parent render. Disable by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming],
  );

  const processStreamEvent = useCallback(
    (block: string, assistantId: string, requestId?: number) => {
      if (requestId !== undefined && requestIdRef.current !== requestId) return;

      let event = "message";
      const dataLines: string[] = [];

      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) {
          // CHAT-P0-3 sanitisation
          event = line.slice(7).replace(/[\r\n -]/g, "").trim();
        } else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
        else if (line.startsWith(":")) continue;
        else if (dataLines.length > 0 && line.trim()) dataLines.push(line);
      }

      const data = dataLines.join("\n").trim();
      if (!data || data === "[DONE]") return;

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        console.error("[chat] SSE parse failure", { err, event, snippet: data.slice(0, 200) });
        return;
      }

      switch (event) {
        case "token":
          if (parsed.token) {
            lastAiContentRef.current += parsed.token;
            const approx = Math.ceil(parsed.token.length / 4);
            tokensSoFarRef.current += approx;
            setTokenCount((p) => p + approx);
            if (parsed.agent) setActiveAgent(parsed.agent);
            const tokAgent = parsed.agent as string | undefined;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + parsed.token, agent: tokAgent ?? m.agent }
                  : m,
              ),
            );
            setThinking((prev) => (prev.active ? { ...prev, active: false } : prev));
          }
          break;

        case "tool_call":
          if (parsed.agent) setActiveAgent(parsed.agent);
          setToolCalls((prev) => {
            const next = new Map(prev);
            next.set(parsed.id, {
              id: parsed.id,
              name: parsed.name || "tool",
              args: parsed.args || {},
              status: "running",
              messageId: assistantId,
            });
            return next;
          });
          break;

        case "tool_result":
          setToolCalls((prev) => {
            const next = new Map(prev);
            const existing = next.get(parsed.id);
            if (existing) {
              next.set(parsed.id, {
                ...existing,
                result: parsed.result || parsed.output,
                status: parsed.status === "error" ? "error" : "completed",
                duration: parsed.duration,
              });
            }
            return next;
          });
          break;

        case "thinking":
          setThinking({ content: parsed.content || "", active: parsed.active !== false });
          break;

        case "subagent_start":
          setActiveAgent(parsed.name || parsed.agent || null);
          setSubAgents((prev) => {
            const next = new Map(prev);
            next.set(parsed.id, {
              id: parsed.id,
              name: parsed.name || parsed.agent,
              description: parsed.description,
              status: "running",
              startedAt: new Date().toISOString(),
              toolCalls: [],
              messages: [],
            });
            return next;
          });
          break;

        case "subagent_end":
          setSubAgents((prev) => {
            const next = new Map(prev);
            const existing = next.get(parsed.id);
            if (existing) {
              next.set(parsed.id, {
                ...existing,
                status: parsed.error ? "error" : "completed",
                endedAt: new Date().toISOString(),
              });
            }
            return next;
          });
          break;

        case "objective":
          setObjectives((prev) => {
            const existing = prev.find((o) => o.id === parsed.id);
            if (existing) return prev.map((o) => (o.id === parsed.id ? { ...o, ...parsed } : o));
            return [...prev, parsed];
          });
          break;

        case "graph_update":
          if (parsed.nodes) setGraphNodes(parsed.nodes);
          if (parsed.edges) setGraphEdges(parsed.edges);
          if (parsed.stats) setGraphStats(parsed.stats);
          break;

        case "messages":
        case "messages/partial":
        case "messages/complete": {
          const chunk = Array.isArray(parsed) ? parsed[0] : parsed;
          const metadata = Array.isArray(parsed) ? parsed[1] : {};
          if (!chunk) break;
          if (chunk.type === "AIMessageChunk" || chunk.type === "ai") {
            let incoming = "";
            if (typeof chunk.content === "string") {
              incoming = chunk.content;
            } else if (Array.isArray(chunk.content)) {
              for (const b of chunk.content) {
                if (b?.type === "text" && typeof b.text === "string") incoming += b.text;
              }
            }
            if (incoming) {
              const current = lastAiContentRef.current;
              let nextContent: string;
              if (incoming.startsWith(current)) {
                nextContent = incoming;
              } else if (current.startsWith(incoming) || current.endsWith(incoming)) {
                nextContent = current;
              } else {
                let overlap = 0;
                const maxOverlap = Math.min(current.length, incoming.length);
                for (let k = maxOverlap; k > 0; k--) {
                  if (current.slice(-k) === incoming.slice(0, k)) {
                    overlap = k;
                    break;
                  }
                }
                nextContent = current + incoming.slice(overlap);
              }
              if (nextContent !== current) {
                const addedLen = nextContent.length - current.length;
                lastAiContentRef.current = nextContent;
                const approx = Math.ceil(addedLen / 4);
                tokensSoFarRef.current += approx;
                setTokenCount((p) => p + approx);
                if (metadata?.langgraph_node) setActiveAgent(metadata.langgraph_node);
                const agentFromNode = metadata?.langgraph_node as string | undefined;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: nextContent, agent: agentFromNode ?? m.agent }
                      : m,
                  ),
                );
                setThinking((prev) => (prev.active ? { ...prev, active: false } : prev));
              }
            }
            if (chunk.response_metadata?.token_usage) {
              const u = chunk.response_metadata.token_usage;
              if (u.total_tokens) setTokenCount(u.total_tokens);
            }
          }
          break;
        }

        case "values": {
          const msgs = parsed.messages || parsed.values?.messages;
          if (Array.isArray(msgs)) {
            let lastUserIdx = -1;
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i]?.type === "human" || msgs[i]?.role === "user") {
                lastUserIdx = i;
                break;
              }
            }
            const aiMsgs = msgs
              .slice(lastUserIdx + 1)
              .filter((m: any) => m.type === "ai" || m.role === "assistant");
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
              if (text && text.length > lastAiContentRef.current.length) {
                const delta = text.slice(lastAiContentRef.current.length);
                lastAiContentRef.current = text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m)),
                );
                setThinking((prev) => (prev.active ? { ...prev, active: false } : prev));
                const approx = Math.ceil(delta.length / 4);
                tokensSoFarRef.current += approx;
                setTokenCount((p) => p + approx);
              }
              if (latest.response_metadata?.token_usage) {
                const u = latest.response_metadata.token_usage;
                if (u.total_tokens) setTokenCount(u.total_tokens);
              }
            }
            for (const ai of msgs.filter((m: any) => m.type === "ai" && m.tool_calls?.length)) {
              for (const tc of ai.tool_calls) {
                setToolCalls((prev) => {
                  if (prev.has(tc.id)) return prev;
                  const next = new Map(prev);
                  next.set(tc.id, {
                    id: tc.id,
                    name: tc.name,
                    args: tc.args || {},
                    status: "running",
                    messageId: assistantId,
                  });
                  return next;
                });
              }
            }
            for (const toolMsg of msgs.filter((m: any) => m.type === "tool")) {
              setToolCalls((prev) => {
                const next = new Map(prev);
                const existing = next.get(toolMsg.tool_call_id);
                if (existing) {
                  next.set(toolMsg.tool_call_id, {
                    ...existing,
                    result: (typeof toolMsg.content === "string"
                      ? toolMsg.content
                      : JSON.stringify(toolMsg.content)
                    ).slice(0, 500),
                    status: toolMsg.status === "error" ? "error" : "completed",
                  });
                }
                return next;
              });
            }
          }
          break;
        }

        case "custom": {
          const evtType = parsed.type || parsed.event;
          const evtData = parsed.data || parsed;
          if (evtType === "subagent_start") {
            setSubAgents((prev) => {
              const next = new Map(prev);
              const id = evtData.id || crypto.randomUUID();
              next.set(id, {
                id,
                name: evtData.name || evtData.agent || "sub-agent",
                description: evtData.description || "",
                status: "running",
                startedAt: new Date().toISOString(),
                toolCalls: [],
                messages: [],
              });
              return next;
            });
          } else if (evtType === "subagent_end") {
            setSubAgents((prev) => {
              const next = new Map(prev);
              const existing = next.get(evtData.id);
              if (existing) {
                next.set(evtData.id, {
                  ...existing,
                  status: evtData.error ? "error" : "completed",
                  endedAt: new Date().toISOString(),
                });
              }
              return next;
            });
          }
          break;
        }

        case "error":
          setStreamError(parsed.message || "Stream error from server");
          break;

        case "done":
          if (parsed.tokensIn || parsed.tokensOut) {
            setTokenCount(parsed.tokensIn + parsed.tokensOut);
          }
          break;

        case "metadata":
          break;

        default:
          if (event && event !== "message") {
            console.debug("[chat] unhandled SSE event type", { event });
          }
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    isStreaming,
    tokenCount,
    streamSpeed,
    activeAgent,
    abort,
    startStream,
  };
}

/**
 * uploadFiles — best-effort attachment upload. Returns the IDs that the
 * orchestrator can attach to the next chat request body.
 */
export async function uploadFiles(files: PendingFile[]): Promise<string[]> {
  if (files.length === 0) return [];
  const results = await Promise.all(
    files.map(async (pf) => {
      try {
        const formData = new FormData();
        formData.append("file", pf.file);
        const res = await browserBackendFetch("/api/chat/files", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          return data.id as string;
        }
      } catch {
        // best-effort
      }
      return null;
    }),
  );
  return results.filter((id): id is string => id !== null);
}
