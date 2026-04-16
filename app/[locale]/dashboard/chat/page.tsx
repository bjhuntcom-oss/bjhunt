"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Plus, PanelRightOpen, PanelRightClose } from "lucide-react";
import { MessageBubble, type ChatMessage } from "@/components/chat/message-bubble";
import { ToolCallBlock, type ToolCall } from "@/components/chat/tool-call-block";
import { ThinkingBlock } from "@/components/chat/thinking-block";
import { SubAgentCard, type SubAgentSession } from "@/components/chat/sub-agent-card";
import { OpplanPanel, type Objective } from "@/components/chat/opplan-panel";
import { KnowledgeGraphPanel, type GraphNode, type GraphEdge, type GraphStats } from "@/components/chat/knowledge-graph-panel";
import { browserBackendFetch } from "@/lib/backend-client";

// ── Types ────────────────────────────────────────────────────────────────

interface Engagement {
  id: string;
  name: string;
  target: string;
  status: string;
  createdAt: string;
}

interface StreamEvent {
  type: "message" | "tool_call" | "thinking" | "sub_agent" | "objective" | "graph_update";
  data: any;
}

// ── Chat Page ────────────────────────────────────────────────────────────

// Direct backend URL for SSE (bypasses Vercel proxy timeout)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.bjhunt.com";

export default function ChatPage() {
  // State
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [activeEngagement, setActiveEngagement] = useState<Engagement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<Map<string, ToolCall>>(new Map());
  const [subAgents, setSubAgents] = useState<Map<string, SubAgentSession>>(new Map());
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphStats, setGraphStats] = useState<GraphStats>({ nodeCount: 0, edgeCount: 0, criticalFindings: 0, highFindings: 0 });
  const [thinking, setThinking] = useState<{ content: string; active: boolean }>({ content: "", active: false });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"engagements" | "opplan" | "graph">("engagements");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAiContentRef = useRef<string>("");

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, subAgents]);

  // Load engagements on mount
  useEffect(() => {
    loadEngagements();
  }, []);

  async function loadEngagements() {
    try {
      const res = await browserBackendFetch("/api/engagements");
      if (res.ok) {
        const data = await res.json();
        setEngagements(data.engagements || []);
      }
    } catch {
      // Backend may not be up yet
    }
  }

  // ── Load conversation history from DB ─────────────────────────────────

  async function loadHistory(engagementId: string) {
    try {
      // Get conversations for this engagement
      const convRes = await browserBackendFetch(`/api/chat/history/${engagementId}`);
      if (!convRes.ok) return;
      const { conversations } = await convRes.json();
      if (!conversations?.length) return;

      // Load messages from the most recent conversation
      const convId = conversations[0].id;
      const msgRes = await browserBackendFetch(`/api/chat/conversations/${convId}/messages`);
      if (!msgRes.ok) return;
      const { messages: dbMessages } = await msgRes.json();

      // Map DB messages to ChatMessage format
      const mapped: ChatMessage[] = (dbMessages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        isStreaming: false,
      }));
      setMessages(mapped);

      // Restore tool calls from messages metadata
      const allToolCalls = new Map<string, ToolCall>();
      for (const m of dbMessages || []) {
        if (m.toolCalls && Array.isArray(m.toolCalls)) {
          for (const tc of m.toolCalls) {
            allToolCalls.set(tc.id, { ...tc, status: tc.status || "completed" });
          }
        }
      }
      setToolCalls(allToolCalls);
    } catch {
      // History load is best-effort
    }
  }

  // ── New engagement ───────────────────────────────────────────────────

  async function createEngagement() {
    const name = `Assessment ${new Date().toLocaleDateString("fr-FR")}`;
    setStreamError(null);
    try {
      const res = await browserBackendFetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, target: "pending", agentGraph: "bjhunt" }),
      });
      if (res.ok) {
        const data = await res.json();
        const eng = data.engagement;
        setEngagements((prev) => [eng, ...prev]);
        setActiveEngagement(eng);
        setMessages([]);
        setToolCalls(new Map());
        setSubAgents(new Map());
        setObjectives([]);
      } else {
        const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        setStreamError(err.message || err.error || `Failed to create assessment (${res.status})`);
      }
    } catch (e: any) {
      setStreamError(e.message || "Failed to create assessment");
    }
  }

  // ── Send message ─────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamError(null);
    setLastMessage(text);
    setThinking({ content: "", active: true });

    // Create assistant placeholder
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();

      // SSE stream goes DIRECTLY to backend (Vercel proxy has 10s timeout).
      // Read the non-HttpOnly stream token cookie for cross-origin auth.
      const tokenCookie = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("bjhunt_stream_token="));
      const sessionToken = tokenCookie?.split("=")[1] || "";

      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `bjhunt_session=${sessionToken}`,
          "Authorization": `Bearer session:${sessionToken}`,
        },
        body: JSON.stringify({
          message: text,
          engagementId: activeEngagement?.id || "",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining data in the buffer
            if (buffer.trim()) {
              processStreamEvent(buffer, assistantId);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            if (!block.trim()) continue;
            processStreamEvent(block, assistantId);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const errMsg = err.message || "Connection failed";
        setStreamError(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || `Error: ${errMsg}`, isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setThinking((prev) => ({ ...prev, active: false }));

      // Apply last known AI content from ref — must be captured BEFORE any async ops
      const finalContent = lastAiContentRef.current;

      // Use requestAnimationFrame to ensure React has committed previous state updates
      requestAnimationFrame(() => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const content = m.content || finalContent;
            return { ...m, content, isStreaming: false };
          })
        );
      });

      lastAiContentRef.current = "";
      abortRef.current = null;
    }
  }

  function processStreamEvent(block: string, assistantId: string) {
    let event = "message";
    let dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
      else if (line.startsWith(":")) continue; // SSE comment (heartbeat)
      else if (dataLines.length > 0 && line.trim()) dataLines.push(line); // continuation
    }

    const data = dataLines.join("\n").trim();
    if (!data || data === "[DONE]") return;

    try {
      const parsed = JSON.parse(data);

      switch (event) {
        case "delta":
        case "message":
          if (parsed.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + parsed.content } : m
              )
            );
            setThinking((prev) => ({ ...prev, active: false }));
          }
          break;

        case "values": {
          // LangGraph "values" stream mode — full state snapshot with all messages
          const msgs = parsed.messages || parsed.values?.messages;
          if (Array.isArray(msgs)) {
            // Find ALL AI messages and concatenate their content (agent may respond multiple times)
            const aiMessages = msgs.filter((m: any) => m.type === "ai" || m.role === "assistant");

            if (aiMessages.length > 0) {
              // Get the latest AI message content
              const latestAi = aiMessages[aiMessages.length - 1];
              let text = "";
              if (typeof latestAi.content === "string") {
                text = latestAi.content;
              } else if (Array.isArray(latestAi.content)) {
                text = latestAi.content
                  .filter((c: any) => c.type === "text")
                  .map((c: any) => c.text)
                  .join("");
              }

              // Only update if we have actual content (not empty string)
              if (text && text.trim()) {
                lastAiContentRef.current = text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: text } : m
                  )
                );
                setThinking((prev) => ({ ...prev, active: false }));
              }
            }

            // Track tool calls from AI messages
            for (const ai of msgs.filter((m: any) => m.type === "ai")) {
              if (ai.tool_calls && Array.isArray(ai.tool_calls) && ai.tool_calls.length > 0) {
                setToolCalls((prev) => {
                  const next = new Map(prev);
                  for (const tc of ai.tool_calls) {
                    next.set(tc.id, {
                      id: tc.id,
                      name: tc.name,
                      args: tc.args || {},
                      status: "running",
                    });
                  }
                  return next;
                });
              }
            }

            // Track tool results
            for (const toolMsg of msgs.filter((m: any) => m.type === "tool")) {
              if (toolMsg.tool_call_id) {
                setToolCalls((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(toolMsg.tool_call_id);
                  if (existing) {
                    const content = typeof toolMsg.content === "string"
                      ? toolMsg.content.slice(0, 500)
                      : JSON.stringify(toolMsg.content).slice(0, 500);
                    next.set(toolMsg.tool_call_id, {
                      ...existing,
                      result: content,
                      status: toolMsg.status === "error" ? "error" : "completed",
                    });
                  }
                  return next;
                });
              }
            }
          }
          break;
        }

        case "custom": {
          // LangGraph custom events (sub-agent lifecycle)
          const evtType = parsed.type || parsed.event;
          if (evtType === "subagent_start" || evtType === "subagent_end") {
            processStreamEvent(
              `event: ${evtType}\ndata: ${JSON.stringify(parsed.data || parsed)}`,
              assistantId
            );
          }
          break;
        }

        case "tool_call":
          setToolCalls((prev) => {
            const next = new Map(prev);
            next.set(parsed.id, {
              id: parsed.id,
              name: parsed.name || parsed.tool,
              args: parsed.args || {},
              status: "running",
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
                status: parsed.error ? "error" : "completed",
                duration: parsed.duration,
              });
            }
            return next;
          });
          break;

        case "thinking":
          setThinking({ content: parsed.content || "", active: true });
          break;

        case "subagent_start":
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
            if (existing) {
              return prev.map((o) => (o.id === parsed.id ? { ...o, ...parsed } : o));
            }
            return [...prev, parsed];
          });
          break;

        case "graph_update":
          if (parsed.nodes) setGraphNodes(parsed.nodes);
          if (parsed.edges) setGraphEdges(parsed.edges);
          if (parsed.stats) setGraphStats(parsed.stats);
          break;
      }
    } catch {
      // Non-JSON data — only append if it looks like readable text, not raw JSON
      if (data && !data.startsWith("{") && !data.startsWith("[")) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + data } : m))
        );
      }
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  // Interleave messages and tool calls chronologically
  const sortedToolCalls = [...toolCalls.values()];
  const sortedSubAgents = [...subAgents.values()];

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      {showSidebar && (
        <div className="w-[280px] border-r border-[var(--border)] flex flex-col bg-[var(--bg)]">
          {/* Sidebar tabs */}
          <div className="flex border-b border-[var(--border)]">
            {(["engagements", "opplan", "graph"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2 text-[9px] uppercase tracking-wider transition-colors ${
                  sidebarTab === tab
                    ? "text-white border-b border-white"
                    : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                }`}
              >
                {tab === "engagements" ? "Sessions" : tab === "opplan" ? "OPPLAN" : "Graph"}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "engagements" && (
              <div className="p-2 space-y-1">
                <button
                  onClick={createEngagement}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] border border-dashed border-[var(--border)] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  New Assessment
                </button>

                {engagements.map((eng) => (
                  <button
                    key={eng.id}
                    onClick={() => {
                      setActiveEngagement(eng);
                      setMessages([]);
                      setToolCalls(new Map());
                      setSubAgents(new Map());
                      loadHistory(eng.id);
                    }}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      activeEngagement?.id === eng.id
                        ? "bg-[var(--bg-card)] border border-[var(--border-strong)]"
                        : "hover:bg-[var(--bg-card)] border border-transparent"
                    }`}
                  >
                    <div className="text-[11px] text-white truncate">{eng.name}</div>
                    <div className="text-[9px] text-[var(--text-subtle)] truncate">{eng.target}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[8px] uppercase px-1 ${
                        eng.status === "running" ? "text-[var(--warning)] bg-[var(--warning-dim)]" :
                        eng.status === "completed" ? "text-[var(--success)] bg-[var(--success-dim)]" :
                        "text-[var(--text-subtle)]"
                      }`}>
                        {eng.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {sidebarTab === "opplan" && (
              <OpplanPanel objectives={objectives} />
            )}

            {sidebarTab === "graph" && (
              <KnowledgeGraphPanel
                nodes={graphNodes}
                edges={graphEdges}
                stats={graphStats}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {showSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
            <div>
              <div className="text-[11px] text-white font-mono">
                {activeEngagement?.name || "BJHUNT ALPHA 1.0"}
              </div>
              {activeEngagement && (
                <div className="text-[9px] text-[var(--text-subtle)]">
                  {activeEngagement.target}
                </div>
              )}
            </div>
          </div>
          <div className="text-[9px] text-[var(--text-subtle)] uppercase tracking-wider">
            {isStreaming ? (
              <span className="text-[var(--warning)]">streaming</span>
            ) : (
              "ready"
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !activeEngagement && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-[24px] font-mono text-white mb-2">BJHUNT ALPHA 1.0</div>
              <p className="text-[11px] text-[var(--text-muted)] max-w-[400px] leading-relaxed">
                Autonomous cybersecurity assessment platform. Create a new assessment
                or select an existing one to start chatting with the AI agents.
              </p>
              <button
                onClick={createEngagement}
                className="mt-6 px-6 py-2 bg-white text-black text-[10px] uppercase tracking-wider hover:bg-white/90 transition-colors"
              >
                New Assessment
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id}>
              <MessageBubble message={msg} />

              {/* Show tool calls after assistant messages */}
              {msg.role === "assistant" && !msg.isStreaming && (
                <>
                  {sortedToolCalls
                    .filter((_, idx) => idx >= i - 1)
                    .slice(0, 5)
                    .map((tc) => (
                      <ToolCallBlock key={tc.id} tool={tc} />
                    ))}
                </>
              )}
            </div>
          ))}

          {/* Active thinking */}
          {thinking.active && (
            <ThinkingBlock content={thinking.content} isActive />
          )}

          {/* Active sub-agents */}
          {sortedSubAgents
            .filter((sa) => sa.status === "running")
            .map((sa) => (
              <SubAgentCard key={sa.id} session={sa} />
            ))}

          {/* Completed sub-agents */}
          {sortedSubAgents
            .filter((sa) => sa.status !== "running")
            .map((sa) => (
              <SubAgentCard key={sa.id} session={sa} />
            ))}

          {/* Error banner with retry */}
          {streamError && !isStreaming && (
            <div className="flex items-center gap-3 px-4 py-2 bg-[var(--danger-dim)] border border-[var(--danger)]/30">
              <span className="text-[10px] text-[var(--danger)] font-mono flex-1">
                Stream error: {streamError}
              </span>
              <button
                onClick={() => {
                  setStreamError(null);
                  // Remove failed assistant message
                  setMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.content.startsWith("Error:"))));
                  // Re-send last message
                  if (lastMessage) {
                    setInput(lastMessage);
                    setTimeout(() => handleSend(), 100);
                  }
                }}
                className="text-[9px] uppercase tracking-wider px-3 py-1 bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeEngagement
                  ? "Describe your target, ask for a scan, or chat with the agents..."
                  : "Create an assessment first..."
                }
                disabled={!activeEngagement}
                rows={1}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-4 py-3 text-[12px] text-white placeholder:text-[var(--text-subtle)] resize-none outline-none focus:border-[var(--border-strong)] transition-colors disabled:opacity-50 font-mono"
                style={{ maxHeight: "40vh" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, window.innerHeight * 0.4)}px`;
                }}
              />
            </div>

            {isStreaming ? (
              <button
                onClick={handleStop}
                className="p-3 bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80 transition-colors shrink-0"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !activeEngagement}
                className="p-3 bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[8px] text-[var(--text-subtle)]">
              Shift+Enter for newline
            </span>
            <span className="text-[8px] text-[var(--text-subtle)]">
              BJHUNT ALPHA 1.0 — 17 AI agents
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
