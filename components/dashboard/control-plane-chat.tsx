"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { useChatApi } from "@/lib/chat/use-chat-api";
import { useChatShortcuts } from "@/lib/chat-shortcuts";
import { exportToMarkdown, downloadString } from "@/lib/chat-export";

import { ConversationSidebar, type Conversation } from "@/components/chat/conversation-sidebar";
import { ModelSettingsPanel, type ModelSettings } from "@/components/chat/model-settings-panel";
import { MessageBubble, type ChatMessage } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatTopbar } from "@/components/chat/chat-topbar";
import { PromptLibraryPanel } from "@/components/chat/prompt-library-panel";
import { ArtifactPanel, type Artifact } from "@/components/chat/artifact-panel";
import type { AIModel } from "@/components/chat/model-selector";

import type { ChatConversation, ChatMessageData } from "@/components/chat/chat-types";
import type { PendingFile } from "@/components/chat/file-upload-zone";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVAILABLE_MODELS: AIModel[] = [
  { id: "bjhunt-sec-v1", name: "BJHUNT Security v1", provider: "BJHUNT", contextLength: 32768 },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", contextLength: 128000 },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", contextLength: 200000 },
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Local", contextLength: 131072 },
];

const DEFAULT_SETTINGS: ModelSettings = {
  systemPrompt: "Tu es BJHUNT AI, un expert en cybersécurité...",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  streamResponse: true,
  webSearch: false,
};

// ---------------------------------------------------------------------------
// Type mappers
// ---------------------------------------------------------------------------

function mapConversation(c: ChatConversation): Conversation {
  return {
    id: c.id,
    title: c.title,
    preview: c.last_message_preview,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    pinned: false,
  };
}

function mapMessage(m: ChatMessageData): ChatMessage {
  return {
    id: m.id,
    role: m.role === "tool" ? "assistant" : (m.role as "user" | "assistant" | "system"),
    content: m.content,
    provider: m.provider_id ?? undefined,
    createdAt: m.created_at,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildRemediationRoute(locale: string, role: string, error: string) {
  if (error === "PLATFORM_PROVIDER_KEY_MISSING" && role === "platform_admin") {
    return `/${locale}/dashboard/admin/llm`;
  }
  return `/${locale}/dashboard/settings?reason=provider`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ControlPlaneChatProps {
  locale: string;
  user: { role: string };
  initialConversations: ChatConversation[];
  initialConversation: ChatConversation | null;
  initialMessages: ChatMessageData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ControlPlaneChat({
  locale,
  user,
  initialConversations,
  initialConversation,
  initialMessages,
}: ControlPlaneChatProps) {
  const router = useRouter();

  // Chat API (all backend communication)
  const chat = useChatApi({
    locale,
    initialConversations,
    initialConversation,
    initialMessages,
  });

  // UI state
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  // Artifacts are extracted from messages in a future iteration; empty for now
  const [artifacts] = useState<Artifact[]>([]);

  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleProviderError = useCallback(
    (error: string) => {
      if (
        error === "PLATFORM_PROVIDER_KEY_MISSING" ||
        error === "NO_ENABLED_PROVIDER_PROFILE"
      ) {
        router.push(buildRemediationRoute(locale, user.role, error));
      }
    },
    [locale, user.role, router]
  );

  const handleCreate = useCallback(async () => {
    const conversation = await chat.createConversation();
    if (conversation) {
      router.push(`/${locale}/dashboard/chat/${conversation.id}`);
      router.refresh();
    } else if (chat.error) {
      handleProviderError(chat.error);
    }
  }, [chat, locale, router, handleProviderError]);

  const handleSelect = useCallback(
    (id: string) => {
      const conversation = chat.conversations.find((c) => c.id === id);
      if (!conversation) return;
      chat.selectConversation(conversation);
      router.push(`/${locale}/dashboard/chat/${conversation.id}`);
    },
    [chat, locale, router]
  );

  const handleSubmit = useCallback(
    async (content: string, files: PendingFile[] = []) => {
      const wasNew = !chat.activeConversation;
      const conversation = await chat.sendMessage(content, files, settings.webSearch);
      if (conversation && wasNew) {
        router.push(`/${locale}/dashboard/chat/${conversation.id}`);
        router.refresh();
      } else if (chat.error) {
        handleProviderError(chat.error);
      }
    },
    [chat, locale, router, handleProviderError, settings.webSearch]
  );

  const handleRegenerate = useCallback(async () => {
    const lastUserMsg = [...chat.messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || !chat.activeConversation) return;
    await handleSubmit(lastUserMsg.content, []);
  }, [chat.messages, chat.activeConversation, handleSubmit]);

  const handleExport = useCallback(() => {
    const title = chat.activeConversation?.title ?? "Conversation BJHUNT";
    const mapped = chat.messages.map(mapMessage);
    const md = exportToMarkdown(title, mapped);
    downloadString(md, `${title.toLowerCase().replace(/\s+/g, "-")}.md`);
  }, [chat.activeConversation, chat.messages]);

  // Keyboard shortcuts
  useChatShortcuts({
    onNewConversation: handleCreate,
    onToggleWebSearch: () => setSettings((s) => ({ ...s, webSearch: !s.webSearch })),
    onToggleSettings: () => setShowSettings((v) => !v),
    onTogglePromptLibrary: () => setShowPromptLibrary((v) => !v),
    onToggleSearch: () => setShowSearch((v) => !v),
    onExport: handleExport,
  });

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const conversations: Conversation[] = chat.conversations.map(mapConversation);

  const messages: ChatMessage[] = chat.messages.map(mapMessage);

  // Determine selected model object before building displayMessages
  const selectedModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  const contextLength = selectedModelObj?.contextLength ?? 32768;

  // Append streaming message if active
  const displayMessages: ChatMessage[] = chat.streamingText !== null
    ? [
        ...messages,
        {
          id: "streaming-current",
          role: "assistant" as const,
          content: chat.streamingText,
          provider: selectedModelObj?.provider?.toLowerCase(),
          isStreaming: true,
          createdAt: new Date().toISOString(),
        },
      ]
    : messages;

  const tokenCount = Math.round(
    displayMessages.reduce((acc, m) => acc + m.content.length, 0) / 4
  );

  // Fork handler (needs displayMessages)
  const handleFork = useCallback(
    async (messageIndex: number) => {
      const targetMsg = displayMessages
        .slice(0, messageIndex + 1)
        .reverse()
        .find((m) => m.role === "user");
      if (!targetMsg) return;
      // TODO: seed the fork with targetMsg.content once the backend supports it
      const conversation = await chat.createConversation();
      if (conversation) {
        router.push(`/${locale}/dashboard/chat/${conversation.id}`);
        router.refresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayMessages, chat, locale, router]
  );

  // Scroll FAB visibility
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    function onScroll() {
      const distFromBottom =
        container!.scrollHeight - container!.scrollTop - container!.clientHeight;
      setShowScrollFab(distFromBottom > 200);
    }
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to bottom on new messages (unless user scrolled up)
  useEffect(() => {
    if (!showScrollFab) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages.length, showScrollFab]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        folders={[]}
        activeId={chat.activeConversation?.id ?? null}
        onSelect={handleSelect}
        onNew={() => void handleCreate()}
        onDelete={(id) => void chat.deleteConversation(id)}
        onRename={() => {}}
        onPin={() => {}}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <ChatTopbar
          locale={locale}
          title={chat.activeConversation?.title ?? "Nouvelle conversation"}
          models={AVAILABLE_MODELS}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          tokenCount={tokenCount}
          contextLength={contextLength}
          onToggleSettings={() => setShowSettings((v) => !v)}
          onTogglePromptLibrary={() => setShowPromptLibrary((v) => !v)}
          onExport={handleExport}
        />

        {/* Inline search bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les messages..."
              className="flex-1 bg-transparent text-[11px] text-white placeholder:text-[var(--text-muted)] outline-none"
              onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
            />
            <span className="text-[9px] text-[var(--text-muted)]">
              {searchQuery
                ? `${displayMessages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length} résultat(s)`
                : ""}
            </span>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider hover:text-white"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Thread — scrollable */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4 flex flex-col relative"
        >
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
            {displayMessages.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-[11px] text-[var(--text-muted)]">
                  Lancez une analyse ou posez une question de cybersécurité.
                </p>
              </div>
            ) : (
              displayMessages
                .filter(
                  (msg) =>
                    !searchQuery ||
                    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onFork={
                      msg.role === "assistant"
                        ? () => {
                            const originalIndex = displayMessages.findIndex(
                              (m) => m.id === msg.id
                            );
                            void handleFork(originalIndex);
                          }
                        : undefined
                    }
                    onRegenerate={
                      msg.id === displayMessages.filter((m) => m.role === "assistant").at(-1)?.id
                        ? handleRegenerate
                        : undefined
                    }
                  />
                ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll FAB */}
          {showScrollFab && (
            <button
              onClick={() =>
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="sticky bottom-4 self-end w-8 h-8 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-muted)] hover:text-white transition-colors shadow-lg"
              title="Aller en bas"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Error banner */}
        {chat.error && (
          <div className="mx-4 mb-0 border border-[var(--danger)]/25 bg-[var(--danger-dim)] px-4 py-3 text-[11px] text-red-200 flex-shrink-0">
            {chat.error === "CHAT_SEND_FAILED"
              ? "La réponse BJHUNT n'a pas pu être générée. Vérifiez la configuration du provider ou relancez la demande."
              : chat.error === "CHAT_CREATE_FAILED"
                ? "Impossible de créer une nouvelle session BJHUNT pour le moment."
                : chat.error}
          </div>
        )}

        {/* Chat input */}
        <ChatInput
          onSubmit={(content, files) => void handleSubmit(content, files)}
          onStop={() => chat.stopStreaming()}
          onOpenSettings={() => setShowSettings((v) => !v)}
          onOpenPromptLibrary={() => setShowPromptLibrary((v) => !v)}
          webSearch={settings.webSearch}
          onToggleWebSearch={() =>
            setSettings((s) => ({ ...s, webSearch: !s.webSearch }))
          }
          disabled={chat.isSubmitting || chat.isCreating}
          isStreaming={!!chat.streamingText}
          initialValue={pendingPrompt ?? undefined}
          onConsumeInitialValue={() => setPendingPrompt(null)}
        />
      </div>

      {/* Model settings panel */}
      {showSettings && (
        <ModelSettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Prompt library panel */}
      {showPromptLibrary && (
        <PromptLibraryPanel
          onSelect={(content) => {
            setPendingPrompt(content);
            setShowPromptLibrary(false);
          }}
          onClose={() => setShowPromptLibrary(false)}
        />
      )}

      {/* Artifact panel */}
      {showArtifacts && artifacts.length > 0 && (
        <ArtifactPanel
          artifacts={artifacts}
          onClose={() => setShowArtifacts(false)}
        />
      )}
    </div>
  );
}
