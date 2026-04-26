/// <reference lib="dom" />
"use client";

import {
  Terminal,
  Search,
  FileText,
  HelpCircle,
  Scan,
  Trash2,
  Download,
  Bot,
  Cpu,
  Activity,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommand {
  command: string;
  description: string;
  icon: React.ReactNode;
  action?: (context: SlashCommandContext) => void;
}

export interface SlashCommandContext {
  /** Replace the current input value */
  setInput: (value: string) => void;
  /** Send a message to the chat */
  sendMessage: (message: string) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Current messages for export */
  messages: Array<{ role: string; content: string }>;
  /** Current engagement ID if any */
  engagementId?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/help",
    description: "Afficher les commandes disponibles",
    icon: <HelpCircle className="w-3 h-3" />,
    action: (ctx) => {
      const helpText = SLASH_COMMANDS.map(
        (c) => `${c.command} — ${c.description}`,
      ).join("\n");
      ctx.sendMessage(
        `/help\n\nCommandes disponibles :\n${helpText}`,
      );
    },
  },
  {
    command: "/clear",
    description: "Effacer les messages du chat",
    icon: <Trash2 className="w-3 h-3" />,
    action: (ctx) => {
      ctx.clearMessages();
    },
  },
  {
    command: "/export",
    description: "Exporter la conversation en markdown",
    icon: <Download className="w-3 h-3" />,
    action: (ctx) => {
      const md = ctx.messages
        .map((m) => `### ${m.role === "user" ? "Vous" : "BJHUNT"}\n\n${m.content}`)
        .join("\n\n---\n\n");
      const blob = new Blob(
        [`# Conversation BJHUNT\n\n${md}`],
        { type: "text/markdown" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bjhunt-conversation-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      ctx.setInput("");
    },
  },
  {
    command: "/agents",
    description: "Lister les agents disponibles",
    icon: <Bot className="w-3 h-3" />,
    action: (ctx) => {
      ctx.sendMessage(
        "/agents\n\nAgents BJHUNT disponibles :\n" +
          "1. BJHUNT — Orchestrateur principal\n" +
          "2. Soundwave — Planification d'engagement\n" +
          "3. Recon — OSINT et enumeration\n" +
          "4. Exploit — Exploitation de vulnerabilites\n" +
          "5. PostExploit — Post-exploitation et mouvement lateral\n" +
          "6. Analyst — Analyse de code et CVE\n" +
          "7. Reverser — Reverse engineering\n" +
          "8. Contract Auditor — Audit smart contracts\n" +
          "9. Cloud Hunter — Securite cloud\n" +
          "10. AD Operator — Active Directory\n" +
          "11. VulnResearch — Recherche de vulnerabilites\n" +
          "12. Scanner — Scan automatise\n" +
          "13. Detector — Detection de vulnerabilites\n" +
          "14. Verifier — Verification de vulnerabilites\n" +
          "15. Patcher — Generation de patchs\n" +
          "16. Exploiter — Generation d'exploits\n" +
          "17. Defender — Defense et remediation",
      );
    },
  },
  {
    command: "/model",
    description: "Afficher / changer le modele IA actuel",
    icon: <Cpu className="w-3 h-3" />,
    action: (ctx) => {
      ctx.sendMessage("/model\n\nAffichage du modele actuel...");
    },
  },
  {
    command: "/status",
    description: "Afficher le statut de l'engagement en cours",
    icon: <Activity className="w-3 h-3" />,
    action: (ctx) => {
      if (ctx.engagementId) {
        ctx.sendMessage(
          `/status\n\nStatut de l'engagement ${ctx.engagementId}...`,
        );
      } else {
        ctx.sendMessage(
          "/status\n\nAucun engagement actif. Lancez un scan pour commencer.",
        );
      }
    },
  },
  {
    command: "/findings",
    description: "Resume des findings de l'engagement en cours",
    icon: <Shield className="w-3 h-3" />,
    action: (ctx) => {
      if (ctx.engagementId) {
        ctx.sendMessage(
          `/findings\n\nChargement des findings pour l'engagement ${ctx.engagementId}...`,
        );
      } else {
        ctx.sendMessage(
          "/findings\n\nAucun engagement actif. Lancez un scan pour voir les findings.",
        );
      }
    },
  },
  {
    command: "/scan",
    description: "Lancer un scan de securite",
    icon: <Scan className="w-3 h-3" />,
  },
  {
    command: "/report",
    description: "Generer un rapport de vulnerabilites",
    icon: <FileText className="w-3 h-3" />,
  },
  {
    command: "/search",
    description: "Rechercher dans la base CVE",
    icon: <Search className="w-3 h-3" />,
  },
  {
    command: "/terminal",
    description: "Mode terminal interactif",
    icon: <Terminal className="w-3 h-3" />,
  },
];

interface SlashCommandsProps {
  query: string;
  activeIndex?: number;
  onSelect: (command: string) => void;
  onHover?: (index: number) => void;
}

export function SlashCommandsMenu({ query, activeIndex = 0, onSelect, onHover }: SlashCommandsProps) {
  const filtered = SLASH_COMMANDS.filter((c) =>
    c.command.includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-md)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
      <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--bjhunt-border)]">
        <span className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">Commandes</span>
        <span className="font-mono text-[11px] text-[var(--bjhunt-text-muted)]">↑↓ naviguer · Enter sélectionner · Esc fermer</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {filtered.map((cmd, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={cmd.command}
              onClick={() => onSelect(cmd.command + " ")}
              onMouseEnter={() => onHover?.(i)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left border-l-2 border-b border-b-[var(--bjhunt-border)] last:border-b-0",
                isActive
                  ? "bg-white/[0.04] border-l-[var(--state-success)]"
                  : "border-l-transparent hover:bg-white/[0.04]"
              )}
            >
              <span className={cn(
                "transition-colors flex-shrink-0",
                isActive ? "text-[var(--state-success)]" : "text-[var(--bjhunt-text-muted)]"
              )}>
                {cmd.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn(
                  "font-mono text-[13px]",
                  isActive ? "text-[var(--bjhunt-text)]" : "text-[var(--bjhunt-text)]"
                )}>
                  {cmd.command}
                </div>
                <div className="font-sans text-[13px] text-[var(--bjhunt-text-muted)] truncate">{cmd.description}</div>
              </div>
              {isActive && (
                <span className="font-mono text-[11px] text-[var(--bjhunt-text-muted)] flex-shrink-0">
                  ↵
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
