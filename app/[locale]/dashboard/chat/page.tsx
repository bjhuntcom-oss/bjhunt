"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, PanelRightOpen, PanelRightClose } from "lucide-react";
import { MessageBubble, type ChatMessage } from "@/components/chat/message-bubble";
import { ToolCallBlock, type ToolCall } from "@/components/chat/tool-call-block";
import { ThinkingBlock } from "@/components/chat/thinking-block";
import { SubAgentCard, type SubAgentSession } from "@/components/chat/sub-agent-card";
import { OpplanPanel, type Objective } from "@/components/chat/opplan-panel";
import { KnowledgeGraphPanel, type GraphNode, type GraphEdge, type GraphStats } from "@/components/chat/knowledge-graph-panel";
import { ChatInput } from "@/components/chat/chat-input";
import { type PendingFile } from "@/components/chat/file-upload-zone";
import { ModelSettingsPanel, type ModelSettings } from "@/components/chat/model-settings-panel";
import { PromptLibraryPanel } from "@/components/chat/prompt-library-panel";
import { SLASH_COMMANDS, type SlashCommandContext } from "@/components/chat/slash-commands";
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [sidebarTab, setSidebarTab] = useState<"engagements" | "opplan" | "graph">("engagements");
  const [webSearch, setWebSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [promptInitialValue, setPromptInitialValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("bjhunt");
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    systemPrompt: "",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    streamResponse: true,
    webSearch: false,
  });

  // Token counter & streaming speed
  const [tokenCount, setTokenCount] = useState(0);
  const [streamSpeed, setStreamSpeed] = useState(0);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const tokensSoFarRef = useRef<number>(0);
  const speedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // ── Slash command handler ─────────────────────────────────────────────

  const handleSlashCommand = useCallback((ctx: SlashCommandContext) => {
    // Slash commands are handled by their action functions
  }, []);

  // ── Send message ─────────────────────────────────────────────────────

  async function handleSend(text: string, files: PendingFile[] = []) {
    if (!text || isStreaming) return;

    // Check for slash command
    const slashCmd = SLASH_COMMANDS.find((c) => text.startsWith(c.command));
    if (slashCmd?.action) {
      const ctx: SlashCommandContext = {
        setInput: () => {},
        sendMessage: (msg) => {
          const sysMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: msg,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, sysMsg]);
        },
        clearMessages: () => {
          setMessages([]);
          setToolCalls(new Map());
          setSubAgents(new Map());
        },
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        engagementId: activeEngagement?.id,
      };
      slashCmd.action(ctx);
      return;
    }

    // TODO: handle file uploads — POST /api/chat/files

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamError(null);
    setLastMessage(text);
    setThinking({ content: "", active: true });

    // Reset token tracking
    setTokenCount(0);
    setStreamSpeed(0);
    setActiveAgent(null);
    tokensSoFarRef.current = 0;
    streamStartTimeRef.current = Date.now();

    // Start speed calculation interval
    speedIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - streamStartTimeRef.current) / 1000;
      if (elapsed > 0 && tokensSoFarRef.current > 0) {
        setStreamSpeed(Math.round(tokensSoFarRef.current / elapsed));
      }
    }, 500);

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
          agentGraph: selectedAgent,
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
      setStreamSpeed(0);
      setActiveAgent(null);
      abortRef.current = null;
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }

      // Mark the assistant message as no longer streaming
      const finalContent = lastAiContentRef.current;
      lastAiContentRef.current = "";

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          return { ...m, content: m.content || finalContent, isStreaming: false };
        })
      );
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

    let parsed: any;
    try { parsed = JSON.parse(data); } catch { return; }

    switch (event) {
      // ── Progressive token streaming (from backend transform) ────────
      case "token":
        if (parsed.token) {
          lastAiContentRef.current += parsed.token;
          // Approximate token count: ~4 chars per token
          const approxTokens = Math.ceil(parsed.token.length / 4);
          tokensSoFarRef.current += approxTokens;
          setTokenCount((prev) => prev + approxTokens);
          if (parsed.agent) setActiveAgent(parsed.agent);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + parsed.token } : m
            )
          );
          setThinking((prev) => prev.active ? { ...prev, active: false } : prev);
        }
        break;

      // ── Tool lifecycle ──────────────────────────────────────────────
      case "tool_call":
        if (parsed.agent) setActiveAgent(parsed.agent);
        setToolCalls((prev) => {
          const next = new Map(prev);
          next.set(parsed.id, {
            id: parsed.id,
            name: parsed.name || "tool",
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
              status: parsed.status === "error" ? "error" : "completed",
              duration: parsed.duration,
            });
          }
          return next;
        });
        break;

      // ── Thinking indicator ──────────────────────────────────────────
      case "thinking":
        setThinking({
          content: parsed.content || "",
          active: parsed.active !== false,
        });
        break;

      // ── Sub-agent lifecycle ─────────────────────────────────────────
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

      // ── OPPLAN & Knowledge Graph ────────────────────────────────────
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

      // ── Stream done ─────────────────────────────────────────────────
      case "done":
        // Backend signals stream complete — nothing to do, finally block handles cleanup
        break;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  // ── Render ───────────────────────────────────────────────────────────

  // Interleave messages and tool calls chronologically
  const sortedToolCalls = [...toolCalls.values()];
  const sortedSubAgents = [...subAgents.values()];

  return (
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      {/* Mobile: overlay with backdrop. Desktop: push layout. */}
      {showSidebar && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        </>
      )}
      {showSidebar && (
        <div className={`
          fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[var(--border)] flex flex-col bg-[var(--bg)]
          md:relative md:inset-auto md:z-auto
        `}>
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
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider">
            {/* Token counter */}
            {tokenCount > 0 && (
              <span
                className="font-mono"
                style={{
                  color: tokenCount < 1000
                    ? "var(--success)"
                    : tokenCount < 4000
                      ? "var(--warning)"
                      : "var(--danger)",
                }}
              >
                ~{tokenCount} tokens
              </span>
            )}

            {/* Active agent */}
            {isStreaming && activeAgent && (
              <span className="font-mono text-[var(--text-muted)]">
                {activeAgent}
              </span>
            )}

            {/* Status + speed */}
            {isStreaming ? (
              <span className="text-[var(--warning)]">
                streaming{streamSpeed > 0 ? ` · ~${streamSpeed} tok/s` : ""}
              </span>
            ) : (
              <span className="text-[var(--text-subtle)]">ready</span>
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

              {/* Show tool calls after the last assistant message */}
              {msg.role === "assistant" && i === messages.length - 1 && sortedToolCalls.length > 0 && (
                <div className="space-y-1 mt-2">
                  {sortedToolCalls.map((tc) => (
                    <ToolCallBlock key={tc.id} tool={tc} />
                  ))}
                </div>
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
                    handleSend(lastMessage);
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

        {/* Input area — ChatInput with slash commands, file upload, voice, etc. */}
        <div className="border-t border-[var(--border)]">
          <ChatInput
            onSubmit={handleSend}
            onStop={handleStop}
            onOpenSettings={() => setShowSettings((v) => !v)}
            onOpenPromptLibrary={() => setShowPromptLibrary((v) => !v)}
            onSlashCommand={handleSlashCommand}
            webSearch={webSearch}
            onToggleWebSearch={() => setWebSearch((v) => !v)}
            disabled={!activeEngagement}
            isStreaming={isStreaming}
            placeholder={activeEngagement
              ? "Describe your target, ask for a scan, or chat with the agents..."
              : "Create an assessment first..."
            }
            initialValue={promptInitialValue}
            onConsumeInitialValue={() => setPromptInitialValue("")}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
        </div>
      </div>

      {/* ── Right panels ──────────────────────────────────────────── */}
      {showSettings && (
        <ModelSettingsPanel
          settings={modelSettings}
          onChange={setModelSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showPromptLibrary && (
        <PromptLibraryPanel
          onSelect={(content) => {
            setPromptInitialValue(content);
            setShowPromptLibrary(false);
          }}
          onClose={() => setShowPromptLibrary(false)}
        />
      )}
    </div>
  );
}
