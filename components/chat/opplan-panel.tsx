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

// MITRE ATT&CK tactic → tri-state colour mapping (refonte 2026 §1).
//
//   success  (emerald) → recon-only / passive observation phases that produce
//                        intelligence without altering the target.
//                        reconnaissance, discovery
//
//   warning  (amber)   → "we have a foothold" phases — active but not yet
//                        catastrophic, or recoverable.
//                        initial_access, persistence, lateral_movement,
//                        collection
//
//   critical (coral)   → high-impact phases that change blast radius:
//                        code execution, escalation, credentials, evasion,
//                        exfiltration, destructive impact.
//                        execution, privilege_escalation, defense_evasion,
//                        credential_access, exfiltration, impact
const PHASE_COLORS: Record<string, string> = {
  reconnaissance:        "var(--state-success)",
  initial_access:        "var(--state-warning)",
  execution:             "var(--state-critical)",
  persistence:           "var(--state-warning)",
  privilege_escalation:  "var(--state-critical)",
  defense_evasion:       "var(--state-critical)",
  credential_access:     "var(--state-critical)",
  discovery:             "var(--state-success)",
  lateral_movement:      "var(--state-warning)",
  collection:            "var(--state-warning)",
  exfiltration:          "var(--state-critical)",
  impact:                "var(--state-critical)",
};

function StatusIcon({ status }: { status: Objective["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--state-success)]" />;
    case "active":
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--state-warning)]" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-[var(--state-critical)]" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-[var(--bjhunt-text-muted)]" />;
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
    <div className={cn("border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] rounded-[var(--bjhunt-radius-md)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--bjhunt-border)]">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
          <span className="font-mono font-semibold text-[12px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
            OPPLAN
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
          <span>{completed}/{total} complete</span>
          {active > 0 && (
            <span className="text-[var(--state-warning)]">{active} active</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-[var(--bjhunt-border)]">
        <div
          className="h-full bg-[var(--state-success)] transition-all duration-500"
          style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
        />
      </div>

      {/* Phases */}
      <div className="max-h-[400px] overflow-y-auto">
        {sortedPhases.map(([phase, objs]) => {
          const isCollapsed = collapsed.has(phase);
          const phaseColor = PHASE_COLORS[phase] || "var(--bjhunt-text-muted)";
          const phaseComplete = objs.filter((o) => o.status === "completed").length;

          return (
            <div key={phase} className="border-b border-[var(--bjhunt-border)] last:border-b-0">
              <button
                onClick={() => togglePhase(phase)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-[var(--bjhunt-text-muted)]" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-[var(--bjhunt-text-muted)]" />
                )}
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phaseColor }} />
                <span className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em]" style={{ color: phaseColor }}>
                  {phase.replace(/_/g, " ")}
                </span>
                <span className="ml-auto font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
                  {phaseComplete}/{objs.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="pl-7 pr-3 pb-1.5 space-y-0.5">
                  {objs.map((obj) => (
                    <div key={obj.id} className="flex items-start gap-2 py-0.5">
                      <StatusIcon status={obj.status} />
                      <div className="min-w-0">
                        <div className="font-sans text-[12px] text-[var(--bjhunt-text)] leading-tight">
                          {obj.title}
                        </div>
                        {obj.mitre && (
                          <span className="font-mono text-[11px] text-[var(--bjhunt-text-muted)]">
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
