export type ChatMessageRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessageData {
  id: string;
  role: ChatMessageRole;
  content: string;
  provider_id: string | null;
  model: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  status: string;
  last_message_preview: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}
