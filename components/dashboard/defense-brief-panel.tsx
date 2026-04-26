"use client";

import { useState, useEffect, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  Check,
  X,
  Pencil,
  AlertTriangle,
  Link2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Eyebrow, Body } from "@/components/ui/typography";
import { StatusDot, type StatusDotState } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";

// ── Types ───────────────────────────────────────────────────────────────

type ActionType =
  | "BLOCK_PORT"
  | "DISABLE_SERVICE"
  | "REVOKE_CREDENTIAL"
  | "FIREWALL_RULE"
  | "CONFIG_CHANGE";

type ActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "applied"
  | "verified";

interface DefenseAction {
  id: string;
  type: ActionType;
  target: string;
  findingId: string;
  findingSeverity: string;
  description: string;
  status: ActionStatus;
  verificationResult?: string;
  verificationDetails?: string;
  approvedAt?: string;
  rejectedAt?: string;
  appliedAt?: string;
  verifiedAt?: string;
}

interface DefenseBriefPanelProps {
  engagementId: string;
}

// ── Constants ───────────────────────────────────────────────────────────

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  BLOCK_PORT: "Block Port",
  DISABLE_SERVICE: "Disable Service",
  REVOKE_CREDENTIAL: "Revoke Credential",
  FIREWALL_RULE: "Firewall Rule",
  CONFIG_CHANGE: "Config Change",
};

// Defense action type → tri-state mapping (refonte 2026 §1).
// Document the rationale: destructive defenses (block / disable) are critical risk
// to operations; revocations and firewall rules are warning (medium impact);
// config changes are success (lowest impact, recoverable).
const ACTION_TYPE_STATE: Record<ActionType, StatusDotState> = {
  BLOCK_PORT:        "critical",
  DISABLE_SERVICE:   "critical",
  REVOKE_CREDENTIAL: "warning",
  FIREWALL_RULE:     "warning",
  CONFIG_CHANGE:     "success",
};

const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  BLOCK_PORT:        "var(--state-critical)",
  DISABLE_SERVICE:   "var(--state-critical)",
  REVOKE_CREDENTIAL: "var(--state-warning)",
  FIREWALL_RULE:     "var(--state-warning)",
  CONFIG_CHANGE:     "var(--state-success)",
};

const STATUS_COLORS: Record<ActionStatus, string> = {
  pending:  "var(--state-warning)",
  approved: "var(--state-success)",
  rejected: "var(--bjhunt-text-muted)",
  applied:  "var(--state-warning)",
  verified: "var(--state-success)",
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  applied: "APPLIED",
  verified: "VERIFIED",
};

// Severity → tri-state token mapping (same as vaccine-monitor).
//   critical/high → critical (coral)
//   medium        → warning  (amber)
//   low           → success  (emerald)
//   info          → neutral  (steel slate)
const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--state-critical)",
  high:     "var(--state-critical)",
  medium:   "var(--state-warning)",
  low:      "var(--state-success)",
  info:     "var(--bjhunt-text-muted)",
};

// ── Component ───────────────────────────────────────────────────────────

export function DefenseBriefPanel({ engagementId }: DefenseBriefPanelProps) {
  const [actions, setActions] = useState<DefenseAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");

  // ── Fetch defense brief ─────────────────────────────────────────────

  const fetchDefenseBrief = useCallback(async () => {
    try {
      const res = await browserBackendFetch(
        `/api/engagements/${engagementId}/defense-brief`,
      );
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    fetchDefenseBrief();
  }, [fetchDefenseBrief]);

  // ── Actions ─────────────────────────────────────────────────────────

  const handleApprove = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      const res = await browserBackendFetch(
        `/api/engagements/${engagementId}/defense-actions/${actionId}/approve`,
        { method: "POST" },
      );
      if (res.ok) {
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? { ...a, status: "approved" as ActionStatus, approvedAt: new Date().toISOString() }
              : a,
          ),
        );
      }
    } catch {
      // silent
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessingId(actionId);
    try {
      const res = await browserBackendFetch(
        `/api/engagements/${engagementId}/defense-actions/${actionId}/reject`,
        { method: "POST" },
      );
      if (res.ok) {
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? { ...a, status: "rejected" as ActionStatus, rejectedAt: new Date().toISOString() }
              : a,
          ),
        );
      }
    } catch {
      // silent
    } finally {
      setProcessingId(null);
    }
  };

  const startEdit = (action: DefenseAction) => {
    setEditingId(action.id);
    setEditDescription(action.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
  };

  const saveEdit = (actionId: string) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId ? { ...a, description: editDescription } : a,
      ),
    );
    setEditingId(null);
    setEditDescription("");
  };

  // ── Stats ───────────────────────────────────────────────────────────

  const stats = {
    total: actions.length,
    pending: actions.filter((a) => a.status === "pending").length,
    approved: actions.filter((a) => a.status === "approved").length,
    rejected: actions.filter((a) => a.status === "rejected").length,
    applied: actions.filter((a) => a.status === "applied").length,
    verified: actions.filter((a) => a.status === "verified").length,
  };

  // ── Loading / empty state ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] rounded-[var(--bjhunt-radius-md)] px-4 py-3 flex items-center justify-center">
        <Loader2 className="w-3 h-3 animate-spin text-[var(--bjhunt-text-muted)]" />
        <span className="ml-2 font-mono text-[11px] text-[var(--bjhunt-text-muted)]">
          Loading defense brief...
        </span>
      </div>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] rounded-[var(--bjhunt-radius-md)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bjhunt-border)]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
          <Eyebrow>Defense Brief</Eyebrow>
        </div>
        <div className="flex items-center gap-3">
          {stats.pending > 0 && (
            <StatusDot state="warning" label={`${stats.pending} pending`} mono />
          )}
          {stats.approved > 0 && (
            <StatusDot state="success" label={`${stats.approved} approved`} mono />
          )}
          {stats.verified > 0 && (
            <StatusDot state="success" label={`${stats.verified} verified`} mono />
          )}
          <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
            {stats.total} total
          </span>
        </div>
      </div>

      {/* Actions list */}
      <div className="divide-y divide-[var(--bjhunt-border)]">
        {actions.map((action) => {
          const isExpanded = expandedId === action.id;
          const isProcessing = processingId === action.id;
          const isEditing = editingId === action.id;
          const typeColor = ACTION_TYPE_COLORS[action.type] || "var(--bjhunt-text-muted)";
          const sevColor = SEVERITY_COLORS[action.findingSeverity] || "var(--bjhunt-text-muted)";
          const statusColor = STATUS_COLORS[action.status] || "var(--bjhunt-text-muted)";
          const typeDot = ACTION_TYPE_STATE[action.type] || "neutral";

          return (
            <div key={action.id}>
              {/* Action row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : action.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                {/* Expand chevron */}
                <div className="w-3 flex-shrink-0 mt-1 text-[var(--bjhunt-text-muted)]">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>

                {/* StatusDot per recommendation list spec — type-driven tri-state */}
                <div className="flex-shrink-0 mt-1">
                  <StatusDot state={typeDot} compact />
                </div>

                {/* Type badge */}
                <div className="flex-shrink-0">
                  <span
                    className="inline-block font-mono font-semibold text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 border rounded-[var(--bjhunt-radius-xs)]"
                    style={{ color: typeColor, borderColor: typeColor }}
                  >
                    {ACTION_TYPE_LABELS[action.type] || action.type}
                  </span>
                </div>

                {/* Target + description */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[12px] text-[var(--bjhunt-text)] truncate">
                    {action.target}
                  </div>
                  <Body className="text-[var(--bjhunt-text-muted)] truncate mt-0.5">
                    {action.description}
                  </Body>
                </div>

                {/* Severity badge */}
                <div className="flex-shrink-0">
                  <span
                    className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 border rounded-[var(--bjhunt-radius-xs)]"
                    style={{ color: sevColor, borderColor: sevColor }}
                  >
                    {action.findingSeverity}
                  </span>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <span
                    className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 border rounded-[var(--bjhunt-radius-xs)]"
                    style={{ color: statusColor, borderColor: statusColor }}
                  >
                    {STATUS_LABELS[action.status]}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--bjhunt-border)]">
                  <div className="pt-3 space-y-3 pl-6">
                    {/* Description (editable) */}
                    <div>
                      <Eyebrow className="block mb-1">Description</Eyebrow>
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full bg-[var(--bjhunt-bg)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] text-[12px] font-mono text-[var(--bjhunt-text)] px-2 py-1.5 outline-none resize-y min-h-[40px] focus:border-[var(--state-success)]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="state"
                              state="success"
                              size="sm"
                              onClick={() => saveEdit(action.id)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Body className="text-[var(--bjhunt-text)] leading-relaxed">
                          {action.description}
                        </Body>
                      )}
                    </div>

                    {/* Finding reference */}
                    <div>
                      <Eyebrow className="block mb-1">Finding Reference</Eyebrow>
                      <div className="flex items-center gap-1.5">
                        <Link2 className="w-3 h-3 text-[var(--bjhunt-text-muted)]" />
                        <span className="font-mono text-[11px] text-[var(--state-success)]">
                          {action.findingId}
                        </span>
                        <span
                          className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] px-1 py-px border ml-1 rounded-[var(--bjhunt-radius-xs)]"
                          style={{ color: sevColor, borderColor: sevColor }}
                        >
                          {action.findingSeverity}
                        </span>
                      </div>
                    </div>

                    {/* Verification result (if applied) */}
                    {action.status === "applied" && action.verificationResult && (
                      <div>
                        <Eyebrow className="block mb-1">Verification</Eyebrow>
                        <div className="flex items-center gap-2">
                          {action.verificationResult === "BLOCKED" ? (
                            <>
                              <ShieldCheck
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--state-success)" }}
                              />
                              <span className="font-mono text-[11px] text-[var(--state-success)]">
                                BLOCKED -- defense verified
                              </span>
                            </>
                          ) : (
                            <>
                              <ShieldX
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--state-critical)" }}
                              />
                              <span className="font-mono text-[11px] text-[var(--state-critical)]">
                                FAILED
                              </span>
                            </>
                          )}
                        </div>
                        {action.verificationDetails && (
                          <p className="font-mono text-[11px] text-[var(--bjhunt-text-muted)] mt-1">
                            {action.verificationDetails}
                          </p>
                        )}
                      </div>
                    )}

                    {action.status === "verified" && (
                      <div>
                        <Eyebrow className="block mb-1">Verification</Eyebrow>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--state-success)" }} />
                          <span className="font-mono text-[11px] text-[var(--state-success)]">
                            Defense verified and active
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {action.approvedAt && (
                        <div>
                          <Eyebrow>Approved </Eyebrow>
                          <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text)] ml-1">
                            {new Date(action.approvedAt).toLocaleString("en-US", {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                      {action.appliedAt && (
                        <div>
                          <Eyebrow>Applied </Eyebrow>
                          <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text)] ml-1">
                            {new Date(action.appliedAt).toLocaleString("en-US", {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {action.status === "pending" && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="state"
                          state="success"
                          size="sm"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(action.id);
                          }}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </Button>

                        <Button
                          variant="state"
                          state="critical"
                          size="sm"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(action.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(action);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                          Modify
                        </Button>
                      </div>
                    )}

                    {/* Re-approve rejected */}
                    {action.status === "rejected" && (
                      <div className="flex items-center gap-2 pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--bjhunt-text-muted)]" />
                        <span className="font-mono text-[11px] text-[var(--bjhunt-text-muted)]">
                          This action was rejected.
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(action.id);
                          }}
                        >
                          Re-approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
