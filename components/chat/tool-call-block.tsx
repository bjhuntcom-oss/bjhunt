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

const TOOL_COLORS: Record<string, string> = {
  bash: "var(--success)",
  http: "#74a4d4",
  nmap: "var(--warning)",
  nuclei: "var(--danger)",
  sqlmap: "var(--danger)",
  cloud: "#a474d4",
  neo4j: "#74d4a4",
};

function getToolIcon(name: string) {
  const key = Object.keys(TOOL_ICONS).find((k) => name.toLowerCase().includes(k));
  return TOOL_ICONS[key || "default"] || Code;
}

function getToolColor(name: string): string {
  const key = Object.keys(TOOL_COLORS).find((k) => name.toLowerCase().includes(k));
  return TOOL_COLORS[key || ""] || "var(--text-muted)";
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
      className="my-2 transition-all duration-200"
      style={isRunning ? {
        background: "rgba(255, 153, 0, 0.04)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 153, 0, 0.2)",
      } : isError ? {
        background: "rgba(255, 68, 68, 0.04)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 68, 68, 0.15)",
      } : {
        background: expanded ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-all duration-200"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
        )}

        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color }} />
        ) : (
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        )}

        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
          {tool.name}
        </span>

        {/* Args preview */}
        {(() => {
          const cmd = tool.args.command;
          if (!cmd) return null;
          const s = String(cmd);
          return (
            <span className="text-[10px] font-mono text-[var(--text-subtle)] truncate max-w-[300px]">
              {s.slice(0, 60)}{s.length > 60 ? "..." : ""}
            </span>
          );
        })()}

        <span className="ml-auto flex items-center gap-2">
          {tool.duration !== undefined && (
            <span className="text-[9px] text-[var(--text-subtle)] font-mono">
              {tool.duration < 1000 ? `${tool.duration}ms` : `${(tool.duration / 1000).toFixed(1)}s`}
            </span>
          )}

          {/* Status icon instead of text badge */}
          {isRunning && (
            <Loader2 className="w-3 h-3 animate-spin text-[var(--warning)]" />
          )}
          {isCompleted && (
            <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
          )}
          {isError && (
            <XCircle className="w-3 h-3 text-[var(--danger)]" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          {/* Args */}
          {Object.keys(tool.args).length > 0 && (
            <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <div className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-subtle)] mb-1">input</div>
              <pre className="text-[10px] font-mono text-[var(--text-muted)] whitespace-pre-wrap overflow-x-auto max-h-[200px] overflow-y-auto">
                {typeof tool.args.command === "string"
                  ? tool.args.command
                  : JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {tool.result && (
            <div className="px-3 py-2">
              <div className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-subtle)] mb-1">output</div>
              <pre className={cn(
                "text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto",
                isError ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
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
