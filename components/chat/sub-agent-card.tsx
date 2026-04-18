"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolCallBlock, type ToolCall } from "./tool-call-block";
import { AgentTransition } from "@/components/ui/agent-transition";

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

/** Normalise an agent name from the stream ("Recon Agent", "recon", "sub_recon") to the upstream id. */
function resolveAgentId(name: string): string {
  const lower = name.toLowerCase();
  const known = [
    'decepticon', 'soundwave', 'recon', 'exploit', 'postexploit', 'analyst',
    'reverser', 'contract_auditor', 'cloud_hunter', 'ad_operator',
    'vulnresearch', 'scanner', 'detector', 'verifier', 'patcher', 'exploiter', 'defender',
  ];
  return known.find((k) => lower.includes(k)) ?? name;
}

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function SubAgentCard({ session }: { session: SubAgentSession }) {
  const [expanded, setExpanded] = useState(session.status === "running");
  const agentId = resolveAgentId(session.name);
  const isRunning = session.status === "running";

  const StatusIcon = isRunning
    ? Loader2
    : session.status === "completed"
    ? CheckCircle2
    : XCircle;

  return (
    <div className="my-3 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--bjhunt-bg-tertiary)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--bjhunt-text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--bjhunt-text-muted)] shrink-0" />
        )}

        <AgentTransition agentId={agentId} variant="pill" />

        {session.description && (
          <span className="text-[10px] text-[var(--bjhunt-text-subtle)] truncate flex-1">
            {session.description}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3 font-mono text-[9px] text-[var(--bjhunt-text-subtle)] tracking-[0.12em]">
          <span>{formatDuration(session.startedAt, session.endedAt)}</span>
          <span>
            {session.toolCalls.length} tool{session.toolCalls.length !== 1 ? "s" : ""}
          </span>
          <StatusIcon
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isRunning && "animate-spin text-[var(--bjhunt-status-warning)]",
              session.status === "completed" && "text-[var(--bjhunt-status-success)]",
              session.status === "error" && "text-[var(--bjhunt-status-danger)]"
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
