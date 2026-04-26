/**
 * Agent registry — mirrors the 17-agent taxonomy used across BJHUNT.
 * Color + icon + description are UI concerns; the canonical id is the upstream agent_id.
 */
import {
  Workflow,
  ClipboardList,
  ScanSearch,
  Zap,
  Crosshair,
  Microscope,
  Cpu,
  FileCheck2,
  Cloud,
  Network,
  GitBranch,
  Radar,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Swords,
  ShieldCheck,
  Bot,
  type LucideIcon,
} from 'lucide-react'

export type AgentId =
  | 'decepticon'
  | 'soundwave'
  | 'recon'
  | 'exploit'
  | 'postexploit'
  | 'analyst'
  | 'reverser'
  | 'contract_auditor'
  | 'cloud_hunter'
  | 'ad_operator'
  | 'vulnresearch'
  | 'scanner'
  | 'detector'
  | 'verifier'
  | 'patcher'
  | 'exploiter'
  | 'defender'

export type AgentRole =
  | 'Orchestrator'
  | 'Planning'
  | 'Offensive'
  | 'Analysis'
  | 'Pipeline'
  | 'Defensive'

export interface AgentMeta {
  id: AgentId
  label: string
  role: AgentRole
  color: string
  icon: LucideIcon
  description: string
}

const REGISTRY: Record<AgentId, AgentMeta> = {
  decepticon:       { id: 'decepticon',       label: 'BJHUNT ALPHA 1.0',       role: 'Orchestrator', color: '#E4E4E7', icon: Workflow,      description: 'Coordinates the full engagement and delegates to all specialist agents.' },
  soundwave:        { id: 'soundwave',        label: 'Planner',                role: 'Planning',     color: '#38BDF8', icon: ClipboardList, description: 'Builds the engagement plan: RoE, CONOPS, deconfliction, OPPLAN.' },
  recon:            { id: 'recon',            label: 'Reconnaissance',         role: 'Offensive',    color: '#22D3EE', icon: ScanSearch,    description: 'OSINT, subdomain enumeration, port scanning, service detection.' },
  exploit:          { id: 'exploit',          label: 'Exploit',                role: 'Offensive',    color: '#FB923C', icon: Zap,           description: 'Active exploitation: SQLi, SSTI, Kerberoasting, credential abuse.' },
  postexploit:      { id: 'postexploit',      label: 'Post-Exploitation',      role: 'Offensive',    color: '#F87171', icon: Crosshair,     description: 'Privilege escalation, lateral movement, C2 establishment.' },
  analyst:          { id: 'analyst',          label: 'Analyst',                role: 'Analysis',     color: '#A78BFA', icon: Microscope,    description: 'Code review, static analysis, CVE sweeps, fuzzing harness.' },
  reverser:         { id: 'reverser',         label: 'Reverser',               role: 'Analysis',     color: '#E879F9', icon: Cpu,           description: 'Binary triage (ELF, PE, firmware), ROP gadgets, Ghidra scripting.' },
  contract_auditor: { id: 'contract_auditor', label: 'Contract Auditor',       role: 'Analysis',     color: '#FBBF24', icon: FileCheck2,    description: 'Solidity / EVM audit: reentrancy, flash loans, Slither integration.' },
  cloud_hunter:     { id: 'cloud_hunter',     label: 'Cloud Hunter',           role: 'Offensive',    color: '#60A5FA', icon: Cloud,         description: 'Cloud privesc on AWS / Azure / GCP / Kubernetes.' },
  ad_operator:      { id: 'ad_operator',      label: 'AD Operator',            role: 'Offensive',    color: '#F472B6', icon: Network,       description: 'Active Directory: BloodHound, Kerberoast, ADCS ESC1-15, DCSync.' },
  vulnresearch:     { id: 'vulnresearch',     label: 'Vuln Research Pipeline', role: 'Pipeline',     color: '#2DD4BF', icon: GitBranch,     description: 'Coordinates Scanner → Detector → Verifier → Patcher → Exploiter.' },
  scanner:          { id: 'scanner',          label: 'Scanner',                role: 'Pipeline',     color: '#34D399', icon: Radar,         description: 'Phase 1 — Sweep codebase for candidate weaknesses.' },
  detector:         { id: 'detector',         label: 'Detector',               role: 'Pipeline',     color: '#A3E635', icon: AlertTriangle, description: 'Phase 2 — Promote candidates to vulnerabilities by reading nearby code.' },
  verifier:         { id: 'verifier',         label: 'Verifier',               role: 'Pipeline',     color: '#FACC15', icon: CheckCircle2,  description: 'Phase 3 — Craft PoCs and confirm vulnerabilities (zero false positive).' },
  patcher:          { id: 'patcher',          label: 'Patcher',                role: 'Pipeline',     color: '#4ADE80', icon: Wrench,        description: 'Phase 4 — Generate minimal diffs and verify the patch.' },
  exploiter:        { id: 'exploiter',        label: 'Exploiter',              role: 'Pipeline',     color: '#F472B6', icon: Swords,        description: 'Phase 5 — Chain primitives into weaponized attack paths.' },
  defender:         { id: 'defender',         label: 'Defender',               role: 'Defensive',    color: '#22C55E', icon: ShieldCheck,   description: 'Vaccine loop: applies defensive actions, then re-tests them.' },
}

const FALLBACK: AgentMeta = {
  id: 'decepticon',
  label: 'Unknown Agent',
  role: 'Orchestrator',
  color: '#A1A1AA',
  icon: Bot,
  description: '',
}

export function agentMeta(id: AgentId | string | null | undefined): AgentMeta {
  if (!id) return FALLBACK
  return REGISTRY[id as AgentId] ?? { ...FALLBACK, label: String(id) }
}

export function allAgents(): AgentMeta[] {
  return Object.values(REGISTRY)
}

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}
