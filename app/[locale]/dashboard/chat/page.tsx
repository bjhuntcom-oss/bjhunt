"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Plus, PanelRightOpen, PanelRightClose, Globe, Cloud, Code, Database, Search, X, Pencil, Trash2 } from "lucide-react";
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
import { VaccineMonitor } from "@/components/dashboard/vaccine-monitor";
import { AGENTS } from "@/components/chat/agent-selector";
import { OnboardingOverlay } from "@/components/dashboard/onboarding-overlay";
import { useParams } from "next/navigation";

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
  const params = useParams();
  const locale = (params?.locale as string) || "fr";

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
  const [sidebarTab, setSidebarTab] = useState<"conversations" | "opplan" | "graph">("conversations");
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

  // Sidebar search (Fix 5)
  const [conversationSearch, setConversationSearch] = useState("");

  // Loading history skeleton (Fix 4)
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Context menu (Fix 6)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; engId: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Token counter & streaming speed
  const [tokenCount, setTokenCount] = useState(0);
  const [streamSpeed, setStreamSpeed] = useState(0);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const streamStartTimeRef = useRef<number>(0);
  const tokensSoFarRef = useRef<number>(0);
  const speedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedSamplesRef = useRef<number[]>([]); // Fix 10: moving average

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAiContentRef = useRef<string>("");

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, subAgents]);

  // Fix 1: Escape key closes panels
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSettings(false);
        setShowPromptLibrary(false);
        setContextMenu(null);
        setDeleteConfirmId(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fix 6: Click-outside closes context menu
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick() { setContextMenu(null); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  // Load engagements on mount
  useEffect(() => {
    loadEngagements();
  }, []);

  // Fix 3: Restore active engagement from sessionStorage after engagements load
  useEffect(() => {
    if (engagements.length === 0) return;
    const savedId = sessionStorage.getItem("bjhunt_active_engagement");
    if (savedId && !activeEngagement) {
      const found = engagements.find((e) => e.id === savedId);
      if (found) {
        setActiveEngagement(found);
        loadHistory(found.id);
      }
    }
  }, [engagements]);

  // Fix 3: Save active engagement to sessionStorage
  useEffect(() => {
    if (activeEngagement) {
      sessionStorage.setItem("bjhunt_active_engagement", activeEngagement.id);
    }
  }, [activeEngagement]);

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
    setLoadingHistory(true);
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
    } finally {
      setLoadingHistory(false);
    }
  }

  // ── New engagement ───────────────────────────────────────────────────

  async function createEngagement(autoName?: string): Promise<Engagement | null> {
    const name = autoName || `Scan ${new Date().toLocaleDateString("fr-FR")}`;
    setStreamError(null);
    try {
      const res = await browserBackendFetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, target: "auto", agentGraph: selectedAgent }),
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
        return eng;
      } else {
        const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        setStreamError(err.message || err.error || `Failed to start conversation (${res.status})`);
        return null;
      }
    } catch (e: any) {
      setStreamError(e.message || "Failed to start conversation");
      return null;
    }
  }

  function startNewConversation() {
    setActiveEngagement(null);
    setMessages([]);
    setToolCalls(new Map());
    setSubAgents(new Map());
    setObjectives([]);
    setStreamError(null);
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

    // Auto-create engagement if none exists
    let engId = activeEngagement?.id;
    if (!engId) {
      const autoName = text.slice(0, 50);
      const eng = await createEngagement(autoName);
      if (!eng) return; // error already set
      engId = eng.id;
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
    speedSamplesRef.current = [];

    // Start speed calculation interval with moving average (Fix 10)
    speedIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - streamStartTimeRef.current) / 1000;
      if (elapsed > 0 && tokensSoFarRef.current > 0) {
        const rawSpeed = tokensSoFarRef.current / elapsed;
        speedSamplesRef.current.push(rawSpeed);
        if (speedSamplesRef.current.length > 5) speedSamplesRef.current.shift();
        const avg = speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
        setStreamSpeed(Math.round(avg));
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
          engagementId: engId || "",
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

  // Fix 6: Rename engagement
  async function handleRename(engId: string, newName: string) {
    if (!newName.trim()) { setRenamingId(null); return; }
    try {
      await browserBackendFetch(`/api/engagements/${engId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
    } catch { /* best-effort */ }
    setEngagements((prev) =>
      prev.map((e) => (e.id === engId ? { ...e, name: newName.trim() } : e))
    );
    setRenamingId(null);
  }

  // Fix 6: Delete engagement
  async function handleDelete(engId: string) {
    try {
      await browserBackendFetch(`/api/engagements/${engId}`, { method: "DELETE" });
    } catch { /* best-effort */ }
    setEngagements((prev) => prev.filter((e) => e.id !== engId));
    if (activeEngagement?.id === engId) {
      setActiveEngagement(null);
      setMessages([]);
      setToolCalls(new Map());
      setSubAgents(new Map());
    }
    setDeleteConfirmId(null);
  }

  // Fix 5: Filtered engagements for sidebar search
  const filteredEngagements = useMemo(() => {
    if (!conversationSearch.trim()) return engagements;
    const q = conversationSearch.toLowerCase();
    return engagements.filter((e) => e.name.toLowerCase().includes(q));
  }, [engagements, conversationSearch]);

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
            {(["conversations", "opplan", "graph"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2 text-[9px] uppercase tracking-wider transition-colors ${
                  sidebarTab === tab
                    ? "text-white border-b border-white"
                    : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                }`}
              >
                {tab === "conversations" ? "Conversations" : tab === "opplan" ? "OPPLAN" : "Graph"}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "conversations" && (
              <div className="p-2 space-y-1">
                <button
                  onClick={startNewConversation}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] border border-dashed border-[var(--border)] transition-colors"
                  title="New conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Fix 5: Conversation search */}
                {engagements.length > 2 && (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-subtle)]" />
                    <input
                      value={conversationSearch}
                      onChange={(e) => setConversationSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] pl-7 pr-7 py-1.5 text-[10px] text-white placeholder:text-[var(--text-subtle)] outline-none focus:border-[var(--border-strong)]"
                    />
                    {conversationSearch && (
                      <button
                        onClick={() => setConversationSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {filteredEngagements.map((eng) => (
                  <div key={eng.id} className="relative">
                    {renamingId === eng.id ? (
                      /* Fix 6: Inline rename */
                      <div className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-strong)]">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(eng.id, renameValue);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => handleRename(eng.id, renameValue)}
                          className="w-full bg-transparent text-[11px] text-white outline-none"
                        />
                      </div>
                    ) : deleteConfirmId === eng.id ? (
                      /* Fix 6: Delete confirmation */
                      <div className="px-3 py-2 bg-[var(--danger-dim)] border border-[var(--danger)]/30">
                        <p className="text-[10px] text-[var(--danger)] mb-2">Delete this conversation?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 py-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(eng.id)}
                            className="flex-1 py-1 text-[9px] uppercase tracking-wider bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveEngagement(eng);
                          setMessages([]);
                          setToolCalls(new Map());
                          setSubAgents(new Map());
                          loadHistory(eng.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, engId: eng.id });
                        }}
                        className={`w-full text-left px-3 py-2 transition-colors ${
                          activeEngagement?.id === eng.id
                            ? "bg-[var(--bg-card)] border border-[var(--border-strong)]"
                            : "hover:bg-[var(--bg-card)] border border-transparent"
                        }`}
                      >
                        <div className="text-[11px] text-white truncate">{eng.name}</div>
                        <div className="text-[9px] text-[var(--text-subtle)] mt-0.5">
                          {new Date(eng.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </button>
                    )}
                  </div>
                ))}

                {/* Fix 6: Context menu dropdown */}
                {contextMenu && (
                  <div
                    className="fixed z-[60] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl py-1 min-w-[140px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        const eng = engagements.find((e) => e.id === contextMenu.engId);
                        setRenamingId(contextMenu.engId);
                        setRenameValue(eng?.name || "");
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-input)] transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmId(contextMenu.engId);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--danger)] hover:bg-[var(--danger-dim)] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === "opplan" && (
              <div className="flex flex-col gap-0">
                <OpplanPanel objectives={objectives} />
                {activeEngagement && (activeEngagement.status === "running" || objectives.length > 0) && (
                  <VaccineMonitor engagementId={activeEngagement.id} compact />
                )}
              </div>
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
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white font-mono uppercase">
                {AGENTS.find((a) => a.id === selectedAgent)?.name || "BJHUNT"}
              </span>
              <span className="text-[9px] text-[var(--text-subtle)] font-mono">
                agent
              </span>
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
          {/* Fix 4: Loading skeleton */}
          {loadingHistory && messages.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex flex-col gap-1.5 ${i % 2 === 1 ? "items-end" : "items-start"}`}>
                  <div className="h-2 w-12 bg-[var(--border)] animate-pulse" />
                  <div
                    className="bg-[var(--bg-input)] border border-[var(--border)] px-4 py-3 animate-pulse"
                    style={{ width: `${40 + i * 15}%`, maxWidth: "75%" }}
                  >
                    <div className="space-y-2">
                      <div className="h-3 bg-[var(--border)] w-full" />
                      <div className="h-3 bg-[var(--border)] w-3/4" />
                      {i === 2 && <div className="h-3 bg-[var(--border)] w-1/2" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.length === 0 && !loadingHistory && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-[24px] font-mono text-white mb-2">BJHUNT ALPHA 1.0</div>
              <p className="text-[11px] text-[var(--text-muted)] max-w-[420px] leading-relaxed mb-8">
                Describe your target, choose an agent, and start scanning. Or just ask a question.
              </p>

              {/* Suggested prompts — Fix 9: auto-send on click */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[520px] w-full">
                {[
                  { icon: <Globe className="w-4 h-4" />, text: "Scan my web application for vulnerabilities" },
                  { icon: <Cloud className="w-4 h-4" />, text: "Audit my AWS infrastructure" },
                  { icon: <Code className="w-4 h-4" />, text: "Analyze this code for security issues" },
                  { icon: <Database className="w-4 h-4" />, text: "Find attack paths in my Active Directory" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => handleSend(suggestion.text)}
                    className="flex items-center gap-3 px-4 py-3 border border-[var(--border)] bg-[var(--bg-card)] text-left hover:border-[var(--border-strong)] hover:bg-[var(--bg-input)] transition-colors group"
                  >
                    <span className="text-[var(--text-muted)] group-hover:text-white transition-colors flex-shrink-0">
                      {suggestion.icon}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] group-hover:text-white transition-colors leading-tight">
                      {suggestion.text}
                    </span>
                  </button>
                ))}
              </div>
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
            onOpenSettings={() => {
              setShowSettings((v) => !v);
              setShowPromptLibrary(false);
            }}
            onOpenPromptLibrary={() => {
              setShowPromptLibrary((v) => !v);
              setShowSettings(false);
            }}
            onSlashCommand={handleSlashCommand}
            webSearch={webSearch}
            onToggleWebSearch={() => setWebSearch((v) => !v)}
            isStreaming={isStreaming}
            placeholder="Describe your target or ask a question..."
            initialValue={promptInitialValue}
            onConsumeInitialValue={() => setPromptInitialValue("")}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
        </div>
      </div>

      {/* ── Fix 2: Click-outside backdrop for right panels ─────── */}
      {(showSettings || showPromptLibrary) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowSettings(false); setShowPromptLibrary(false); }}
        />
      )}

      {/* ── Right panels ──────────────────────────────────────────── */}
      {showSettings && (
        <div className="relative z-50">
          <ModelSettingsPanel
            settings={modelSettings}
            onChange={setModelSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}
      {showPromptLibrary && (
        <div className="relative z-50">
          <PromptLibraryPanel
            onSelect={(content) => {
              setPromptInitialValue(content);
              setShowPromptLibrary(false);
            }}
            onClose={() => setShowPromptLibrary(false)}
          />
        </div>
      )}

      {/* Onboarding overlay for first-time users */}
      <OnboardingOverlay
        locale={locale}
        onPrefillChat={(prompt) => setPromptInitialValue(prompt)}
      />
    </div>
  );
}
