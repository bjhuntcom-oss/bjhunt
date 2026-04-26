'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { browserBackendFetch } from '@/lib/backend-client'
import {
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Target,
  Shield,
  Cpu,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Eyebrow, H3, H4, Body } from '@/components/ui/typography'
import { StatusDot, type DotState } from '@/components/ui/status-dot'

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

const STATUS_DOT: Record<string, DotState> = {
  draft: 'neutral',
  running: 'warning',
  completed: 'success',
  failed: 'critical',
  cancelled: 'neutral',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'DRAFT',
  running: 'RUNNING',
  completed: 'DONE',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
}

// ── Wizard types ────────────────────────────────────────────────────────

type TargetType = 'web' | 'network' | 'cloud' | 'ad' | 'mobile' | 'contract'

interface WizardState {
  targetUrl: string
  targetName: string
  targetType: TargetType
  inScope: string
  outOfScope: string
  maxDuration: number
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

// IMPORTANT: every `value` MUST exactly match a key in `engine/langgraph.json`.
const AGENT_OPTIONS: {
  value: string
  label: string
  description: string
  icon: typeof Target
}[] = [
  { value: 'bjhunt', label: 'BJHUNT Orchestrator', description: 'Full autonomous scan — coordinates all 9 specialist sub-agents', icon: Cpu },
  { value: 'soundwave', label: 'Soundwave (Planner)', description: 'Engagement planning — RoE, CONOPS, deconfliction, OPPLAN', icon: FileText },
  { value: 'recon', label: 'Recon', description: 'OSINT, subdomain enum, port scanning, service detection', icon: Target },
  { value: 'exploit', label: 'Exploit', description: 'SQLi, SSTI, Kerberoasting, credential attacks', icon: Shield },
  { value: 'postexploit', label: 'PostExploit', description: 'Privilege escalation, lateral movement, C2', icon: Shield },
  { value: 'analyst', label: 'Analyst', description: 'Code review, static analysis, CVE sweeps, fuzzing', icon: FileText },
  { value: 'reverser', label: 'Reverser', description: 'ELF/PE/firmware triage, ROP gadgets, Ghidra', icon: Cpu },
  { value: 'contract_auditor', label: 'Contract Auditor', description: 'Solidity/EVM: reentrancy, flash loans, Slither', icon: FileText },
  { value: 'cloud_hunter', label: 'Cloud Hunter', description: 'AWS IAM privesc, S3 takeover, K8s RBAC', icon: Target },
  { value: 'ad_operator', label: 'AD Operator', description: 'BloodHound, Kerberoast, ADCS, DCSync', icon: Target },
  { value: 'vulnresearch', label: 'VulnResearch', description: 'Vulnerability research pipeline (Scanner→Detector→Verifier)', icon: Cpu },
  { value: 'scanner', label: 'Scanner', description: 'Phase 1 — sweep codebase for candidate weaknesses', icon: Target },
  { value: 'detector', label: 'Detector', description: 'Phase 2 — promote candidates to vulnerabilities', icon: Target },
  { value: 'verifier', label: 'Verifier', description: 'Phase 3 — craft PoCs (zero false positive)', icon: Shield },
  { value: 'patcher', label: 'Patcher', description: 'Phase 4 — generate minimal patches', icon: FileText },
  { value: 'exploiter', label: 'Exploiter', description: 'Phase 5 — chain primitives into weaponized attack paths', icon: Shield },
  { value: 'defender', label: 'Defender', description: 'Vaccine loop — attack → defense → verify', icon: Shield },
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
    <div
      className="fixed inset-0 z-50 flex items-stretch md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal — full-screen on <md, contained on md+ */}
      <div className="relative w-full md:w-[720px] md:max-w-[90vw] md:max-h-[90vh] md:mx-4 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-elevated)] flex flex-col md:rounded-[8px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-[var(--bjhunt-border)]">
          <div>
            <Eyebrow className="block">Step {step + 1} of {totalSteps}</Eyebrow>
            <H3 id="wizard-title" className="mt-1">New scan</H3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
            aria-label="Close wizard"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step tabs / progress */}
        <div className="flex items-center px-5 md:px-6 py-3 border-b border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] overflow-x-auto">
          {STEP_LABELS.map((label, i) => {
            const Icon = STEP_ICONS[i]
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={label} className="flex items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-6 h-6 flex items-center justify-center border rounded-[4px] transition-colors',
                      isActive
                        ? 'border-[var(--state-success)] text-[var(--state-success)]'
                        : isDone
                          ? 'border-[var(--state-success)] bg-[var(--state-success)] text-black'
                          : 'border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)]',
                    )}
                  >
                    {isDone ? <Check size={11} /> : <Icon size={11} />}
                  </div>
                  <span
                    className={cn(
                      'font-mono text-[11px] uppercase tracking-[0.18em]',
                      isActive
                        ? 'text-[var(--bjhunt-text)]'
                        : isDone
                          ? 'text-[var(--state-success)]'
                          : 'text-[var(--bjhunt-text-muted)]',
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className={cn(
                      'w-8 md:w-12 h-px mx-2',
                      isDone ? 'bg-[var(--state-success)]' : 'bg-[var(--bjhunt-border)]',
                    )}
                    aria-hidden
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5 space-y-5">
          {/* Step 1: Target */}
          {step === 0 && (
            <>
              <Field label="Target URL / IP *">
                <input
                  value={wizard.targetUrl}
                  onChange={(e) => updateField('targetUrl', e.target.value)}
                  className="w-full bg-[var(--bjhunt-bg-secondary)] border border-[var(--bjhunt-border)] px-3 h-11 md:h-10 text-[13px] font-mono text-[var(--bjhunt-text)] focus:outline-none focus:border-[var(--state-success)] rounded-[6px]"
                  placeholder="https://example.com or 192.168.1.0/24"
                  autoFocus
                />
              </Field>
              <Field label="Target name" hint="Leave blank to auto-generate from the target URL.">
                <input
                  value={wizard.targetName}
                  onChange={(e) => updateField('targetName', e.target.value)}
                  className="w-full bg-[var(--bjhunt-bg-secondary)] border border-[var(--bjhunt-border)] px-3 h-11 md:h-10 text-[13px] font-mono text-[var(--bjhunt-text)] focus:outline-none focus:border-[var(--state-success)] rounded-[6px]"
                  placeholder={wizard.targetUrl ? deriveNameFromUrl(wizard.targetUrl) : 'Auto-generated from URL'}
                />
              </Field>
              <Field label="Target type">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {TARGET_TYPES.map((tt) => (
                    <button
                      key={tt.value}
                      onClick={() => updateField('targetType', tt.value)}
                      className={cn(
                        'h-11 md:h-10 px-3 text-[12px] font-mono border transition-colors text-left rounded-[6px]',
                        wizard.targetType === tt.value
                          ? 'border-[var(--state-success)] text-[var(--state-success)] bg-[var(--state-success-tint)]'
                          : 'border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)] hover:border-[var(--bjhunt-border-strong)] hover:text-[var(--bjhunt-text)]',
                      )}
                    >
                      {tt.label}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* Step 2: Scope */}
          {step === 1 && (
            <>
              <Field label="In-scope domains / IPs" hint="One entry per line. Wildcards and CIDR supported.">
                <textarea
                  value={wizard.inScope}
                  onChange={(e) => updateField('inScope', e.target.value)}
                  rows={4}
                  className="w-full bg-[var(--bjhunt-bg-secondary)] border border-[var(--bjhunt-border)] px-3 py-2 text-[13px] font-mono text-[var(--bjhunt-text)] focus:outline-none focus:border-[var(--state-success)] resize-none rounded-[6px]"
                  placeholder={'example.com\n*.example.com\n192.168.1.0/24'}
                />
              </Field>
              <Field label="Out-of-scope" hint="Systems that must NOT be tested.">
                <textarea
                  value={wizard.outOfScope}
                  onChange={(e) => updateField('outOfScope', e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--bjhunt-bg-secondary)] border border-[var(--bjhunt-border)] px-3 py-2 text-[13px] font-mono text-[var(--bjhunt-text)] focus:outline-none focus:border-[var(--state-success)] resize-none rounded-[6px]"
                  placeholder={'prod.example.com\n10.0.0.0/8'}
                />
              </Field>
              <Field label="Max scan duration">
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => updateField('maxDuration', d.value)}
                      className={cn(
                        'h-9 px-4 text-[12px] font-mono border transition-colors rounded-[6px]',
                        wizard.maxDuration === d.value
                          ? 'border-[var(--state-success)] text-[var(--state-success)] bg-[var(--state-success-tint)]'
                          : 'border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)] hover:border-[var(--bjhunt-border-strong)] hover:text-[var(--bjhunt-text)]',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* Step 3: Agent picker — 1 / 2 / 3 col */}
          {step === 2 && (
            <>
              <Field label="Agent graph">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {AGENT_OPTIONS.map((agent) => {
                    const Icon = agent.icon
                    const selected = wizard.agentGraph === agent.value
                    return (
                      <button
                        key={agent.value}
                        onClick={() => updateField('agentGraph', agent.value)}
                        className={cn(
                          'flex flex-col gap-1.5 text-left p-4 border transition-colors rounded-[6px] bg-[var(--bjhunt-bg-secondary)]',
                          selected
                            ? 'border-[var(--state-success)]'
                            : 'border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)]',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            size={20}
                            className={selected ? 'text-[var(--state-success)]' : 'text-[var(--bjhunt-text-muted)]'}
                            aria-hidden
                          />
                          <H4 className="text-[14px]">{agent.label}</H4>
                        </div>
                        <Body size="sm" muted>
                          {agent.description}
                        </Body>
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="space-y-3 pt-1">
                <ToggleRow
                  checked={wizard.vaccineMode}
                  onChange={(v) => updateField('vaccineMode', v)}
                  label="Enable vaccine loop"
                  hint="Attack → defense → verify cycle. Generates defensive recommendations."
                />
                <ToggleRow
                  checked={wizard.autoReport}
                  onChange={(v) => updateField('autoReport', v)}
                  label="Enable auto-reporting"
                  hint="Generate reports automatically when the scan completes."
                />
              </div>
            </>
          )}

          {/* Step 4: Review & Launch */}
          {step === 3 && (
            <div className="border border-[var(--bjhunt-border)] rounded-[6px] divide-y divide-[var(--bjhunt-border)]">
              <ReviewRow label="Target">
                <H4>{wizard.targetName || deriveNameFromUrl(wizard.targetUrl)}</H4>
                <Body size="sm" muted className="mt-0.5 font-mono">
                  {wizard.targetUrl}
                </Body>
                <span className="inline-flex mt-2 px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)] rounded-[4px]">
                  {TARGET_TYPES.find((t) => t.value === wizard.targetType)?.label ?? wizard.targetType}
                </span>
              </ReviewRow>

              <ReviewRow label="Scope">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Eyebrow>In-scope</Eyebrow>
                    <Body size="sm" muted className="mt-1 font-mono whitespace-pre-line">
                      {wizard.inScope || '(all from target)'}
                    </Body>
                  </div>
                  <div>
                    <Eyebrow>Out-of-scope</Eyebrow>
                    <Body size="sm" muted className="mt-1 font-mono whitespace-pre-line">
                      {wizard.outOfScope || '(none)'}
                    </Body>
                  </div>
                </div>
                <Body size="sm" muted className="mt-3 font-mono">
                  Max duration: {DURATION_OPTIONS.find((d) => d.value === wizard.maxDuration)?.label ?? `${wizard.maxDuration}s`}
                </Body>
              </ReviewRow>

              <ReviewRow label="Agent">
                <H4>
                  {AGENT_OPTIONS.find((a) => a.value === wizard.agentGraph)?.label ?? wizard.agentGraph}
                </H4>
                <div className="flex items-center gap-2 mt-2">
                  <ReviewBadge active={wizard.vaccineMode}>Vaccine {wizard.vaccineMode ? 'ON' : 'OFF'}</ReviewBadge>
                  <ReviewBadge active={wizard.autoReport}>Auto-report {wizard.autoReport ? 'ON' : 'OFF'}</ReviewBadge>
                </div>
              </ReviewRow>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-t border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)]">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={isPending}
              className="inline-flex items-center gap-1 h-10 md:h-9 px-4 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] transition-colors disabled:opacity-40 rounded-[6px]"
            >
              <ChevronLeft size={12} />
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="inline-flex items-center gap-1 h-10 md:h-9 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors disabled:opacity-40 rounded-[6px]"
              >
                Next
                <ChevronRight size={12} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isPending}
                  className="h-11 md:h-10 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] transition-colors disabled:opacity-40 rounded-[6px]"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                  Create scan
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 h-11 md:h-10 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors disabled:opacity-40 rounded-[6px]"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Create &amp; launch
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block mb-1.5">
        <Eyebrow>{label}</Eyebrow>
      </label>
      {children}
      {hint && (
        <Body size="sm" muted className="mt-1.5">
          {hint}
        </Body>
      )}
    </div>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full p-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] transition-colors text-left rounded-[6px]"
    >
      <div
        className={cn(
          'w-5 h-5 flex items-center justify-center border rounded-[4px] transition-colors flex-shrink-0',
          checked
            ? 'border-[var(--state-success)] bg-[var(--state-success)]'
            : 'border-[var(--bjhunt-border-strong)]',
        )}
        aria-hidden
      >
        {checked && <Check size={12} className="text-black" />}
      </div>
      <div className="min-w-0">
        <Body className="text-[14px]">{label}</Body>
        <Body size="sm" muted>
          {hint}
        </Body>
      </div>
    </button>
  )
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4">
      <Eyebrow className="block mb-2">{label}</Eyebrow>
      {children}
    </div>
  )
}

function ReviewBadge({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.18em] border rounded-[4px]',
        active
          ? 'border-[var(--state-success)] text-[var(--state-success)]'
          : 'border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)]',
      )}
    >
      {children}
    </span>
  )
}

// ── Engagement card ─────────────────────────────────────────────────────

function EngagementCard({
  run,
  locale,
  onCancel,
  isPending,
}: {
  run: AuditRun
  locale: string
  onCancel: (id: string) => void
  isPending: boolean
}) {
  const dotState = STATUS_DOT[run.status] ?? 'neutral'
  const isLive = run.status === 'running'
  const summary = (run.resultSummary ?? {}) as { totalFindings?: number; criticalCount?: number }

  return (
    <div className="bg-[var(--bjhunt-bg-secondary)] p-6 hover:bg-[var(--bjhunt-bg-tertiary)] transition-colors flex flex-col gap-4 group">
      {/* Eyebrow status */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <StatusDot state={dotState} live={isLive} />
          <span
            style={{
              fontFamily: 'var(--bjhunt-font-mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:
                dotState === 'success'
                  ? 'var(--state-success)'
                  : dotState === 'warning'
                    ? 'var(--state-warning)'
                    : dotState === 'critical'
                      ? 'var(--state-critical)'
                      : 'var(--bjhunt-text-muted)',
            }}
          >
            {STATUS_LABELS[run.status] ?? run.status}
          </span>
        </div>
        {(run.status === 'draft' || run.status === 'running') && (
          <button
            onClick={() => onCancel(run.id)}
            disabled={isPending}
            title="Cancel"
            aria-label="Cancel engagement"
            className="p-1.5 text-[var(--bjhunt-text-muted)] hover:text-[var(--state-critical)] transition-colors disabled:opacity-40"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Title */}
      <Link
        href={`/${locale}/dashboard/audits/${run.id}`}
        className="block hover:text-white transition-colors"
      >
        <H3 className="line-clamp-2">{run.title}</H3>
      </Link>

      {/* Target — mono */}
      {run.target && (
        <Body
          className="font-mono truncate text-[13px]"
          style={{ color: 'var(--bjhunt-text)' }}
        >
          {run.target}
        </Body>
      )}

      {/* Last run */}
      <Body size="sm" muted className="font-mono">
        Updated {new Date(run.updatedAt ?? run.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Body>

      {/* Summary chip row */}
      {summary.totalFindings != null && summary.totalFindings > 0 && (
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--bjhunt-border)] text-[12px] font-mono">
          <span className="text-[var(--bjhunt-text-muted)]">
            <span className="tabular-nums text-[var(--bjhunt-text)]">{summary.totalFindings}</span> findings
          </span>
          {summary.criticalCount != null && summary.criticalCount > 0 && (
            <span className="text-[var(--state-critical)]">
              <span className="tabular-nums">{summary.criticalCount}</span> critical
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/${locale}/dashboard/audits/${run.id}`}
        className="inline-flex items-center justify-center gap-1 mt-auto h-9 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] transition-colors rounded-[6px]"
      >
        Open
        <ChevronRight size={12} />
      </Link>
    </div>
  )
}

// ── Main client ─────────────────────────────────────────────────────────

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
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const router = useRouter()

  // Auto-refresh while a run is in flight
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

  const handleCancel = (id: string) => setCancelTargetId(id)

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
      {/* Cancel confirmation modal */}
      {cancelTargetId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-audit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setCancelTargetId(null)}
        >
          <div
            className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-elevated)] p-6 max-w-sm w-full rounded-[8px]"
            onClick={(e) => e.stopPropagation()}
          >
            <H3 id="cancel-audit-title" className="mb-2">Cancel this audit?</H3>
            <Body muted className="mb-5">
              The audit will switch to <span className="text-[var(--bjhunt-text)] font-mono">cancelled</span>. Findings already collected are kept.
            </Body>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="h-10 px-4 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--bjhunt-text)] border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] transition-colors rounded-[6px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={isPending}
                className="h-10 px-4 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--state-critical)] border border-[var(--state-critical)] hover:bg-[var(--state-critical-tint)] transition-colors disabled:opacity-50 rounded-[6px]"
              >
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <Body className="font-mono text-[13px]" muted>
          {total} engagement{total !== 1 ? 's' : ''}
        </Body>
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-1.5 h-10 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors rounded-[6px]"
        >
          <Plus size={14} />
          New audit
        </button>
      </div>

      {/* Wizard */}
      {showWizard && (
        <WizardModal
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Empty / Grid */}
      {runs.length === 0 ? (
        <div className="border-y border-[var(--bjhunt-border)] py-24 px-4 text-center">
          <Eyebrow className="block mb-3">Empty State</Eyebrow>
          <H3 className="mb-2">No audits yet</H3>
          <Body muted className="mb-6 max-w-md mx-auto">
            Create your first engagement to put the orchestrator to work.
          </Body>
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-1.5 h-10 px-5 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors rounded-[6px]"
          >
            <Plus size={14} />
            New audit
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-[var(--bjhunt-border)] border border-[var(--bjhunt-border)]"
        >
          {runs.map((run) => (
            <EngagementCard
              key={run.id}
              run={run}
              locale={locale}
              onCancel={handleCancel}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
