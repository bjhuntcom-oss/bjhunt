"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  Swords,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { browserBackendFetch } from "@/lib/backend-client";

// ── Types ────────────────────────────────────────────────────────────────

interface VaccineStatus {
  phase: "idle" | "attack" | "brief_generation" | "defense" | "verification" | "complete";
  iteration: number;
  maxIterations: number;
  findings: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  defensesApplied: number;
  defensesVerified: number;
  defensesFailed: number;
  currentFinding: string | null;
  currentAgent: string | null;
  startedAt: string | null;
  history: VaccineHistoryEntry[];
}

interface VaccineHistoryEntry {
  timestamp: string;
  phase: string;
  action: string;
  result: "finding" | "success" | "failure" | "info";
  severity?: string;
}

interface VaccineMonitorProps {
  engagementId: string;
  compact?: boolean;
}

// ── Phase definitions ────────────────────────────────────────────────────

const PHASES = [
  { key: "attack", label: "ATTACK", icon: Swords },
  { key: "brief_generation", label: "BRIEF", icon: FileText },
  { key: "defense", label: "DEFENSE", icon: Shield },
  { key: "verification", label: "VERIFY", icon: ShieldCheck },
] as const;

type PhaseKey = (typeof PHASES)[number]["key"];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--danger)",
  high: "#f97316",
  medium: "var(--warning)",
  low: "#60a5fa",
  info: "var(--text-muted)",
};

const RESULT_COLORS: Record<string, string> = {
  finding: "var(--warning)",
  success: "var(--success)",
  failure: "var(--danger)",
  info: "var(--text-muted)",
};

const DEFAULT_STATUS: VaccineStatus = {
  phase: "idle",
  iteration: 0,
  maxIterations: 0,
  findings: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  defensesApplied: 0,
  defensesVerified: 0,
  defensesFailed: 0,
  currentFinding: null,
  currentAgent: null,
  startedAt: null,
  history: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────

function getPhaseState(
  phaseKey: PhaseKey,
  currentPhase: VaccineStatus["phase"]
): "completed" | "active" | "pending" {
  if (currentPhase === "idle") return "pending";
  if (currentPhase === "complete") return "completed";

  const phaseOrder: PhaseKey[] = ["attack", "brief_generation", "defense", "verification"];
  const currentIdx = phaseOrder.indexOf(currentPhase as PhaseKey);
  const thisIdx = phaseOrder.indexOf(phaseKey);

  if (thisIdx < currentIdx) return "completed";
  if (thisIdx === currentIdx) return "active";
  return "pending";
}

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return "--:--";
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Phase Bar ────────────────────────────────────────────────────────────

function PhaseBar({ status }: { status: VaccineStatus }) {
  return (
    <div className="flex items-center gap-0">
      {PHASES.map((phase, idx) => {
        const state = getPhaseState(phase.key, status.phase);
        const Icon = phase.icon;

        return (
          <div key={phase.key} className="flex items-center">
            {/* Connector line */}
            {idx > 0 && (
              <div
                className="w-4 md:w-6 h-px mx-0.5"
                style={{
                  background:
                    state === "pending"
                      ? "var(--border)"
                      : "var(--success)",
                  ...(state === "pending"
                    ? {
                        backgroundImage:
                          "repeating-linear-gradient(90deg, var(--border) 0, var(--border) 3px, transparent 3px, transparent 6px)",
                        backgroundSize: "6px 1px",
                        backgroundColor: "transparent",
                      }
                    : {}),
                }}
              />
            )}

            {/* Phase node */}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center border transition-all",
                  state === "active" &&
                    "border-[var(--warning)] bg-[var(--warning-dim)]",
                  state === "completed" &&
                    "border-[var(--success)] bg-[var(--success-dim)]",
                  state === "pending" &&
                    "border-[var(--border)] bg-[var(--bg-card)]"
                )}
                style={
                  state === "active"
                    ? { animation: "pulse-dot 2s ease-in-out infinite" }
                    : undefined
                }
              >
                {state === "completed" ? (
                  <CheckCircle2
                    className="w-3 h-3"
                    style={{ color: "var(--success)" }}
                  />
                ) : state === "active" ? (
                  <Loader2
                    className="w-3 h-3 animate-spin"
                    style={{ color: "var(--warning)" }}
                  />
                ) : (
                  <Icon
                    className="w-3 h-3"
                    style={{ color: "var(--text-subtle)" }}
                  />
                )}
              </div>
              <span
                className="text-[7px] uppercase tracking-widest font-mono"
                style={{
                  color:
                    state === "active"
                      ? "var(--warning)"
                      : state === "completed"
                        ? "var(--success)"
                        : "var(--text-subtle)",
                }}
              >
                {phase.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stats Row ────────────────────────────────────────────────────────────

function StatsRow({
  status,
  elapsed,
}: {
  status: VaccineStatus;
  elapsed: string;
}) {
  const { findings, defensesApplied, defensesVerified, defensesFailed } = status;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Iteration */}
      <StatItem
        label="Iteration"
        value={`${status.iteration}/${status.maxIterations}`}
        color="var(--text-muted)"
      />

      {/* Findings */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] font-mono">
          Findings
        </span>
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          {findings.total}
        </span>
        {findings.total > 0 && (
          <div className="flex items-center gap-0.5 ml-0.5">
            {findings.critical > 0 && (
              <SeverityPill count={findings.critical} color={SEVERITY_COLORS.critical} label="C" />
            )}
            {findings.high > 0 && (
              <SeverityPill count={findings.high} color={SEVERITY_COLORS.high} label="H" />
            )}
            {findings.medium > 0 && (
              <SeverityPill count={findings.medium} color={SEVERITY_COLORS.medium} label="M" />
            )}
            {findings.low > 0 && (
              <SeverityPill count={findings.low} color={SEVERITY_COLORS.low} label="L" />
            )}
            {findings.info > 0 && (
              <SeverityPill count={findings.info} color={SEVERITY_COLORS.info} label="I" />
            )}
          </div>
        )}
      </div>

      {/* Defenses */}
      <StatItem
        label="Defenses"
        value={String(defensesApplied)}
        color="var(--text-muted)"
      />

      {/* Verified */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] font-mono">
          Verified
        </span>
        <span className="text-[10px] font-mono" style={{ color: "var(--success)" }}>
          {defensesVerified}
        </span>
        {defensesFailed > 0 && (
          <span className="text-[10px] font-mono" style={{ color: "var(--danger)" }}>
            /{defensesFailed}
          </span>
        )}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 ml-auto">
        <Clock className="w-2.5 h-2.5" style={{ color: "var(--text-subtle)" }} />
        <span className="text-[9px] font-mono text-[var(--text-muted)]">
          {elapsed}
        </span>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] font-mono">
        {label}
      </span>
      <span className="text-[10px] font-mono" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function SeverityPill({
  count,
  color,
  label,
}: {
  count: number;
  color: string;
  label: string;
}) {
  return (
    <span
      className="text-[7px] font-mono px-1 py-px border"
      style={{ color, borderColor: color + "40" }}
    >
      {count}{label}
    </span>
  );
}

// ── Current Activity ─────────────────────────────────────────────────────

function CurrentActivity({ status }: { status: VaccineStatus }) {
  if (status.phase === "idle" || status.phase === "complete") return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)]">
      <Activity
        className="w-3 h-3 flex-shrink-0"
        style={{ color: "var(--warning)" }}
      />
      <div className="min-w-0 flex-1">
        {status.currentFinding && (
          <span className="text-[10px] font-mono text-[var(--text-muted)] truncate block">
            {status.currentFinding}
          </span>
        )}
        {!status.currentFinding && (
          <span className="text-[10px] font-mono text-[var(--text-subtle)] italic">
            Processing...
          </span>
        )}
      </div>
      {status.currentAgent && (
        <span className="text-[8px] font-mono uppercase tracking-wider text-[var(--warning)] flex-shrink-0">
          {status.currentAgent}
        </span>
      )}
      <Loader2
        className="w-2.5 h-2.5 animate-spin flex-shrink-0"
        style={{ color: "var(--warning)" }}
      />
    </div>
  );
}

// ── History Log ──────────────────────────────────────────────────────────

function HistoryLog({ history }: { history: VaccineHistoryEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[9px] font-mono text-[var(--text-subtle)]">
        No activity yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[160px] overflow-y-auto"
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-left px-2 py-1">
              Time
            </th>
            <th className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-left px-2 py-1">
              Phase
            </th>
            <th className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-left px-2 py-1">
              Action
            </th>
            <th className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-left px-2 py-1">
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {history.slice(-10).map((entry, idx) => (
            <tr
              key={idx}
              className="border-b border-[var(--border)]/20 hover:bg-[var(--bg-card)] transition-colors"
            >
              <td className="text-[8px] font-mono text-[var(--text-subtle)] px-2 py-1 whitespace-nowrap">
                {formatTime(entry.timestamp)}
              </td>
              <td className="text-[8px] font-mono uppercase text-[var(--text-muted)] px-2 py-1 whitespace-nowrap">
                {entry.phase.replace(/_/g, " ")}
              </td>
              <td className="text-[9px] font-mono text-[var(--text-muted)] px-2 py-1 max-w-[200px] truncate">
                {entry.action}
              </td>
              <td className="px-2 py-1">
                <span
                  className="text-[7px] font-mono uppercase tracking-wider px-1 py-px border"
                  style={{
                    color: RESULT_COLORS[entry.result] || "var(--text-muted)",
                    borderColor: (RESULT_COLORS[entry.result] || "var(--text-muted)") + "40",
                  }}
                >
                  {entry.result}
                </span>
                {entry.severity && (
                  <span
                    className="text-[7px] font-mono uppercase ml-1"
                    style={{
                      color: SEVERITY_COLORS[entry.severity] || "var(--text-muted)",
                    }}
                  >
                    {entry.severity}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export function VaccineMonitor({ engagementId, compact = false }: VaccineMonitorProps) {
  const [status, setStatus] = useState<VaccineStatus>(DEFAULT_STATUS);
  const [elapsed, setElapsed] = useState("--:--");
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await browserBackendFetch(
        `/api/engagements/${engagementId}/vaccine-status`
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently ignore — endpoint may not exist yet
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  // Update elapsed timer every second
  useEffect(() => {
    elapsedRef.current = setInterval(() => {
      setElapsed(formatElapsed(status.startedAt));
    }, 1000);
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [status.startedAt]);

  // Don't render when idle and no data
  if (status.phase === "idle" && status.iteration === 0 && !loading) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex items-center justify-center">
        <Loader2 className="w-3 h-3 animate-spin text-[var(--text-subtle)]" />
        <span className="ml-2 text-[9px] font-mono text-[var(--text-subtle)]">
          Loading vaccine status...
        </span>
      </div>
    );
  }

  // ── Compact mode ─────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="border border-[var(--border)] bg-[var(--bg-input)]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Vaccine Loop
            </span>
          </div>
          <span
            className="text-[8px] font-mono uppercase tracking-wider px-1 py-px border"
            style={{
              color:
                status.phase === "complete"
                  ? "var(--success)"
                  : status.phase === "idle"
                    ? "var(--text-subtle)"
                    : "var(--warning)",
              borderColor:
                status.phase === "complete"
                  ? "var(--success)"
                  : status.phase === "idle"
                    ? "var(--text-subtle)"
                    : "var(--warning)",
            }}
          >
            {status.phase === "complete"
              ? "done"
              : status.phase === "idle"
                ? "idle"
                : "running"}
          </span>
        </div>

        {/* Phase bar */}
        <div className="px-3 py-2 flex justify-center">
          <PhaseBar status={status} />
        </div>

        {/* Stats */}
        <div className="px-3 py-1.5 border-t border-[var(--border)]">
          <StatsRow status={status} elapsed={elapsed} />
        </div>
      </div>
    );
  }

  // ── Full mode ──────────────────────────────────────────────────────────
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Vaccine Loop Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status.phase !== "idle" && status.phase !== "complete" && (
            <span className="status-dot" />
          )}
          <span
            className="text-[9px] font-mono uppercase tracking-wider"
            style={{
              color:
                status.phase === "complete"
                  ? "var(--success)"
                  : status.phase === "idle"
                    ? "var(--text-subtle)"
                    : "var(--warning)",
            }}
          >
            {status.phase === "complete"
              ? "complete"
              : status.phase === "idle"
                ? "idle"
                : status.phase.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Phase progress bar */}
      <div className="px-4 py-3 flex justify-center border-b border-[var(--border)]">
        <PhaseBar status={status} />
      </div>

      {/* Stats row */}
      <div className="px-4 py-2 border-b border-[var(--border)]">
        <StatsRow status={status} elapsed={elapsed} />
      </div>

      {/* Current activity */}
      {status.phase !== "idle" && status.phase !== "complete" && (
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <CurrentActivity status={status} />
        </div>
      )}

      {/* History log */}
      <div>
        <div className="px-4 py-1.5 border-b border-[var(--border)]">
          <span className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] font-mono">
            Activity Log
          </span>
        </div>
        <HistoryLog history={status.history} />
      </div>
    </div>
  );
}
