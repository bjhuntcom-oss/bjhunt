/**
 * MessageStream — refonte 2026 / B5.
 *
 * Center column. The ONLY scroll container in the layout. Holds:
 *  - history skeleton when loading,
 *  - empty state when no messages,
 *  - message list (uses existing <MessageBubble>),
 *  - inline tool calls (<ToolCallBlock>),
 *  - thinking indicator + sub-agent cards,
 *  - error banner with retry,
 *  - sticky scroll-to-bottom FAB.
 *
 * No chrome on the bubbles per spec — typography hierarchy carries it
 * (handled by MessageBubble itself in components/chat).
 */
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown } from "lucide-react";
import { MessageBubble, type ChatMessage } from "@/components/chat/message-bubble";
import { ToolCallBlock, type ToolCall } from "@/components/chat/tool-call-block";
import { ThinkingBlock } from "@/components/chat/thinking-block";
import { SubAgentCard, type SubAgentSession } from "@/components/chat/sub-agent-card";
import { browserBackendFetch } from "@/lib/backend-client";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

interface Props {
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  subAgents: SubAgentSession[];
  thinking: { content: string; active: boolean };
  isStreaming: boolean;
  loadingHistory: boolean;
  streamError: string | null;
  lastMessage: string;

  containerRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;

  onPrompt: (text: string) => void;
  onSetMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onClearStreamError: () => void;
}

export function MessageStream({
  messages,
  toolCalls,
  subAgents,
  thinking,
  isStreaming,
  loadingHistory,
  streamError,
  lastMessage,
  containerRef,
  endRef,
  onPrompt,
  onSetMessages,
  onClearStreamError,
}: Props) {
  const [showScrollDown, setShowScrollDown] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);

  // Track scroll position to show/hide "scroll to bottom" FAB
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function onScroll() {
      if (!container) return;
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollDown(dist > 200);
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sortedSubAgents = subAgents;
  const sortedToolCalls = toolCalls;

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={(el) => {
          // Forward ref so the orchestrator can run autoscroll heuristics.
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          internalRef.current = el;
        }}
        className={cn(
          "absolute inset-0 overflow-y-auto",
          "bg-[var(--bjhunt-bg)]",
        )}
      >
        <div className="mx-auto w-full max-w-[720px] px-4 md:px-6 py-6 space-y-6">
          {loadingHistory && messages.length === 0 && <HistorySkeleton />}

          {messages.length === 0 && !loadingHistory && (
            <EmptyState onPrompt={onPrompt} />
          )}

          {messages.map((msg, i) => (
            <div key={msg.id} className="space-y-2">
              <MessageBubble
                message={msg}
                onRetry={
                  msg.role === "assistant" && msg.emptyResponse && !msg.content
                    ? () => {
                        onSetMessages((prev) => prev.filter((m) => m.id !== msg.id));
                        if (lastMessage) onPrompt(lastMessage);
                      }
                    : undefined
                }
                onRegenerate={
                  msg.role === "assistant" && !msg.isStreaming
                    ? () => {
                        const idx = messages.findIndex((m) => m.id === msg.id);
                        const prevUser = [...messages.slice(0, idx)]
                          .reverse()
                          .find((m) => m.role === "user");
                        if (!prevUser) return;
                        onSetMessages((prev) => prev.slice(0, idx));
                        onPrompt(prevUser.content);
                      }
                    : undefined
                }
                onEdit={
                  msg.role === "user" && !isStreaming
                    ? (newContent: string) => {
                        const trimmed = newContent.trim();
                        if (!trimmed || trimmed === msg.content) return;
                        const idx = messages.findIndex((m) => m.id === msg.id);
                        onSetMessages((prev) => prev.slice(0, idx));
                        onPrompt(trimmed);
                      }
                    : undefined
                }
                onFeedback={
                  msg.role === "assistant" && !msg.isStreaming
                    ? (type: "up" | "down") => {
                        browserBackendFetch(`/api/chat/messages/${msg.id}/feedback`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ rating: type === "up" ? 1 : -1 }),
                        }).catch(() => {});
                      }
                    : undefined
                }
              />

              {/* Tool calls attached to this assistant message. Tool calls
                  without a messageId (legacy / history-loaded) attach to the
                  last assistant message as a fallback. */}
              {msg.role === "assistant" && (() => {
                const tools = sortedToolCalls.filter(
                  (tc) => tc.messageId === msg.id || (!tc.messageId && i === messages.length - 1),
                );
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    {tools.map((tc) => (
                      <ToolCallBlock key={tc.id} tool={tc} />
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}

          {thinking.active && <ThinkingBlock content={thinking.content} isActive />}

          {sortedSubAgents
            .filter((sa) => sa.status === "running")
            .map((sa) => (
              <SubAgentCard key={sa.id} session={sa} />
            ))}

          {sortedSubAgents
            .filter((sa) => sa.status !== "running")
            .map((sa) => (
              <SubAgentCard key={sa.id} session={sa} />
            ))}

          {streamError && !isStreaming && (
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-[var(--bjhunt-radius)]",
                "bg-[var(--state-critical-tint)] border border-[var(--state-critical)]",
              )}
            >
              <span className="flex-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--state-critical)]">
                Stream error: {streamError}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearStreamError();
                  onSetMessages((prev) =>
                    prev.filter(
                      (m) => !(m.role === "assistant" && m.content.startsWith("Error:")),
                    ),
                  );
                  if (lastMessage) onPrompt(lastMessage);
                }}
                className="font-mono text-[11px] uppercase tracking-[0.18em] px-3 h-7 rounded-[var(--bjhunt-radius)] bg-[var(--bjhunt-bg-surface)] border border-[var(--state-critical)] text-[var(--state-critical)] hover:bg-[var(--state-critical-tint)]"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Sticky scroll-to-bottom FAB */}
      {showScrollDown && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-6 z-10",
            "inline-flex items-center gap-2 h-9 px-3",
            "bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)]",
            "rounded-[var(--bjhunt-radius-pill)]",
            "font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]",
            "hover:text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] transition-colors",
          )}
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          Latest
        </button>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn("flex flex-col gap-1.5", i % 2 === 1 ? "items-end" : "items-start")}
        >
          <div className="h-2 w-16 bg-[var(--bjhunt-border)] rounded animate-pulse" />
          <div
            className="bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] px-4 py-3 animate-pulse"
            style={{ width: `${40 + i * 15}%`, maxWidth: "75%" }}
          >
            <div className="space-y-2">
              <div className="h-3 bg-[var(--bjhunt-border)] w-full rounded" />
              <div className="h-3 bg-[var(--bjhunt-border)] w-3/4 rounded" />
              {i === 2 && <div className="h-3 bg-[var(--bjhunt-border)] w-1/2 rounded" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
