/**
 * Shared types for the chat page split components (refonte 2026 / B5).
 * Kept as a tiny module so the orchestrator + each child file can import
 * without circular references.
 */
export interface Engagement {
  id: string;
  name: string;
  target: string;
  status: string;
  createdAt: string;
  /** Upstream langgraph agent identifier — optional because the backend may omit it on older rows. */
  agentGraph?: string;
}

/** Sidebar conversation item (loaded from /api/chat/conversations) */
export interface SidebarConversation {
  id: string;
  title: string;
  engagementId: string | null;
  engagementName: string | null;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SidebarLocale = "fr" | "en";

export type RightPanelTab = "opplan" | "graph" | "settings" | "prompts" | null;
