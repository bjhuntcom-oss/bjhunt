"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  GripVertical,
  Target,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { browserBackendFetch } from "@/lib/backend-client";

// ── Types ────────────────────────────────────────────────────────────────

interface OpplanObjective {
  id: string;
  title: string;
  description?: string;
  phase: string;
  status: "pending" | "in_progress" | "passed" | "blocked";
  agent?: string;
  mitre?: string[];
  timeEstimate?: string;
}

interface EngagementSummary {
  id: string;
  name: string;
  status: string;
}

// ── Agent category colors ────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  decepticon: "var(--warning)",
  soundwave: "#74a4d4",
  recon: "#74a4d4",
  exploit: "var(--danger)",
  postexploit: "var(--danger)",
  analyst: "#a4d474",
  reverser: "#d4a574",
  "contract auditor": "#d474a4",
  "cloud hunter": "#60a5fa",
  "ad operator": "#a474d4",
  vulnresearch: "var(--warning)",
  scanner: "#74a4d4",
  detector: "#a4d474",
  verifier: "var(--success)",
  patcher: "var(--success)",
  exploiter: "var(--danger)",
  defender: "var(--success)",
  bjhunt: "var(--success)",
};

function agentDotColor(agent?: string): string {
  if (!agent) return "var(--text-subtle)";
  const key = agent.toLowerCase();
  return AGENT_COLORS[key] ?? "var(--text-muted)";
}

// ── Column definitions ───────────────────────────────────────────────────

const COLUMNS: {
  key: OpplanObjective["status"];
  label: string;
  color: string;
  bgDim: string;
}[] = [
  {
    key: "pending",
    label: "PENDING",
    color: "var(--text-muted)",
    bgDim: "rgba(102,102,102,0.08)",
  },
  {
    key: "in_progress",
    label: "IN PROGRESS",
    color: "var(--warning)",
    bgDim: "rgba(255,153,0,0.08)",
  },
  {
    key: "passed",
    label: "PASSED",
    color: "var(--success)",
    bgDim: "rgba(0,204,138,0.08)",
  },
  {
    key: "blocked",
    label: "BLOCKED",
    color: "var(--danger)",
    bgDim: "rgba(255,68,68,0.08)",
  },
];

// ── Objective card ───────────────────────────────────────────────────────

function ObjectiveCard({ obj }: { obj: OpplanObjective }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)] p-3 mb-2 hover:border-[var(--border-strong)] transition-colors group">
      {/* Drag handle + phase */}
      <div className="flex items-center gap-2 mb-1.5">
        <GripVertical className="w-3 h-3 text-[var(--text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] truncate">
          {obj.phase.replace(/_/g, " ")}
        </span>
      </div>

      {/* Title */}
      <div className="text-[11px] font-mono font-bold text-white leading-tight mb-1">
        {obj.title}
      </div>

      {/* Description — truncated to 2 lines */}
      {obj.description && (
        <p className="text-[10px] font-mono text-[var(--text-muted)] leading-snug mb-2 line-clamp-2">
          {obj.description}
        </p>
      )}

      {/* Agent */}
      {obj.agent && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div
            className="w-1.5 h-1.5 flex-shrink-0"
            style={{ backgroundColor: agentDotColor(obj.agent) }}
          />
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {obj.agent}
          </span>
        </div>
      )}

      {/* Bottom row: MITRE tags + time estimate */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {obj.mitre?.map((t) => (
          <span
            key={t}
            className="text-[8px] font-mono px-1.5 py-0.5 border border-[var(--border)] text-[var(--text-subtle)] uppercase tracking-wider"
          >
            {t}
          </span>
        ))}
        {obj.timeEstimate && (
          <span className="text-[8px] font-mono text-[var(--text-subtle)] ml-auto">
            {obj.timeEstimate}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function OpplanPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [objectives, setObjectives] = useState<OpplanObjective[]>([]);
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [opplanRes, engRes] = await Promise.all([
          browserBackendFetch(`/api/engagements/${id}/opplan`),
          browserBackendFetch(`/api/engagements/${id}`),
        ]);

        if (cancelled) return;

        if (!opplanRes.ok) {
          setError("Failed to load OPPLAN data");
          setLoading(false);
          return;
        }

        const opplanData = await opplanRes.json();
        setObjectives(opplanData.objectives ?? []);

        if (engRes.ok) {
          const engData = await engRes.json();
          setEngagement(engData.engagement ?? null);
        }
      } catch {
        if (!cancelled) setError("Network error loading OPPLAN");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Group objectives by column
  const grouped: Record<OpplanObjective["status"], OpplanObjective[]> = {
    pending: [],
    in_progress: [],
    passed: [],
    blocked: [],
  };
  for (const obj of objectives) {
    const col = grouped[obj.status];
    if (col) col.push(obj);
    else grouped.pending.push(obj);
  }

  const total = objectives.length;
  const passed = grouped.passed.length;
  const inProgress = grouped.in_progress.length;
  const blocked = grouped.blocked.length;

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <Link
          href={`/${locale}/dashboard/audits/${id}`}
          className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={12} />
          Retour a l&apos;audit
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-[var(--text-muted)]" />
            <div>
              <h1 className="text-xl font-black tracking-tight">
                OPPLAN{" "}
                {engagement ? (
                  <span className="text-[var(--text-muted)] font-normal">
                    — {engagement.name}
                  </span>
                ) : null}
              </h1>
              <p className="text-[10px] font-mono text-[var(--text-subtle)] mt-0.5">
                Operational Plan — Kanban Tracker
              </p>
            </div>
          </div>

          {/* Stats */}
          {total > 0 && (
            <div className="flex items-center gap-4 text-[9px] font-mono flex-shrink-0">
              <span className="text-[var(--text-muted)]">
                {passed}/{total} passed
              </span>
              {inProgress > 0 && (
                <span className="text-[var(--warning)]">
                  {inProgress} active
                </span>
              )}
              {blocked > 0 && (
                <span className="text-[var(--danger)]">
                  {blocked} blocked
                </span>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3 h-px bg-[var(--border)]">
            <div
              className="h-full bg-[var(--success)] transition-all duration-500"
              style={{ width: `${(passed / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] mx-auto mb-2" />
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && total === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center border border-[var(--border)] px-8 py-8">
            <Target className="w-5 h-5 text-[var(--text-subtle)] mx-auto mb-2" />
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              No OPPLAN objectives yet.
            </p>
            <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-1">
              Launch an agent to generate the operational plan.
            </p>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      {!loading && !error && total > 0 && (
        <div className="flex-1 grid grid-cols-4 gap-3 min-h-0 overflow-hidden">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex flex-col min-h-0"
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2 mb-2 border border-[var(--border)]"
                style={{ backgroundColor: col.bgDim }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5"
                    style={{ backgroundColor: col.color }}
                  />
                  <span
                    className="text-[8px] font-mono uppercase tracking-[0.15em] font-bold"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                  {grouped[col.key].length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto pr-1">
                {grouped[col.key].length === 0 ? (
                  <div className="border border-dashed border-[var(--border)] px-3 py-6 text-center">
                    <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                      Empty
                    </span>
                  </div>
                ) : (
                  grouped[col.key].map((obj) => (
                    <ObjectiveCard key={obj.id} obj={obj} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
