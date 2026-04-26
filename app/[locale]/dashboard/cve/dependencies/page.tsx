"use client";

import { useState, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import Link from "next/link";
import { PageHero, Eyebrow } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Package,
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

interface PackageCve {
  cveId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  cvss: number;
  description: string;
}

interface PackageResult {
  name: string;
  version: string;
  cves: PackageCve[];
  highestSeverity: string | null;
  highestCvss: number | null;
}

interface ScanSummary {
  total: number;
  vulnerable: number;
  critical: number;
  high: number;
}

// ── Constants ───────────────────────────────────────────────────────────

const SEVERITY_TONE: Record<string, "critical" | "warning" | "success"> = {
  CRITICAL: "critical",
  HIGH: "critical",
  MEDIUM: "warning",
  LOW: "success",
};

const TONE_COLORS = {
  critical: "var(--bjhunt-status-danger, #fb565b)",
  warning: "var(--bjhunt-status-warning, #ffba00)",
  success: "var(--bjhunt-status-success, #00d992)",
};

const TONE_BG = {
  critical: "var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))",
  warning: "var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))",
  success: "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.12))",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  borderColor: "var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius-md, 8px)",
};

const SUPPORTED_FILES = [
  "requirements.txt",
  "package-lock.json",
  "package.json",
  "go.sum",
  "go.mod",
  "Cargo.lock",
  "pom.xml",
];

function cvssTone(score: number): "critical" | "warning" | "success" {
  if (score >= 7.0) return "critical";
  if (score >= 4.0) return "warning";
  return "success";
}

// ── Component ───────────────────────────────────────────────────────────

export default function DependencyScannerPage() {
  const { plan } = usePlan();
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PackageResult[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setResults([]);
    setSummary(null);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await browserBackendFetch("/api/cve/scan-dependencies", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Scan failed" }));
        setError(data.error || "Scan failed");
        return;
      }

      const data = await res.json();
      setResults(data.packages ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError("Network error during scan");
    } finally {
      setScanning(false);
    }
  };

  return (
    <PlanGate requiredPlan="pro" currentPlan={plan} featureName="Dependency Scanner">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
        <Link
          href="/dashboard/cve"
          className="inline-flex items-center gap-1 mb-4 transition-colors"
          style={{
            fontFamily: "var(--bjhunt-font-sans)",
            fontSize: 13,
            color: "var(--bjhunt-text-muted)",
          }}
        >
          <ChevronLeft size={14} />
          Back to CVE Intel
        </Link>

        <PageHero
          eyebrow="06.1 / DEPENDENCY SCANNER"
          title="Dependency Scanner"
          lede="Upload a lockfile to scan dependencies for known CVEs."
        />

        {/* Upload zone */}
        <div className="mb-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="border border-dashed px-6 py-10 text-center cursor-pointer transition-colors"
            style={{
              borderColor: dragOver
                ? "var(--bjhunt-status-success, #00d992)"
                : "var(--bjhunt-border, #3d3a39)",
              background: dragOver
                ? "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.06))"
                : "transparent",
              borderRadius: "var(--bjhunt-radius-md, 8px)",
            }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".txt,.json,.lock,.sum,.mod,.xml,.toml";
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFile(f);
              };
              input.click();
            }}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText
                  className="w-5 h-5"
                  style={{ color: "var(--bjhunt-status-success, #00d992)" }}
                />
                <div className="text-left">
                  <span
                    className="block"
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 14,
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {file.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            ) : (
              <>
                <Upload
                  className="w-6 h-6 mx-auto mb-3"
                  style={{ color: "var(--bjhunt-text-muted)" }}
                />
                <p
                  className="mb-2"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 14,
                    color: "var(--bjhunt-text)",
                  }}
                >
                  Drop a lockfile here or click to browse
                </p>
                <p
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 12,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  Supported: {SUPPORTED_FILES.join(", ")}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Button
              variant="state" state="success"
              size="md"
              onClick={handleScan}
              disabled={!file || scanning}
            >
              {scanning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  Scanning
                </>
              ) : (
                <>
                  <Package className="w-3 h-3 mr-2" />
                  Scan
                </>
              )}
            </Button>
            {error && (
              <span
                role="alert"
                style={{
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 13,
                  color: "var(--bjhunt-status-danger, #fb565b)",
                }}
              >
                {error}
              </span>
            )}
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <SummaryBadge label="Total" count={summary.total} tone="neutral" />
            <SummaryBadge label="Vulnerable" count={summary.vulnerable} tone="critical" />
            <SummaryBadge label="Critical" count={summary.critical} tone="critical" />
            <SummaryBadge label="High" count={summary.high} tone="critical" />
          </div>
        )}

        {results.length > 0 && (
          <div className="border" style={CARD_STYLE}>
            {/* Table header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{
                background: "var(--bjhunt-bg, #050507)",
                borderColor: "var(--bjhunt-border, #3d3a39)",
              }}
            >
              <div className="w-4 shrink-0" />
              <Th>Package</Th>
              <Th className="w-[100px] text-center">Version</Th>
              <Th className="w-[80px] text-center">CVEs</Th>
              <Th className="w-[110px] text-center hidden md:block">Highest Sev</Th>
              <Th className="w-[60px] text-center hidden md:block">CVSS</Th>
            </div>

            {results.map((pkg, idx) => {
              const isExpanded = expandedPkg === `${pkg.name}@${pkg.version}`;
              const hasVulns = pkg.cves.length > 0;
              const sevTone =
                hasVulns && pkg.highestSeverity
                  ? SEVERITY_TONE[pkg.highestSeverity] || "warning"
                  : "warning";

              return (
                <div
                  key={`${pkg.name}@${pkg.version}`}
                  style={{
                    borderTop:
                      idx === 0 ? "none" : "1px solid var(--bjhunt-border, #3d3a39)",
                  }}
                >
                  <button
                    onClick={() =>
                      hasVulns &&
                      setExpandedPkg(
                        isExpanded ? null : `${pkg.name}@${pkg.version}`
                      )
                    }
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      hasVulns
                        ? "hover:bg-white/[0.02] cursor-pointer"
                        : "cursor-default opacity-60"
                    )}
                  >
                    <div className="w-4 shrink-0" style={{ color: "var(--bjhunt-text-muted)" }}>
                      {hasVulns &&
                        (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span
                        className="truncate block"
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 13,
                          color: "var(--bjhunt-text)",
                        }}
                      >
                        {pkg.name}
                      </span>
                    </div>

                    <Cell width={100}>{pkg.version}</Cell>

                    <Cell width={80}>
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: hasVulns
                            ? "var(--bjhunt-status-danger, #fb565b)"
                            : "var(--bjhunt-text-muted)",
                        }}
                      >
                        {pkg.cves.length}
                      </span>
                    </Cell>

                    <Cell width={110} hideOnMobile>
                      {pkg.highestSeverity ? (
                        <span
                          className="inline-flex items-center"
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: TONE_COLORS[sevTone],
                            border: `1px solid ${TONE_COLORS[sevTone]}`,
                            background: TONE_BG[sevTone],
                            borderRadius: "var(--bjhunt-radius-sm, 4px)",
                            padding: "2px 6px",
                          }}
                        >
                          {pkg.highestSeverity}
                        </span>
                      ) : (
                        <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>
                      )}
                    </Cell>

                    <Cell width={60} hideOnMobile>
                      {pkg.highestCvss != null ? (
                        <span
                          style={{
                            fontFamily: "var(--bjhunt-font-mono)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: TONE_COLORS[cvssTone(pkg.highestCvss)],
                          }}
                        >
                          {pkg.highestCvss.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>
                      )}
                    </Cell>
                  </button>

                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-0"
                      style={{ background: "var(--bjhunt-bg, #050507)" }}
                    >
                      <div
                        className="pl-7 ml-1.5 space-y-3 pt-3"
                        style={{ borderLeft: "1px solid var(--bjhunt-border-strong, #5a5654)" }}
                      >
                        {pkg.cves.map((cve) => {
                          const cTone = SEVERITY_TONE[cve.severity] || "warning";
                          return (
                            <div key={cve.cveId}>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                    color: TONE_COLORS[cTone],
                                    background: TONE_BG[cTone],
                                    border: `1px solid ${TONE_COLORS[cTone]}`,
                                    borderRadius: "var(--bjhunt-radius-sm, 4px)",
                                    padding: "1px 5px",
                                  }}
                                >
                                  {cve.severity}
                                </span>
                                <span
                                  style={{
                                    fontFamily: "var(--bjhunt-font-mono)",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: TONE_COLORS[cvssTone(cve.cvss)],
                                  }}
                                >
                                  CVSS {cve.cvss.toFixed(1)}
                                </span>
                                <a
                                  href={`https://nvd.nist.gov/vuln/detail/${cve.cveId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 ml-auto transition-colors"
                                  style={{
                                    fontFamily: "var(--bjhunt-font-sans)",
                                    fontSize: 12,
                                    color: "var(--bjhunt-text-muted)",
                                  }}
                                >
                                  <ExternalLink size={10} />
                                  NVD
                                </a>
                              </div>
                              <p
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!scanning && results.length === 0 && !summary && (
          <div className="border px-4 py-16 text-center" style={CARD_STYLE}>
            <Package
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
              Upload a lockfile to begin scanning
            </p>
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: 13,
                color: "var(--bjhunt-text-muted)",
              }}
            >
              The scanner checks package versions against known vulnerability databases.
            </p>
          </div>
        )}
      </div>
    </PlanGate>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("flex-1", className)}
      style={{
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--bjhunt-text-muted)",
      }}
    >
      {children}
    </div>
  );
}

function Cell({
  children,
  width,
  hideOnMobile = false,
}: {
  children: React.ReactNode;
  width: number;
  hideOnMobile?: boolean;
}) {
  return (
    <div
      className={cn("shrink-0 text-center", hideOnMobile && "hidden md:block")}
      style={{
        width,
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 13,
        color: "var(--bjhunt-text)",
      }}
    >
      {children}
    </div>
  );
}

function SummaryBadge({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "critical" | "warning" | "success" | "neutral";
}) {
  const colors = {
    critical: TONE_COLORS.critical,
    warning: TONE_COLORS.warning,
    success: TONE_COLORS.success,
    neutral: "var(--bjhunt-text-muted, #8b949e)",
  };
  const bgs = {
    critical: TONE_BG.critical,
    warning: TONE_BG.warning,
    success: TONE_BG.success,
    neutral: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 border"
      style={{
        borderColor: colors[tone],
        background: bgs[tone],
        borderRadius: "var(--bjhunt-radius, 6px)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: colors[tone],
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: 14,
          fontWeight: 600,
          color: colors[tone],
        }}
      >
        {count}
      </span>
    </div>
  );
}
