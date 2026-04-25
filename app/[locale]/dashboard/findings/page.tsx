"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { browserBackendFetch } from "@/lib/backend-client";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Shield,
  Download,
  Network,
  Loader2,
} from "lucide-react";
import { SeverityBadge, type Severity } from "@/components/ui/severity-badge";

// ── Types ───────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  engagementId: string;
  engagementName: string | null;
  title: string;
  description: string | null;
  severity: string;
  cvssScore: number | null;
  cvssVector: string | null;
  cveIds: string[] | null;
  mitreAttack: string[] | null;
  evidence: Record<string, unknown> | null;
  remediation: string | null;
  status: string;
  remediationStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FindingStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface Engagement {
  id: string;
  name: string;
}

// ── Constants ───────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
  info: "var(--severity-info)",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "var(--severity-critical-bg)",
  high: "var(--severity-high-bg)",
  medium: "var(--severity-medium-bg)",
  low: "var(--severity-low-bg)",
  info: "var(--severity-info-bg)",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

const REMEDIATION_STATUS_COLORS: Record<string, string> = {
  pending: "var(--warning)",
  applied: "var(--success)",
  verified: "#4a9eff",
};

const REMEDIATION_STATUS_LABELS: Record<string, string> = {
  pending: "PENDING",
  applied: "APPLIED",
  verified: "VERIFIED",
};

// ── Component ───────────────────────────────────────────────────────────

export default function FindingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<FindingStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  });
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Selection for batch export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState("");
  const [engagementFilter, setEngagementFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Pagination
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // ── Toggle selection ────────────────────────────────────────────────

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === findings.length) return new Set();
      return new Set(findings.map((f) => f.id));
    });
  }, [findings]);

  // ── Batch export ────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await browserBackendFetch("/api/findings/export", {
        method: "POST",
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `findings-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const detail = await res.text().catch(() => "");
        setExportError(
          res.status === 403
            ? "Export requires a higher plan."
            : `Export failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }
    } catch (err) {
      console.error("[findings] export failed", err);
      setExportError(err instanceof Error ? err.message : "Export failed — network error.");
    } finally {
      setExporting(false);
    }
  }, [selectedIds]);

  // ── Fetch stats ─────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await browserBackendFetch("/api/findings/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Fetch engagements for filter dropdown ───────────────────────────

  const fetchEngagements = useCallback(async () => {
    try {
      const res = await browserBackendFetch("/api/engagements?limit=100");
      if (res.ok) {
        const data = await res.json();
        setEngagements(data.engagements ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Fetch findings ──────────────────────────────────────────────────

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (severityFilter) params.set("severity", severityFilter);
      if (engagementFilter) params.set("engagement_id", engagementFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await browserBackendFetch(
        `/api/findings?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setFindings(data.findings ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [offset, severityFilter, engagementFilter, searchQuery]);

  // ── Initial load ────────────────────────────────────────────────────

  useEffect(() => {
    fetchStats();
    fetchEngagements();
  }, [fetchStats, fetchEngagements]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  // ── Search submit ───────────────────────────────────────────────────

  const handleSearch = () => {
    setOffset(0);
    setSearchQuery(searchInput);
  };

  const handleFilterChange = (
    setter: (v: string) => void,
    value: string
  ) => {
    setOffset(0);
    setter(value);
  };

  // ── CVSS color ──────────────────────────────────────────────────────

  const cvssColor = (score: number): string => {
    if (score >= 9.0) return "var(--severity-critical)";
    if (score >= 7.0) return "var(--severity-high)";
    if (score >= 4.0) return "var(--severity-medium)";
    if (score >= 0.1) return "var(--severity-low)";
    return "var(--severity-info)";
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.2em] text-white">
          FINDINGS
        </h1>
        <p className="text-[10px] text-[var(--text-subtle)] font-mono mt-1">
          Security vulnerabilities discovered across all scans
        </p>
      </div>

      {/* Stats bar — SeverityBadge (outline variant) with live counts */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-1.5 border border-[var(--bjhunt-border-strong)] bg-[var(--bjhunt-bg-secondary)]"
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--bjhunt-text-subtle)]">
            Total
          </span>
          <span className="text-[13px] font-mono font-semibold text-[var(--bjhunt-text)] tabular-nums">
            {stats.total}
          </span>
        </div>
        {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((sev) => (
          <SeverityBadge
            key={sev}
            severity={sev}
            variant={sev === 'critical' && stats.critical > 0 ? 'solid' : 'outline'}
            size="md"
            pulse={sev === 'critical' && stats.critical > 0}
          >
            {sev} · {stats[sev]}
          </SeverityBadge>
        ))}
      </div>

      {/* Export error banner */}
      {exportError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 mb-4 px-3 py-2 border border-red-500/40 bg-red-500/10 text-[10px] font-mono text-red-300"
        >
          <span>{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-red-200 hover:text-white"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Export bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 border border-[var(--border)] bg-[var(--bg-card)]">
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {selectedIds.size} finding{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-white hover:text-white/80 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] transition-colors disabled:opacity-40"
          >
            {exporting ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Download size={10} />
            )}
            Export Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] hover:text-white px-2 py-1.5 transition-colors ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Severity dropdown */}
        <select
          value={severityFilter}
          onChange={(e) =>
            handleFilterChange(setSeverityFilter, e.target.value)
          }
          className="bg-[var(--bg-input)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] px-2 py-1.5 outline-none focus:border-[var(--border-strong)] appearance-none cursor-pointer"
          style={{ minWidth: 120 }}
        >
          <option value="">All severities</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Engagement dropdown */}
        <select
          value={engagementFilter}
          onChange={(e) =>
            handleFilterChange(setEngagementFilter, e.target.value)
          }
          className="bg-[var(--bg-input)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] px-2 py-1.5 outline-none focus:border-[var(--border-strong)] appearance-none cursor-pointer"
          style={{ minWidth: 160 }}
        >
          <option value="">All engagements</option>
          {engagements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        {/* Search input */}
        <div className="flex items-center border border-[var(--border)] bg-[var(--bg-input)] flex-1 min-w-[180px]">
          <Search
            size={12}
            className="ml-2 text-[var(--text-subtle)] flex-shrink-0"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by title, CVE, description..."
            className="bg-transparent text-[10px] font-mono text-white px-2 py-1.5 outline-none flex-1 placeholder:text-[var(--text-subtle)]"
          />
          <button
            onClick={handleSearch}
            className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-2 py-1.5 border-l border-[var(--border)] transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Findings list */}
      {loading ? (
        <div className="border border-[var(--border)] px-4 py-12 text-center">
          <p className="text-[10px] font-mono text-[var(--text-subtle)] animate-pulse">
            Loading findings...
          </p>
        </div>
      ) : findings.length === 0 ? (
        <div className="border border-[var(--border)] px-4 py-16 text-center">
          <Shield
            size={28}
            className="mx-auto mb-3 text-[var(--text-subtle)]"
          />
          <p className="text-[11px] font-mono text-[var(--text-muted)] mb-1">
            No findings yet.
          </p>
          <p className="text-[10px] font-mono text-[var(--text-subtle)] mb-4">
            Run a scan to discover vulnerabilities.
          </p>
          {/* DASH-P2: empty state now offers a direct CTA to start a scan
              instead of leaving the user to figure out where to go. */}
          <div className="flex items-center justify-center gap-2">
            <Link
              href={`/${locale}/dashboard/chat`}
              className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest bg-white text-black hover:bg-white/90 transition-colors"
            >
              Start a scan
            </Link>
            <Link
              href={`/${locale}/dashboard/audits`}
              className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white border border-[var(--border)] transition-colors"
            >
              View audits
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-card)]">
              <div className="w-4 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedIds.size === findings.length && findings.length > 0}
                  onChange={toggleAll}
                  className="w-3 h-3 accent-white cursor-pointer"
                />
              </div>
              <div className="w-4 flex-shrink-0" />
              <div className="w-[72px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                Severity
              </div>
              <div className="flex-1 min-w-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                Title
              </div>
              <div className="w-[90px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] hidden md:block">
                CVE
              </div>
              <div className="w-[50px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] hidden md:block text-center">
                CVSS
              </div>
              <div className="w-[80px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] hidden lg:block text-center">
                Remediation
              </div>
              <div className="w-[120px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] hidden lg:block">
                Engagement
              </div>
              <div className="w-[60px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] hidden lg:block text-right">
                Date
              </div>
            </div>

            {/* Findings rows */}
            {findings.map((f) => {
              const isExpanded = expandedId === f.id;
              const remStatus = f.remediationStatus || "pending";
              const remColor = REMEDIATION_STATUS_COLORS[remStatus] || "var(--text-subtle)";

              return (
                <div key={f.id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card)]/50 transition-colors">
                    {/* Checkbox */}
                    <div className="w-4 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(f.id)}
                        onChange={() => toggleSelected(f.id)}
                        className="w-3 h-3 accent-white cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                    {/* Expand chevron */}
                    <div className="w-4 flex-shrink-0 text-[var(--text-subtle)]">
                      {isExpanded ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </div>

                    {/* Severity badge */}
                    <div className="w-[72px] flex-shrink-0">
                      <span
                        className="inline-block text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5"
                        style={{
                          color: SEVERITY_COLORS[f.severity],
                          background: SEVERITY_BG[f.severity],
                          border: `1px solid ${SEVERITY_COLORS[f.severity]}`,
                        }}
                      >
                        {f.severity}
                      </span>
                    </div>

                    {/* Title + inline MITRE badges */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-white truncate block">
                        {f.title}
                      </span>
                      {f.mitreAttack && f.mitreAttack.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {f.mitreAttack.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[7px] font-mono text-[var(--warning)] bg-[var(--warning-dim)] border border-[var(--warning)] px-1 py-px"
                            >
                              {t}
                            </span>
                          ))}
                          {f.mitreAttack.length > 3 && (
                            <span className="text-[7px] font-mono text-[var(--text-subtle)]">
                              +{f.mitreAttack.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CVE */}
                    <div className="w-[90px] flex-shrink-0 hidden md:block">
                      {f.cveIds && f.cveIds.length > 0 ? (
                        <span className="text-[9px] font-mono text-[var(--success)]">
                          {f.cveIds[0]}
                          {f.cveIds.length > 1 && (
                            <span className="text-[var(--text-subtle)]">
                              {" "}
                              +{f.cveIds.length - 1}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                          --
                        </span>
                      )}
                    </div>

                    {/* CVSS */}
                    <div className="w-[50px] flex-shrink-0 hidden md:block text-center">
                      {f.cvssScore != null ? (
                        <span
                          className="text-[9px] font-mono font-bold"
                          style={{ color: cvssColor(f.cvssScore) }}
                        >
                          {f.cvssScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                          --
                        </span>
                      )}
                    </div>

                    {/* Remediation status */}
                    <div className="w-[80px] flex-shrink-0 hidden lg:block text-center">
                      <span
                        className="text-[7px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5"
                        style={{
                          color: remColor,
                          backgroundColor: `${remColor}15`,
                          border: `1px solid ${remColor}`,
                        }}
                      >
                        {REMEDIATION_STATUS_LABELS[remStatus] || remStatus.toUpperCase()}
                      </span>
                    </div>

                    {/* Engagement */}
                    <div className="w-[120px] flex-shrink-0 hidden lg:block">
                      <span className="text-[9px] font-mono text-[var(--text-muted)] truncate block">
                        {f.engagementName ?? "--"}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="w-[60px] flex-shrink-0 hidden lg:block text-right">
                      <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                        {new Date(f.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 bg-[var(--bg-card)]/30">
                      <div className="pl-7 border-l border-[var(--border-strong)] ml-1.5 space-y-4">
                        {/* Description */}
                        {f.description && (
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                              Description
                            </div>
                            <p className="text-[11px] font-mono text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">
                              {f.description}
                            </p>
                          </div>
                        )}

                        {/* Evidence / PoC */}
                        {f.evidence && Object.keys(f.evidence).length > 0 && (
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                              Evidence / PoC
                            </div>
                            <pre className="text-[10px] font-mono text-[var(--success)] bg-[var(--bg)] border border-[var(--border)] px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                              {typeof f.evidence === "string"
                                ? f.evidence
                                : JSON.stringify(f.evidence, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Remediation */}
                        {f.remediation && (
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                              Remediation
                            </div>
                            <p className="text-[11px] font-mono text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed border-l-2 border-[var(--success)] pl-3">
                              {f.remediation}
                            </p>
                          </div>
                        )}

                        {/* MITRE ATT&CK */}
                        {f.mitreAttack && f.mitreAttack.length > 0 && (
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                              MITRE ATT&CK
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {f.mitreAttack.map((t) => (
                                <span
                                  key={t}
                                  className="text-[8px] font-mono text-[var(--warning)] bg-[var(--warning-dim)] border border-[var(--warning)] px-1.5 py-0.5"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CVE IDs (full list) */}
                        {f.cveIds && f.cveIds.length > 0 && (
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                              CVE IDs
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {f.cveIds.map((cve) => (
                                <span
                                  key={cve}
                                  className="text-[9px] font-mono text-[var(--success)]"
                                >
                                  {cve}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CVSS Vector */}
                        {f.cvssVector && (
                          <div>
                            <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                              CVSS Vector
                            </div>
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">
                              {f.cvssVector}
                            </span>
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-4 flex-wrap pt-1">
                          {f.engagementName && (
                            <div>
                              <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                                Engagement:{" "}
                              </span>
                              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                {f.engagementName}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                              Status:{" "}
                            </span>
                            <span
                              className="text-[9px] font-mono uppercase"
                              style={{
                                color:
                                  f.status === "open"
                                    ? "var(--warning)"
                                    : f.status === "remediated"
                                      ? "var(--success)"
                                      : f.status === "false_positive"
                                        ? "var(--text-subtle)"
                                        : "var(--text-muted)",
                              }}
                            >
                              {f.status.replace("_", " ")}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                              Found:{" "}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">
                              {new Date(f.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>

                          {/* View in Graph */}
                          {f.engagementId && (
                            <Link
                              href={`/${locale}/dashboard/audits/${f.engagementId}/graph`}
                              className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors ml-auto"
                            >
                              <Network size={9} />
                              View in Graph
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of{" "}
                {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-2 py-1 border border-[var(--border)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                  className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-2 py-1 border border-[var(--border)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

