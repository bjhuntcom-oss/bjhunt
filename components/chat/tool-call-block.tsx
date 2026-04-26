"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, Globe, Shield, Cloud, Database, Code, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "running" | "completed" | "error";
  duration?: number;
  /** Assistant message this tool call belongs to, so prior-turn tools stay visible. */
  messageId?: string;
}

const TOOL_ICONS: Record<string, typeof Terminal> = {
  bash: Terminal,
  http: Globe,
  nmap: Shield,
  nuclei: Shield,
  sqlmap: Shield,
  cloud: Cloud,
  neo4j: Database,
  default: Code,
};

// Tool → tri-state mapping (refonte 2026 §1).
// Maps each tool to its MITRE-relative risk profile so we can express tool
// chrome with the 3-state system instead of bespoke hex.
//   bash, neo4j  → success (low impact / introspection / shell)
//   http, cloud  → success (read traffic / cloud enumeration is recon)
//   nmap         → warning (active scanning, likely tripwire)
//   nuclei,sqlmap→ critical (active exploit attempts)
const TOOL_COLORS: Record<string, string> = {
  bash:   "var(--state-success)",
  http:   "var(--state-success)",
  nmap:   "var(--state-warning)",
  nuclei: "var(--state-critical)",
  sqlmap: "var(--state-critical)",
  cloud:  "var(--state-success)",
  neo4j:  "var(--state-success)",
};

function getToolIcon(name: string) {
  const key = Object.keys(TOOL_ICONS).find((k) => name.toLowerCase().includes(k));
  return TOOL_ICONS[key || "default"] || Code;
}

function getToolColor(name: string): string {
  const key = Object.keys(TOOL_COLORS).find((k) => name.toLowerCase().includes(k));
  return TOOL_COLORS[key || ""] || "var(--bjhunt-text-muted)";
}

export function ToolCallBlock({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getToolIcon(tool.name);
  const color = getToolColor(tool.name);
  const isRunning = tool.status === "running" || tool.status === "pending";
  const isError = tool.status === "error";
  const isCompleted = tool.status === "completed";

  return (
    <div
      className={cn(
        "my-2 transition-colors rounded-[var(--bjhunt-radius)] border",
        isRunning && "bg-[var(--state-warning-tint)] border-[var(--state-warning)]",
        isError && "bg-[var(--state-critical-tint)] border-[var(--state-critical)]",
        !isRunning && !isError && "bg-[var(--bjhunt-bg-surface)] border-[var(--bjhunt-border)]"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors rounded-[var(--bjhunt-radius)]"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--bjhunt-text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--bjhunt-text-muted)] shrink-0" />
        )}

        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color }} />
        ) : (
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        )}

        <span className="font-mono font-semibold text-[12px] uppercase tracking-[0.18em]" style={{ color }}>
          {tool.name}
        </span>

        {/* Args preview */}
        {(() => {
          const cmd = tool.args.command;
          if (!cmd) return null;
          const s = String(cmd);
          return (
            <span className="font-mono text-[12px] text-[var(--bjhunt-text-muted)] truncate max-w-[300px]">
              {s.slice(0, 60)}{s.length > 60 ? "..." : ""}
            </span>
          );
        })()}

        <span className="ml-auto flex items-center gap-2">
          {tool.duration !== undefined && (
            <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
              {tool.duration < 1000 ? `${tool.duration}ms` : `${(tool.duration / 1000).toFixed(1)}s`}
            </span>
          )}

          {/* Status icon instead of text badge */}
          {isRunning && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--state-warning)]" />
          )}
          {isCompleted && (
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--state-success)]" />
          )}
          {isError && (
            <XCircle className="w-3.5 h-3.5 text-[var(--state-critical)]" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--bjhunt-border)]">
          {/* Args */}
          {Object.keys(tool.args).length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--bjhunt-border)]">
              <div className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] mb-1">input</div>
              <pre className="font-mono text-[12px] text-[var(--bjhunt-text)] whitespace-pre-wrap overflow-x-auto max-h-[200px] overflow-y-auto">
                {typeof tool.args.command === "string"
                  ? tool.args.command
                  : JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {tool.result && (
            <div className="px-3 py-2">
              <div className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] mb-1">output</div>
              <pre className={cn(
                "font-mono text-[12px] whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto",
                isError ? "text-[var(--state-critical)]" : "text-[var(--bjhunt-text)]"
              )}>
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
