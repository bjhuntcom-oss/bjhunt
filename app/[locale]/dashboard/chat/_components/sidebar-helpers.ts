/**
 * Pure helpers for the conversation sidebar. Lifted out of the old
 * 1986-LOC god component verbatim — same behaviour, no logic change.
 */
import type { SidebarConversation, SidebarLocale } from "./types";

const GROUP_LABELS = {
  fr: { today: "Aujourd'hui", yesterday: "Hier", week: "7 derniers jours", older: "Plus ancien" },
  en: { today: "Today", yesterday: "Yesterday", week: "Last 7 days", older: "Older" },
} as const;

export function groupByDate(
  items: SidebarConversation[],
  locale: SidebarLocale = "fr",
): { label: string; items: SidebarConversation[] }[] {
  const labels = GROUP_LABELS[locale] ?? GROUP_LABELS.en;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOf7Days = new Date(startOfToday.getTime() - 7 * 86400000);

  const groups: Record<string, SidebarConversation[]> = {
    [labels.today]: [],
    [labels.yesterday]: [],
    [labels.week]: [],
    [labels.older]: [],
  };

  for (const item of items) {
    const d = new Date(item.updatedAt || item.createdAt);
    if (d >= startOfToday) groups[labels.today].push(item);
    else if (d >= startOfYesterday) groups[labels.yesterday].push(item);
    else if (d >= startOf7Days) groups[labels.week].push(item);
    else groups[labels.older].push(item);
  }

  return Object.entries(groups)
    .filter(([, v]) => v.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

export function isGenericTitle(title: string): boolean {
  if (!title) return true;
  return /^(Assessment|Scan|Evaluation|Audit)\s+\d{1,2}\/\d{1,2}\/\d{4}$/i.test(title)
    || /^New (conversation|chat)$/i.test(title);
}

export function displayTitle(conv: SidebarConversation, locale: SidebarLocale = "fr"): string {
  if (isGenericTitle(conv.title)) {
    if (conv.lastMessage) return truncate(conv.lastMessage, 40);
    return locale === "fr" ? "Sans titre" : "Untitled";
  }
  return truncate(conv.title, 40);
}

export function relativeTime(iso: string): string {
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

/**
 * Backend errors come back in two shapes: legacy `{error: "STRING"}` and
 * the new typed envelope `{error: {code, message}}`. Pull a renderable
 * string out of either; previously the chat tried to render the envelope
 * as a React child and crashed with React error #31.
 */
export function errorToString(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const e = payload as { error?: unknown; message?: unknown };
  if (typeof e.error === "string") return e.error;
  if (e.error && typeof e.error === "object") {
    const inner = e.error as { message?: unknown; code?: unknown };
    if (typeof inner.message === "string") return inner.message;
    if (typeof inner.code === "string") return inner.code;
  }
  if (typeof e.message === "string") return e.message;
  return "";
}
