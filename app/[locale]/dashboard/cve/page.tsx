"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import {
  Search,
  Shield,
  ExternalLink,
  Copy,
  Crosshair,
  ChevronDown,
  ChevronRight,
  Package,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────

interface CveResult {
  cveId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  cvss: number;
  cvssVector: string;
  epss: number;
  description: string;
  products: string[];
  references: { url: string; source: string }[];
  published: string;
  modified: string;
}

// ── Constants ───────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff4444",
  HIGH: "#ff6b35",
  MEDIUM: "#ff9900",
  LOW: "#00cc8a",
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: "rgba(255,68,68,0.08)",
  HIGH: "rgba(255,107,53,0.08)",
  MEDIUM: "rgba(255,153,0,0.08)",
  LOW: "rgba(0,204,138,0.08)",
};

// ── Component ───────────────────────────────────────────────────────────

export default function CveIntelligencePage() {
  const { plan } = usePlan();
  const [searchInput, setSearchInput] = useState("");
  const [searchMode, setSearchMode] = useState<"cve" | "package">("cve");
  const [results, setResults] = useState<CveResult[]>([]);
  const [trending, setTrending] = useState<CveResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch trending CVEs on mount ────────────────────────────────────

  const fetchTrending = useCallback(async () => {
    try {
      const res = await browserBackendFetch("/api/cve/trending");
      if (res.ok) {
        const data = await res.json();
        setTrending(data.results ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // ── Search ──────────────────────────────────────────────────────────

  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) return;

    setLoading(true);
    setHasSearched(true);
    setExpandedId(null);

    try {
      let url: string;
      if (searchMode === "package") {
        // Split "package version" format
        const parts = q.split(/\s+/);
        const pkg = parts[0];
        const version = parts.slice(1).join(" ");
        url = `/api/cve/search?package=${encodeURIComponent(pkg!)}${version ? `&version=${encodeURIComponent(version)}` : ""}`;
      } else {
        url = `/api/cve/search?q=${encodeURIComponent(q)}`;
      }

      const res = await browserBackendFetch(url);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // ── Copy CVE ID ─────────────────────────────────────────────────────

  const copyCveId = (cveId: string) => {
    navigator.clipboard.writeText(cveId);
    setCopiedId(cveId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── CVSS color ──────────────────────────────────────────────────────

  const cvssColor = (score: number): string => {
    if (score >= 9.0) return "#ff4444";
    if (score >= 7.0) return "#ff6b35";
    if (score >= 4.0) return "#ff9900";
    return "#00cc8a";
  };

  // ── EPSS bar width ─────────────────────────────────────────────────

  const epssWidth = (epss: number): string => `${Math.round(epss * 100)}%`;

  // ── CVE Card ────────────────────────────────────────────────────────

  const CveCard = ({ cve, compact = false }: { cve: CveResult; compact?: boolean }) => {
    const isExpanded = expandedId === cve.cveId;
    const sevColor = SEVERITY_COLORS[cve.severity] || "#999";
    const sevBg = SEVERITY_BG[cve.severity] || "transparent";

    return (
      <div className="border border-[var(--border)] bg-[var(--bg-card)]">
        {/* Header row */}
        <button
          onClick={() => setExpandedId(isExpanded ? null : cve.cveId)}
          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bg-input)]/30 transition-colors"
        >
          {/* Expand chevron */}
          {!compact && (
            <div className="w-3 flex-shrink-0 mt-0.5 text-[var(--text-subtle)]">
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </div>
          )}

          {/* CVE ID */}
          <div className="flex-shrink-0">
            <span
              className="text-[11px] font-mono font-bold"
              style={{ color: "#00cc8a" }}
            >
              {cve.cveId}
            </span>
          </div>

          {/* Severity badge */}
          <div className="flex-shrink-0">
            <span
              className="inline-block text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5"
              style={{
                color: sevColor,
                background: sevBg,
                border: `1px solid ${sevColor}`,
              }}
            >
              {cve.severity}
            </span>
          </div>

          {/* CVSS score */}
          <div className="flex-shrink-0">
            <span
              className="text-[10px] font-mono font-bold"
              style={{ color: cvssColor(cve.cvss) }}
            >
              {cve.cvss.toFixed(1)}
            </span>
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {cve.description}
            </p>
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-[var(--border)]">
            <div className="pt-3 space-y-4">
              {/* CVSS + EPSS row */}
              <div className="flex items-start gap-6 flex-wrap">
                {/* CVSS */}
                <div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    CVSS 3.1
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[16px] font-mono font-bold"
                      style={{ color: cvssColor(cve.cvss) }}
                    >
                      {cve.cvss.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                      {cve.cvssVector}
                    </span>
                  </div>
                </div>

                {/* EPSS */}
                <div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    EPSS Score
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono font-bold text-white">
                      {(cve.epss * 100).toFixed(1)}%
                    </span>
                    <div className="w-[80px] h-[6px] bg-[var(--bg-input)] border border-[var(--border)]">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: epssWidth(cve.epss),
                          background: cve.epss > 0.5 ? "#ff4444" : cve.epss > 0.2 ? "#ff9900" : "#00cc8a",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-[8px] font-mono text-[var(--text-subtle)] mt-0.5">
                    Probability of exploitation in 30 days
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                  Description
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
                  {cve.description}
                </p>
              </div>

              {/* Affected products */}
              {cve.products.length > 0 && (
                <div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    Affected Products
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cve.products.map((p) => (
                      <span
                        key={p}
                        className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] px-1.5 py-0.5"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* References */}
              {cve.references.length > 0 && (
                <div>
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    References
                  </div>
                  <div className="flex flex-col gap-1">
                    {cve.references.map((ref) => (
                      <a
                        key={ref.url}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--success)] hover:text-white transition-colors group"
                      >
                        <ExternalLink size={9} className="flex-shrink-0 opacity-50 group-hover:opacity-100" />
                        <span className="text-[8px] text-[var(--text-subtle)]">[{ref.source}]</span>
                        <span className="truncate">{ref.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                    Published:{" "}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">
                    {new Date(cve.published).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                    Modified:{" "}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">
                    {new Date(cve.modified).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyCveId(cve.cveId);
                  }}
                  className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-2 py-1.5 border border-[var(--border)] transition-colors"
                >
                  <Copy size={9} />
                  {copiedId === cve.cveId ? "Copied" : "Copy CVE ID"}
                </button>
                {/* Bridges the dead "Create Exploit Objective" CTA (DOC-07 audit P1)
                    by handing the CVE off to the chat with an OPPLAN seed prompt.
                    The full POST /api/engagements/:id/opplan/objectives endpoint
                    lands in W8 — until then the user gets an instant, working
                    workflow instead of a no-op button. */}
                <Link
                  href={`/dashboard/chat?seed=${encodeURIComponent(
                    `Create an exploitation objective for ${cve.cveId} ` +
                    `(${cve.severity ?? 'unknown severity'}, CVSS ${cve.cvssScore ?? 'n/a'}). ` +
                    `Describe the attack chain and propose verification steps.`
                  )}`}
                  className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-[var(--success)] hover:text-white px-2 py-1.5 border border-[var(--success)]/30 hover:border-[var(--success)] transition-colors"
                >
                  <Crosshair size={9} />
                  Create Exploit Objective
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <PlanGate requiredPlan="pro" currentPlan={plan} featureName="CVE Intelligence">
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.2em] text-white">
          CVE INTELLIGENCE
        </h1>
        <p className="text-[10px] text-[var(--text-subtle)] font-mono mt-1">
          Search vulnerabilities by CVE ID or affected package using NVD + EPSS + OSV data
        </p>
        <Link
          href="/dashboard/cve/dependencies"
          className="inline-flex items-center gap-1.5 mt-3 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-3 py-1.5 border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
        >
          <Package size={10} />
          Dependency Scanner
        </Link>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        {/* Mode toggle */}
        <div className="flex items-center gap-0 mb-2">
          <button
            onClick={() => setSearchMode("cve")}
            className={`text-[8px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              searchMode === "cve"
                ? "text-white bg-[var(--bg-card)] border-[var(--border-strong)]"
                : "text-[var(--text-subtle)] border-[var(--border)] hover:text-[var(--text-muted)]"
            }`}
          >
            By CVE
          </button>
          <button
            onClick={() => setSearchMode("package")}
            className={`text-[8px] font-mono uppercase tracking-widest px-3 py-1.5 border border-l-0 transition-colors ${
              searchMode === "package"
                ? "text-white bg-[var(--bg-card)] border-[var(--border-strong)]"
                : "text-[var(--text-subtle)] border-[var(--border)] hover:text-[var(--text-muted)]"
            }`}
          >
            By Package
          </button>
        </div>

        {/* Search input */}
        <div className="flex items-center border border-[var(--border)] bg-[var(--bg-input)]">
          <Search
            size={14}
            className="ml-3 text-[var(--text-subtle)] flex-shrink-0"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={
              searchMode === "cve"
                ? "Search CVE (e.g., CVE-2024-1234) or keyword"
                : "Search package (e.g., apache 2.4.49)"
            }
            className="bg-transparent text-[11px] font-mono text-white px-3 py-3 outline-none flex-1 placeholder:text-[var(--text-subtle)]"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white px-4 py-3 border-l border-[var(--border)] transition-colors disabled:opacity-40"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Search results */}
      {hasSearched && (
        <div className="mb-8">
          <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-3">
            Results ({results.length})
          </div>
          {loading ? (
            <div className="border border-[var(--border)] px-4 py-12 text-center">
              <p className="text-[10px] font-mono text-[var(--text-subtle)] animate-pulse">
                Querying CVE databases...
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="border border-[var(--border)] px-4 py-12 text-center">
              <Shield
                size={24}
                className="mx-auto mb-2 text-[var(--text-subtle)]"
              />
              <p className="text-[10px] font-mono text-[var(--text-muted)]">
                No vulnerabilities found for this query.
              </p>
              <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-1">
                Try a different CVE ID or package name.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((cve) => (
                <CveCard key={cve.cveId} cve={cve} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending / Recent Critical CVEs */}
      {!hasSearched && (
        <div>
          <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-3">
            Trending Critical CVEs
          </div>
          {trending.length === 0 ? (
            <div className="border border-[var(--border)] px-4 py-12 text-center">
              <p className="text-[10px] font-mono text-[var(--text-subtle)] animate-pulse">
                Loading trending vulnerabilities...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {trending.map((cve) => {
                const sevColor = SEVERITY_COLORS[cve.severity] || "#999";
                const sevBg = SEVERITY_BG[cve.severity] || "transparent";

                return (
                  <button
                    key={cve.cveId}
                    onClick={() => {
                      setSearchInput(cve.cveId);
                      setSearchMode("cve");
                      setResults([cve]);
                      setHasSearched(true);
                      setExpandedId(cve.cveId);
                    }}
                    className="border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left hover:bg-[var(--bg-input)]/30 transition-colors group"
                  >
                    {/* Top row: CVE ID + Severity */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{ color: "#00cc8a" }}
                      >
                        {cve.cveId}
                      </span>
                      <span
                        className="text-[7px] font-mono font-bold uppercase tracking-widest px-1 py-0.5"
                        style={{
                          color: sevColor,
                          background: sevBg,
                          border: `1px solid ${sevColor}`,
                        }}
                      >
                        {cve.severity}
                      </span>
                      <span
                        className="text-[9px] font-mono font-bold ml-auto"
                        style={{ color: cvssColor(cve.cvss) }}
                      >
                        {cve.cvss.toFixed(1)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[9px] font-mono text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-2">
                      {cve.description}
                    </p>

                    {/* EPSS bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                        EPSS
                      </span>
                      <div className="flex-1 h-[3px] bg-[var(--bg-input)] border border-[var(--border)]">
                        <div
                          className="h-full"
                          style={{
                            width: epssWidth(cve.epss),
                            background: cve.epss > 0.5 ? "#ff4444" : "#ff9900",
                          }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-[var(--text-muted)]">
                        {(cve.epss * 100).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </PlanGate>
  );
}
