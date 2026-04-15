"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, Globe, Shield, Cloud, Database, Code, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "running" | "completed" | "error";
  duration?: number;
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

  return (
    <div className={cn(
      "my-2 border transition-colors",
      isError ? "border-[var(--danger)]/30" : "border-[var(--border)]",
      expanded && "bg-[var(--bg-input)]"
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-card)] transition-colors"
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
        {tool.args.command && (
          <span className="text-[10px] font-mono text-[var(--text-subtle)] truncate max-w-[300px]">
            {String(tool.args.command).slice(0, 60)}
            {String(tool.args.command).length > 60 ? "..." : ""}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2">
          {tool.duration !== undefined && (
            <span className="text-[9px] text-[var(--text-subtle)]">
              {tool.duration < 1000 ? `${tool.duration}ms` : `${(tool.duration / 1000).toFixed(1)}s`}
            </span>
          )}
          <span className={cn(
            "text-[8px] uppercase tracking-wider px-1.5 py-0.5",
            isRunning && "text-[var(--warning)] bg-[var(--warning-dim)]",
            tool.status === "completed" && "text-[var(--success)] bg-[var(--success-dim)]",
            isError && "text-[var(--danger)] bg-[var(--danger-dim)]"
          )}>
            {isRunning ? "running" : tool.status}
          </span>
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border)]">
          {/* Args */}
          {Object.keys(tool.args).length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border)]/50">
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
