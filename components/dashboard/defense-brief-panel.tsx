"use client";

import { useState, useEffect, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { cn } from "@/lib/utils";
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

const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  BLOCK_PORT: "var(--danger)",
  DISABLE_SERVICE: "#f97316",
  REVOKE_CREDENTIAL: "var(--warning)",
  FIREWALL_RULE: "#60a5fa",
  CONFIG_CHANGE: "#a78bfa",
};

const STATUS_COLORS: Record<ActionStatus, string> = {
  pending: "var(--warning)",
  approved: "var(--success)",
  rejected: "var(--text-subtle)",
  applied: "#60a5fa",
  verified: "var(--success)",
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  applied: "APPLIED",
  verified: "VERIFIED",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--danger)",
  high: "#f97316",
  medium: "var(--warning)",
  low: "#60a5fa",
  info: "var(--text-muted)",
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
      <div className="border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex items-center justify-center">
        <Loader2 className="w-3 h-3 animate-spin text-[var(--text-subtle)]" />
        <span className="ml-2 text-[9px] font-mono text-[var(--text-subtle)]">
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
    <div className="border border-[var(--border)] bg-[var(--bg-card)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-white">
            Defense Brief
          </span>
        </div>
        <div className="flex items-center gap-3">
          {stats.pending > 0 && (
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--warning)" }}>
              {stats.pending} pending
            </span>
          )}
          {stats.approved > 0 && (
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--success)" }}>
              {stats.approved} approved
            </span>
          )}
          {stats.verified > 0 && (
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--success)" }}>
              {stats.verified} verified
            </span>
          )}
          <span className="text-[8px] font-mono text-[var(--text-subtle)]">
            {stats.total} total
          </span>
        </div>
      </div>

      {/* Actions list */}
      <div className="divide-y divide-[var(--border)]">
        {actions.map((action) => {
          const isExpanded = expandedId === action.id;
          const isProcessing = processingId === action.id;
          const isEditing = editingId === action.id;
          const typeColor = ACTION_TYPE_COLORS[action.type] || "var(--text-muted)";
          const sevColor = SEVERITY_COLORS[action.findingSeverity] || "var(--text-muted)";
          const statusColor = STATUS_COLORS[action.status] || "var(--text-muted)";

          return (
            <div key={action.id}>
              {/* Action row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : action.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bg-input)]/20 transition-colors"
              >
                {/* Expand chevron */}
                <div className="w-3 flex-shrink-0 mt-0.5 text-[var(--text-subtle)]">
                  {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </div>

                {/* Type badge */}
                <div className="flex-shrink-0">
                  <span
                    className="inline-block text-[7px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border"
                    style={{
                      color: typeColor,
                      borderColor: typeColor + "40",
                      background: typeColor + "08",
                    }}
                  >
                    {ACTION_TYPE_LABELS[action.type] || action.type}
                  </span>
                </div>

                {/* Target */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-white truncate">
                    {action.target}
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-subtle)] truncate mt-0.5">
                    {action.description}
                  </div>
                </div>

                {/* Severity badge */}
                <div className="flex-shrink-0">
                  <span
                    className="text-[7px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 border"
                    style={{ color: sevColor, borderColor: sevColor + "40" }}
                  >
                    {action.findingSeverity}
                  </span>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <span
                    className="text-[7px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border"
                    style={{ color: statusColor, borderColor: statusColor + "40" }}
                  >
                    {STATUS_LABELS[action.status]}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--border)]/30">
                  <div className="pt-3 space-y-3 pl-6">
                    {/* Description (editable) */}
                    <div>
                      <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                        Description
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[10px] font-mono text-white px-2 py-1.5 outline-none resize-y min-h-[40px]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveEdit(action.id)}
                              className="text-[8px] font-mono uppercase tracking-widest text-[var(--success)] px-2 py-1 border border-[var(--success)]/40 hover:border-[var(--success)] transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] px-2 py-1 border border-[var(--border)] hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
                          {action.description}
                        </p>
                      )}
                    </div>

                    {/* Finding reference */}
                    <div>
                      <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                        Finding Reference
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link2 className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                        <span className="text-[9px] font-mono text-[var(--success)]">
                          {action.findingId}
                        </span>
                        <span
                          className="text-[7px] font-mono uppercase tracking-widest px-1 py-px border ml-1"
                          style={{ color: sevColor, borderColor: sevColor + "40" }}
                        >
                          {action.findingSeverity}
                        </span>
                      </div>
                    </div>

                    {/* Verification result (if applied) */}
                    {action.status === "applied" && action.verificationResult && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                          Verification
                        </div>
                        <div className="flex items-center gap-2">
                          {action.verificationResult === "BLOCKED" ? (
                            <>
                              <ShieldCheck
                                className="w-3 h-3"
                                style={{ color: "var(--success)" }}
                              />
                              <span className="text-[9px] font-mono text-[var(--success)]">
                                BLOCKED -- defense verified
                              </span>
                            </>
                          ) : (
                            <>
                              <ShieldX
                                className="w-3 h-3"
                                style={{ color: "var(--danger)" }}
                              />
                              <span className="text-[9px] font-mono text-[var(--danger)]">
                                FAILED
                              </span>
                            </>
                          )}
                        </div>
                        {action.verificationDetails && (
                          <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-1">
                            {action.verificationDetails}
                          </p>
                        )}
                      </div>
                    )}

                    {action.status === "verified" && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                          Verification
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" style={{ color: "var(--success)" }} />
                          <span className="text-[9px] font-mono text-[var(--success)]">
                            Defense verified and active
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {action.approvedAt && (
                        <div>
                          <span className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                            Approved:{" "}
                          </span>
                          <span className="text-[8px] font-mono text-[var(--text-muted)]">
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
                          <span className="text-[7px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                            Applied:{" "}
                          </span>
                          <span className="text-[8px] font-mono text-[var(--text-muted)]">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(action.id);
                          }}
                          disabled={isProcessing}
                          className={cn(
                            "flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest px-2.5 py-1.5 border transition-colors",
                            isProcessing
                              ? "opacity-50 cursor-not-allowed text-[var(--text-subtle)] border-[var(--border)]"
                              : "text-[var(--success)] border-[var(--success)]/40 hover:border-[var(--success)] hover:bg-[var(--success)]/5",
                          )}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Check className="w-2.5 h-2.5" />
                          )}
                          Approve
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(action.id);
                          }}
                          disabled={isProcessing}
                          className={cn(
                            "flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest px-2.5 py-1.5 border transition-colors",
                            isProcessing
                              ? "opacity-50 cursor-not-allowed text-[var(--text-subtle)] border-[var(--border)]"
                              : "text-[var(--danger)] border-[var(--danger)]/40 hover:border-[var(--danger)] hover:bg-[var(--danger)]/5",
                          )}
                        >
                          <X className="w-2.5 h-2.5" />
                          Reject
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(action);
                          }}
                          disabled={isProcessing}
                          className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] px-2.5 py-1.5 border border-[var(--border)] hover:text-white hover:border-[var(--border-strong)] transition-colors"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          Modify
                        </button>
                      </div>
                    )}

                    {/* Re-approve rejected */}
                    {action.status === "rejected" && (
                      <div className="flex items-center gap-2 pt-1">
                        <AlertTriangle className="w-3 h-3 text-[var(--text-subtle)]" />
                        <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                          This action was rejected.
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(action.id);
                          }}
                          disabled={isProcessing}
                          className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] px-2 py-1 border border-[var(--border)] hover:text-white transition-colors ml-2"
                        >
                          Re-approve
                        </button>
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
