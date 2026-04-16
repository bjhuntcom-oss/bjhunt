"use client";

import { useState, useCallback } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import Link from "next/link";
import {
  Upload,
  Package,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
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

const SUPPORTED_FILES = [
  "requirements.txt",
  "package-lock.json",
  "package.json",
  "go.sum",
  "go.mod",
  "Cargo.lock",
  "pom.xml",
];

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

  const cvssColor = (score: number): string => {
    if (score >= 9.0) return "#ff4444";
    if (score >= 7.0) return "#ff6b35";
    if (score >= 4.0) return "#ff9900";
    return "#00cc8a";
  };

  return (
    <PlanGate requiredPlan="pro" currentPlan={plan} featureName="Dependency Scanner">
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/cve"
          className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={12} />
          Back to CVE Intel
        </Link>

        <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.2em] text-white">
          DEPENDENCY SCANNER
        </h1>
        <p className="text-[10px] text-[var(--text-subtle)] font-mono mt-1">
          Upload a lockfile to scan dependencies for known CVEs
        </p>
      </div>

      {/* Upload zone */}
      <div className="mb-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border border-dashed px-6 py-8 text-center cursor-pointer transition-colors",
            dragOver
              ? "border-white bg-[var(--bg-card)]"
              : "border-[var(--border)] hover:border-[var(--border-strong)]",
          )}
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
              <FileText className="w-5 h-5 text-[var(--success)]" />
              <div className="text-left">
                <span className="text-[11px] font-mono text-white block">{file.name}</span>
                <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-[var(--text-subtle)] mx-auto mb-2" />
              <p className="text-[11px] font-mono text-[var(--text-muted)] mb-1">
                Drop a lockfile here or click to browse
              </p>
              <p className="text-[9px] font-mono text-[var(--text-subtle)]">
                Supported: {SUPPORTED_FILES.join(", ")}
              </p>
            </>
          )}
        </div>

        {/* Scan button */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleScan}
            disabled={!file || scanning}
            className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-5 py-2.5 bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {scanning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Package className="w-3 h-3" />
                Scan
              </>
            )}
          </button>

          {error && (
            <span className="text-[9px] font-mono text-[var(--danger)]">{error}</span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <SummaryBadge label="TOTAL" count={summary.total} color="var(--text-muted)" bg="var(--bg-card)" />
          <SummaryBadge label="VULNERABLE" count={summary.vulnerable} color="#ff4444" bg="rgba(255,68,68,0.08)" />
          <SummaryBadge label="CRITICAL" count={summary.critical} color="#ff4444" bg="rgba(255,68,68,0.08)" />
          <SummaryBadge label="HIGH" count={summary.high} color="#ff6b35" bg="rgba(255,107,53,0.08)" />
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-card)]">
            <div className="w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
              Package
            </div>
            <div className="w-[80px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-center">
              Version
            </div>
            <div className="w-[80px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-center">
              CVEs Found
            </div>
            <div className="w-[100px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-center hidden md:block">
              Highest Sev
            </div>
            <div className="w-[60px] flex-shrink-0 text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] text-center hidden md:block">
              CVSS
            </div>
          </div>

          {/* Package rows */}
          {results.map((pkg) => {
            const isExpanded = expandedPkg === `${pkg.name}@${pkg.version}`;
            const hasVulns = pkg.cves.length > 0;
            const sevColor = hasVulns && pkg.highestSeverity
              ? SEVERITY_COLORS[pkg.highestSeverity] || "var(--text-muted)"
              : "var(--text-muted)";

            return (
              <div key={`${pkg.name}@${pkg.version}`}>
                <button
                  onClick={() =>
                    hasVulns && setExpandedPkg(isExpanded ? null : `${pkg.name}@${pkg.version}`)
                  }
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    hasVulns
                      ? "hover:bg-[var(--bg-card)]/50 cursor-pointer"
                      : "cursor-default opacity-60",
                  )}
                >
                  {/* Chevron */}
                  <div className="w-4 flex-shrink-0 text-[var(--text-subtle)]">
                    {hasVulns && (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                  </div>

                  {/* Package name */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-white truncate block">
                      {pkg.name}
                    </span>
                  </div>

                  {/* Version */}
                  <div className="w-[80px] flex-shrink-0 text-center">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                      {pkg.version}
                    </span>
                  </div>

                  {/* CVEs count */}
                  <div className="w-[80px] flex-shrink-0 text-center">
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{ color: hasVulns ? "#ff4444" : "var(--text-subtle)" }}
                    >
                      {pkg.cves.length}
                    </span>
                  </div>

                  {/* Severity */}
                  <div className="w-[100px] flex-shrink-0 text-center hidden md:block">
                    {pkg.highestSeverity ? (
                      <span
                        className="inline-block text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5"
                        style={{
                          color: sevColor,
                          background: pkg.highestSeverity ? SEVERITY_BG[pkg.highestSeverity] || "transparent" : "transparent",
                          border: `1px solid ${sevColor}`,
                        }}
                      >
                        {pkg.highestSeverity}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-[var(--text-subtle)]">--</span>
                    )}
                  </div>

                  {/* CVSS */}
                  <div className="w-[60px] flex-shrink-0 text-center hidden md:block">
                    {pkg.highestCvss != null ? (
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{ color: cvssColor(pkg.highestCvss) }}
                      >
                        {pkg.highestCvss.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-[var(--text-subtle)]">--</span>
                    )}
                  </div>
                </button>

                {/* Expanded CVE details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 bg-[var(--bg-card)]/30">
                    <div className="pl-7 border-l border-[var(--border-strong)] ml-1.5 space-y-3">
                      {pkg.cves.map((cve) => {
                        const cSevColor = SEVERITY_COLORS[cve.severity] || "#999";
                        return (
                          <div key={cve.cveId} className="pt-2">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-mono font-bold" style={{ color: "#00cc8a" }}>
                                {cve.cveId}
                              </span>
                              <span
                                className="text-[7px] font-mono font-bold uppercase tracking-widest px-1 py-0.5"
                                style={{
                                  color: cSevColor,
                                  background: SEVERITY_BG[cve.severity] || "transparent",
                                  border: `1px solid ${cSevColor}`,
                                }}
                              >
                                {cve.severity}
                              </span>
                              <span
                                className="text-[9px] font-mono font-bold"
                                style={{ color: cvssColor(cve.cvss) }}
                              >
                                CVSS {cve.cvss.toFixed(1)}
                              </span>
                              <a
                                href={`https://nvd.nist.gov/vuln/detail/${cve.cveId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-[8px] font-mono text-[var(--text-subtle)] hover:text-white transition-colors ml-auto"
                              >
                                <ExternalLink size={8} />
                                NVD
                              </a>
                            </div>
                            <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
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

      {/* No results yet */}
      {!scanning && results.length === 0 && !summary && (
        <div className="border border-[var(--border)] px-4 py-16 text-center">
          <Package size={28} className="mx-auto mb-3 text-[var(--text-subtle)]" />
          <p className="text-[11px] font-mono text-[var(--text-muted)] mb-1">
            Upload a lockfile to begin scanning
          </p>
          <p className="text-[10px] font-mono text-[var(--text-subtle)]">
            The scanner checks package versions against known vulnerability databases.
          </p>
        </div>
      )}
    </div>
    </PlanGate>
  );
}

// ── SummaryBadge ────────────────────────────────────────────────────────

function SummaryBadge({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 border"
      style={{ borderColor: color, background: bg }}
    >
      <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span className="text-[11px] font-mono font-bold" style={{ color }}>
        {count}
      </span>
    </div>
  );
}
