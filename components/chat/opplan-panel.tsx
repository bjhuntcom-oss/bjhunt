"use client";

import { useState } from "react";
import { Target, ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Objective {
  id: string;
  title: string;
  description?: string;
  phase: string;
  status: "pending" | "active" | "completed" | "failed";
  parentId?: string;
  mitre?: string;
}

interface OpplanPanelProps {
  objectives: Objective[];
  className?: string;
}

const PHASE_ORDER = [
  "reconnaissance",
  "initial_access",
  "execution",
  "persistence",
  "privilege_escalation",
  "defense_evasion",
  "credential_access",
  "discovery",
  "lateral_movement",
  "collection",
  "exfiltration",
  "impact",
];

const PHASE_COLORS: Record<string, string> = {
  reconnaissance: "#74a4d4",
  initial_access: "var(--warning)",
  execution: "var(--danger)",
  persistence: "#d4a574",
  privilege_escalation: "#d474a4",
  defense_evasion: "#a474d4",
  credential_access: "var(--danger)",
  discovery: "#74a4d4",
  lateral_movement: "var(--warning)",
  collection: "#a4d474",
  exfiltration: "var(--danger)",
  impact: "var(--danger)",
};

function StatusIcon({ status }: { status: Objective["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />;
    case "active":
      return <Loader2 className="w-3 h-3 animate-spin text-[var(--warning)]" />;
    case "failed":
      return <XCircle className="w-3 h-3 text-[var(--danger)]" />;
    default:
      return <Circle className="w-3 h-3 text-[var(--text-subtle)]" />;
  }
}

export function OpplanPanel({ objectives, className }: OpplanPanelProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Group by phase
  const phases = new Map<string, Objective[]>();
  for (const obj of objectives) {
    const phase = obj.phase || "unclassified";
    if (!phases.has(phase)) phases.set(phase, []);
    phases.get(phase)!.push(obj);
  }

  // Sort phases by kill chain order
  const sortedPhases = [...phases.entries()].sort(([a], [b]) => {
    const ia = PHASE_ORDER.indexOf(a);
    const ib = PHASE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const total = objectives.length;
  const completed = objectives.filter((o) => o.status === "completed").length;
  const active = objectives.filter((o) => o.status === "active").length;

  function togglePhase(phase: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  return (
    <div className={cn("border border-[var(--border)] bg-[var(--bg-input)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            OPPLAN
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-[var(--text-subtle)]">
          <span>{completed}/{total} complete</span>
          {active > 0 && (
            <span className="text-[var(--warning)]">{active} active</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-[var(--border)]">
        <div
          className="h-full bg-[var(--success)] transition-all duration-500"
          style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
        />
      </div>

      {/* Phases */}
      <div className="max-h-[400px] overflow-y-auto">
        {sortedPhases.map(([phase, objs]) => {
          const isCollapsed = collapsed.has(phase);
          const phaseColor = PHASE_COLORS[phase] || "var(--text-muted)";
          const phaseComplete = objs.filter((o) => o.status === "completed").length;

          return (
            <div key={phase} className="border-b border-[var(--border)]/30 last:border-b-0">
              <button
                onClick={() => togglePhase(phase)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-card)] transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                ) : (
                  <ChevronDown className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                )}
                <div className="w-1.5 h-1.5" style={{ backgroundColor: phaseColor }} />
                <span className="text-[9px] uppercase tracking-wider" style={{ color: phaseColor }}>
                  {phase.replace(/_/g, " ")}
                </span>
                <span className="ml-auto text-[8px] text-[var(--text-subtle)]">
                  {phaseComplete}/{objs.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="pl-7 pr-3 pb-1.5 space-y-0.5">
                  {objs.map((obj) => (
                    <div key={obj.id} className="flex items-start gap-2 py-0.5">
                      <StatusIcon status={obj.status} />
                      <div className="min-w-0">
                        <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                          {obj.title}
                        </div>
                        {obj.mitre && (
                          <span className="text-[8px] text-[var(--text-subtle)] font-mono">
                            {obj.mitre}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
