"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  Shield,
  Target,
  Clock,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { browserBackendFetch } from "@/lib/backend-client";

// ── Types ────────────────────────────────────────────────────────────────

interface EngagementConfig {
  targetType?: string;
  inScope?: string;
  outOfScope?: string;
  opsecLevel?: string;
  vaccineMode?: boolean;
  maxDuration?: number;
  [key: string]: unknown;
}

interface Engagement {
  id: string;
  name: string;
  description: string | null;
  target: string;
  status: string;
  agentGraph: string;
  config: EngagementConfig | null;
}

// ── Constants ────────────────────────────────────────────────────────────

const OPSEC_LEVELS = [
  {
    value: "standard",
    label: "Standard",
    description: "Normal scan speed and volume. Acceptable noise level for most targets.",
    icon: Target,
    color: "var(--success)",
  },
  {
    value: "careful",
    label: "Careful",
    description: "Reduced scan rate, randomized timing, avoid triggering IDS/IPS.",
    icon: Shield,
    color: "var(--warning)",
  },
  {
    value: "paranoid",
    label: "Paranoid",
    description: "Minimal footprint, encrypted channels only, max evasion techniques.",
    icon: AlertTriangle,
    color: "var(--danger)",
  },
];

const AGENT_GRAPHS = [
  { value: "bjhunt", label: "BJHUNT (Full)", description: "Complete multi-agent pipeline" },
  { value: "recon-only", label: "Recon Only", description: "Reconnaissance and enumeration" },
  { value: "vuln-research", label: "Vuln Research", description: "Scanner + Detector + Verifier" },
  { value: "web-audit", label: "Web Audit", description: "Web-focused vulnerability assessment" },
  { value: "ad-audit", label: "AD Audit", description: "Active Directory security assessment" },
  { value: "cloud-audit", label: "Cloud Audit", description: "Cloud infrastructure review" },
  { value: "contract-audit", label: "Contract Audit", description: "Smart contract security audit" },
];

const DURATION_OPTIONS = [
  { value: 1800, label: "30 min" },
  { value: 3600, label: "1 hour" },
  { value: 7200, label: "2 hours" },
  { value: 14400, label: "4 hours" },
  { value: 28800, label: "8 hours" },
];

const TARGET_TYPES = [
  { value: "web", label: "Web Application" },
  { value: "network", label: "Network / Infrastructure" },
  { value: "cloud", label: "Cloud (AWS/GCP/Azure)" },
  { value: "ad", label: "Active Directory" },
  { value: "mobile", label: "Mobile Application" },
  { value: "contract", label: "Smart Contract" },
];

// ── Component ────────────────────────────────────────────────────────────

export default function EngagementConfigPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const id = params.id as string;

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState("web");
  const [inScope, setInScope] = useState("");
  const [outOfScope, setOutOfScope] = useState("");
  const [opsecLevel, setOpsecLevel] = useState("standard");
  const [agentGraph, setAgentGraph] = useState("bjhunt");
  const [vaccineMode, setVaccineMode] = useState(false);
  const [maxDuration, setMaxDuration] = useState(7200);

  // ── Load engagement ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await browserBackendFetch(`/api/engagements/${id}`);
        if (!res.ok) {
          setError("Failed to load engagement");
          return;
        }
        const data = await res.json();
        const eng = data.engagement as Engagement;
        if (cancelled) return;

        setEngagement(eng);
        setName(eng.name || "");
        setDescription(eng.description || "");
        setTarget(eng.target || "");
        setAgentGraph(eng.agentGraph || "bjhunt");

        const cfg = eng.config || {};
        setTargetType(cfg.targetType as string || "web");
        setInScope(cfg.inScope as string || "");
        setOutOfScope(cfg.outOfScope as string || "");
        setOpsecLevel(cfg.opsecLevel as string || "standard");
        setVaccineMode(cfg.vaccineMode as boolean || false);
        setMaxDuration(cfg.maxDuration as number || 7200);
      } catch {
        if (!cancelled) setError("Network error loading engagement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Save engagement ──────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await browserBackendFetch(`/api/engagements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description: description || null,
          target,
          agentGraph,
          config: {
            targetType,
            inScope: inScope || undefined,
            outOfScope: outOfScope || undefined,
            opsecLevel,
            vaccineMode,
            maxDuration,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed" }));
        setError(data.error || "Save failed");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error saving engagement");
    } finally {
      setSaving(false);
    }
  }, [id, name, description, target, agentGraph, targetType, inScope, outOfScope, opsecLevel, vaccineMode, maxDuration]);

  // ── Readonly check ───────────────────────────────────────────────────

  const isReadonly = engagement?.status === "running" || engagement?.status === "completed";

  // ── Loading / Error states ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (error && !engagement) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-5 h-5 text-[var(--danger)] mx-auto mb-2" />
          <p className="text-[11px] font-mono text-[var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/audits/${id}`}
          className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={12} />
          Back to audit
        </Link>

        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-[var(--text-muted)]" />
          <div>
            <h1 className="text-xl font-black tracking-tight">
              ENGAGEMENT CONFIG
            </h1>
            <p className="text-[10px] font-mono text-[var(--text-subtle)] mt-0.5">
              Configure scan parameters and agent behavior
            </p>
          </div>
        </div>

        {isReadonly && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 border border-[var(--warning)] bg-[var(--warning)]/5">
            <AlertTriangle className="w-3 h-3 text-[var(--warning)]" />
            <span className="text-[9px] font-mono text-[var(--warning)]">
              This engagement is {engagement?.status}. Configuration is read-only.
            </span>
          </div>
        )}
      </div>

      {/* Section: Name / Description */}
      <div className="border border-[var(--border)] mb-4">
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] font-bold">
            General
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1">
              Engagement Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadonly}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2 outline-none focus:border-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isReadonly}
              rows={3}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2 outline-none focus:border-white resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Section: Target */}
      <div className="border border-[var(--border)] mb-4">
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] font-bold">
            Target
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1">
              Target URL / IP
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={isReadonly}
              placeholder="https://example.com or 192.168.1.0/24"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2 outline-none focus:border-white placeholder:text-[var(--text-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1">
              Target Type
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              disabled={isReadonly}
              className="bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] px-3 py-2 outline-none focus:border-white appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Scope */}
      <div className="border border-[var(--border)] mb-4">
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] font-bold">
            Scope
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1">
              In-Scope Domains (one per line)
            </label>
            <textarea
              value={inScope}
              onChange={(e) => setInScope(e.target.value)}
              disabled={isReadonly}
              rows={4}
              placeholder={"*.example.com\n192.168.1.0/24\napi.example.com"}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2 outline-none focus:border-white resize-none placeholder:text-[var(--text-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1">
              Out-of-Scope (one per line)
            </label>
            <textarea
              value={outOfScope}
              onChange={(e) => setOutOfScope(e.target.value)}
              disabled={isReadonly}
              rows={3}
              placeholder={"production.example.com\npayments.example.com"}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-mono text-white px-3 py-2 outline-none focus:border-white resize-none placeholder:text-[var(--text-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Section: OPSEC Level */}
      <div className="border border-[var(--border)] mb-4">
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] font-bold">
            OPSEC Level
          </span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {OPSEC_LEVELS.map((level) => {
              const Icon = level.icon;
              const isSelected = opsecLevel === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => !isReadonly && setOpsecLevel(level.value)}
                  disabled={isReadonly}
                  className={cn(
                    "text-left p-4 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected
                      ? "border-white bg-[var(--bg-card)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: level.color }} />
                    <span
                      className="text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{ color: isSelected ? "white" : level.color }}
                    >
                      {level.label}
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-[var(--text-subtle)] leading-relaxed">
                    {level.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section: Agent & Execution */}
      <div className="border border-[var(--border)] mb-4">
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] font-bold">
            Agent & Execution
          </span>
        </div>
        <div className="p-4 space-y-4">
          {/* Agent graph */}
          <div>
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1.5">
              <Cpu className="w-3 h-3 inline-block mr-1" />
              Agent Graph
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {AGENT_GRAPHS.map((ag) => (
                <button
                  key={ag.value}
                  onClick={() => !isReadonly && setAgentGraph(ag.value)}
                  disabled={isReadonly}
                  className={cn(
                    "text-left px-3 py-2 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    agentGraph === ag.value
                      ? "border-white bg-[var(--bg-card)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]",
                  )}
                >
                  <span className={cn(
                    "text-[9px] font-mono font-bold block",
                    agentGraph === ag.value ? "text-white" : "text-[var(--text-muted)]",
                  )}>
                    {ag.label}
                  </span>
                  <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                    {ag.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Vaccine mode */}
          <div className="flex items-center justify-between py-2 border-t border-[var(--border)]">
            <div>
              <label className="text-[9px] font-mono text-white block">
                <Shield className="w-3 h-3 inline-block mr-1" />
                Vaccine Mode
              </label>
              <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                Attack → Defense → Verification loop
              </span>
            </div>
            <button
              onClick={() => !isReadonly && setVaccineMode(!vaccineMode)}
              disabled={isReadonly}
              className={cn(
                "w-10 h-5 border transition-colors flex items-center px-0.5 disabled:opacity-50 disabled:cursor-not-allowed",
                vaccineMode
                  ? "bg-[var(--success)] border-[var(--success)]"
                  : "bg-[var(--bg-input)] border-[var(--border)]",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 bg-white transition-transform",
                  vaccineMode ? "translate-x-[18px]" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Max duration */}
          <div className="border-t border-[var(--border)] pt-3">
            <label className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] block mb-1.5">
              <Clock className="w-3 h-3 inline-block mr-1" />
              Max Duration
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => !isReadonly && setMaxDuration(opt.value)}
                  disabled={isReadonly}
                  className={cn(
                    "text-[9px] font-mono px-3 py-1.5 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    maxDuration === opt.value
                      ? "text-white border-white bg-[var(--bg-card)]"
                      : "text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-strong)]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      {!isReadonly && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !target.trim()}
            className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-6 py-2.5 bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                Save Configuration
              </>
            )}
          </button>

          {saved && (
            <span className="text-[9px] font-mono text-[var(--success)]">
              Configuration saved successfully
            </span>
          )}

          {error && (
            <span className="text-[9px] font-mono text-[var(--danger)]">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
