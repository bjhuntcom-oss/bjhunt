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

const CATEGORY_META: Record<AgentCategory, { label: string; color: string }> = {
  orchestration: { label: "ORCHESTRATION", color: "#ffffff" },
  offensive:     { label: "OFFENSIVE",     color: "#ff4444" },
  analysis:      { label: "ANALYSIS",      color: "#ff9900" },
  vulnresearch:  { label: "VULN RESEARCH", color: "#60a5fa" },
  defense:       { label: "DEFENSE",       color: "#00cc8a" },
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

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 transition-all duration-200",
          "text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06]",
          open && "text-white bg-white/[0.06]"
        )}
        title={`Agent: ${current.name}`}
      >
        <span
          className="w-1.5 h-1.5 flex-shrink-0"
          style={{ backgroundColor: currentMeta.color }}
        />
        <span className="text-[10px] font-mono uppercase tracking-wider">
          {current.name}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-[320px] z-50 slash-menu-enter overflow-hidden"
          style={{
            background: "rgba(17, 17, 17, 0.9)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Select Agent
            </span>
            <span className="text-[8px] text-[var(--text-subtle)]">
              17 agents available
            </span>
          </div>

          {/* Agent list grouped by category */}
          <div className="max-h-[400px] overflow-y-auto">
            {groupedAgents().map(({ category, agents }) => {
              const meta = CATEGORY_META[category];
              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(10, 10, 10, 0.5)", borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <span
                      className="w-1.5 h-1.5 flex-shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-subtle)]">
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
                          "w-full flex items-center gap-3 px-3 py-2 transition-all duration-200 text-left",
                          isSelected
                            ? "border-l-2"
                            : "hover:bg-white/[0.04] border-l-2 border-l-transparent"
                        )}
                        style={isSelected ? { background: "rgba(255, 255, 255, 0.06)", borderLeftColor: meta.color } : undefined}
                      >
                        {/* Icon */}
                        <span
                          className={cn(
                            "flex-shrink-0 transition-colors",
                            isSelected ? "text-white" : "text-[var(--text-muted)]"
                          )}
                        >
                          {agent.icon}
                        </span>

                        {/* Text */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-mono uppercase tracking-wider",
                                isSelected ? "text-white" : "text-[var(--text-muted)]"
                              )}
                            >
                              {agent.name}
                            </span>
                            {agent.id === "bjhunt" && (
                              <span className="text-[7px] uppercase tracking-wider px-1 py-px bg-[var(--border)] text-[var(--text-subtle)]">
                                default
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-[var(--text-subtle)] truncate">
                            {agent.description}
                          </div>
                        </div>

                        {/* Category dot */}
                        <span
                          className="w-1.5 h-1.5 flex-shrink-0"
                          style={{ backgroundColor: meta.color, opacity: isSelected ? 1 : 0.4 }}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
