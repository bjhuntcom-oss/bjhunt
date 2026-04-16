"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Plus, PanelRightOpen, PanelRightClose, Globe, Cloud, Code, Database, Search, X, Pencil, Trash2, ArrowDown } from "lucide-react";
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

/** Sidebar conversation item (loaded from /api/chat/conversations) */
interface SidebarConversation {
  id: string;
  title: string;
  engagementId: string | null;
  engagementName: string | null;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Group sidebar conversations by relative date */
function groupByDate(items: SidebarConversation[]): { label: string; items: SidebarConversation[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOf7Days = new Date(startOfToday.getTime() - 7 * 86400000);

  const groups: Record<string, SidebarConversation[]> = {
    "Aujourd'hui": [],
    "Hier": [],
    "7 derniers jours": [],
    "Plus ancien": [],
  };

  for (const item of items) {
    const d = new Date(item.updatedAt || item.createdAt);
    if (d >= startOfToday) groups["Aujourd'hui"].push(item);
    else if (d >= startOfYesterday) groups["Hier"].push(item);
    else if (d >= startOf7Days) groups["7 derniers jours"].push(item);
    else groups["Plus ancien"].push(item);
  }

  return Object.entries(groups)
    .filter(([, v]) => v.length > 0)
    .map(([label, items]) => ({ label, items }));
}

/** Truncate text to maxLen chars with ellipsis */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

/** Check if a conversation title is a generic/placeholder name */
function isGenericTitle(title: string): boolean {
  if (!title) return true;
  // Match patterns like "Assessment 16/04/2026", "Scan 16/04/2026", "New conversation", "New chat"
  return /^(Assessment|Scan|Evaluation|Audit)\s+\d{1,2}\/\d{1,2}\/\d{4}$/i.test(title)
    || /^New (conversation|chat)$/i.test(title);
}

/** Get display title: prefer lastMessage preview for generic titles */
function displayTitle(conv: SidebarConversation): string {
  if (isGenericTitle(conv.title)) {
    if (conv.lastMessage) return truncate(conv.lastMessage, 40);
    return "Sans titre";
  }
  return truncate(conv.title, 40);
}

/** Relative time label */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface StreamEvent {
  type: "message" | "tool_call" | "thinking" | "sub_agent" | "objective" | "graph_update";
  data: any;
}

// ── Chat Page ────────────────────────────────────────────────────────────

// Direct backend URL for SSE (bypasses Vercel proxy timeout)

export default function ChatPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "fr";

  // State
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [activeEngagement, setActiveEngagement] = useState<Engagement | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarConversations, setSidebarConversations] = useState<SidebarConversation[]>([]);
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"conversations" | "opplan" | "graph">("conversations");

  // Set sidebar visibility based on viewport after hydration (avoids SSR mismatch)
  useEffect(() => {
    if (window.innerWidth < 768) setShowSidebar(false);
  }, []);
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastAiContentRef = useRef<string>("");
  const requestIdRef = useRef<number>(0);
  const hasAutoNamedRef = useRef<boolean>(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Auto-scroll only when near bottom (within 150px)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, toolCalls, subAgents]);

  // Track scroll position to show/hide "scroll to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    function onScroll() {
      if (!container) return;
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollDown(distFromBottom > 200);
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

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

  // Load engagements and sidebar conversations on mount
  useEffect(() => {
    loadEngagements();
    loadSidebarConversations();
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

  async function loadSidebarConversations() {
    try {
      const res = await browserBackendFetch("/api/chat/conversations?limit=50");
      if (res.ok) {
        const data = await res.json();
        const convs: SidebarConversation[] = (data.conversations || []).map((c: any) => ({
          id: c.id,
          title: c.title || "New conversation",
          engagementId: c.engagementId || c.engagement_id || null,
          engagementName: c.engagementName || c.engagement_name || null,
          lastMessage: c.lastMessage || c.last_message || null,
          createdAt: c.createdAt || c.created_at,
          updatedAt: c.updatedAt || c.updated_at || c.createdAt || c.created_at,
        }));
        setSidebarConversations(convs);
      }
    } catch {
      // Sidebar load is best-effort
    }
  }

  // ── Load conversation history from DB ─────────────────────────────────

  async function loadHistory(engagementId: string, convIdOverride?: string) {
    setLoadingHistory(true);
    try {
      let convId = convIdOverride;

      if (!convId) {
        // Get conversations for this engagement
        const convRes = await browserBackendFetch(`/api/chat/history/${engagementId}`);
        if (!convRes.ok) return;
        const { conversations } = await convRes.json();
        if (!conversations?.length) return;

        // Use the most recent conversation
        convId = conversations[0].id as string;
      }

      // Fix 5: Capture the active conversation ID
      setActiveConversationId(convId!);

      const msgRes = await browserBackendFetch(`/api/chat/conversations/${convId}/messages`);
      if (!msgRes.ok) return;
      const { messages: dbMessages } = await msgRes.json();

      // Map DB messages to ChatMessage format
      const mapped: ChatMessage[] = (dbMessages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt || m.created_at,
        isStreaming: false,
      }));
      setMessages(mapped);

      // Mark that we already have history — don't auto-rename
      hasAutoNamedRef.current = mapped.length > 0;

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

  /** Load a specific conversation by its ID (from sidebar click) */
  async function loadConversation(conv: SidebarConversation) {
    // Find or set the related engagement
    if (conv.engagementId) {
      const eng = engagements.find((e) => e.id === conv.engagementId);
      if (eng) {
        setActiveEngagement(eng);
      } else {
        // Create a minimal engagement reference
        setActiveEngagement({
          id: conv.engagementId,
          name: conv.engagementName || conv.title,
          target: "",
          status: "running",
          createdAt: conv.createdAt,
        });
      }
    }

    setActiveConversationId(conv.id);
    setMessages([]);
    setToolCalls(new Map());
    setSubAgents(new Map());
    setObjectives([]);
    setStreamError(null);

    // Load messages for this specific conversation
    if (conv.engagementId) {
      await loadHistory(conv.engagementId, conv.id);
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
        // Fix 4: Reset conversationId for new engagement
        setActiveConversationId(null);
        hasAutoNamedRef.current = false;
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

  // Fix 7: New conversation resets all state and focuses input
  function startNewConversation() {
    setActiveEngagement(null);
    setActiveConversationId(null);
    hasAutoNamedRef.current = false;
    setMessages([]);
    setToolCalls(new Map());
    setSubAgents(new Map());
    setObjectives([]);
    setStreamError(null);
    // Focus the chat input after React re-renders
    requestAnimationFrame(() => {
      chatInputRef.current?.focus();
    });
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

    // Upload any attached files and collect their IDs for linking to the conversation
    let uploadedFileIds: string[] = [];
    if (files.length > 0) {
      const uploadPromises = files.map(async (pf) => {
        try {
          const formData = new FormData();
          formData.append("file", pf.file);
          const uploadRes = await browserBackendFetch("/api/chat/files", {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            return data.id as string;
          }
        } catch {
          // File upload is best-effort — don't block the message
        }
        return null;
      });
      const results = await Promise.all(uploadPromises);
      uploadedFileIds = results.filter((id): id is string => id !== null);
    }

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

      // Include conversationId so backend reuses existing conversation,
      // and attachmentIds so uploaded files get linked.
      const requestBody: Record<string, unknown> = {
        message: text,
        engagementId: engId || "",
        agentGraph: selectedAgent,
      };
      if (activeConversationId) {
        requestBody.conversationId = activeConversationId;
      }
      if (uploadedFileIds.length > 0) {
        requestBody.attachmentIds = uploadedFileIds;
      }

      // ── Phase 1: Prepare (fast REST call via Vercel proxy) ─────────
      const currentRequestId = ++requestIdRef.current;

      const prepareRes = await fetch(`/api/proxy/chat/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
        signal: abortRef.current.signal,
      });

      if (!prepareRes.ok) {
        const err = await prepareRes.json().catch(() => ({ error: `HTTP ${prepareRes.status}` }));
        throw new Error(err.error || err.message || `Prepare failed (${prepareRes.status})`);
      }

      const { streamUrl, ticket, conversationId: returnedConvId } = await prepareRes.json();
      if (returnedConvId) setActiveConversationId(returnedConvId);

      // ── Phase 2: Stream (direct GET to backend, bypasses Vercel timeout) ──
      const streamRes = await fetch(`${streamUrl}?ticket=${encodeURIComponent(ticket)}`, {
        signal: abortRef.current.signal,
      });

      if (!streamRes.ok) {
        throw new Error(`Stream HTTP ${streamRes.status}`);
      }

      // Read SSE stream
      const reader = streamRes.body?.getReader();
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

          // Race condition guard: drop events if user switched conversations
          if (requestIdRef.current !== currentRequestId) break;

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
      if (err.name === "AbortError") {
        // User clicked Stop — mark message as done without showing an error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      } else {
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
          const resolvedContent = m.content || finalContent;
          // If content is empty after stream ends and no explicit error, show unavailable notice
          if (!resolvedContent && !streamError) {
            return { ...m, content: "", isStreaming: false, emptyResponse: true };
          }
          return { ...m, content: resolvedContent, isStreaming: false };
        })
      );

      // Fix 9: Auto-name the engagement after the first assistant response
      if (!hasAutoNamedRef.current && engId && (finalContent || text)) {
        hasAutoNamedRef.current = true;
        // Use first 40 chars of user message as the title
        const autoTitle = truncate(text, 40);
        // Fire-and-forget PATCH to rename
        browserBackendFetch(`/api/engagements/${engId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: autoTitle }),
        }).catch(() => {});
        // Update local engagement list
        setEngagements((prev) =>
          prev.map((e) => (e.id === engId ? { ...e, name: autoTitle } : e))
        );
        if (activeEngagement?.id === engId) {
          setActiveEngagement((prev) => prev ? { ...prev, name: autoTitle } : prev);
        }
      }

      // Refresh sidebar conversations list (new conversation may have been created)
      loadSidebarConversations();
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

      // ── Stream error from backend (timeout, LangGraph failure, etc.) ──
      case "error":
        setStreamError(parsed.message || "Stream error from server");
        break;

      // ── Stream done ─────────────────────────────────────────────────
      case "done":
        // Use real token counts from backend if provided
        if (parsed.tokensIn || parsed.tokensOut) {
          setTokenCount(parsed.tokensIn + parsed.tokensOut);
        }
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
    // Also update sidebar conversation titles that reference this engagement
    setSidebarConversations((prev) =>
      prev.map((c) =>
        c.engagementId === engId ? { ...c, title: newName.trim(), engagementName: newName.trim() } : c
      )
    );
    setRenamingId(null);
  }

  // Fix 10: Delete engagement (and its conversations)
  async function handleDelete(engId: string) {
    try {
      await browserBackendFetch(`/api/engagements/${engId}`, { method: "DELETE" });
    } catch { /* best-effort */ }
    setEngagements((prev) => prev.filter((e) => e.id !== engId));
    // Remove related sidebar conversations
    setSidebarConversations((prev) => prev.filter((c) => c.engagementId !== engId));
    if (activeEngagement?.id === engId) {
      setActiveEngagement(null);
      setActiveConversationId(null);
      setMessages([]);
      setToolCalls(new Map());
      setSubAgents(new Map());
    }
    setDeleteConfirmId(null);
  }

  // Fix 10: Delete a specific conversation from sidebar
  async function handleDeleteConversation(convId: string) {
    try {
      await browserBackendFetch(`/api/chat/conversations/${convId}`, { method: "DELETE" });
    } catch { /* best-effort */ }
    setSidebarConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      // Active conversation was deleted — clear chat and show welcome
      setActiveConversationId(null);
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

  // Filtered and grouped sidebar conversations
  const filteredSidebarConvs = useMemo(() => {
    let items = sidebarConversations;
    if (conversationSearch.trim()) {
      const q = conversationSearch.toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
          (c.engagementName && c.engagementName.toLowerCase().includes(q))
      );
    }
    return items;
  }, [sidebarConversations, conversationSearch]);

  // Fix 8: Date-grouped conversations for sidebar
  const groupedConversations = useMemo(() => groupByDate(filteredSidebarConvs), [filteredSidebarConvs]);

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
            onClick={() => setShowSidebar(false)}
          />
        </>
      )}
      {showSidebar && (
        <div className={`
          fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col
          md:relative md:inset-auto md:z-auto
        `}
        style={{
          background: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
        }}>
          {/* Sidebar tabs */}
          <div className="flex" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
            {(["conversations", "opplan", "graph"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2 text-[9px] uppercase tracking-wider transition-all duration-200 ${
                  sidebarTab === tab
                    ? "text-white"
                    : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                }`}
                style={sidebarTab === tab ? {
                  background: "rgba(255, 255, 255, 0.08)",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.3)",
                } : {
                  background: "rgba(255, 255, 255, 0.04)",
                  borderBottom: "2px solid transparent",
                }}
              >
                {tab === "conversations" ? "Conversations" : tab === "opplan" ? "OPPLAN" : "Graph"}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "conversations" && (
              <div className="p-2 space-y-1">
                {/* New conversation button + count */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={startNewConversation}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[var(--text-muted)] hover:text-white transition-all duration-200"
                    style={{
                      border: "1px dashed rgba(255, 255, 255, 0.08)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
                    title="New conversation"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px] uppercase tracking-wider">New</span>
                  </button>
                  {sidebarConversations.length > 0 && (
                    <span className="text-[9px] font-mono text-[var(--text-subtle)] tabular-nums flex-shrink-0">
                      {sidebarConversations.length}
                    </span>
                  )}
                </div>

                {/* Conversation search */}
                {(sidebarConversations.length > 2 || engagements.length > 2) && (
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

                {/* Grouped conversations (ChatGPT-like) */}
                {groupedConversations.length > 0 ? (
                  groupedConversations.map((group) => (
                    <div key={group.label}>
                      {/* Fix 8: Date group header */}
                      <div className="px-3 pt-3 pb-1 text-[8px] uppercase tracking-widest text-[var(--text-subtle)] font-mono">
                        {group.label}
                      </div>
                      {group.items.map((conv) => (
                        <div key={conv.id} className="relative">
                          {renamingId === conv.id ? (
                            /* Inline rename */
                            <div className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-strong)]">
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    // Rename the engagement behind this conversation
                                    if (conv.engagementId) handleRename(conv.engagementId, renameValue);
                                    setRenamingId(null);
                                  }
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                onBlur={() => {
                                  if (conv.engagementId) handleRename(conv.engagementId, renameValue);
                                  setRenamingId(null);
                                }}
                                className="w-full bg-transparent text-[11px] text-white outline-none"
                              />
                            </div>
                          ) : deleteConfirmId === conv.id ? (
                            /* Delete confirmation */
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
                                  onClick={() => handleDeleteConversation(conv.id)}
                                  className="flex-1 py-1 text-[9px] uppercase tracking-wider bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => loadConversation(conv)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, engId: conv.id });
                              }}
                              title={conv.lastMessage || conv.title}
                              className={`w-full text-left px-3 py-2 transition-all duration-200 group ${
                                activeConversationId === conv.id
                                  ? "border-l-2 border-y border-r border-y-transparent border-r-transparent"
                                  : "border-l-2 border-l-transparent border-y border-r border-y-transparent border-r-transparent"
                              }`}
                              style={activeConversationId === conv.id ? {
                                background: "rgba(0, 204, 138, 0.08)",
                                borderLeftColor: "rgba(0, 204, 138, 0.5)",
                              } : undefined}
                              onMouseEnter={(e) => {
                                if (activeConversationId !== conv.id) {
                                  (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (activeConversationId !== conv.id) {
                                  (e.currentTarget as HTMLElement).style.background = "transparent";
                                }
                              }}
                            >
                              {/* Title: meaningful name, or last message preview, or "Sans titre" */}
                              <div className={`text-[11px] truncate ${
                                isGenericTitle(conv.title) && !conv.lastMessage
                                  ? "text-[var(--text-muted)] italic"
                                  : "text-white"
                              }`}>
                                {displayTitle(conv)}
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[9px] text-[var(--text-subtle)]">
                                  {relativeTime(conv.updatedAt || conv.createdAt)}
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  /* Fallback: show engagements if no conversations loaded yet */
                  filteredEngagements.map((eng) => (
                    <div key={eng.id} className="relative">
                      {renamingId === eng.id ? (
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
                            setActiveConversationId(null);
                            setMessages([]);
                            setToolCalls(new Map());
                            setSubAgents(new Map());
                            loadHistory(eng.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, engId: eng.id });
                          }}
                          className={`w-full text-left px-3 py-2 transition-all duration-200 ${
                            activeEngagement?.id === eng.id
                              ? "border-l-2 border-y border-r border-y-transparent border-r-transparent"
                              : "border-l-2 border-l-transparent border-y border-r border-y-transparent border-r-transparent"
                          }`}
                          style={activeEngagement?.id === eng.id ? {
                            background: "rgba(0, 204, 138, 0.08)",
                            borderLeftColor: "rgba(0, 204, 138, 0.5)",
                          } : undefined}
                          onMouseEnter={(e) => {
                            if (activeEngagement?.id !== eng.id) {
                              (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.04)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeEngagement?.id !== eng.id) {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                            }
                          }}
                        >
                          <div className="text-[11px] text-white truncate">{eng.name}</div>
                          <div className="text-[9px] text-[var(--text-subtle)] mt-0.5">
                            {relativeTime(eng.createdAt)}
                          </div>
                        </button>
                      )}
                    </div>
                  ))
                )}

                {/* Context menu dropdown */}
                {contextMenu && (
                  <div
                    className="fixed z-[60] shadow-2xl py-1 min-w-[140px]"
                    style={{
                      left: contextMenu.x,
                      top: contextMenu.y,
                      background: "rgba(17, 17, 17, 0.9)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        const conv = sidebarConversations.find((c) => c.id === contextMenu.engId);
                        const eng = engagements.find((e) => e.id === contextMenu.engId);
                        setRenamingId(contextMenu.engId);
                        setRenameValue(conv?.title || eng?.name || "");
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
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: "rgba(10, 10, 10, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {showSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2" title={AGENTS.find((a) => a.id === selectedAgent)?.description || "Default orchestrator"}>
              <span className="text-[11px] text-white font-mono uppercase">
                {AGENTS.find((a) => a.id === selectedAgent)?.name || "BJHUNT"}
              </span>
              <span className="hidden sm:inline text-[9px] text-[var(--text-subtle)] font-mono max-w-[200px] truncate">
                {AGENTS.find((a) => a.id === selectedAgent)?.description || "agent"}
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
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative chat-messages-scroll"
          style={{ background: "rgba(10, 10, 10, 0.5)" }}
        >
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
                    className="flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 group"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255, 255, 255, 0.06)";
                      el.style.borderColor = "rgba(255, 255, 255, 0.1)";
                      el.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255, 255, 255, 0.03)";
                      el.style.borderColor = "rgba(255, 255, 255, 0.06)";
                      el.style.transform = "translateY(0)";
                    }}
                  >
                    <span className="text-[var(--text-muted)] group-hover:text-white transition-colors duration-200 flex-shrink-0">
                      {suggestion.icon}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] group-hover:text-white transition-colors duration-200 leading-tight">
                      {suggestion.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id}>
              <MessageBubble
                message={msg}
                onRetry={msg.role === "assistant" && msg.emptyResponse && !msg.content ? () => {
                  // Remove the empty assistant message and re-send
                  setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                  if (lastMessage) handleSend(lastMessage);
                } : undefined}
              />

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
            <div
              className="flex items-center gap-3 px-4 py-2"
              style={{
                background: "rgba(255, 68, 68, 0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 68, 68, 0.15)",
              }}
            >
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

          {/* Scroll to bottom FAB */}
          {showScrollDown && messages.length > 0 && (
            <button
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-muted)] hover:text-white transition-all duration-200"
              style={{
                background: "rgba(17, 17, 17, 0.85)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              <ArrowDown className="w-3 h-3" />
              <span className="text-[9px] uppercase tracking-wider">Dernier message</span>
            </button>
          )}
        </div>

        {/* Input area — floating glass chatbox */}
        <div className="chat-input-glass px-3 md:px-5 pb-3 md:pb-4 pt-0">
          <div
            style={{
              background: "rgba(13, 13, 13, 0.7)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 -4px 30px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)",
            }}
          >
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
      </div>

      {/* ── Fix 2: Click-outside backdrop for right panels ─────── */}
      {(showSettings || showPromptLibrary) && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-200"
          style={{ background: "rgba(0, 0, 0, 0.3)", backdropFilter: "blur(2px)" }}
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
