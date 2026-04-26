/// <reference lib="dom" />
"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Bot,
  Radio,
  Search,
  Bug,
  KeyRound,
  Database,
  Cloud,
  Code,
  Binary,
  Coins,
  Microscope,
  ScanSearch,
  Radar,
  ShieldCheck,
  Wrench,
  Crosshair,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Agent definition ─────────────────────────────────────────────────────

export interface AgentDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: AgentCategory;
}

type AgentCategory = "orchestration" | "offensive" | "analysis" | "vulnresearch" | "defense";

// Agent category → tri-state token mapping (refonte 2026 §1).
// Categories collapse to 3-state instead of 5 hex codes:
//   orchestration → neutral text (--bjhunt-text)  — coordinators are not "risky"
//   offensive     → critical (coral)              — exploitation, post-exploit
//   analysis      → warning (amber)               — code review, reverse, audit
//   vulnresearch  → warning (amber)               — research pipeline
//   defense       → success (emerald)             — defensive remediation
const CATEGORY_META: Record<AgentCategory, { label: string; color: string }> = {
  orchestration: { label: "ORCHESTRATION", color: "var(--bjhunt-text)" },
  offensive:     { label: "OFFENSIVE",     color: "var(--state-critical)" },
  analysis:      { label: "ANALYSIS",      color: "var(--state-warning)" },
  vulnresearch:  { label: "VULN RESEARCH", color: "var(--state-warning)" },
  defense:       { label: "DEFENSE",       color: "var(--state-success)" },
};

export const AGENTS: AgentDef[] = [
  // ── Orchestration ──
  {
    id: "bjhunt",
    name: "BJHUNT",
    description: "Default orchestrator — coordinates all sub-agents",
    icon: <Bot className="w-3.5 h-3.5" />,
    category: "orchestration",
  },
  {
    id: "soundwave",
    name: "Soundwave",
    description: "Engagement planning — RoE, CONOPS, OPPLAN",
    icon: <Radio className="w-3.5 h-3.5" />,
    category: "orchestration",
  },

  // ── Offensive ──
  {
    id: "recon",
    name: "Recon",
    description: "OSINT, subdomain enum, port scanning, service detection",
    icon: <Search className="w-3.5 h-3.5" />,
    category: "offensive",
  },
  {
    id: "exploit",
    name: "Exploit",
    description: "SQLi, SSTI, Kerberoasting, credential attacks",
    icon: <Bug className="w-3.5 h-3.5" />,
    category: "offensive",
  },
  {
    id: "postexploit",
    name: "PostExploit",
    description: "Privilege escalation, lateral movement, C2",
    icon: <KeyRound className="w-3.5 h-3.5" />,
    category: "offensive",
  },
  {
    id: "ad_operator",
    name: "AD Operator",
    description: "BloodHound, Kerberoast, AS-REP, ADCS, DCSync",
    icon: <Database className="w-3.5 h-3.5" />,
    category: "offensive",
  },
  {
    id: "cloud_hunter",
    name: "Cloud Hunter",
    description: "AWS IAM privesc, S3 takeover, K8s RBAC, Terraform",
    icon: <Cloud className="w-3.5 h-3.5" />,
    category: "offensive",
  },

  // ── Analysis ──
  {
    id: "analyst",
    name: "Analyst",
    description: "Code review, static analysis, CVE sweeps, fuzzing",
    icon: <Code className="w-3.5 h-3.5" />,
    category: "analysis",
  },
  {
    id: "reverser",
    name: "Reverser",
    description: "ELF/PE/firmware triage, packer detection, ROP, Ghidra",
    icon: <Binary className="w-3.5 h-3.5" />,
    category: "analysis",
  },
  {
    id: "contract_auditor",
    name: "Contract Auditor",
    description: "Solidity/EVM reentrancy, flash loans, Slither, Foundry",
    icon: <Coins className="w-3.5 h-3.5" />,
    category: "analysis",
  },

  // ── Vulnerability Research ──
  {
    id: "vulnresearch",
    name: "VulnResearch",
    description: "Pipeline coordinator for vulnerability research",
    icon: <Microscope className="w-3.5 h-3.5" />,
    category: "vulnresearch",
  },
  {
    id: "scanner",
    name: "Scanner",
    description: "Automated scanning agent",
    icon: <ScanSearch className="w-3.5 h-3.5" />,
    category: "vulnresearch",
  },
  {
    id: "detector",
    name: "Detector",
    description: "Vulnerability detection and classification",
    icon: <Radar className="w-3.5 h-3.5" />,
    category: "vulnresearch",
  },
  {
    id: "verifier",
    name: "Verifier",
    description: "Vulnerability verification and validation",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    category: "vulnresearch",
  },
  {
    id: "patcher",
    name: "Patcher",
    description: "Patch generation and remediation code",
    icon: <Wrench className="w-3.5 h-3.5" />,
    category: "vulnresearch",
  },
  {
    id: "exploiter",
    name: "Exploiter",
    description: "Exploit generation and proof-of-concept",
    icon: <Crosshair className="w-3.5 h-3.5" />,
    category: "vulnresearch",
  },

  // ── Defense ──
  {
    id: "defender",
    name: "Defender",
    description: "Remediation, hardening, defense verification",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    category: "defense",
  },
];

// Group agents by category in display order
const CATEGORY_ORDER: AgentCategory[] = ["orchestration", "offensive", "analysis", "vulnresearch", "defense"];

function groupedAgents(): { category: AgentCategory; agents: AgentDef[] }[] {
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    agents: AGENTS.filter((a) => a.category === cat),
  }));
}

// ── Component ────────────────────────────────────────────────────────────

interface AgentSelectorProps {
  selectedAgent: string;
  onSelect: (agentId: string) => void;
}

export function AgentSelector({ selectedAgent, onSelect }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = AGENTS.find((a) => a.id === selectedAgent) || AGENTS[0];
  const currentMeta = CATEGORY_META[current.category];

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Agent list — shared between the dropdown (md+) and the drawer (<md).
  // Active state uses a 2px state-success border-l per spec.
  const agentList = (
    <div className="max-h-[80vh] md:max-h-[400px] overflow-y-auto">
      {groupedAgents().map(({ category, agents }) => {
        const meta = CATEGORY_META[category];
        return (
          <div key={category}>
            {/* Category header */}
            <div className="px-3 py-2 flex items-center gap-2 bg-[var(--bjhunt-bg)] border-b border-[var(--bjhunt-border)]">
              <span
                className="w-1.5 h-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
                {meta.label}
              </span>
            </div>

            {/* Agents in this category */}
            {agents.map((agent) => {
              const isSelected = agent.id === selectedAgent;
              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    onSelect(agent.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 md:py-2 transition-colors text-left border-l-2",
                    isSelected
                      ? "bg-white/[0.04] border-l-[var(--state-success)]"
                      : "border-l-transparent hover:bg-white/[0.04]"
                  )}
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      isSelected ? "text-[var(--bjhunt-text)]" : "text-[var(--bjhunt-text-muted)]"
                    )}
                  >
                    {agent.icon}
                  </span>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono font-semibold text-[12px] uppercase tracking-[0.18em]",
                          isSelected ? "text-[var(--bjhunt-text)]" : "text-[var(--bjhunt-text)]"
                        )}
                      >
                        {agent.name}
                      </span>
                      {agent.id === "bjhunt" && (
                        <span className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] px-1 py-px border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-xs)] text-[var(--bjhunt-text-muted)]">
                          default
                        </span>
                      )}
                    </div>
                    <div className="font-sans text-[12px] text-[var(--bjhunt-text-muted)] truncate mt-0.5">
                      {agent.description}
                    </div>
                  </div>

                  {/* Category dot */}
                  <span
                    className="w-1.5 h-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color, opacity: isSelected ? 1 : 0.4 }}
                  />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button — ghost variant per spec */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 h-9 md:h-8 px-3 transition-colors rounded-[var(--bjhunt-radius)] border",
          "text-[var(--bjhunt-text)] border-[var(--bjhunt-border)]",
          "hover:bg-white/[0.04] hover:border-[var(--bjhunt-border-strong)]",
          open && "bg-white/[0.04] border-[var(--bjhunt-border-strong)]"
        )}
        title={`Agent: ${current.name}`}
      >
        <span
          className="w-1.5 h-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: currentMeta.color }}
        />
        <span className="font-mono font-semibold text-[12px] uppercase tracking-[0.18em]">
          {current.name}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Drawer (mobile <md) */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "var(--bjhunt-bg-overlay, rgba(0,0,0,0.7))" }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="md:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden bg-[var(--bjhunt-bg-surface)] border-t border-[var(--bjhunt-border)] rounded-t-[var(--bjhunt-radius-lg)] shadow-[0_-8px_24px_rgba(0,0,0,0.5)]"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--bjhunt-border)]">
              <span className="font-mono font-semibold text-[12px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
                Select Agent
              </span>
              <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
                17 agents
              </span>
            </div>
            {agentList}
          </div>
        </>
      )}

      {/* Dropdown (desktop md+) */}
      {open && (
        <div
          className="hidden md:block absolute bottom-full left-0 mb-2 w-[320px] z-50 overflow-hidden bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-md)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--bjhunt-border)]">
            <span className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
              Select Agent
            </span>
            <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
              17 agents available
            </span>
          </div>
          {agentList}
        </div>
      )}
    </div>
  );
}
