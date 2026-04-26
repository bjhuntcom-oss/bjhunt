/**
 * useChatActions — orchestration layer that wires conversation/engagement
 * lifecycle handlers (load, send, switch, delete) on top of useChatData
 * and useChatStream. Lifted out of page.tsx so the orchestrator stays
 * under the 250-LOC budget.
 *
 * Preserves verbatim:
 *   - slash command short-circuit (calls SLASH_COMMANDS action.with ctx).
 *   - auto-create engagement on first send when none exists.
 *   - auto-name engagement after first response (only when not already named).
 *   - per-engagement agent restoration on conversation/engagement switch.
 *   - sidebar refresh after each completed turn.
 */
"use client";

import { useCallback, useRef } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import type { ChatMessage } from "@/components/chat/message-bubble";
import type { ToolCall } from "@/components/chat/tool-call-block";
import type { SubAgentSession } from "@/components/chat/sub-agent-card";
import type { Objective } from "@/components/chat/opplan-panel";
import type { ModelSettings } from "@/components/chat/model-settings-panel";
import type { PendingFile } from "@/components/chat/file-upload-zone";
import type { SlashCommandContext } from "@/components/chat/slash-commands";
import { SLASH_COMMANDS } from "@/components/chat/slash-commands";
import { truncate } from "../_components/sidebar-helpers";
import type { Engagement, SidebarConversation } from "../_components/types";
import type { useChatData } from "./use-chat-data";
import { uploadFiles, type useChatStream } from "./use-chat-stream";

interface ActionsArgs {
  data: ReturnType<typeof useChatData>;
  stream: ReturnType<typeof useChatStream>;
  // State pieces owned by the page
  messages: ChatMessage[];
  activeEngagement: Engagement | null;
  setActiveEngagement: React.Dispatch<React.SetStateAction<Engagement | null>>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setToolCalls: React.Dispatch<React.SetStateAction<Map<string, ToolCall>>>;
  setSubAgents: React.Dispatch<React.SetStateAction<Map<string, SubAgentSession>>>;
  setObjectives: React.Dispatch<React.SetStateAction<Objective[]>>;
  setStreamError: (s: string | null) => void;
  setLastMessage: (s: string) => void;
  setSelectedAgent: (id: string) => void;
  selectedAgent: string;
  webSearch: boolean;
  modelSettings: ModelSettings;
}

export function useChatActions(args: ActionsArgs) {
  const {
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
  } = args;

  const hasAutoNamedRef = useRef<boolean>(false);

  const startNewConversation = useCallback(() => {
    setActiveEngagement(null);
    setActiveConversationId(null);
    hasAutoNamedRef.current = false;
    setMessages([]);
    setToolCalls(new Map());
    setSubAgents(new Map());
    setObjectives([]);
    setStreamError(null);
  }, [
    setActiveConversationId,
    setActiveEngagement,
    setMessages,
    setObjectives,
    setStreamError,
    setSubAgents,
    setToolCalls,
  ]);

  const loadConversation = useCallback(
    async (conv: SidebarConversation) => {
      if (conv.engagementId) {
        const eng = data.engagements.find((e) => e.id === conv.engagementId);
        if (eng) {
          setActiveEngagement(eng);
          if (eng.agentGraph) setSelectedAgent(eng.agentGraph);
        } else {
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
      if (conv.engagementId) {
        const count = await data.loadHistory(conv.engagementId, conv.id);
        hasAutoNamedRef.current = (count ?? 0) > 0;
      }
    },
    [
      data,
      setActiveConversationId,
      setActiveEngagement,
      setMessages,
      setObjectives,
      setSelectedAgent,
      setStreamError,
      setSubAgents,
      setToolCalls,
    ],
  );

  const selectEngagement = useCallback(
    async (eng: Engagement) => {
      setActiveEngagement(eng);
      setActiveConversationId(null);
      setMessages([]);
      setToolCalls(new Map());
      setSubAgents(new Map());
      if (eng.agentGraph) setSelectedAgent(eng.agentGraph);
      const count = await data.loadHistory(eng.id);
      hasAutoNamedRef.current = (count ?? 0) > 0;
    },
    [
      data,
      setActiveConversationId,
      setActiveEngagement,
      setMessages,
      setSelectedAgent,
      setSubAgents,
      setToolCalls,
    ],
  );

  const handleSend = useCallback(
    async (text: string, files: PendingFile[] = []) => {
      if (!text) return;

      // Slash command short-circuit
      const slashCmd = SLASH_COMMANDS.find((c) => text.startsWith(c.command));
      if (slashCmd?.action) {
        const ctx: SlashCommandContext = {
          setInput: () => {},
          sendMessage: (msg) => {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: msg,
                createdAt: new Date().toISOString(),
              },
            ]);
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

      let engId = activeEngagement?.id;
      let engagementForRequest = activeEngagement;
      if (!engId) {
        const eng = await data.createEngagement(selectedAgent, text.slice(0, 50));
        if (!eng) return;
        engId = eng.id;
        engagementForRequest = eng;
        setActiveEngagement(eng);
        setActiveConversationId(null);
        hasAutoNamedRef.current = false;
      }

      await uploadFiles(files);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLastMessage(text);

      await stream.startStream(
        {
          text,
          files,
          engagementId: engId!,
          conversationId: activeConversationId,
          selectedAgent,
          activeEngagement: engagementForRequest,
          webSearch,
          modelSettings,
        },
        (finalContent) => {
          if (!hasAutoNamedRef.current && engId && (finalContent || text)) {
            hasAutoNamedRef.current = true;
            const autoTitle = truncate(text, 40);
            browserBackendFetch(`/api/engagements/${engId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: autoTitle }),
            }).catch(() => {});
            data.setEngagements((prev) =>
              prev.map((e) => (e.id === engId ? { ...e, name: autoTitle } : e)),
            );
            if (activeEngagement?.id === engId) {
              setActiveEngagement((prev) => (prev ? { ...prev, name: autoTitle } : prev));
            }
          }
          data.loadSidebarConversations();
        },
      );
    },
    [
      activeConversationId,
      activeEngagement,
      data,
      messages,
      modelSettings,
      selectedAgent,
      setActiveConversationId,
      setActiveEngagement,
      setLastMessage,
      setMessages,
      setSubAgents,
      setToolCalls,
      stream,
      webSearch,
    ],
  );

  const handleDeleteEngagement = useCallback(
    async (engId: string) => {
      await data.deleteEngagement(engId);
      if (activeEngagement?.id === engId) startNewConversation();
    },
    [activeEngagement, data, startNewConversation],
  );

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      await data.deleteConversation(convId);
      if (activeConversationId === convId) startNewConversation();
    },
    [activeConversationId, data, startNewConversation],
  );

  return {
    hasAutoNamedRef,
    startNewConversation,
    loadConversation,
    selectEngagement,
    handleSend,
    handleDeleteEngagement,
    handleDeleteConversation,
  };
}
