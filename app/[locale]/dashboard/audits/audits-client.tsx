'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, X, ChevronRight, ChevronLeft, Loader2, Check, Target, Shield, Cpu, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditRun {
  id: string
  title: string
  target: string | null
  status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled'
  scanConfig: Record<string, unknown>
  resultSummary: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--bjhunt-text-muted)',
  running: 'var(--bjhunt-status-warning)',
  completed: 'var(--bjhunt-status-success)',
  failed: 'var(--bjhunt-status-danger)',
  cancelled: 'var(--bjhunt-text-subtle)',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  running: 'En cours',
  completed: 'Termine',
  failed: 'Echoue',
  cancelled: 'Annule',
}

// ── Wizard types ────────────────────────────────────────────────────────

type TargetType = 'web' | 'network' | 'cloud' | 'ad' | 'mobile' | 'contract'

interface WizardState {
  // Step 1: Target
  targetUrl: string
  targetName: string
  targetType: TargetType
  // Step 2: Scope
  inScope: string
  outOfScope: string
  maxDuration: number
  // Step 3: Agent
  agentGraph: string
  vaccineMode: boolean
  autoReport: boolean
}

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'web', label: 'Web Application' },
  { value: 'network', label: 'Network' },
  { value: 'cloud', label: 'Cloud Infrastructure' },
  { value: 'ad', label: 'Active Directory' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'contract', label: 'Smart Contract' },
]

const DURATION_OPTIONS = [
  { value: 1800, label: '30 min' },
  { value: 3600, label: '1 hour' },
  { value: 7200, label: '2 hours' },
  { value: 14400, label: '4 hours' },
  { value: 28800, label: '8 hours' },
]

// IMPORTANT: every `value` MUST exactly match a key in `engine/langgraph.json`
// (verified 2026-04-18). Sending a non-registered name returns LangGraph 404.
const AGENT_OPTIONS = [
  { value: 'bjhunt', label: 'BJHUNT Orchestrator', description: 'Full autonomous scan — coordinates all 9 specialist sub-agents' },
  { value: 'soundwave', label: 'Soundwave (Planner)', description: 'Engagement planning — RoE, CONOPS, deconfliction, OPPLAN' },
  { value: 'recon', label: 'Recon', description: 'OSINT, subdomain enum, port scanning, service detection' },
  { value: 'exploit', label: 'Exploit', description: 'SQLi, SSTI, Kerberoasting, credential attacks' },
  { value: 'postexploit', label: 'PostExploit', description: 'Privilege escalation, lateral movement, C2' },
  { value: 'analyst', label: 'Analyst', description: 'Code review, static analysis, CVE sweeps, fuzzing' },
  { value: 'reverser', label: 'Reverser', description: 'ELF/PE/firmware triage, ROP gadgets, Ghidra' },
  { value: 'contract_auditor', label: 'Contract Auditor', description: 'Solidity/EVM: reentrancy, flash loans, Slither' },
  { value: 'cloud_hunter', label: 'Cloud Hunter', description: 'AWS IAM privesc, S3 takeover, K8s RBAC' },
  { value: 'ad_operator', label: 'AD Operator', description: 'BloodHound, Kerberoast, ADCS, DCSync' },
  { value: 'vulnresearch', label: 'VulnResearch', description: 'Vulnerability research pipeline (Scanner→Detector→Verifier→Patcher→Exploiter)' },
  { value: 'scanner', label: 'Scanner', description: 'Phase 1 — sweep codebase for candidate weaknesses' },
  { value: 'detector', label: 'Detector', description: 'Phase 2 — promote candidates to vulnerabilities' },
  { value: 'verifier', label: 'Verifier', description: 'Phase 3 — craft PoCs (zero false positive)' },
  { value: 'patcher', label: 'Patcher', description: 'Phase 4 — generate minimal patches' },
  { value: 'exploiter', label: 'Exploiter', description: 'Phase 5 — chain primitives into weaponized attack paths' },
  { value: 'defender', label: 'Defender', description: 'Vaccine loop — attack → defense → verify' },
]

const STEP_ICONS = [Target, Shield, Cpu, FileText]
const STEP_LABELS = ['Target', 'Scope', 'Agent', 'Review']

function deriveNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return url.split('/')[0] || ''
  }
}

// ── Wizard Modal ────────────────────────────────────────────────────────

function WizardModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (engagement: AuditRun) => void
}) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [wizard, setWizard] = useState<WizardState>({
    targetUrl: '',
    targetName: '',
    targetType: 'web',
    inScope: '',
    outOfScope: '',
    maxDuration: 3600,
    agentGraph: 'bjhunt',
    vaccineMode: false,
    autoReport: true,
  })

  const updateField = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setWizard((prev) => ({ ...prev, [key]: value }))
  }, [])

  const canNext = step === 0 ? wizard.targetUrl.trim().length > 0 : true
  const totalSteps = 4

  const handleSubmit = (launch: boolean) => {
    startTransition(async () => {
      const name = wizard.targetName.trim() || deriveNameFromUrl(wizard.targetUrl)

      const res = await browserBackendFetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          target: wizard.targetUrl,
          targetType: wizard.targetType,
          inScope: wizard.inScope || undefined,
          outOfScope: wizard.outOfScope || undefined,
          agentGraph: wizard.agentGraph,
          vaccineMode: wizard.vaccineMode,
          autoReport: wizard.autoReport,
          maxDuration: wizard.maxDuration,
        }),
      })

      if (!res.ok) return

      const { engagement } = await res.json()

      if (launch) {
        await browserBackendFetch(`/api/engagements/${engagement.id}/launch`, {
          method: 'POST',
        })
      }

      const run = { ...engagement, title: engagement.name }
      onCreated(run)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 border border-[var(--border)] bg-[var(--bg)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-[14px] font-mono font-bold uppercase tracking-widest text-white">
              New Scan
            </h2>
            <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-0.5">
              Step {step + 1} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
          {STEP_LABELS.map((label, i) => {
            const Icon = STEP_ICONS[i]
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-5 h-5 flex items-center justify-center border',
                      isActive
                        ? 'border-white bg-white text-black'
                        : isDone
                          ? 'border-[var(--success)] bg-[var(--success)] text-black'
                          : 'border-[var(--border)] text-[var(--text-subtle)]'
                    )}
                  >
                    {isDone ? <Check size={10} /> : <Icon size={10} />}
                  </div>
                  <span
                    className={cn(
                      'text-[8px] font-mono uppercase tracking-widest',
                      isActive ? 'text-white' : isDone ? 'text-[var(--success)]' : 'text-[var(--text-subtle)]'
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-px mx-3',
                      isDone ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="px-6 py-5 space-y-4">
          {/* Step 1: Target */}
          {step === 0 && (
            <>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Target URL / IP *
                </label>
                <input
                  value={wizard.targetUrl}
                  onChange={(e) => updateField('targetUrl', e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                  placeholder="https://example.com or 192.168.1.0/24"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Target Name
                </label>
                <input
                  value={wizard.targetName}
                  onChange={(e) => updateField('targetName', e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                  placeholder={wizard.targetUrl ? deriveNameFromUrl(wizard.targetUrl) : 'Auto-generated from URL'}
                />
                <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                  Leave blank to auto-generate from the target URL.
                </p>
              </div>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Target Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TARGET_TYPES.map((tt) => (
                    <button
                      key={tt.value}
                      onClick={() => updateField('targetType', tt.value)}
                      className={cn(
                        'px-3 py-2 text-[10px] font-mono border transition-colors text-left',
                        wizard.targetType === tt.value
                          ? 'border-white text-white bg-[var(--bg-card)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                      )}
                    >
                      {tt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Scope */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  In-Scope Domains / IPs
                </label>
                <textarea
                  value={wizard.inScope}
                  onChange={(e) => updateField('inScope', e.target.value)}
                  rows={4}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                  placeholder={"example.com\n*.example.com\n192.168.1.0/24"}
                />
                <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                  One entry per line. Supports wildcards and CIDR notation.
                </p>
              </div>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Out-of-Scope
                </label>
                <textarea
                  value={wizard.outOfScope}
                  onChange={(e) => updateField('outOfScope', e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                  placeholder={"prod.example.com\n10.0.0.0/8"}
                />
                <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                  Systems that must NOT be tested.
                </p>
              </div>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Max Scan Duration
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => updateField('maxDuration', d.value)}
                      className={cn(
                        'px-3 py-1.5 text-[10px] font-mono border transition-colors',
                        wizard.maxDuration === d.value
                          ? 'border-white text-white bg-[var(--bg-card)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Agent Selection */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Agent Graph
                </label>
                <div className="max-h-[250px] overflow-y-auto border border-[var(--border)] divide-y divide-[var(--border)]">
                  {AGENT_OPTIONS.map((agent) => (
                    <button
                      key={agent.value}
                      onClick={() => updateField('agentGraph', agent.value)}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors',
                        wizard.agentGraph === agent.value
                          ? 'bg-[var(--bg-card)]'
                          : 'hover:bg-[var(--bg-card)]'
                      )}
                    >
                      <div
                        className={cn(
                          'w-3 h-3 border flex-shrink-0 mt-0.5 flex items-center justify-center',
                          wizard.agentGraph === agent.value
                            ? 'border-white bg-white'
                            : 'border-[var(--border-strong)]'
                        )}
                      >
                        {wizard.agentGraph === agent.value && (
                          <Check size={8} className="text-black" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono font-bold text-white">
                          {agent.label}
                        </div>
                        <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                          {agent.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <label
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => updateField('vaccineMode', !wizard.vaccineMode)}
                >
                  <div
                    className={cn(
                      'w-3.5 h-3.5 border flex items-center justify-center transition-colors',
                      wizard.vaccineMode
                        ? 'border-[var(--success)] bg-[var(--success)]'
                        : 'border-[var(--border-strong)] group-hover:border-[var(--text-muted)]'
                    )}
                  >
                    {wizard.vaccineMode && <Check size={9} className="text-black" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-white">
                      Enable Vaccine Loop
                    </span>
                    <p className="text-[8px] font-mono text-[var(--text-subtle)]">
                      Attack, defense, verify cycle — generates defensive recommendations
                    </p>
                  </div>
                </label>
                <label
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => updateField('autoReport', !wizard.autoReport)}
                >
                  <div
                    className={cn(
                      'w-3.5 h-3.5 border flex items-center justify-center transition-colors',
                      wizard.autoReport
                        ? 'border-[var(--success)] bg-[var(--success)]'
                        : 'border-[var(--border-strong)] group-hover:border-[var(--text-muted)]'
                    )}
                  >
                    {wizard.autoReport && <Check size={9} className="text-black" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-white">
                      Enable Auto-Reporting
                    </span>
                    <p className="text-[8px] font-mono text-[var(--text-subtle)]">
                      Automatically generate reports when the scan completes
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Step 4: Review & Launch */}
          {step === 3 && (
            <>
              <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
                {/* Target */}
                <div className="px-4 py-3">
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    Target
                  </div>
                  <div className="text-[11px] font-mono text-white font-bold">
                    {wizard.targetName || deriveNameFromUrl(wizard.targetUrl)}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                    {wizard.targetUrl}
                  </div>
                  <span className="inline-block text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-[var(--border)] text-[var(--text-muted)] mt-1">
                    {TARGET_TYPES.find((t) => t.value === wizard.targetType)?.label ?? wizard.targetType}
                  </span>
                </div>

                {/* Scope */}
                <div className="px-4 py-3">
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    Scope
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[8px] font-mono text-[var(--text-subtle)] mb-0.5">In-scope</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] whitespace-pre-line">
                        {wizard.inScope || '(all from target)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono text-[var(--text-subtle)] mb-0.5">Out-of-scope</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] whitespace-pre-line">
                        {wizard.outOfScope || '(none)'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-subtle)] mt-2">
                    Max duration: {DURATION_OPTIONS.find((d) => d.value === wizard.maxDuration)?.label ?? `${wizard.maxDuration}s`}
                  </div>
                </div>

                {/* Agent */}
                <div className="px-4 py-3">
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-subtle)] mb-1">
                    Agent
                  </div>
                  <div className="text-[11px] font-mono text-white font-bold">
                    {AGENT_OPTIONS.find((a) => a.value === wizard.agentGraph)?.label ?? wizard.agentGraph}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={cn(
                      'text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border',
                      wizard.vaccineMode
                        ? 'border-[var(--success)] text-[var(--success)]'
                        : 'border-[var(--border)] text-[var(--text-subtle)]'
                    )}>
                      Vaccine {wizard.vaccineMode ? 'ON' : 'OFF'}
                    </span>
                    <span className={cn(
                      'text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border',
                      wizard.autoReport
                        ? 'border-[var(--success)] text-[var(--success)]'
                        : 'border-[var(--border)] text-[var(--text-subtle)]'
                    )}>
                      Auto-report {wizard.autoReport ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
          <div>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={10} />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="flex items-center gap-1 px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-white text-black hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Next
                <ChevronRight size={10} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isPending}
                  className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] transition-colors disabled:opacity-40"
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  ) : null}
                  Create Scan
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-[var(--success)] text-black hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  Create &amp; Launch
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main audits list ────────────────────────────────────────────────────

export function AuditsClient({
  initialRuns,
  initialTotal,
  locale,
}: {
  initialRuns: AuditRun[]
  initialTotal: number
  locale: string
}) {
  const [runs, setRuns] = useState(initialRuns)
  const [total, setTotal] = useState(initialTotal)
  const [showWizard, setShowWizard] = useState(false)
  // DASH-P2: replace browser-native confirm() with a styled modal so the
  // confirmation matches the design system + works on mobile (where some
  // PWA configurations suppress confirm()).
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)

  // DASH-P2: auto-refresh while at least one audit is in flight, so users
  // see status transitions without clicking Refresh. Server component
  // re-fetch via router.refresh() every 15s; cleared when no run is
  // running anymore. Cheap because the SSR data fetch is a single SQL
  // query. Pause when the tab isn't visible.
  const router = useRouter()
  useEffect(() => {
    const hasRunning = runs.some((r) =>
      ['running', 'pending', 'queued', 'planning', 'approved'].includes(
        (r as { status?: string }).status ?? '',
      ),
    )
    if (!hasRunning) return
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const interval = setInterval(tick, 15000)
    return () => clearInterval(interval)
  }, [runs, router])
  const [isPending, startTransition] = useTransition()

  const handleCreated = (run: AuditRun) => {
    setRuns((prev) => [run, ...prev])
    setTotal((t) => t + 1)
    setShowWizard(false)
  }

  const handleCancel = (id: string) => {
    // Open the modal; actual API call happens in confirmCancel below.
    setCancelTargetId(id)
  }

  const confirmCancel = () => {
    const id = cancelTargetId
    if (!id) return
    setCancelTargetId(null)
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/engagements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) return
      const { engagement } = await res.json()
      const run = { ...engagement, title: engagement.name }
      setRuns((prev) => prev.map((r) => (r.id === id ? run : r)))
    })
  }

  return (
    <div>
      {cancelTargetId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-audit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setCancelTargetId(null)}
        >
          <div
            className="border border-[var(--border)] bg-[var(--bg-card)] p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="cancel-audit-title"
              className="text-[12px] font-mono font-bold uppercase tracking-widest text-white mb-2"
            >
              Annuler cet audit ?
            </h3>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mb-5 leading-relaxed">
              L&apos;audit passera en statut <span className="text-white">cancelled</span>. Les findings déjà collectés sont conservés.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] hover:text-white border border-[var(--border)] transition-colors"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={isPending}
                className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-white bg-[var(--danger)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {total} audit{total !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-[11px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Nouvel audit
        </button>
      </div>

      {/* Wizard modal */}
      {showWizard && (
        <WizardModal
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}

      {runs.length === 0 ? (
        <div
          className="px-4 py-24 text-center"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--bjhunt-font-mono)',
              fontSize: 10,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'var(--bjhunt-text-subtle)',
              marginBottom: 12,
            }}
          >
            Empty State
          </div>
          <h2
            style={{
              fontFamily: 'var(--bjhunt-font-sans)',
              fontWeight: 200,
              fontSize: 32,
              letterSpacing: '-0.02em',
              color: 'var(--bjhunt-text)',
              margin: '0 0 8px',
            }}
          >
            No audits yet
          </h2>
          <p
            className="mb-6"
            style={{
              fontFamily: 'var(--bjhunt-font-sans)',
              fontWeight: 300,
              fontSize: 15,
              color: 'var(--bjhunt-text-muted)',
            }}
          >
            Create your first engagement to put the orchestrator to work.
          </p>
          {/* DASH-P2: inline CTA inside the empty state so the user
              doesn't have to hunt for the "+ Nouvel audit" button. */}
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-[10px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <Plus size={12} />
            Nouvel audit
          </button>
        </div>
      ) : (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between px-4 py-4 transition-[padding,background-color]"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                transitionDuration: 'var(--bjhunt-duration-base)',
                transitionTimingFunction: 'var(--bjhunt-easing-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.012)'
                e.currentTarget.style.paddingLeft = '40px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = ''
                e.currentTarget.style.paddingLeft = ''
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-1.5 h-1.5 flex-shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[run.status] ?? 'var(--text-subtle)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/${locale}/dashboard/audits/${run.id}`}
                      className="text-[12px] font-mono font-bold text-white hover:text-[var(--accent)] transition-colors truncate"
                    >
                      {run.title}
                    </Link>
                    <span
                      className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border flex-shrink-0"
                      style={{ borderColor: STATUS_COLORS[run.status], color: STATUS_COLORS[run.status] }}
                    >
                      {STATUS_LABELS[run.status] ?? run.status}
                    </span>
                  </div>
                  {run.target && (
                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                      {run.target}
                    </div>
                  )}
                  <div className="text-[9px] text-[var(--text-subtle)] font-mono mt-0.5">
                    {new Date(run.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(run.status === 'draft' || run.status === 'running') && (
                  <button
                    onClick={() => handleCancel(run.id)}
                    disabled={isPending}
                    title="Annuler"
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
                  >
                    <X size={13} />
                  </button>
                )}
                <Link
                  href={`/${locale}/dashboard/audits/${run.id}`}
                  className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
                  title="Voir le detail"
                >
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
