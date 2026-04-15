"use client";

import { useState, useMemo } from "react";
import {
  Search, Plus, Pin, Trash2, Edit3, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  folderId?: string;
  model?: string;
}

export interface ConversationFolder {
  id: string;
  name: string;
}

type DateGroup = "Épinglées" | "Aujourd'hui" | "Hier" | "7 derniers jours" | "Plus ancien"

function getDateGroup(updatedAt: string, pinned: boolean): DateGroup {
  if (pinned) return "Épinglées"
  const now = new Date()
  const d = new Date(updatedAt)
  const diffMs = now.getTime() - d.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 1) return "Aujourd'hui"
  if (diffDays < 2) return "Hier"
  if (diffDays < 8) return "7 derniers jours"
  return "Plus ancien"
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  folders: ConversationFolder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ConvItemProps {
  c: Conversation;
  activeId: string | null;
  renamingId: string | null;
  renameValue: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  setRenamingId: (id: string | null) => void;
  setRenameValue: (v: string) => void;
  onRename: (id: string, title: string) => void;
}

function ConvItem({
  c, activeId, renamingId, renameValue,
  onSelect, onDelete, onPin,
  setRenamingId, setRenameValue, onRename,
}: ConvItemProps) {
  const isActive = c.id === activeId;
  const isRenaming = renamingId === c.id;

  function startRename() {
    setRenamingId(c.id);
    setRenameValue(c.title);
  }

  function commitRename(id: string) {
    if (renameValue.trim()) onRename(id, renameValue.trim());
    setRenamingId(null);
  }

  return (
    <div
      className={cn(
        "group relative flex items-center px-3 py-2 cursor-pointer transition-colors rounded-lg",
        isActive
          ? "bg-[var(--bg-card)] border-l-2 border-l-white rounded-lg"
          : "hover:bg-[var(--bg-card)]/50"
      )}
      onClick={() => !isRenaming && onSelect(c.id)}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => commitRename(c.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename(c.id);
            if (e.key === "Escape") setRenamingId(null);
          }}
          className="flex-1 bg-transparent text-[11px] text-white outline-none border-b border-white/30"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {c.pinned && <Pin className="w-2.5 h-2.5 text-[var(--warning)] flex-shrink-0" />}
            <span className="text-[11px] text-white truncate">{c.title}</span>
          </div>
          <div className="text-[9px] text-[var(--text-muted)] truncate mt-0.5">{c.preview}</div>
        </div>
      )}

      {/* Actions au hover */}
      {!isRenaming && (
        <div className="absolute right-2 hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(c.id); }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--warning)]"
            title="Épingler"
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); startRename(); }}
            className="p-1 text-[var(--text-muted)] hover:text-white"
            title="Renommer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ConversationSidebar({
  conversations, folders, activeId,
  onSelect, onNew, onDelete, onRename, onPin,
  collapsed = false, onToggleCollapse,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
    );
  }, [search, conversations]);

  return (
    <div
      className="flex flex-col h-full bg-[var(--bg-input)] border-r border-[var(--border)] flex-shrink-0 overflow-hidden transition-[width] duration-200"
      style={{ width: collapsed ? 0 : 240 }}
    >
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-2.5 h-8 rounded-lg">
          <Search className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="bg-transparent text-[10px] text-white placeholder:text-[var(--text-muted)] outline-none flex-1"
          />
        </div>
        <button
          onClick={onNew}
          className="h-8 w-8 flex items-center justify-center bg-white text-black hover:bg-white/90 transition-colors flex-shrink-0 rounded-lg"
          title="Nouvelle conversation (Ctrl+K)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="h-8 w-8 flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] rounded-lg transition-colors flex-shrink-0"
            title="Masquer la sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {(() => {
          const ORDER: DateGroup[] = ["Épinglées", "Aujourd'hui", "Hier", "7 derniers jours", "Plus ancien"]
          const grouped: Record<DateGroup, Conversation[]> = {
            "Épinglées": [],
            "Aujourd'hui": [],
            "Hier": [],
            "7 derniers jours": [],
            "Plus ancien": [],
          }
          for (const c of filtered) {
            grouped[getDateGroup(c.updatedAt, c.pinned)].push(c)
          }
          const nonEmpty = ORDER.filter((g) => grouped[g].length > 0)
          if (nonEmpty.length === 0) {
            return (
              <div className="px-4 py-8 text-center text-[10px] text-[var(--text-muted)]">
                Aucune conversation
              </div>
            )
          }
          return nonEmpty.map((group) => (
            <div key={group}>
              <div className="px-3 pt-3 pb-1">
                <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{group}</span>
              </div>
              {grouped[group].map((c) => (
                <ConvItem
                  key={c.id}
                  c={c}
                  activeId={activeId}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onPin={onPin}
                  setRenamingId={setRenamingId}
                  setRenameValue={setRenameValue}
                  onRename={onRename}
                />
              ))}
            </div>
          ))
        })()}
      </div>
    </div>
  );
}
