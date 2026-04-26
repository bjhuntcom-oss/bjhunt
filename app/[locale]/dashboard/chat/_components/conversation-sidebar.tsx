/**
 * ConversationSidebar — refonte 2026 / B5.
 * Left rail: 280px on lg+, drawer with backdrop on <lg. Active item = 2px
 * left rule white (no bg fill — legacy green tint gone). CSS-only :hover.
 * Row rendering in ./sidebar-rows.tsx to keep this file under 300 LOC.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupByDate } from "./sidebar-helpers";
import {
  ConversationRow,
  DeleteConfirmRow,
  EngagementRow,
  RenameRow,
} from "./sidebar-rows";
import type {
  Engagement,
  SidebarConversation,
  SidebarLocale,
} from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  locale: SidebarLocale;

  engagements: Engagement[];
  conversations: SidebarConversation[];
  activeEngagementId: string | null;
  activeConversationId: string | null;

  search: string;
  onSearchChange: (s: string) => void;

  onNewConversation: () => void;
  onSelectConversation: (conv: SidebarConversation) => void;
  onSelectEngagement: (eng: Engagement) => void;

  onRename: (engId: string, name: string) => Promise<void>;
  onDeleteEngagement: (engId: string) => Promise<void>;
  onDeleteConversation: (convId: string) => Promise<void>;
}

export function ConversationSidebar({
  open,
  onClose,
  locale,
  engagements,
  conversations,
  activeEngagementId,
  activeConversationId,
  search,
  onSearchChange,
  onNewConversation,
  onSelectConversation,
  onSelectEngagement,
  onRename,
  onDeleteEngagement,
  onDeleteConversation,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Click-outside closes context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handle = () => setContextMenu(null);
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [contextMenu]);

  // Escape key closes any open inline state
  useEffect(() => {
    if (!renamingId && !deleteConfirmId && !contextMenu) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRenamingId(null);
        setDeleteConfirmId(null);
        setContextMenu(null);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [renamingId, deleteConfirmId, contextMenu]);

  const filteredEngagements = useMemo(() => {
    if (!search.trim()) return engagements;
    const q = search.toLowerCase();
    return engagements.filter((e) => e.name.toLowerCase().includes(q));
  }, [engagements, search]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
        (c.engagementName && c.engagementName.toLowerCase().includes(q)),
    );
  }, [conversations, search]);

  const groupedConversations = useMemo(
    () => groupByDate(filteredConversations, locale),
    [filteredConversations, locale],
  );

  if (!open) return null;

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
    setContextMenu(null);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-[var(--bjhunt-bg-overlay)] z-40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col min-h-0",
          "lg:relative lg:inset-auto lg:z-auto",
          "bg-[var(--bjhunt-bg)] border-r border-[var(--bjhunt-border)]",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-[var(--bjhunt-border)]">
          <button
            type="button"
            onClick={onNewConversation}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 h-9",
              "rounded-[var(--bjhunt-radius)] border border-[var(--bjhunt-border)]",
              "text-[var(--bjhunt-text)] hover:bg-white/[0.04] hover:border-[var(--bjhunt-border-strong)]",
              "transition-colors",
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">New</span>
          </button>
          {conversations.length > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-[var(--bjhunt-text-muted)]">
              {conversations.length}
            </span>
          )}
        </div>

        {/* Search */}
        {(conversations.length > 2 || engagements.length > 2) && (
          <div className="p-3 border-b border-[var(--bjhunt-border)]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bjhunt-text-muted)]" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search…"
                className={cn(
                  "w-full h-9 pl-8 pr-7",
                  "bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)]",
                  "text-[13px] text-[var(--bjhunt-text)] placeholder:text-[var(--bjhunt-text-muted)]",
                  "outline-none focus:border-[var(--state-success)] focus:ring-2 focus:ring-[var(--state-success-tint)]",
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {groupedConversations.length > 0
            ? groupedConversations.map((group) => (
                <div key={group.label}>
                  <div className="px-3 pt-4 pb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
                    {group.label}
                  </div>
                  {group.items.map((conv) =>
                    renamingId === conv.id ? (
                      <RenameRow
                        key={conv.id}
                        value={renameValue}
                        onChange={setRenameValue}
                        onSubmit={async () => {
                          if (conv.engagementId) await onRename(conv.engagementId, renameValue);
                          setRenamingId(null);
                        }}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : deleteConfirmId === conv.id ? (
                      <DeleteConfirmRow
                        key={conv.id}
                        onCancel={() => setDeleteConfirmId(null)}
                        onConfirm={async () => {
                          await onDeleteConversation(conv.id);
                          setDeleteConfirmId(null);
                        }}
                      />
                    ) : (
                      <ConversationRow
                        key={conv.id}
                        conv={conv}
                        locale={locale}
                        isActive={activeConversationId === conv.id}
                        onClick={() => onSelectConversation(conv)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, id: conv.id });
                        }}
                      />
                    ),
                  )}
                </div>
              ))
            : filteredEngagements.map((eng) =>
                renamingId === eng.id ? (
                  <RenameRow
                    key={eng.id}
                    value={renameValue}
                    onChange={setRenameValue}
                    onSubmit={async () => {
                      await onRename(eng.id, renameValue);
                      setRenamingId(null);
                    }}
                    onCancel={() => setRenamingId(null)}
                  />
                ) : deleteConfirmId === eng.id ? (
                  <DeleteConfirmRow
                    key={eng.id}
                    onCancel={() => setDeleteConfirmId(null)}
                    onConfirm={async () => {
                      await onDeleteEngagement(eng.id);
                      setDeleteConfirmId(null);
                    }}
                  />
                ) : (
                  <EngagementRow
                    key={eng.id}
                    eng={eng}
                    isActive={activeEngagementId === eng.id}
                    onClick={() => onSelectEngagement(eng)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, id: eng.id });
                    }}
                  />
                ),
              )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div
            className={cn(
              "fixed z-[60] py-1 min-w-[160px]",
              "bg-[var(--bjhunt-bg-elevated)] border border-[var(--bjhunt-border)]",
              "rounded-[var(--bjhunt-radius)]",
            )}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const conv = conversations.find((c) => c.id === contextMenu.id);
                const eng = engagements.find((e) => e.id === contextMenu.id);
                startRename(contextMenu.id, conv?.title || eng?.name || "");
              }}
              className="w-full inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] hover:bg-white/[0.04]"
            >
              <Pencil className="w-3.5 h-3.5" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmId(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--state-critical)] hover:bg-[var(--state-critical-tint)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
