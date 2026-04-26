/**
 * useChatData — owns the conversation/engagement load + mutate API surface
 * for the chat orchestrator. Extracted from page.tsx to keep the component
 * file under the 250-LOC budget.
 *
 * Endpoints touched (no shape changes):
 *   GET  /api/engagements
 *   GET  /api/chat/conversations?limit=50
 *   GET  /api/chat/history/:engagementId
 *   GET  /api/chat/conversations/:id/messages
 *   POST /api/engagements
 *   PATCH /api/engagements/:id
 *   DELETE /api/engagements/:id
 *   DELETE /api/chat/conversations/:id
 */
"use client";

import { useCallback, useState } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import type { ChatMessage } from "@/components/chat/message-bubble";
import type { ToolCall } from "@/components/chat/tool-call-block";
import type { Engagement, SidebarConversation } from "../_components/types";
import { errorToString } from "../_components/sidebar-helpers";

interface Setters {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setToolCalls: React.Dispatch<React.SetStateAction<Map<string, ToolCall>>>;
  setActiveConversationId: (id: string | null) => void;
  setStreamError: (s: string | null) => void;
}

export function useChatData(setters: Setters) {
  const { setMessages, setToolCalls, setActiveConversationId, setStreamError } = setters;

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadEngagements = useCallback(async () => {
    try {
      const res = await browserBackendFetch("/api/engagements");
      if (res.ok) {
        const data = await res.json();
        setEngagements(data.engagements || []);
      }
    } catch {
      // backend may not be up
    }
  }, []);

  const loadSidebarConversations = useCallback(async () => {
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
        setConversations(convs);
      }
    } catch {
      // best-effort
    }
  }, []);

  const loadHistory = useCallback(
    async (engagementId: string, convIdOverride?: string) => {
      setLoadingHistory(true);
      try {
        let convId = convIdOverride;
        if (!convId) {
          const convRes = await browserBackendFetch(`/api/chat/history/${engagementId}`);
          if (!convRes.ok) return;
          const { conversations } = await convRes.json();
          if (!conversations?.length) return;
          convId = conversations[0].id as string;
        }
        setActiveConversationId(convId!);
        const msgRes = await browserBackendFetch(
          `/api/chat/conversations/${convId}/messages`,
        );
        if (!msgRes.ok) return;
        const { messages: dbMessages } = await msgRes.json();
        const mapped: ChatMessage[] = (dbMessages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt || m.created_at,
          isStreaming: false,
        }));
        setMessages(mapped);
        const allTools = new Map<string, ToolCall>();
        for (const m of dbMessages || []) {
          if (m.toolCalls && Array.isArray(m.toolCalls)) {
            for (const tc of m.toolCalls) {
              allTools.set(tc.id, { ...tc, status: tc.status || "completed" });
            }
          }
        }
        setToolCalls(allTools);
        return mapped.length;
      } catch {
        return 0;
      } finally {
        setLoadingHistory(false);
      }
    },
    [setActiveConversationId, setMessages, setToolCalls],
  );

  const createEngagement = useCallback(
    async (selectedAgent: string, autoName?: string): Promise<Engagement | null> => {
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
          const eng = data.engagement as Engagement;
          setEngagements((prev) => [eng, ...prev]);
          return eng;
        }
        const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
        setStreamError(errorToString(err) || `Failed to start conversation (${res.status})`);
        return null;
      } catch (e: any) {
        setStreamError(e.message || "Failed to start conversation");
        return null;
      }
    },
    [setStreamError],
  );

  const renameEngagement = useCallback(async (engId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await browserBackendFetch(`/api/engagements/${engId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
    } catch {
      // best-effort
    }
    setEngagements((prev) =>
      prev.map((e) => (e.id === engId ? { ...e, name: newName.trim() } : e)),
    );
    setConversations((prev) =>
      prev.map((c) =>
        c.engagementId === engId
          ? { ...c, title: newName.trim(), engagementName: newName.trim() }
          : c,
      ),
    );
  }, []);

  const deleteEngagement = useCallback(async (engId: string) => {
    try {
      await browserBackendFetch(`/api/engagements/${engId}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
    setEngagements((prev) => prev.filter((e) => e.id !== engId));
    setConversations((prev) => prev.filter((c) => c.engagementId !== engId));
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    try {
      await browserBackendFetch(`/api/chat/conversations/${convId}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
    setConversations((prev) => prev.filter((c) => c.id !== convId));
  }, []);

  return {
    engagements,
    setEngagements,
    conversations,
    setConversations,
    loadingHistory,
    loadEngagements,
    loadSidebarConversations,
    loadHistory,
    createEngagement,
    renameEngagement,
    deleteEngagement,
    deleteConversation,
  };
}
