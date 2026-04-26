"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { browserBackendFetch } from "@/lib/backend-client";
import { Search, Download, Loader2, X } from "lucide-react";
import { Eyebrow, H1, H3, Body } from "@/components/ui/typography";
import { StatusDot, type DotState } from "@/components/ui/status-dot";
import { StateText } from "@/components/ui/state-text";
import type { Severity } from "@/components/ui/severity-badge";

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

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

const SEVERITY_TO_STATE: Record<string, DotState> = {
  open: "warning",
  remediated: "success",
  false_positive: "neutral",
  pending: "warning",
  applied: "success",
  verified: "success",
};

function severityKey(s: string): Severity {
  return (SEVERITY_ORDER as readonly string[]).includes(s)
    ? (s as Severity)
    : "info";
}

function severityState(s: string): DotState {
  switch (severityKey(s)) {
    case "critical":
    case "high":
      return "critical";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "neutral";
  }
}

function statusState(s: string): DotState {
  return SEVERITY_TO_STATE[s] ?? "neutral";
}

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

  // Selection for batch export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [engagementFilter, setEngagementFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Pagination
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // ── Selection helpers ───────────────────────────────────────────────

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
      setExportError(
        err instanceof Error ? err.message : "Export failed — network error.",
      );
    } finally {
      setExporting(false);
    }
  }, [selectedIds]);

  // ── Fetch helpers ───────────────────────────────────────────────────

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

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (severityFilter) params.set("severity", severityFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (engagementFilter) params.set("engagement_id", engagementFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await browserBackendFetch(
        `/api/findings?${params.toString()}`,
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
  }, [offset, severityFilter, statusFilter, engagementFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
    fetchEngagements();
  }, [fetchStats, fetchEngagements]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const handleSearch = () => {
    setOffset(0);
    setSearchQuery(searchInput);
  };

  const handleFilterChange = (
    setter: (v: string) => void,
    value: string,
  ) => {
    setOffset(0);
    setter(value);
  };

  // ── Render ──────────────────────────────────────────────────────────

  const allSelected = selectedIds.size === findings.length && findings.length > 0;

  return (
    <div className="px-4 py-8 sm:px-6 md:p-10 max-w-[1280px] mx-auto">
      {/* Hero */}
      <header className="mb-10 md:mb-12">
        <Eyebrow className="mb-4 inline-block">01 / Findings</Eyebrow>
        <H1>Findings</H1>
        <Body muted className="mt-4 max-w-2xl">
          Vulnerabilities discovered across all engagements — verified,
          deduplicated, and mapped to MITRE ATT&amp;CK.
        </Body>
      </header>

      {/* Stats summary — minimal mono */}
      <div className="mb-6 flex items-center gap-6 flex-wrap text-[11px] font-mono text-[var(--bjhunt-text-muted)]">
        <span>
          <span className="text-[var(--bjhunt-text-muted)]">total</span>{' '}
          <span className="text-[var(--bjhunt-text)] tabular-nums">{stats.total}</span>
        </span>
        {SEVERITY_ORDER.map((sev) => (
          <span key={sev} className="inline-flex items-center gap-2">
            <StatusDot state={severityState(sev)} compact />
            <StateText state={`severity-${sev}` as const}>
              {sev} {stats[sev as keyof FindingStats]}
            </StateText>
          </span>
        ))}
      </div>

      {/* Export error banner */}
      {exportError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 px-3 py-2 border border-[var(--state-critical)] bg-[var(--state-critical-tint)]"
        >
          <span className="text-[12px] font-mono text-[var(--state-critical)]">
            {exportError}
          </span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-[var(--state-critical)] hover:opacity-80"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-3 py-2 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)]">
          <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)]">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[10px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors disabled:opacity-40"
          >
            {exporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Download size={12} />
            )}
            Export selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] px-2 h-9 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <FilterChip
          label="Severity"
          value={severityFilter}
          options={SEVERITY_ORDER.map((s) => ({ value: s, label: s.toUpperCase() }))}
          onChange={(v) => handleFilterChange(setSeverityFilter, v)}
        />
        <FilterChip
          label="Status"
          value={statusFilter}
          options={[
            { value: "open", label: "OPEN" },
            { value: "remediated", label: "REMEDIATED" },
            { value: "false_positive", label: "FALSE POSITIVE" },
          ]}
          onChange={(v) => handleFilterChange(setStatusFilter, v)}
        />
        <FilterChip
          label="Engagement"
          value={engagementFilter}
          options={engagements.map((e) => ({ value: e.id, label: e.name }))}
          onChange={(v) => handleFilterChange(setEngagementFilter, v)}
        />

        {/* Search input */}
        <div className="flex items-center border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] flex-1 min-w-[200px] h-9 rounded-[6px]">
          <Search
            size={14}
            className="ml-3 text-[var(--bjhunt-text-muted)] flex-shrink-0"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by title, CVE, description..."
            className="bg-transparent text-[12px] font-mono text-[var(--bjhunt-text)] px-2 outline-none flex-1 placeholder:text-[var(--bjhunt-text-muted)]"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="px-4 py-16 text-center border-y border-[var(--bjhunt-border)]">
          <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)] animate-pulse">
            Loading findings...
          </span>
        </div>
      ) : findings.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bjhunt-bg)] border-b border-[var(--bjhunt-border)]">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 w-[36px]"
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-[var(--state-success)] cursor-pointer"
                      aria-label="Select all findings on this page"
                    />
                  </th>
                  <ThEyebrow>Title</ThEyebrow>
                  <ThEyebrow className="w-[100px]">Severity</ThEyebrow>
                  <ThEyebrow className="w-[120px]">Status</ThEyebrow>
                  <ThEyebrow className="hidden md:table-cell w-[80px] text-right">CVSS</ThEyebrow>
                  <ThEyebrow className="hidden md:table-cell w-[140px]">CVE</ThEyebrow>
                  <ThEyebrow className="hidden lg:table-cell w-[180px]">Engagement</ThEyebrow>
                  <ThEyebrow className="hidden lg:table-cell w-[110px] text-right">Date</ThEyebrow>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <FindingRow
                    key={f.id}
                    f={f}
                    locale={locale}
                    selected={selectedIds.has(f.id)}
                    onToggle={() => toggleSelected(f.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)]">
                {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <PagerButton
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Prev
                </PagerButton>
                <span className="text-[11px] font-mono text-[var(--bjhunt-text-muted)] px-2">
                  Page{' '}
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, Math.ceil(total / limit))}
                    value={Math.floor(offset / limit) + 1}
                    onChange={(e) => {
                      const n = Math.max(
                        1,
                        Math.min(
                          Math.ceil(total / limit) || 1,
                          Number.parseInt(e.target.value, 10) || 1,
                        ),
                      );
                      setOffset((n - 1) * limit);
                    }}
                    aria-label="Go to page"
                    className="w-12 mx-1 text-center bg-[var(--bjhunt-bg-secondary)] border border-[var(--bjhunt-border)] px-1 py-0.5 text-[var(--bjhunt-text)] focus:outline-none focus:border-[var(--state-success)]"
                  />
                  / {Math.max(1, Math.ceil(total / limit))}
                </span>
                <PagerButton
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </PagerButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────

function ThEyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`text-left px-4 py-3 ${className}`}
      style={{
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--bjhunt-text-muted)",
      }}
    >
      {children}
    </th>
  );
}

function FilterChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] bg-transparent rounded-[6px] cursor-pointer transition-colors">
      <span
        style={{
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--bjhunt-text-muted)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[12px] font-mono text-[var(--bjhunt-text)] outline-none cursor-pointer appearance-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PagerButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 px-4 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--bjhunt-text)] border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-[6px]"
    >
      {children}
    </button>
  );
}

function FindingRow({
  f,
  locale,
  selected,
  onToggle,
}: {
  f: Finding;
  locale: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const sev = severityKey(f.severity);
  const statusLabel = f.status.replace(/_/g, " ");

  return (
    <tr
      className="border-b border-[var(--bjhunt-border)] transition-[padding,background-color] hover:bg-white/[0.02] group"
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 accent-[var(--state-success)] cursor-pointer"
          aria-label={`Select ${f.title}`}
        />
      </td>
      <td className="px-4 py-3 group-hover:pl-7 transition-[padding] duration-150">
        <Link
          href={`/${locale}/dashboard/audits/${f.engagementId}`}
          className="text-[14px] text-[var(--bjhunt-text)] hover:text-white transition-colors"
        >
          {f.title}
        </Link>
        {f.cveIds && f.cveIds.length > 0 && (
          <div className="md:hidden mt-1 text-[11px] font-mono text-[var(--bjhunt-text-muted)]">
            {f.cveIds[0]}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <StateText state={`severity-${sev}` as const}>{sev}</StateText>
      </td>
      <td className="px-4 py-3">
        <StatusDot state={statusState(f.status)} label={statusLabel} />
      </td>
      <td className="hidden md:table-cell px-4 py-3 text-right">
        {f.cvssScore != null ? (
          <span
            className="font-mono text-[13px] tabular-nums"
            style={{
              color:
                f.cvssScore >= 9.0
                  ? "var(--state-critical)"
                  : f.cvssScore >= 7.0
                    ? "var(--state-critical)"
                    : f.cvssScore >= 4.0
                      ? "var(--state-warning)"
                      : f.cvssScore >= 0.1
                        ? "var(--state-success)"
                        : "var(--bjhunt-text-muted)",
            }}
          >
            {f.cvssScore.toFixed(1)}
          </span>
        ) : (
          <span className="font-mono text-[13px] text-[var(--bjhunt-text-muted)]">--</span>
        )}
      </td>
      <td className="hidden md:table-cell px-4 py-3 font-mono text-[13px] text-[var(--bjhunt-text)]">
        {f.cveIds && f.cveIds.length > 0 ? (
          <>
            {f.cveIds[0]}
            {f.cveIds.length > 1 && (
              <span className="text-[var(--bjhunt-text-muted)]"> +{f.cveIds.length - 1}</span>
            )}
          </>
        ) : (
          <span className="text-[var(--bjhunt-text-muted)]">--</span>
        )}
      </td>
      <td className="hidden lg:table-cell px-4 py-3 text-[13px] text-[var(--bjhunt-text-muted)] truncate max-w-[180px]">
        {f.engagementName ?? "--"}
      </td>
      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono text-[12px] text-[var(--bjhunt-text-muted)]">
        {new Date(f.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        })}
      </td>
    </tr>
  );
}

function EmptyState({ locale }: { locale: string }) {
  return (
    <div className="border-y border-[var(--bjhunt-border)] py-24 px-4 text-center">
      <Eyebrow className="block mb-3">Empty State</Eyebrow>
      <H3 className="mb-2">No findings yet</H3>
      <Body muted className="mb-6 max-w-md mx-auto">
        Run a scan to discover vulnerabilities. Verified findings land here in
        real time.
      </Body>
      <div className="flex items-center justify-center gap-2">
        <Link
          href={`/${locale}/dashboard/chat`}
          className="inline-flex items-center h-10 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors rounded-[6px]"
        >
          Start a scan
        </Link>
        <Link
          href={`/${locale}/dashboard/audits`}
          className="inline-flex items-center h-10 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] transition-colors rounded-[6px]"
        >
          View audits
        </Link>
      </div>
    </div>
  );
}
