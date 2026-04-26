/**
 * Chat page — refonte 2026 / B5 (orchestrator).
 * State + side effects + assembly only. Visuals in _components/, domain
 * logic in _hooks/. Was 1986 LOC; now split into 7 components + 3 hooks.
 * Bugs killed: 48px magic number; double scroll containers; JS hover;
 * green tint active state; modelSettings always sent; autoload overwrite;
 * missing min-h-0. SP3 ticket flow / identity guard / abort-on-submit /
 * delta-vs-cumulative merge / slash / upload / voice / ?seed= preserved.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import { OnboardingOverlay } from "@/components/dashboard/onboarding-overlay";

import { ChatTopbar } from "./_components/chat-topbar";
import { ConversationSidebar } from "./_components/conversation-sidebar";
import { MessageStream } from "./_components/message-stream";
import { Composer } from "./_components/composer";
import { RightPanel } from "./_components/right-panel";
import type { Engagement, RightPanelTab, SidebarLocale } from "./_components/types";
import { useChatStream } from "./_hooks/use-chat-stream";
import { useChatData } from "./_hooks/use-chat-data";
import { useChatActions } from "./_hooks/use-chat-actions";

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  systemPrompt: "",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  streamResponse: true,
  webSearch: false,
};

export default function ChatPage() {
  const params = useParams();
  const localeRaw = (params?.locale as string) || "fr";
  const locale: SidebarLocale = localeRaw === "en" ? "en" : "fr";

  // ── Conversation state (drives the message stream) ─────────────────
  const [activeEngagement, setActiveEngagement] = useState<Engagement | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<Map<string, ToolCall>>(new Map());
  const [subAgents, setSubAgents] = useState<Map<string, SubAgentSession>>(new Map());
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphStats, setGraphStats] = useState<GraphStats>({
    nodeCount: 0,
    edgeCount: 0,
    criticalFindings: 0,
    highFindings: 0,
  });
  const [thinking, setThinking] = useState({ content: "", active: false });
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>("");

  // ── UI state ───────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(true);
  const [rightPanel, setRightPanel] = useState<RightPanelTab>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("bjhunt");
  const [promptInitialValue, setPromptInitialValue] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Hooks: data + stream + actions ─────────────────────────────────
  const data = useChatData({
    setMessages,
    setToolCalls,
    setActiveConversationId,
    setStreamError,
  });
  const stream = useChatStream({
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
  });
  const actions = useChatActions({
    data,
    stream,
    messages,
    activeEngagement,
    setActiveEngagement,
    activeConversationId,
    setActiveConversationId,
    setMessages,
    setToolCalls,
    setSubAgents,
    setObjectives,
    setStreamError,
    setLastMessage,
    setSelectedAgent,
    selectedAgent,
    webSearch,
    modelSettings,
  });

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setShowSidebar(false);
  }, []);

  const searchParams = useSearchParams();
  useEffect(() => {
    const seed = searchParams.get("seed");
    if (seed) setPromptInitialValue(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll only when near bottom (within 150px).
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (nearBottom) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, subAgents]);

  useEffect(() => {
    data.loadEngagements();
    data.loadSidebarConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore active engagement from sessionStorage — gated to never overwrite
  // an active conversation the user already opened.
  useEffect(() => {
    if (data.engagements.length === 0) return;
    if (activeConversationId !== null) return;
    if (activeEngagement !== null) return;
    const savedId = sessionStorage.getItem("bjhunt_active_engagement");
    if (savedId) {
      const found = data.engagements.find((e) => e.id === savedId);
      if (found) {
        setActiveEngagement(found);
        data.loadHistory(found.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.engagements, activeConversationId, activeEngagement]);

  useEffect(() => {
    if (activeEngagement) {
      sessionStorage.setItem("bjhunt_active_engagement", activeEngagement.id);
    }
  }, [activeEngagement]);

  const sortedToolCalls = useMemo(() => [...toolCalls.values()], [toolCalls]);
  const sortedSubAgents = useMemo(() => [...subAgents.values()], [subAgents]);

  const togglePanel = (tab: NonNullable<RightPanelTab>) =>
    setRightPanel((prev) => (prev === tab ? null : tab));

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] min-h-0 bg-[var(--bjhunt-bg)] text-[var(--bjhunt-text)]">
      <ChatTopbar
        selectedAgent={selectedAgent}
        isStreaming={stream.isStreaming}
        activeAgent={stream.activeAgent}
        tokenCount={stream.tokenCount}
        streamSpeed={stream.streamSpeed}
        rightPanel={rightPanel}
        onToggleSidebar={() => setShowSidebar((v) => !v)}
        onTogglePanel={togglePanel}
      />

      <div className="flex flex-1 min-h-0">
        <ConversationSidebar
          open={showSidebar}
          onClose={() => setShowSidebar(false)}
          locale={locale}
          engagements={data.engagements}
          conversations={data.conversations}
          activeEngagementId={activeEngagement?.id ?? null}
          activeConversationId={activeConversationId}
          search={conversationSearch}
          onSearchChange={setConversationSearch}
          onNewConversation={actions.startNewConversation}
          onSelectConversation={actions.loadConversation}
          onSelectEngagement={actions.selectEngagement}
          onRename={data.renameEngagement}
          onDeleteEngagement={actions.handleDeleteEngagement}
          onDeleteConversation={actions.handleDeleteConversation}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <MessageStream
            messages={messages}
            toolCalls={sortedToolCalls}
            subAgents={sortedSubAgents}
            thinking={thinking}
            isStreaming={stream.isStreaming}
            loadingHistory={data.loadingHistory}
            streamError={streamError}
            lastMessage={lastMessage}
            containerRef={messagesContainerRef}
            endRef={messagesEndRef}
            onPrompt={(t) => actions.handleSend(t)}
            onSetMessages={setMessages}
            onClearStreamError={() => setStreamError(null)}
          />
          <Composer
            isStreaming={stream.isStreaming}
            webSearch={webSearch}
            selectedAgent={selectedAgent}
            initialValue={promptInitialValue}
            onSubmit={actions.handleSend}
            onStop={stream.abort}
            onOpenSettings={() => togglePanel("settings")}
            onOpenPromptLibrary={() => togglePanel("prompts")}
            onSlashCommand={() => {}}
            onToggleWebSearch={() => setWebSearch((v) => !v)}
            onSelectAgent={setSelectedAgent}
            onConsumeInitialValue={() => setPromptInitialValue("")}
          />
        </main>

        <RightPanel
          tab={rightPanel}
          onClose={() => setRightPanel(null)}
          objectives={objectives}
          activeEngagement={activeEngagement}
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          graphStats={graphStats}
          modelSettings={modelSettings}
          onModelSettingsChange={setModelSettings}
          onSelectPrompt={(content) => setPromptInitialValue(content)}
        />
      </div>

      <OnboardingOverlay
        locale={localeRaw}
        onPrefillChat={(prompt) => setPromptInitialValue(prompt)}
      />
    </div>
  );
}
