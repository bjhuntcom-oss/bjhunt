import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { serverBackendFetch } from '@/lib/backend-client'
import { ChevronLeft } from 'lucide-react'
import { ReportExportBar } from '@/components/dashboard/report-export-bar'
import { VaccineMonitor } from '@/components/dashboard/vaccine-monitor'
import { DefenseBriefPanel } from '@/components/dashboard/defense-brief-panel'
import { FindingCard } from '@/components/ui/finding-card'
import { type Severity } from '@/components/ui/severity-badge'
import { type AgentId } from '@/lib/agent-labels'
import { Eyebrow, H1, H2, Body } from '@/components/ui/typography'
import { StatusDot, type DotState } from '@/components/ui/status-dot'

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

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

function clampSeverity(s: string): Severity {
  return (SEVERITY_ORDER as string[]).includes(s) ? (s as Severity) : 'info'
}

function statusColor(state: DotState): string {
  switch (state) {
    case 'success':
      return 'var(--state-success)'
    case 'warning':
      return 'var(--state-warning)'
    case 'critical':
      return 'var(--state-critical)'
    default:
      return 'var(--bjhunt-text-muted)'
  }
}

export default async function AuditRunDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const meRes = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meRes.ok) redirect(`/${locale}/login`)

  const [engRes, findingsRes] = await Promise.all([
    serverBackendFetch(`/api/engagements/${id}`, {}, cookieHeader),
    serverBackendFetch(`/api/engagements/${id}/findings`, {}, cookieHeader),
  ])
  if (!engRes.ok) {
    if (engRes.status === 404) notFound()
    redirect(`/${locale}/dashboard/audits`)
  }

  const { engagement } = await engRes.json()
  const findingsData = findingsRes.ok ? await findingsRes.json() : { findings: [] }
  const run = { ...engagement, title: engagement.name }
  const results = findingsData.findings ?? []

  const dotState = STATUS_DOT[run.status] ?? 'neutral'
  const isLive = run.status === 'running'

  return (
    <div className="px-4 py-8 sm:px-6 md:p-10 max-w-[1280px] mx-auto">
      {/* Back link */}
      <Link
        href={`/${locale}/dashboard/audits`}
        className="inline-flex items-center gap-1 mb-6 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
      >
        <ChevronLeft size={12} />
        Back to audits
      </Link>

      {/* Hero */}
      <header className="mb-10 md:mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <StatusDot state={dotState} live={isLive} />
          <span
            style={{
              fontFamily: 'var(--bjhunt-font-mono)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: statusColor(dotState),
            }}
          >
            Engagement · {STATUS_LABELS[run.status] ?? run.status}
          </span>
        </div>
        <H1 className="max-w-3xl" style={{ textWrap: 'balance' }}>
          {run.title}
        </H1>
        {run.target && (
          <p
            className="mt-3 font-mono"
            style={{
              fontSize: 14,
              color: 'var(--bjhunt-text)',
              letterSpacing: '0.02em',
            }}
          >
            <span className="text-[var(--bjhunt-text-muted)]">target </span>
            {run.target}
          </p>
        )}
        <Body size="sm" muted className="mt-2 font-mono">
          Created {new Date(run.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Body>
      </header>

      {/* Action strip */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <NavLink href={`/${locale}/dashboard/audits/${id}/opplan`}>OPPLAN</NavLink>
        <NavLink href={`/${locale}/dashboard/audits/${id}/graph`}>Knowledge graph</NavLink>
        <NavLink href={`/${locale}/dashboard/audits/${id}/config`}>Config</NavLink>
        <NavLink href={`/${locale}/dashboard/audits/${id}/report/view`}>Report</NavLink>
      </div>
      <div className="mb-6">
        <ReportExportBar engagementId={id} />
      </div>

      {/* 2-col layout xl+, single col below */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: findings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <H2>Findings</H2>
            <span className="font-mono text-[13px] text-[var(--bjhunt-text-muted)] tabular-nums">
              {results.length}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="border border-[var(--bjhunt-border)] px-4 py-10 text-center">
              <Body muted>No scan results for this audit yet.</Body>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.map((r: {
                id: string
                severity: string
                category: string
                title: string
                description: string | null
                cve: string | null
                cvssScore: number | null
                mitreTechnique?: string | null
                agent?: string | null
                verified?: boolean
                remediation: string | null
                createdAt: string
              }) => (
                <FindingCard
                  key={r.id}
                  severity={clampSeverity(r.severity)}
                  title={r.title}
                  cve={r.cve}
                  cvss={r.cvssScore ?? undefined}
                  mitre={r.mitreTechnique ?? null}
                  agent={(r.agent ?? null) as AgentId | null}
                  verified={r.verified}
                  description={r.description ?? r.remediation ?? ''}
                  compact
                />
              ))}
            </div>
          )}
        </section>

        {/* Right: monitors */}
        <section className="space-y-6">
          {(run.status === 'running' || results.length > 0) && (
            <VaccineMonitor engagementId={id} />
          )}
          {results.length > 0 && <DefenseBriefPanel engagementId={id} />}
          {run.status !== 'running' && results.length === 0 && (
            <div className="border border-[var(--bjhunt-border)] p-6">
              <Eyebrow className="block mb-2">Status</Eyebrow>
              <Body muted>
                The orchestrator is idle for this engagement. Launch a scan from
                the chat or via the OPPLAN to populate findings.
              </Body>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center h-9 px-4 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] transition-colors rounded-[6px]"
    >
      {children}
    </Link>
  )
}
