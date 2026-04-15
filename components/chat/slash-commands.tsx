/// <reference lib="dom" />
"use client";

import { Terminal, Search, FileText, HelpCircle, Scan } from "lucide-react";

export interface SlashCommand {
  command: string;
  description: string;
  icon: React.ReactNode;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/scan",     description: "Lancer un scan de sécurité",        icon: <Scan className="w-3 h-3" /> },
  { command: "/report",   description: "Générer un rapport de vulnérabilités", icon: <FileText className="w-3 h-3" /> },
  { command: "/search",   description: "Rechercher dans la base CVE",         icon: <Search className="w-3 h-3" /> },
  { command: "/terminal", description: "Mode terminal interactif",            icon: <Terminal className="w-3 h-3" /> },
  { command: "/help",     description: "Afficher l'aide BJHUNT",              icon: <HelpCircle className="w-3 h-3" /> },
];

interface SlashCommandsProps {
  query: string;
  onSelect: (command: string) => void;
}

export function SlashCommandsMenu({ query, onSelect }: SlashCommandsProps) {
  const filtered = SLASH_COMMANDS.filter((c) =>
    c.command.includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-card)] border border-[var(--border)] shadow-xl z-50">
      <div className="px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Commandes</span>
      </div>
      {filtered.map((cmd) => (
        <button
          key={cmd.command}
          onClick={() => onSelect(cmd.command + " ")}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-input)] transition-colors text-left"
        >
          <span className="text-[var(--success)]">{cmd.icon}</span>
          <div>
            <div className="text-[11px] text-white font-mono">{cmd.command}</div>
            <div className="text-[9px] text-[var(--text-muted)]">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
