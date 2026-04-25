"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import {
  Database,
  Shield,
  Key,
  Lock,
  Upload,
  Loader2,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Users,
  Monitor,
  Network,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

interface ADTechnique {
  id: string;
  name: string;
  description: string;
  mitre: string;
  risk: "HIGH" | "CRITICAL";
  enabled: boolean;
}

interface BloodhoundSummary {
  usersCount: number;
  groupsCount: number;
  computersCount: number;
  domainTrusts: number;
  pathsToDa: number;
  fileName: string;
}

interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string | null;
  mitreAttack: string[] | null;
  remediation: string | null;
  evidence: Record<string, unknown> | null;
}

interface AttackChain {
  steps: { label: string; technique: string; severity: string }[];
}

interface AssessmentResult {
  engagementId: string;
  status: "running" | "completed" | "failed";
  findings: Finding[];
  chains: AttackChain[];
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

const RISK_COLORS: Record<string, string> = {
  HIGH: "var(--severity-high)",
  CRITICAL: "var(--severity-critical)",
};

const DEFAULT_TECHNIQUES: ADTechnique[] = [
  {
    id: "kerberoast",
    name: "Kerberoasting",
    description: "Extract service account hashes via SPN requests",
    mitre: "T1558.003",
    risk: "HIGH",
    enabled: true,
  },
  {
    id: "asrep_roast",
    name: "AS-REP Roasting",
    description: "Extract hashes for accounts without Kerberos preauth",
    mitre: "T1558.004",
    risk: "HIGH",
    enabled: true,
  },
  {
    id: "adcs",
    name: "ADCS ESC1-ESC15",
    description: "Certificate template abuse for privilege escalation",
    mitre: "T1649",
    risk: "CRITICAL",
    enabled: true,
  },
  {
    id: "dcsync",
    name: "DCSync",
    description: "Replicate domain credentials via DRS replication",
    mitre: "T1003.006",
    risk: "CRITICAL",
    enabled: false,
  },
  {
    id: "golden_ticket",
    name: "Golden Ticket",
    description: "Forge Kerberos TGT with krbtgt hash",
    mitre: "T1558.001",
    risk: "CRITICAL",
    enabled: false,
  },
  {
    id: "pth",
    name: "Pass-the-Hash",
    description: "Lateral movement using NTLM hash authentication",
    mitre: "T1550.002",
    risk: "HIGH",
    enabled: false,
  },
  {
    id: "bloodhound_path",
    name: "BloodHound Path",
    description: "Shortest path analysis to Domain Admin",
    mitre: "\u2014",
    risk: "HIGH",
    enabled: true,
  },
];

// ── Component ───────────────────────────────────────────────────────────

export default function ADAssessmentPage() {
  const { plan } = usePlan();
  const [techniques, setTechniques] = useState<ADTechnique[]>(DEFAULT_TECHNIQUES);
  const [bloodhound, setBloodhound] = useState<BloodhoundSummary | null>(null);
  const [bhUploading, setBhUploading] = useState(false);
  const [bhDragOver, setBhDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target config
  const [domainName, setDomainName] = useState("");
  const [dcHostname, setDcHostname] = useState("");
  const [adUsername, setAdUsername] = useState("");
  const [adPassword, setAdPassword] = useState("");
  const [scope, setScope] = useState<"full" | "specific">("full");
  const [specificOUs, setSpecificOUs] = useState("");

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  // ── Technique toggle ───────────────────────────────────────────────────

  const toggleTechnique = useCallback((id: string) => {
    setTechniques((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  }, []);

  // ── BloodHound upload ──────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    const validTypes = [".zip", ".json"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validTypes.includes(ext)) {
      setLaunchError(
        ext === ""
          ? "Upload a BloodHound .zip or .json file."
          : `Unsupported file type ${ext}. Only .zip and .json are accepted.`,
      );
      return;
    }

    setBhUploading(true);
    setLaunchError(null);
    try {
      // DASH-P0-1: previous implementation generated Math.random() counts
      // and presented them as real BloodHound parse results. That's now
      // replaced by an honest client-side count of objects in JSON files
      // (we count top-level entries by type) and a "pending backend
      // ingest" placeholder for .zip files. Full extraction lives on the
      // backend `/api/engagements/:id/graph/ingest` endpoint and is
      // wired at scan-launch time, not at upload.
      let summary: BloodhoundSummary = {
        usersCount: 0,
        groupsCount: 0,
        computersCount: 0,
        domainTrusts: 0,
        pathsToDa: 0,
        fileName: file.name,
      };

      if (ext === ".json") {
        const text = await file.text();
        try {
          const json = JSON.parse(text);
          const items: any[] = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.users)
            ? json.users
            : Array.isArray(json.computers)
            ? json.computers
            : [];
          for (const it of items) {
            const t = (it?.Properties?.objecttype || it?.type || "").toLowerCase();
            if (t === "user") summary.usersCount += 1;
            else if (t === "group") summary.groupsCount += 1;
            else if (t === "computer" || t === "host") summary.computersCount += 1;
            else if (t === "domain") summary.domainTrusts += 1;
          }
        } catch (err) {
          console.error("[ad] BloodHound JSON parse failed", err);
          setLaunchError("Could not parse BloodHound JSON. Verify the file is valid.");
          return;
        }
      }
      // .zip files are kept as-is; backend will extract on ingest.

      setBloodhound(summary);
    } finally {
      setBhUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setBhDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setBhDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setBhDragOver(false);
  }, []);

  // ── Launch assessment ──────────────────────────────────────────────────

  const handleLaunch = () => {
    if (!domainName.trim()) return;

    startTransition(async () => {
      const enabledTechniques = techniques.filter((t) => t.enabled).map((t) => t.id);

      const adConfig: Record<string, unknown> = {
        domain: domainName,
        dcHostname: dcHostname || undefined,
        techniques: enabledTechniques,
        scope: scope,
        specificOUs: scope === "specific" ? specificOUs : undefined,
        hasBloodhound: !!bloodhound,
      };

      if (adUsername.trim()) {
        adConfig.credentials = { username: adUsername, password: adPassword };
      }

      try {
        const createRes = await browserBackendFetch("/api/engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `AD Scan - ${domainName}`,
            target: domainName,
            targetType: "ad",
            agentGraph: "ad_operator",
            config: adConfig,
          }),
        });

        if (!createRes.ok) return;
        const { engagement } = await createRes.json();

        // Launch
        await browserBackendFetch(`/api/engagements/${engagement.id}/launch`, {
          method: "POST",
        });

        setResult({
          engagementId: engagement.id,
          status: "running",
          findings: [],
          chains: [],
        });

        // Poll for findings — surface failures so user knows to refresh
        let consecutiveFailures = 0;
        const interval = setInterval(async () => {
          try {
            const findingsRes = await browserBackendFetch(`/api/engagements/${engagement.id}/findings`);
            if (findingsRes.ok) {
              const { findings } = await findingsRes.json();
              const chains = buildAttackChains(findings || []);
              setResult((prev) =>
                prev ? { ...prev, findings: findings || [], chains } : prev
              );
            } else if (findingsRes.status >= 500) {
              throw new Error(`Findings poll: HTTP ${findingsRes.status}`);
            }

            const engRes = await browserBackendFetch(`/api/engagements/${engagement.id}`);
            if (engRes.ok) {
              const { engagement: eng } = await engRes.json();
              if (eng.status === "completed" || eng.status === "failed" || eng.status === "cancelled") {
                setResult((prev) =>
                  prev ? { ...prev, status: eng.status } : prev
                );
                clearInterval(interval);
                setPollInterval(null);
              }
            }
            consecutiveFailures = 0;
            setPollError(null);
          } catch (err) {
            consecutiveFailures += 1;
            console.error("[ad-scan] poll failure", err);
            if (consecutiveFailures >= 3) {
              setPollError("Connection to scan poller lost — results may be stale. Refresh the page if this persists.");
            }
          }
        }, 5000);

        setPollInterval(interval);
      } catch (err) {
        console.error("[ad-scan] launch failed", err);
        setLaunchError(err instanceof Error ? err.message : "Failed to launch AD scan. Please retry.");
      }
    });
  };

  // ── Build attack chains from findings ──────────────────────────────────

  function buildAttackChains(findings: Finding[]): AttackChain[] {
    if (findings.length === 0) return [];

    const chains: AttackChain[] = [];
    const criticalHigh = findings.filter(
      (f) => f.severity === "critical" || f.severity === "high"
    );

    if (criticalHigh.length >= 2) {
      // Build primary chain
      const steps = criticalHigh.map((f) => ({
        label: f.title,
        technique: f.mitreAttack?.[0] || "",
        severity: f.severity,
      }));
      chains.push({ steps });
    }

    // Individual critical findings as single-step chains
    findings
      .filter((f) => f.severity === "critical")
      .forEach((f) => {
        chains.push({
          steps: [
            { label: "Initial Access", technique: "", severity: "info" },
            { label: f.title, technique: f.mitreAttack?.[0] || "", severity: f.severity },
            { label: "Domain Admin", technique: "", severity: "critical" },
          ],
        });
      });

    return chains;
  }

  // ── Severity breakdown ─────────────────────────────────────────────────

  const severityCounts = result?.findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  const enabledCount = techniques.filter((t) => t.enabled).length;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <PlanGate requiredPlan="enterprise" currentPlan={plan} featureName="Active Directory Assessment">
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[14px] font-mono font-bold uppercase tracking-widest text-white">
          Active Directory Scan
        </h1>
        <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-1">
          AD Operator agent — BloodHound, Kerberoast, ADCS abuse, DCSync, golden ticket
        </p>
      </div>

      {(launchError || pollError) && (
        <div
          role="alert"
          className="mb-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] font-mono text-red-300 flex items-center justify-between gap-3"
        >
          <span>{launchError ?? pollError}</span>
          <button
            type="button"
            onClick={() => {
              setLaunchError(null);
              setPollError(null);
            }}
            className="text-red-200 hover:text-white"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Section 1: BloodHound Upload */}
      <div className="border border-[var(--border)] mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
            BloodHound Data Upload
          </h2>
          <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-0.5">
            Upload BloodHound collection data for attack path analysis
          </p>
        </div>

        <div className="p-4">
          {!bloodhound ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                bhDragOver
                  ? "border-white bg-[var(--bg-card)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {bhUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Parsing BloodHound data...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-[var(--text-muted)]" />
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Drop BloodHound ZIP or JSON file here
                  </span>
                  <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                    or click to browse
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-[var(--border)]">
              <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-[var(--text-muted)]" />
                  <span className="text-[10px] font-mono text-white">{bloodhound.fileName}</span>
                </div>
                <button
                  onClick={() => setBloodhound(null)}
                  className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-5 divide-x divide-[var(--border)]">
                {[
                  { label: "Users", value: bloodhound.usersCount, icon: Users },
                  { label: "Groups", value: bloodhound.groupsCount, icon: Network },
                  { label: "Computers", value: bloodhound.computersCount, icon: Monitor },
                  { label: "Domain Trusts", value: bloodhound.domainTrusts, icon: Shield },
                  { label: "Paths to DA", value: bloodhound.pathsToDa, icon: Key },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="px-3 py-3 text-center">
                      <Icon className="w-3 h-3 text-[var(--text-subtle)] mx-auto mb-1" />
                      <div className="text-[14px] font-mono font-bold text-white">
                        {stat.value.toLocaleString()}
                      </div>
                      <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)]">
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Attack Technique Selector */}
      <div className="border border-[var(--border)] mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
              Attack Techniques
            </h2>
            <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-0.5">
              Select techniques to include in the scan
            </p>
          </div>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {enabledCount}/{techniques.length} enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 divide-x divide-[var(--border)]">
          {techniques.map((tech) => (
            <div
              key={tech.id}
              className={cn(
                "border-b border-[var(--border)] p-3 transition-colors cursor-pointer",
                tech.enabled ? "bg-[var(--bg-card)]" : "hover:bg-[var(--bg-card)]"
              )}
              onClick={() => toggleTechnique(tech.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 transition-colors",
                      tech.enabled
                        ? "border-[var(--success)] bg-[var(--success)]"
                        : "border-[var(--border-strong)]"
                    )}
                  >
                    {tech.enabled && <CheckCircle className="w-2.5 h-2.5 text-black" />}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold uppercase tracking-wider truncate",
                      tech.enabled ? "text-white" : "text-[var(--text-muted)]"
                    )}
                  >
                    {tech.name}
                  </span>
                </div>
                <span
                  className="text-[7px] font-mono uppercase tracking-widest px-1 py-0.5 border flex-shrink-0 ml-2"
                  style={{
                    borderColor: RISK_COLORS[tech.risk],
                    color: RISK_COLORS[tech.risk],
                  }}
                >
                  {tech.risk}
                </span>
              </div>
              <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed mb-2">
                {tech.description}
              </p>
              {tech.mitre !== "\u2014" && (
                <span className="text-[8px] font-mono px-1 py-0.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-subtle)]">
                  {tech.mitre}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Target Configuration */}
      <div className="border border-[var(--border)] mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
            Target Configuration
          </h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                Domain Name *
              </label>
              <input
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                placeholder="corp.example.com"
              />
            </div>
            <div>
              <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                Domain Controller IP / Hostname
              </label>
              <input
                value={dcHostname}
                onChange={(e) => setDcHostname(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                placeholder="dc01.corp.example.com or 10.0.0.10"
              />
            </div>
          </div>

          {/* Credentials (optional) */}
          <div>
            <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
              Credentials (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={adUsername}
                onChange={(e) => setAdUsername(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                placeholder="CORP\username or user@corp.example.com"
              />
              <input
                type="password"
                value={adPassword}
                onChange={(e) => setAdPassword(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                placeholder="Password or NTLM hash"
              />
            </div>
            <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
              Provide domain credentials for authenticated enumeration. Supports password or NTLM hash.
            </p>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
              Scan Scope
            </label>
            <div className="flex gap-2 mb-2">
              {(["full", "specific"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-mono border transition-colors uppercase tracking-wider",
                    scope === s
                      ? "border-white text-white bg-[var(--bg-card)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white"
                  )}
                >
                  {s === "full" ? "Full Domain" : "Specific OUs"}
                </button>
              ))}
            </div>
            {scope === "specific" && (
              <textarea
                value={specificOUs}
                onChange={(e) => setSpecificOUs(e.target.value)}
                rows={3}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                placeholder={"OU=Engineering,DC=corp,DC=example,DC=com\nOU=IT,DC=corp,DC=example,DC=com"}
              />
            )}
          </div>
        </div>

        {/* Launch */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
          <div className="text-[9px] font-mono text-[var(--text-subtle)]">
            Agent: <span className="text-white">AD Operator</span> |
            Techniques: <span className="text-white">{enabledCount}</span> |
            Scope: <span className="text-white">{scope === "full" ? "Full Domain" : "Specific OUs"}</span>
          </div>
          <button
            onClick={handleLaunch}
            disabled={isPending || result?.status === "running" || !domainName.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-white text-black hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isPending || result?.status === "running" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Database className="w-3 h-3" />
            )}
            {result?.status === "running" ? "Running..." : "Start AD Scan"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="border border-[var(--border)]">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                Scan Results
              </h2>
              <span
                className={cn(
                  "text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border",
                  result.status === "running"
                    ? "border-[var(--warning)] text-[var(--warning)]"
                    : result.status === "completed"
                      ? "border-[var(--success)] text-[var(--success)]"
                      : "border-[var(--danger)] text-[var(--danger)]"
                )}
              >
                {result.status}
              </span>
            </div>
            {result.status === "running" && (
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--warning)]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Polling for findings...
              </div>
            )}
          </div>

          {/* Severity summary */}
          {result.findings.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-4">
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
              </span>
              {(["critical", "high", "medium", "low", "info"] as const).map((sev) => {
                const count = severityCounts[sev] || 0;
                if (count === 0) return null;
                return (
                  <span
                    key={sev}
                    className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
                    style={{
                      borderColor: SEVERITY_COLORS[sev],
                      color: SEVERITY_COLORS[sev],
                      backgroundColor: SEVERITY_BG[sev],
                    }}
                  >
                    {count} {sev}
                  </span>
                );
              })}
            </div>
          )}

          {/* Attack chains */}
          {result.chains.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-2">
                Attack Chains
              </div>
              <div className="space-y-2">
                {result.chains.map((chain, ci) => (
                  <div key={ci} className="flex items-center gap-0 overflow-x-auto pb-1">
                    {chain.steps.map((step, si) => (
                      <div key={si} className="flex items-center flex-shrink-0">
                        <div
                          className="px-2.5 py-1.5 border text-[9px] font-mono max-w-[200px] truncate"
                          style={{
                            borderColor: SEVERITY_COLORS[step.severity] || "var(--border)",
                            color: SEVERITY_COLORS[step.severity] || "var(--text-muted)",
                            backgroundColor: SEVERITY_BG[step.severity] || "transparent",
                          }}
                          title={step.label}
                        >
                          <div className="truncate">{step.label}</div>
                          {step.technique && (
                            <div className="text-[7px] text-[var(--text-subtle)] mt-0.5">
                              {step.technique}
                            </div>
                          )}
                        </div>
                        {si < chain.steps.length - 1 && (
                          <ChevronRight
                            className="w-3 h-3 flex-shrink-0 mx-1"
                            style={{
                              color: SEVERITY_COLORS[step.severity] || "var(--text-subtle)",
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings list */}
          {result.findings.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
              {result.status === "running"
                ? "Waiting for findings..."
                : "No findings detected."}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {result.findings.map((f) => (
                <div key={f.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: SEVERITY_COLORS[f.severity] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-white font-bold">
                          {f.title}
                        </span>
                        <span
                          className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border"
                          style={{
                            borderColor: SEVERITY_COLORS[f.severity],
                            color: SEVERITY_COLORS[f.severity],
                          }}
                        >
                          {f.severity}
                        </span>
                        {f.mitreAttack?.map((m) => (
                          <span
                            key={m}
                            className="text-[8px] font-mono px-1 py-0.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-subtle)]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      {f.description && (
                        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 leading-relaxed">
                          {f.description}
                        </p>
                      )}
                      {f.remediation && (
                        <div className="mt-2 px-3 py-2 border-l-2 border-[var(--success)] bg-[var(--success-dim)]">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--success)] block mb-0.5">
                            Remediation
                          </span>
                          <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                            {f.remediation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </PlanGate>
  );
}
