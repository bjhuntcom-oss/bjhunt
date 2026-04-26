"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import { PageHero, Eyebrow, StatusDot } from "@/components/ui/page-hero";
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

const SEVERITY_TONE: Record<string, "critical" | "warning" | "success" | "neutral"> = {
  CRITICAL: "critical",
  HIGH: "critical",
  MEDIUM: "warning",
  LOW: "success",
};

const TONE_COLORS = {
  critical: "var(--bjhunt-status-danger, #fb565b)",
  warning: "var(--bjhunt-status-warning, #ffba00)",
  success: "var(--bjhunt-status-success, #00d992)",
  neutral: "var(--bjhunt-text-muted, #8b949e)",
};

const TONE_BG = {
  critical: "var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))",
  warning: "var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))",
  success: "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.12))",
  neutral: "transparent",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  borderColor: "var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius-md, 8px)",
};

// CVSS color: same 3-state logic but expressed via tokens
function cvssTone(score: number): "critical" | "warning" | "success" {
  if (score >= 7.0) return "critical";
  if (score >= 4.0) return "warning";
  return "success";
}

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

  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) return;

    setLoading(true);
    setHasSearched(true);
    setExpandedId(null);

    try {
      let url: string;
      if (searchMode === "package") {
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

  const copyCveId = (cveId: string) => {
    navigator.clipboard.writeText(cveId);
    setCopiedId(cveId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const epssWidth = (epss: number): string => `${Math.round(epss * 100)}%`;

  // ── CVE Card ────────────────────────────────────────────────────────

  const CveCard = ({ cve, compact = false }: { cve: CveResult; compact?: boolean }) => {
    const isExpanded = expandedId === cve.cveId;
    const sevTone = SEVERITY_TONE[cve.severity] || "neutral";
    const sevColor = TONE_COLORS[sevTone];
    const sevBg = TONE_BG[sevTone];
    const cvss = cvssTone(cve.cvss);

    return (
      <div className="border" style={CARD_STYLE}>
        <button
          onClick={() => setExpandedId(isExpanded ? null : cve.cveId)}
          className="w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.02]"
        >
          {!compact && (
            <span className="shrink-0 mt-1" style={{ color: "var(--bjhunt-text-muted)" }}>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}

          <span
            className="shrink-0"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--bjhunt-text)",
            }}
          >
            {cve.cveId}
          </span>

          <span
            className="shrink-0 inline-flex items-center"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: sevColor,
              border: `1px solid ${sevColor}`,
              background: sevBg,
              borderRadius: "var(--bjhunt-radius-sm, 4px)",
              padding: "2px 6px",
            }}
          >
            {cve.severity}
          </span>

          <span
            className="shrink-0"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: TONE_COLORS[cvss],
            }}
          >
            {cve.cvss.toFixed(1)}
          </span>

          <p
            className="flex-1 min-w-0 line-clamp-2"
            style={{
              fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--bjhunt-text-muted)",
              margin: 0,
            }}
          >
            {cve.description}
          </p>
        </button>

        {isExpanded && (
          <div
            className="px-4 pb-4 border-t"
            style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
          >
            <div className="pt-4 space-y-5">
              <div className="flex items-start gap-8 flex-wrap">
                <div>
                  <Eyebrow>CVSS 3.1</Eyebrow>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 24,
                        fontWeight: 600,
                        color: TONE_COLORS[cvss],
                      }}
                    >
                      {cve.cvss.toFixed(1)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 13,
                        color: "var(--bjhunt-text-muted)",
                      }}
                    >
                      {cve.cvssVector}
                    </span>
                  </div>
                </div>

                <div>
                  <Eyebrow>EPSS Score</Eyebrow>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--bjhunt-text)",
                      }}
                    >
                      {(cve.epss * 100).toFixed(1)}%
                    </span>
                    <div
                      className="w-[100px] h-1.5"
                      style={{
                        background: "var(--bjhunt-bg, #050507)",
                        border: "1px solid var(--bjhunt-border, #3d3a39)",
                        borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                      }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          width: epssWidth(cve.epss),
                          background:
                            cve.epss > 0.5
                              ? TONE_COLORS.critical
                              : cve.epss > 0.2
                                ? TONE_COLORS.warning
                                : TONE_COLORS.success,
                          borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                        }}
                      />
                    </div>
                  </div>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    Probability of exploitation in 30 days
                  </p>
                </div>
              </div>

              <div>
                <Eyebrow>Description</Eyebrow>
                <p
                  className="mt-2"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--bjhunt-text)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {cve.description}
                </p>
              </div>

              {cve.products.length > 0 && (
                <div>
                  <Eyebrow>Affected Products</Eyebrow>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {cve.products.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          color: "var(--bjhunt-text)",
                          border: "1px solid var(--bjhunt-border, #3d3a39)",
                          borderRadius: "var(--bjhunt-radius-sm, 4px)",
                          padding: "2px 6px",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cve.references.length > 0 && (
                <div>
                  <Eyebrow>References</Eyebrow>
                  <div className="mt-2 flex flex-col gap-1">
                    {cve.references.map((ref) => (
                      <a
                        key={ref.url}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 transition-colors group"
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          color: "var(--bjhunt-status-success, #00d992)",
                        }}
                      >
                        <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
                        <span
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 12,
                            color: "var(--bjhunt-text-muted)",
                          }}
                        >
                          [{ref.source}]
                        </span>
                        <span className="truncate">{ref.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <Eyebrow>Published</Eyebrow>
                  <span
                    className="ml-2"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {new Date(cve.published).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </span>
                </div>
                <div>
                  <Eyebrow>Modified</Eyebrow>
                  <span
                    className="ml-2"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {new Date(cve.modified).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyCveId(cve.cveId);
                  }}
                  className="inline-flex items-center gap-2 transition-colors"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text)",
                    border: "1px solid var(--bjhunt-border, #3d3a39)",
                    borderRadius: "var(--bjhunt-radius, 6px)",
                    padding: "0 12px",
                    height: 36,
                    background: "transparent",
                  }}
                >
                  <Copy size={11} />
                  {copiedId === cve.cveId ? "Copied" : "Copy CVE ID"}
                </button>
                <Link
                  href={`/dashboard/chat?seed=${encodeURIComponent(
                    `Create an exploitation objective for ${cve.cveId} ` +
                      `(${cve.severity ?? "unknown severity"}, CVSS ${cve.cvss ?? "n/a"}). ` +
                      `Describe the attack chain and propose verification steps.`
                  )}`}
                  className="inline-flex items-center gap-2 transition-colors"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-status-success, #00d992)",
                    border: "1px solid var(--bjhunt-status-success, #00d992)",
                    borderRadius: "var(--bjhunt-radius, 6px)",
                    padding: "0 12px",
                    height: 36,
                  }}
                >
                  <Crosshair size={11} />
                  Create Exploit Objective
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PlanGate requiredPlan="pro" currentPlan={plan} featureName="CVE Intelligence">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
        <PageHero
          eyebrow="06 / CVE INTEL"
          title="CVE Intelligence"
          lede="Search vulnerabilities by CVE ID or affected package using NVD + EPSS + OSV data."
          actions={
            <Link
              href="/dashboard/cve/dependencies"
              className="inline-flex items-center gap-2 transition-colors"
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: 13,
                color: "var(--bjhunt-text)",
                border: "1px solid var(--bjhunt-border, #3d3a39)",
                borderRadius: "var(--bjhunt-radius, 6px)",
                padding: "0 16px",
                height: 36,
                background: "transparent",
              }}
            >
              <Package size={14} />
              Dependency Scanner
            </Link>
          }
        />

        {/* Search bar */}
        <div className="mb-6">
          {/* Mode toggle */}
          <div
            className="inline-flex items-center mb-3 border overflow-hidden"
            style={{
              borderColor: "var(--bjhunt-border, #3d3a39)",
              borderRadius: "var(--bjhunt-radius, 6px)",
            }}
          >
            {(["cve", "package"] as const).map((mode, idx) => (
              <button
                key={mode}
                onClick={() => setSearchMode(mode)}
                className="px-4 transition-colors"
                style={{
                  height: 36,
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color:
                    searchMode === mode
                      ? "var(--bjhunt-text)"
                      : "var(--bjhunt-text-muted)",
                  background:
                    searchMode === mode
                      ? "var(--bjhunt-bg-secondary, var(--surface, #101010))"
                      : "transparent",
                  borderLeft:
                    idx === 0 ? "none" : "1px solid var(--bjhunt-border, #3d3a39)",
                }}
              >
                By {mode === "cve" ? "CVE" : "Package"}
              </button>
            ))}
          </div>

          <div
            className="flex items-center border"
            style={{
              background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
              borderColor: "var(--bjhunt-border, #3d3a39)",
              borderRadius: "var(--bjhunt-radius, 6px)",
              height: 40,
            }}
          >
            <Search size={14} className="ml-3 shrink-0" style={{ color: "var(--bjhunt-text-muted)" }} />
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
              className="bg-transparent px-2 outline-none flex-1"
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: 14,
                color: "var(--bjhunt-text)",
                height: 38,
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-5 transition-colors h-full border-l disabled:opacity-40"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--bjhunt-text)",
                borderColor: "var(--bjhunt-border, #3d3a39)",
              }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {hasSearched && (
          <div className="mb-8">
            <div className="mb-3">
              <Eyebrow>Results ({results.length})</Eyebrow>
            </div>
            {loading ? (
              <div className="border px-4 py-12 text-center" style={CARD_STYLE}>
                <p
                  className="animate-pulse"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  Querying CVE databases...
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="border px-4 py-12 text-center" style={CARD_STYLE}>
                <Shield
                  size={28}
                  className="mx-auto mb-3"
                  style={{ color: "var(--bjhunt-text-muted)" }}
                />
                <p
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 14,
                    color: "var(--bjhunt-text)",
                  }}
                >
                  No vulnerabilities found for this query.
                </p>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  Try a different CVE ID or package name.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((cve) => (
                  <CveCard key={cve.cveId} cve={cve} />
                ))}
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <section>
            <div className="mb-3">
              <Eyebrow>Trending Critical CVEs</Eyebrow>
            </div>
            {trending.length === 0 ? (
              <div className="border px-4 py-12 text-center" style={CARD_STYLE}>
                <p
                  className="animate-pulse"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  Loading trending vulnerabilities...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trending.map((cve) => {
                  const sevTone = SEVERITY_TONE[cve.severity] || "neutral";
                  const sevColor = TONE_COLORS[sevTone];
                  const sevBg = TONE_BG[sevTone];
                  const cvss = cvssTone(cve.cvss);

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
                      className="border p-4 text-left transition-colors hover:bg-white/[0.02]"
                      style={CARD_STYLE}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--bjhunt-text)",
                          }}
                        >
                          {cve.cveId}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: sevColor,
                            border: `1px solid ${sevColor}`,
                            background: sevBg,
                            borderRadius: "var(--bjhunt-radius-sm, 4px)",
                            padding: "1px 5px",
                          }}
                        >
                          {cve.severity}
                        </span>
                        <span
                          className="ml-auto"
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: TONE_COLORS[cvss],
                          }}
                        >
                          {cve.cvss.toFixed(1)}
                        </span>
                      </div>

                      <p
                        className="line-clamp-2 mb-3"
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        {cve.description}
                      </p>

                      <div className="flex items-center gap-2">
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
                          EPSS
                        </span>
                        <div
                          className="flex-1 h-1"
                          style={{
                            background: "var(--bjhunt-bg, #050507)",
                            border: "1px solid var(--bjhunt-border, #3d3a39)",
                            borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                          }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: epssWidth(cve.epss),
                              background:
                                cve.epss > 0.5 ? TONE_COLORS.critical : TONE_COLORS.warning,
                              borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 12,
                            color: "var(--bjhunt-text)",
                          }}
                        >
                          {(cve.epss * 100).toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </PlanGate>
  );
}
