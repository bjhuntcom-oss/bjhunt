"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useParams } from "next/navigation";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import { PageHero, Eyebrow, StatusDot } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import {
  Database,
  Shield,
  Key,
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

// ── Tokens ──────────────────────────────────────────────────────────────

const SEVERITY_TONE: Record<string, "critical" | "warning" | "success" | "neutral"> = {
  critical: "critical",
  high: "critical",
  medium: "warning",
  low: "success",
  info: "neutral",
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

const RISK_TONE: Record<string, "critical" | "warning"> = {
  CRITICAL: "critical",
  HIGH: "warning",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  borderColor: "var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius-md, 8px)",
};

const INPUT_STYLE: React.CSSProperties = {
  fontFamily: "var(--bjhunt-font-mono)",
  fontSize: 13,
  color: "var(--bjhunt-text)",
  background: "var(--bjhunt-bg, #050507)",
  border: "1px solid var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius, 6px)",
  padding: "8px 12px",
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--bjhunt-font-sans)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--bjhunt-text)",
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
    mitre: "—",
    risk: "HIGH",
    enabled: true,
  },
];

// ── Component ───────────────────────────────────────────────────────────

export default function ADAssessmentPage() {
  const { plan } = usePlan();
  const params = useParams();
  const isFr = ((params?.locale as string) || "fr") === "fr";
  const [techniques, setTechniques] = useState<ADTechnique[]>(DEFAULT_TECHNIQUES);
  const [bloodhound, setBloodhound] = useState<BloodhoundSummary | null>(null);
  const [bhUploading, setBhUploading] = useState(false);
  const [bhDragOver, setBhDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const toggleTechnique = useCallback((id: string) => {
    setTechniques((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    const validTypes = [".zip", ".json"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validTypes.includes(ext)) {
      setLaunchError(
        ext === ""
          ? "Upload a BloodHound .zip or .json file."
          : `Unsupported file type ${ext}. Only .zip and .json are accepted.`
      );
      return;
    }

    setBhUploading(true);
    setLaunchError(null);
    try {
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

        await browserBackendFetch(`/api/engagements/${engagement.id}/launch`, {
          method: "POST",
        });

        setResult({
          engagementId: engagement.id,
          status: "running",
          findings: [],
          chains: [],
        });

        let consecutiveFailures = 0;
        const interval = setInterval(async () => {
          try {
            const findingsRes = await browserBackendFetch(
              `/api/engagements/${engagement.id}/findings`
            );
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
              if (
                eng.status === "completed" ||
                eng.status === "failed" ||
                eng.status === "cancelled"
              ) {
                setResult((prev) => (prev ? { ...prev, status: eng.status } : prev));
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
              setPollError(
                "Connection to scan poller lost — results may be stale. Refresh the page if this persists."
              );
            }
          }
        }, 5000);

        setPollInterval(interval);
      } catch (err) {
        console.error("[ad-scan] launch failed", err);
        setLaunchError(
          err instanceof Error ? err.message : "Failed to launch AD scan. Please retry."
        );
      }
    });
  };

  function buildAttackChains(findings: Finding[]): AttackChain[] {
    if (findings.length === 0) return [];

    const chains: AttackChain[] = [];
    const criticalHigh = findings.filter(
      (f) => f.severity === "critical" || f.severity === "high"
    );

    if (criticalHigh.length >= 2) {
      const steps = criticalHigh.map((f) => ({
        label: f.title,
        technique: f.mitreAttack?.[0] || "",
        severity: f.severity,
      }));
      chains.push({ steps });
    }

    findings
      .filter((f) => f.severity === "critical")
      .forEach((f) => {
        chains.push({
          steps: [
            { label: "Initial Access", technique: "", severity: "info" },
            {
              label: f.title,
              technique: f.mitreAttack?.[0] || "",
              severity: f.severity,
            },
            { label: "Domain Admin", technique: "", severity: "critical" },
          ],
        });
      });

    return chains;
  }

  const severityCounts =
    result?.findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) || {};

  const enabledCount = techniques.filter((t) => t.enabled).length;

  return (
    <PlanGate requiredPlan="enterprise" currentPlan={plan} featureName="Active Directory Assessment">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
        <PageHero
          eyebrow="08 / ACTIVE DIRECTORY"
          title={isFr ? "Audit Active Directory" : "Active Directory Scan"}
          lede={
            isFr
              ? "Agent AD Operator — BloodHound, Kerberoast, ADCS abuse, DCSync, golden ticket."
              : "AD Operator agent — BloodHound, Kerberoast, ADCS abuse, DCSync, golden ticket."
          }
        />

        {(launchError || pollError) && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 flex items-center justify-between gap-3"
            style={{
              border: "1px solid var(--bjhunt-status-danger, #fb565b)",
              background: "var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))",
              color: "var(--bjhunt-status-danger, #fb565b)",
              fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 13,
              borderRadius: "var(--bjhunt-radius, 6px)",
            }}
          >
            <span>{launchError ?? pollError}</span>
            <button
              type="button"
              onClick={() => {
                setLaunchError(null);
                setPollError(null);
              }}
              aria-label="Dismiss"
              style={{ color: "currentColor" }}
            >
              ×
            </button>
          </div>
        )}

        {/* Section 1: BloodHound Upload */}
        <section className="mb-8">
          <div className="mb-3">
            <Eyebrow>BloodHound Data Upload</Eyebrow>
          </div>
          <div className="border" style={CARD_STYLE}>
            <div className="p-6">
              {!bloodhound ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed p-10 text-center cursor-pointer transition-colors"
                  style={{
                    borderColor: bhDragOver
                      ? "var(--bjhunt-status-success, #00d992)"
                      : "var(--bjhunt-border, #3d3a39)",
                    background: bhDragOver
                      ? "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.06))"
                      : "transparent",
                    borderRadius: "var(--bjhunt-radius-md, 8px)",
                  }}
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
                      <Loader2
                        className="w-6 h-6 animate-spin"
                        style={{ color: "var(--bjhunt-text-muted)" }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 13,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        Parsing BloodHound data...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload
                        className="w-6 h-6"
                        style={{ color: "var(--bjhunt-text-muted)" }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontSize: 14,
                          color: "var(--bjhunt-text)",
                        }}
                      >
                        Drop BloodHound ZIP or JSON file here
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          color: "var(--bjhunt-text-muted)",
                        }}
                      >
                        or click to browse
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="border"
                  style={{
                    borderColor: "var(--bjhunt-border, #3d3a39)",
                    borderRadius: "var(--bjhunt-radius-md, 8px)",
                  }}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between border-b"
                    style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText
                        className="w-4 h-4"
                        style={{ color: "var(--bjhunt-text-muted)" }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 13,
                          color: "var(--bjhunt-text)",
                        }}
                      >
                        {bloodhound.fileName}
                      </span>
                    </div>
                    <button
                      onClick={() => setBloodhound(null)}
                      className="transition-colors"
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--bjhunt-status-danger, #fb565b)",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5">
                    {[
                      { label: "Users", value: bloodhound.usersCount, icon: Users },
                      { label: "Groups", value: bloodhound.groupsCount, icon: Network },
                      { label: "Computers", value: bloodhound.computersCount, icon: Monitor },
                      { label: "Domain Trusts", value: bloodhound.domainTrusts, icon: Shield },
                      { label: "Paths to DA", value: bloodhound.pathsToDa, icon: Key },
                    ].map((stat, idx) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className="px-4 py-4 text-center"
                          style={{
                            borderLeft:
                              idx === 0
                                ? "none"
                                : "1px solid var(--bjhunt-border, #3d3a39)",
                          }}
                        >
                          <Icon
                            className="w-4 h-4 mx-auto mb-2"
                            style={{ color: "var(--bjhunt-text-muted)" }}
                          />
                          <div
                            style={{
                              fontFamily: "var(--bjhunt-font-mono)",
                              fontSize: 24,
                              fontWeight: 600,
                              color: "var(--bjhunt-text)",
                            }}
                          >
                            {stat.value.toLocaleString()}
                          </div>
                          <Eyebrow>{stat.label}</Eyebrow>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Attack Technique Selector */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>Attack Techniques</Eyebrow>
            <span
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 13,
                color: "var(--bjhunt-text-muted)",
              }}
            >
              {enabledCount}/{techniques.length} enabled
            </span>
          </div>
          <div
            className="border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            style={CARD_STYLE}
          >
            {techniques.map((tech, idx) => {
              const tone = RISK_TONE[tech.risk];
              return (
                <button
                  key={tech.id}
                  onClick={() => toggleTechnique(tech.id)}
                  className="p-4 text-left transition-colors"
                  style={{
                    background: tech.enabled ? "var(--bjhunt-bg, #050507)" : "transparent",
                    borderTop:
                      idx >= 4
                        ? "1px solid var(--bjhunt-border, #3d3a39)"
                        : idx > 0 && idx < 4 && (idx === 1 || idx === 2 || idx === 3)
                          ? "none"
                          : "none",
                    borderLeft:
                      idx % 4 !== 0 ? "1px solid var(--bjhunt-border, #3d3a39)" : "none",
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        className="inline-flex items-center justify-center shrink-0"
                        style={{
                          width: 16,
                          height: 16,
                          marginTop: 1,
                          border: `1px solid ${tech.enabled ? "var(--bjhunt-status-success, #00d992)" : "var(--bjhunt-border-strong, #5a5654)"}`,
                          background: tech.enabled
                            ? "var(--bjhunt-status-success, #00d992)"
                            : "transparent",
                          borderRadius: "var(--bjhunt-radius-sm, 4px)",
                        }}
                      >
                        {tech.enabled && (
                          <CheckCircle className="w-2.5 h-2.5" style={{ color: "#000" }} />
                        )}
                      </span>
                      <h4
                        className="m-0 truncate"
                        style={{
                          fontFamily: "var(--bjhunt-font-sans)",
                          fontWeight: 600,
                          fontSize: 14,
                          color: tech.enabled ? "var(--bjhunt-text)" : "var(--bjhunt-text-muted)",
                        }}
                      >
                        {tech.name}
                      </h4>
                    </div>
                    <span
                      className="shrink-0"
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: TONE_COLORS[tone],
                        border: `1px solid ${TONE_COLORS[tone]}`,
                        borderRadius: "var(--bjhunt-radius-sm, 4px)",
                        padding: "1px 5px",
                      }}
                    >
                      {tech.risk}
                    </span>
                  </div>
                  <p
                    className="mb-2"
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--bjhunt-text-muted)",
                      margin: 0,
                    }}
                  >
                    {tech.description}
                  </p>
                  {tech.mitre !== "—" && (
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-font-mono)",
                        fontSize: 11,
                        color: "var(--bjhunt-text-muted)",
                        border: "1px solid var(--bjhunt-border, #3d3a39)",
                        borderRadius: "var(--bjhunt-radius-sm, 4px)",
                        padding: "1px 5px",
                      }}
                    >
                      {tech.mitre}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Target Configuration */}
        <section className="mb-8">
          <div className="mb-3">
            <Eyebrow>Target Configuration</Eyebrow>
          </div>
          <div className="border" style={CARD_STYLE}>
            <div
              className="p-6 space-y-5 border-b"
              style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2" style={LABEL_STYLE}>
                    Domain Name *
                  </label>
                  <input
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                    placeholder="corp.example.com"
                  />
                </div>
                <div>
                  <label className="block mb-2" style={LABEL_STYLE}>
                    Domain Controller IP / Hostname
                  </label>
                  <input
                    value={dcHostname}
                    onChange={(e) => setDcHostname(e.target.value)}
                    style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                    placeholder="dc01.corp.example.com or 10.0.0.10"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2" style={LABEL_STYLE}>
                  Credentials (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={adUsername}
                    onChange={(e) => setAdUsername(e.target.value)}
                    style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                    placeholder="CORP\username or user@corp.example.com"
                  />
                  <input
                    type="password"
                    value={adPassword}
                    onChange={(e) => setAdPassword(e.target.value)}
                    style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                    placeholder="Password or NTLM hash"
                  />
                </div>
                <p
                  className="mt-2"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  Provide domain credentials for authenticated enumeration. Supports password or NTLM hash.
                </p>
              </div>

              <div>
                <label className="block mb-2" style={LABEL_STYLE}>
                  Scan Scope
                </label>
                <div
                  className="inline-flex items-center mb-2 border overflow-hidden"
                  style={{
                    borderColor: "var(--bjhunt-border, #3d3a39)",
                    borderRadius: "var(--bjhunt-radius, 6px)",
                  }}
                >
                  {(["full", "specific"] as const).map((s, idx) => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className="px-4 transition-colors"
                      style={{
                        height: 36,
                        fontFamily: "var(--bjhunt-font-sans)",
                        fontSize: 13,
                        fontWeight: 500,
                        color:
                          scope === s ? "var(--bjhunt-text)" : "var(--bjhunt-text-muted)",
                        background:
                          scope === s
                            ? "var(--bjhunt-bg-secondary, var(--surface, #101010))"
                            : "transparent",
                        borderLeft:
                          idx === 0 ? "none" : "1px solid var(--bjhunt-border, #3d3a39)",
                      }}
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
                    style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                    placeholder={
                      "OU=Engineering,DC=corp,DC=example,DC=com\nOU=IT,DC=corp,DC=example,DC=com"
                    }
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <p
                style={{
                  fontFamily: "var(--bjhunt-font-mono)",
                  fontSize: 13,
                  color: "var(--bjhunt-text-muted)",
                  margin: 0,
                }}
              >
                Agent: <span style={{ color: "var(--bjhunt-text)" }}>AD Operator</span> ·
                Techniques: <span style={{ color: "var(--bjhunt-text)" }}>{enabledCount}</span>{" "}
                · Scope:{" "}
                <span style={{ color: "var(--bjhunt-text)" }}>
                  {scope === "full" ? "Full Domain" : "Specific OUs"}
                </span>
              </p>
              <Button
                variant="state" state="success"
                size="md"
                onClick={handleLaunch}
                disabled={isPending || result?.status === "running" || !domainName.trim()}
              >
                {isPending || result?.status === "running" ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : (
                  <Database className="w-3 h-3 mr-2" />
                )}
                {result?.status === "running"
                  ? isFr
                    ? "Scan en cours..."
                    : "Running..."
                  : isFr
                    ? "Lancer le scan AD"
                    : "Start AD Scan"}
              </Button>
            </div>
          </div>
        </section>

        {/* Results */}
        {result && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-3 flex-wrap">
              <Eyebrow>{isFr ? "Resultats" : "Scan Results"}</Eyebrow>
              <StatusDot
                state={
                  result.status === "completed"
                    ? "success"
                    : result.status === "running"
                      ? "warning"
                      : "critical"
                }
                label={
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color:
                        result.status === "completed"
                          ? "var(--bjhunt-status-success, #00d992)"
                          : result.status === "running"
                            ? "var(--bjhunt-status-warning, #ffba00)"
                            : "var(--bjhunt-status-danger, #fb565b)",
                    }}
                  >
                    {result.status}
                  </span>
                }
                pulse={result.status === "running"}
              />
              {result.status === "running" && (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-status-warning, #ffba00)",
                  }}
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Polling for findings...
                </span>
              )}
            </div>

            <div className="border" style={CARD_STYLE}>
              {result.findings.length > 0 && (
                <div
                  className="px-6 py-4 flex items-center gap-3 flex-wrap border-b"
                  style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
                  </span>
                  {(["critical", "high", "medium", "low", "info"] as const).map((sev) => {
                    const count = severityCounts[sev] || 0;
                    if (count === 0) return null;
                    const tone = SEVERITY_TONE[sev];
                    return (
                      <span
                        key={sev}
                        className="inline-flex items-center"
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: TONE_COLORS[tone],
                          background: TONE_BG[tone],
                          border: `1px solid ${TONE_COLORS[tone]}`,
                          borderRadius: "var(--bjhunt-radius-sm, 4px)",
                          padding: "2px 6px",
                        }}
                      >
                        {count} {sev}
                      </span>
                    );
                  })}
                </div>
              )}

              {result.chains.length > 0 && (
                <div
                  className="px-6 py-4 border-b"
                  style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
                >
                  <Eyebrow>Attack Chains</Eyebrow>
                  <div className="mt-3 space-y-3">
                    {result.chains.map((chain, ci) => (
                      <div key={ci} className="flex items-center gap-1 overflow-x-auto pb-1">
                        {chain.steps.map((step, si) => {
                          const tone = SEVERITY_TONE[step.severity] || "neutral";
                          return (
                            <div key={si} className="flex items-center shrink-0">
                              <div
                                className="px-3 py-2 max-w-[200px] truncate"
                                style={{
                                  border: `1px solid ${TONE_COLORS[tone]}`,
                                  background: TONE_BG[tone],
                                  borderRadius: "var(--bjhunt-radius, 6px)",
                                }}
                                title={step.label}
                              >
                                <div
                                  className="truncate"
                                  style={{
                                    fontFamily: "var(--bjhunt-font-sans)",
                                    fontSize: 13,
                                    color: TONE_COLORS[tone],
                                  }}
                                >
                                  {step.label}
                                </div>
                                {step.technique && (
                                  <div
                                    style={{
                                      fontFamily: "var(--bjhunt-font-mono)",
                                      fontSize: 11,
                                      color: "var(--bjhunt-text-muted)",
                                      marginTop: 2,
                                    }}
                                  >
                                    {step.technique}
                                  </div>
                                )}
                              </div>
                              {si < chain.steps.length - 1 && (
                                <ChevronRight
                                  className="w-3 h-3 mx-1 shrink-0"
                                  style={{ color: TONE_COLORS[tone] }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.findings.length === 0 ? (
                <div
                  className="px-6 py-12 text-center"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 14,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  {result.status === "running"
                    ? "Waiting for findings..."
                    : "No findings detected."}
                </div>
              ) : (
                <div>
                  {result.findings.map((f, idx) => {
                    const tone = SEVERITY_TONE[f.severity];
                    return (
                      <div
                        key={f.id}
                        className="px-6 py-4"
                        style={{
                          borderTop:
                            idx === 0
                              ? "none"
                              : "1px solid var(--bjhunt-border, #3d3a39)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="shrink-0 mt-2"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                              background: TONE_COLORS[tone],
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                className="m-0"
                                style={{
                                  fontFamily: "var(--bjhunt-font-sans)",
                                  fontWeight: 600,
                                  fontSize: 14,
                                  color: "var(--bjhunt-text)",
                                }}
                              >
                                {f.title}
                              </h4>
                              <span
                                style={{
                                  fontFamily: "var(--bjhunt-font-mono)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  letterSpacing: "0.18em",
                                  textTransform: "uppercase",
                                  color: TONE_COLORS[tone],
                                  border: `1px solid ${TONE_COLORS[tone]}`,
                                  borderRadius: "var(--bjhunt-radius-sm, 4px)",
                                  padding: "1px 5px",
                                }}
                              >
                                {f.severity}
                              </span>
                              {f.mitreAttack?.map((m) => (
                                <span
                                  key={m}
                                  style={{
                                    fontFamily: "var(--bjhunt-font-mono)",
                                    fontSize: 11,
                                    color: "var(--bjhunt-text-muted)",
                                    border: "1px solid var(--bjhunt-border, #3d3a39)",
                                    borderRadius: "var(--bjhunt-radius-sm, 4px)",
                                    padding: "1px 5px",
                                  }}
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                            {f.description && (
                              <p
                                className="mt-1"
                                style={{
                                  fontFamily: "var(--bjhunt-font-sans)",
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                  color: "var(--bjhunt-text-muted)",
                                  margin: 0,
                                }}
                              >
                                {f.description}
                              </p>
                            )}
                            {f.remediation && (
                              <div
                                className="mt-2 px-3 py-2"
                                style={{
                                  borderLeft:
                                    "2px solid var(--bjhunt-status-success, #00d992)",
                                  background:
                                    "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.12))",
                                  borderRadius:
                                    "0 var(--bjhunt-radius, 6px) var(--bjhunt-radius, 6px) 0",
                                }}
                              >
                                <Eyebrow>Remediation</Eyebrow>
                                <p
                                  className="mt-1"
                                  style={{
                                    fontFamily: "var(--bjhunt-font-sans)",
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    color: "var(--bjhunt-text)",
                                    margin: 0,
                                  }}
                                >
                                  {f.remediation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </PlanGate>
  );
}
