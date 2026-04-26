/**
 * Sidebar list rows — extracted from conversation-sidebar to keep each file
 * under the 300-LOC component budget. Pure presentational, all state lives
 * in the parent.
 */
"use client";

import { cn } from "@/lib/utils";
import { displayTitle, isGenericTitle, relativeTime } from "./sidebar-helpers";
import type { Engagement, SidebarConversation, SidebarLocale } from "./types";

// ── Shared row shell ────────────────────────────────────────────────

interface RowShellProps {
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  title?: string;
  children: React.ReactNode;
}

export function RowShell({ isActive, onClick, onContextMenu, title, children }: RowShellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      data-active={isActive || undefined}
      className={cn(
        "group w-full text-left h-11 lg:h-9 pl-3 pr-3 transition-colors",
        "border-l-2 border-l-transparent",
        "hover:bg-white/[0.04]",
        "data-[active]:border-l-[var(--bjhunt-text)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 h-full">{children}</div>
    </button>
  );
}

// ── Conversation row ────────────────────────────────────────────────

interface ConversationRowProps {
  conv: SidebarConversation;
  locale: SidebarLocale;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function ConversationRow({
  conv,
  locale,
  isActive,
  onClick,
  onContextMenu,
}: ConversationRowProps) {
  const muted = isGenericTitle(conv.title) && !conv.lastMessage;
  return (
    <RowShell
      isActive={isActive}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={conv.lastMessage || conv.title}
    >
      <span
        className={cn(
          "truncate text-[13px]",
          muted ? "text-[var(--bjhunt-text-muted)] italic" : "text-[var(--bjhunt-text)]",
        )}
      >
        {displayTitle(conv, locale)}
      </span>
      <span className="font-mono text-[11px] text-[var(--bjhunt-text-muted)] shrink-0">
        {relativeTime(conv.updatedAt || conv.createdAt)}
      </span>
    </RowShell>
  );
}

// ── Engagement row ──────────────────────────────────────────────────

interface EngagementRowProps {
  eng: Engagement;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function EngagementRow({ eng, isActive, onClick, onContextMenu }: EngagementRowProps) {
  return (
    <RowShell isActive={isActive} onClick={onClick} onContextMenu={onContextMenu}>
      <span className="truncate text-[13px] text-[var(--bjhunt-text)]">{eng.name}</span>
      <span className="font-mono text-[11px] text-[var(--bjhunt-text-muted)] shrink-0">
        {relativeTime(eng.createdAt)}
      </span>
    </RowShell>
  );
}

// ── Inline rename row ───────────────────────────────────────────────

interface RenameRowProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RenameRow({ value, onChange, onSubmit, onCancel }: RenameRowProps) {
  return (
    <div className="px-3 py-2 mx-2 my-0.5 bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border-strong)] rounded-[var(--bjhunt-radius)]">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onSubmit}
        className="w-full bg-transparent text-[13px] text-[var(--bjhunt-text)] outline-none"
      />
    </div>
  );
}

// ── Inline delete confirm ───────────────────────────────────────────

interface DeleteConfirmRowProps {
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmRow({ onCancel, onConfirm }: DeleteConfirmRowProps) {
  return (
    <div className="px-3 py-2 mx-2 my-0.5 bg-[var(--state-critical-tint)] border border-[var(--state-critical)] rounded-[var(--bjhunt-radius)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--state-critical)] mb-2">
        Delete this conversation?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-7 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] hover:text-[var(--bjhunt-text)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 h-7 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--state-critical)] border border-[var(--state-critical)] rounded-[var(--bjhunt-radius)] hover:bg-[var(--state-critical-tint)]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
