/**
 * BJHUNT presentation-layer mapping for upstream Decepticon agent names.
 *
 * Per the architectural decision D6 in `docs/superpowers/specs/` :
 *   - Internal agent identifiers (the keys here) MUST match `engine/decepticon/`
 *     upstream (PurpleAILAB) so monthly merges stay clean.
 *   - User-facing surfaces (chat header, dashboard, marketing) use the labels
 *     from this file. NEVER expose raw upstream identifiers to end users.
 *
 * Source of truth for the 17 agents: `engine/langgraph.json` and
 * `docs/architecture/04-DECEPTICON-ENGINE.md`.
 */

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

export type AgentRole = 'orchestrator' | 'planning' | 'offensive' | 'analysis' | 'pipeline' | 'defensive'

export interface AgentMeta {
  /** User-facing short label (chat header, badges) */
  label: string
  /** One-line role description (tooltips, agent picker) */
  description: string
  /** Functional role (used for grouping in UI) */
  role: AgentRole
  /** Tailwind color class name suffix (e.g. "indigo", "emerald") */
  color: string
  /** Lucide icon name (matches lucide-react) */
  icon: string
}

/**
 * Mapping table. Order matches the kill-chain (planning → offensive → analysis → defensive).
 */
export const AGENT_META: Readonly<Record<AgentId, AgentMeta>> = Object.freeze({
  decepticon: {
    label: 'Orchestrator',
    description: 'Coordinates the full engagement and delegates to specialist agents.',
    role: 'orchestrator',
    color: 'indigo',
    icon: 'Workflow',
  },
  soundwave: {
    label: 'Planner',
    description: 'Builds the engagement plan: RoE, CONOPS, deconfliction, OPPLAN.',
    role: 'planning',
    color: 'sky',
    icon: 'ClipboardList',
  },
  recon: {
    label: 'Reconnaissance',
    description: 'OSINT, subdomain enumeration, port scanning, service detection.',
    role: 'offensive',
    color: 'cyan',
    icon: 'ScanSearch',
  },
  exploit: {
    label: 'Exploit',
    description: 'Active exploitation: SQLi, SSTI, Kerberoasting, credential abuse.',
    role: 'offensive',
    color: 'orange',
    icon: 'Zap',
  },
  postexploit: {
    label: 'Post-Exploitation',
    description: 'Privilege escalation, lateral movement, C2 establishment.',
    role: 'offensive',
    color: 'red',
    icon: 'Crosshair',
  },
  analyst: {
    label: 'Analyst',
    description: 'Code review, static analysis, CVE sweeps, fuzzing harness.',
    role: 'analysis',
    color: 'violet',
    icon: 'Microscope',
  },
  reverser: {
    label: 'Reverser',
    description: 'Binary triage (ELF, PE, firmware), ROP gadgets, Ghidra scripting.',
    role: 'analysis',
    color: 'fuchsia',
    icon: 'Cpu',
  },
  contract_auditor: {
    label: 'Contract Auditor',
    description: 'Solidity / EVM audit: reentrancy, flash loans, Slither integration.',
    role: 'analysis',
    color: 'amber',
    icon: 'FileCheck2',
  },
  cloud_hunter: {
    label: 'Cloud Hunter',
    description: 'Cloud privesc on AWS / Azure / GCP / Kubernetes.',
    role: 'offensive',
    color: 'blue',
    icon: 'Cloud',
  },
  ad_operator: {
    label: 'AD Operator',
    description: 'Active Directory: BloodHound, Kerberoast, ADCS ESC1-15, DCSync.',
    role: 'offensive',
    color: 'rose',
    icon: 'Network',
  },
  vulnresearch: {
    label: 'Vuln Research Pipeline',
    description: 'Coordinates Scanner → Detector → Verifier → Patcher → Exploiter.',
    role: 'pipeline',
    color: 'teal',
    icon: 'GitBranch',
  },
  scanner: {
    label: 'Scanner',
    description: 'Phase 1 — Sweep codebase for candidate weaknesses.',
    role: 'pipeline',
    color: 'emerald',
    icon: 'Radar',
  },
  detector: {
    label: 'Detector',
    description: 'Phase 2 — Promote candidates to vulnerabilities by reading nearby code.',
    role: 'pipeline',
    color: 'lime',
    icon: 'AlertTriangle',
  },
  verifier: {
    label: 'Verifier',
    description: 'Phase 3 — Craft PoCs and confirm vulnerabilities (zero false positive).',
    role: 'pipeline',
    color: 'yellow',
    icon: 'CheckCircle2',
  },
  patcher: {
    label: 'Patcher',
    description: 'Phase 4 — Generate minimal diffs and verify the patch.',
    role: 'pipeline',
    color: 'green',
    icon: 'Wrench',
  },
  exploiter: {
    label: 'Exploiter',
    description: 'Phase 5 — Chain primitives into weaponized attack paths.',
    role: 'pipeline',
    color: 'pink',
    icon: 'Swords',
  },
  defender: {
    label: 'Defender',
    description: 'Vaccine loop: applies defensive actions, then re-tests them.',
    role: 'defensive',
    color: 'slate',
    icon: 'ShieldCheck',
  },
})

const DEFAULT_META: AgentMeta = {
  label: 'Agent',
  description: 'Specialist BJHUNT agent.',
  role: 'orchestrator',
  color: 'gray',
  icon: 'Bot',
}

/**
 * Resolve an upstream agent identifier to a display label.
 * Unknown ids fall back to a humanised version of the input string.
 */
export function agentLabel(id: string | null | undefined): string {
  if (!id) return DEFAULT_META.label
  const meta = AGENT_META[id as AgentId]
  if (meta) return meta.label
  return id
    .split(/[_-]/)
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

/** Full meta or a sensible default for unknown agents. */
export function agentMeta(id: string | null | undefined): AgentMeta {
  if (!id) return DEFAULT_META
  return AGENT_META[id as AgentId] ?? { ...DEFAULT_META, label: agentLabel(id) }
}

/** All known agent ids (use to render an agent picker exhaustively). */
export const AGENT_IDS: ReadonlyArray<AgentId> = Object.freeze(
  Object.keys(AGENT_META) as AgentId[],
)
