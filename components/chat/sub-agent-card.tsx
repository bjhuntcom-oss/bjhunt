"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Bot, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolCallBlock, type ToolCall } from "./tool-call-block";

export interface SubAgentSession {
  id: string;
  name: string;
  description?: string;
  status: "running" | "completed" | "error";
  startedAt: string;
  endedAt?: string;
  toolCalls: ToolCall[];
  messages: Array<{ role: string; content: string }>;
}

const AGENT_COLORS: Record<string, string> = {
  recon: "#74a4d4",
  exploit: "var(--danger)",
  postexploit: "var(--warning)",
  analyst: "#a474d4",
  reverser: "#d4a574",
  cloud_hunter: "#74d4a4",
  ad_operator: "#d474a4",
  contract_auditor: "#a4d474",
  soundwave: "var(--text-muted)",
  scanner: "#74a4d4",
  detector: "var(--warning)",
  verifier: "var(--success)",
  patcher: "#a474d4",
  exploiter: "var(--danger)",
  defender: "var(--success)",
};

function agentColor(name: string): string {
  const key = Object.keys(AGENT_COLORS).find((k) => name.toLowerCase().includes(k));
  return AGENT_COLORS[key || ""] || "var(--text-muted)";
}

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function SubAgentCard({ session }: { session: SubAgentSession }) {
  const [expanded, setExpanded] = useState(session.status === "running");
  const color = agentColor(session.name);
  const isRunning = session.status === "running";

  const StatusIcon = isRunning
    ? Loader2
    : session.status === "completed"
    ? CheckCircle2
    : XCircle;

  return (
    <div className="my-3 border border-[var(--border)] bg-[var(--bg-input)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-card)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
        )}

        <Bot className="w-4 h-4 shrink-0" style={{ color }} />

        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
            {session.name}
          </span>
          {session.description && (
            <span className="text-[9px] text-[var(--text-subtle)] truncate">
              {session.description}
            </span>
          )}
        </div>

        <span className="ml-auto flex items-center gap-2">
          <span className="text-[9px] text-[var(--text-subtle)]">
            {formatDuration(session.startedAt, session.endedAt)}
          </span>
          <span className="text-[9px] text-[var(--text-subtle)]">
            {session.toolCalls.length} tool{session.toolCalls.length !== 1 ? "s" : ""}
          </span>
          <StatusIcon
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isRunning && "animate-spin text-[var(--warning)]",
              session.status === "completed" && "text-[var(--success)]",
              session.status === "error" && "text-[var(--danger)]"
            )}
          />
        </span>
      </button>

      {/* Expanded: tool calls + messages */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-3 py-2 space-y-1">
          {session.toolCalls.map((tc) => (
            <ToolCallBlock key={tc.id} tool={tc} />
          ))}

          {session.messages
            .filter((m) => m.role === "assistant" && m.content)
            .map((m, i) => (
              <div key={i} className="px-2 py-1.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                {m.content.slice(0, 500)}
                {m.content.length > 500 ? "..." : ""}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
