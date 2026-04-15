"use client";

import { useState, useCallback, useRef } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import type { ChatMessageData, ChatConversation } from "@/components/chat/chat-types";
import type { PendingFile } from "@/components/chat/file-upload-zone";

interface CreateConversationPayload {
  conversation: ChatConversation;
  messages: ChatMessageData[];
  error?: string;
}

interface UseChatApiOptions {
  locale: string;
  initialConversations: ChatConversation[];
  initialConversation: ChatConversation | null;
  initialMessages: ChatMessageData[];
}

function moveConversationToTop(
  conversations: ChatConversation[],
  next: ChatConversation
): ChatConversation[] {
  const remaining = conversations.filter((c) => c.id !== next.id);
  return [next, ...remaining];
}

/** Read an SSE stream and yield parsed events */
async function* readSSEStream(
  response: Response
): AsyncGenerator<{ event: string; data: unknown }> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newlines
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        let event = "message";
        let data = "";

        for (const line of block.split("\n")) {
          if (line.startsWith("event: ")) {
            event = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.slice(6).trim();
          }
        }

        if (!data) continue;

        try {
          yield { event, data: JSON.parse(data) };
        } catch {
          // skip malformed data
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useChatApi({
  initialConversations,
  initialConversation,
  initialMessages,
}: UseChatApiOptions) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] = useState(initialConversation);
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const streamingBufferRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const createConversation = useCallback(async (): Promise<ChatConversation | null> => {
    setError("");
    setIsCreating(true);

    try {
      const response = await browserBackendFetch("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateConversationPayload;

      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "CHAT_CREATE_FAILED");
      }

      setConversations((current) => moveConversationToTop(current, payload.conversation));
      setActiveConversation(payload.conversation);
      setMessages([]);
      return payload.conversation;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "CHAT_CREATE_FAILED");
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, files: PendingFile[] = [], webSearch = false) => {
    if (!content.trim()) return;

    setError("");
    setIsSubmitting(true);

    // Upload attachments first
    async function uploadFile(file: PendingFile): Promise<string> {
      const formData = new FormData();
      formData.append("file", file.file);
      const res = await browserBackendFetch("/api/chat/files", {
        method: "POST",
        body: formData,
        // Don't set Content-Type — browser sets multipart boundary automatically
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = (await res.json()) as { id: string };
      return data.id;
    }

    let attachmentIds: string[] = [];
    if (files.length > 0) {
      try {
        attachmentIds = await Promise.all(files.map(uploadFile));
      } catch {
        setError("FILE_UPLOAD_FAILED");
        setIsSubmitting(false);
        return null;
      }
    }

    const optimisticMessage: ChatMessageData = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      provider_id: null,
      model: null,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);

    try {
      const currentConversation = activeConversationRef.current;

      // If no active conversation, create one first (JSON response)
      if (!currentConversation) {
        const response = await browserBackendFetch("/api/chat/conversations", {
          method: "POST",
          body: JSON.stringify({ initialMessage: content.trim(), webSearch, attachmentIds }),
        });
        const payload = (await response.json().catch(() => ({}))) as CreateConversationPayload;

        if (!response.ok || !payload.conversation) {
          throw new Error(payload.error || "CHAT_SEND_FAILED");
        }

        setActiveConversation(payload.conversation);
        setConversations((current) => moveConversationToTop(current, payload.conversation));
        setMessages((current) => {
          const preserved = current.filter((msg) => msg.id !== optimisticMessage.id);
          return [...preserved, ...payload.messages];
        });

        return payload.conversation;
      }

      // Existing conversation: SSE streaming
      abortRef.current = new AbortController();
      const response = await browserBackendFetch(
        `/api/chat/conversations/${currentConversation.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: content.trim(), webSearch, attachmentIds }),
          signal: abortRef.current.signal,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "CHAT_SEND_FAILED");
      }

      // Remove optimistic and start streaming AI response
      setMessages((current) => current.filter((msg) => msg.id !== optimisticMessage.id));
      setStreamingText("");
      streamingBufferRef.current = "";

      let finalConversation = currentConversation;

      for await (const { event, data } of readSSEStream(response)) {
        const payload = data as Record<string, unknown>;

        if (event === "message") {
          const typed = payload as { type: string; message?: ChatMessageData; conversation?: ChatConversation };

          if (typed.type === 'user_message' && typed.message) {
            setMessages((current) => {
              const withoutOptimistic = current.filter((m) => !m.id.startsWith("temp-"));
              return [...withoutOptimistic, typed.message!];
            });
          } else if (typed.type === 'assistant_message' && typed.message) {
            setStreamingText(null);
            setMessages((current) => {
              const withoutTemp = current.filter((m) => !m.id.startsWith("streaming-"));
              return [...withoutTemp, typed.message!];
            });
            if (typed.conversation) {
              finalConversation = typed.conversation;
              setActiveConversation(typed.conversation);
              setConversations((current) => moveConversationToTop(current, typed.conversation!));
            }
          }
        } else if (event === "delta") {
          const delta = payload as { type: string; text: string };
          if (delta.type === "text_delta") {
            streamingBufferRef.current += delta.text;
            setStreamingText(streamingBufferRef.current);
          }
        } else if (event === "done") {
          setStreamingText(null);
        } else if (event === "error") {
          const errMsg = (payload as { error?: string }).error || "CHAT_STREAM_ERROR";
          throw new Error(errMsg);
        }
      }

      return finalConversation;
    } catch (caughtError) {
      setStreamingText(null);
      setMessages((current) => current.filter((m) => !m.id.startsWith("temp-") && !m.id.startsWith("streaming-")));
      if (caughtError instanceof Error && caughtError.name !== "AbortError") {
        setError(caughtError.message || "CHAT_SEND_FAILED");
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreamingText(null);
    setIsSubmitting(false);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const snapshot = conversationsRef.current;
    const deletedConv = snapshot.find((c) => c.id === id) ?? null;

    // Optimistic remove
    setConversations((current) => current.filter((c) => c.id !== id));
    if (activeConversationRef.current?.id === id) {
      setActiveConversation(null);
      setMessages([]);
      setStreamingText(null);
    }

    try {
      const res = await browserBackendFetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("DELETE_FAILED");
    } catch {
      // Rollback: reinsert deleted conversation at the front
      if (deletedConv) {
        setConversations((current) => {
          if (current.some((c) => c.id === deletedConv.id)) return current;
          return [deletedConv, ...current];
        });
      }
      setError("Impossible de supprimer la conversation.");
    }
  }, []);

  const selectConversation = useCallback((conversation: ChatConversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    setStreamingText(null);
    setError("");
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return {
    conversations,
    activeConversation,
    messages,
    streamingText,
    error,
    isSubmitting,
    isCreating,
    createConversation,
    sendMessage,
    selectConversation,
    stopStreaming,
    deleteConversation,
    clearError,
  };
}
