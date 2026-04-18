/**
 * audits/[id]/report/view — standalone readable report.
 *
 * Complements the existing `/report` download hub. Server-fetches engagement +
 * findings, groups findings by severity, and renders them via FindingCard,
 * ProgressBarPhases, and SeverityBadge — everything respects the design tokens.
 *
 * Print-optimised: @media print sheds chrome and forces severity accents to
 * carry through on paper.
 */
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { serverBackendFetch } from '@/lib/backend-client'
import { ChevronLeft, Download } from 'lucide-react'
import { SeverityBadge, type Severity } from '@/components/ui/severity-badge'
import { ProgressBarPhases, type PhaseState } from '@/components/ui/progress-bar-phases'
import { ReportFindings } from './report-findings'
import { PrintButton } from './print-button'

interface Engagement {
  id: string
  name: string
  target: string | null
  status: string
  created_at?: string
  createdAt?: string
  completed_at: string | null
  findings_count: number | null
  security_score: number | null
}

interface Finding {
  id: string
  severity: string
  category: string
  title: string
  description: string | null
  cve: string | null
  cvssScore: number | null
  mitreTechnique?: string | null
  agent?: string | null
  remediation: string | null
  createdAt: string
  verified?: boolean
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

const PHASE_BY_STATUS: Record<string, PhaseState> = {
  draft: 'pending',
  running: 'active',
  completed: 'complete',
  failed: 'error',
  cancelled: 'error',
}

function clampSeverity(s: string): Severity {
  return (SEVERITY_ORDER as string[]).includes(s) ? (s as Severity) : 'info'
}

export default async function AuditReportViewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const [engRes, findingsRes] = await Promise.all([
    serverBackendFetch(`/api/engagements/${id}`, {}, cookieHeader),
    serverBackendFetch(`/api/engagements/${id}/findings`, {}, cookieHeader),
  ])
  if (engRes.status === 404) notFound()
  if (!engRes.ok) redirect(`/${locale}/dashboard/audits`)

  const { engagement } = (await engRes.json()) as { engagement: Engagement }
  const { findings = [] } = findingsRes.ok ? await findingsRes.json() : { findings: [] }
  const typedFindings = findings as Finding[]

  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: typedFindings.filter((f) => clampSeverity(f.severity) === sev),
  }))
  const counts = Object.fromEntries(grouped.map((g) => [g.severity, g.items.length])) as Record<Severity, number>
  const total = typedFindings.length

  const createdISO = engagement.createdAt ?? engagement.created_at
  const createdAt = createdISO ? new Date(createdISO) : null
  const completedAt = engagement.completed_at ? new Date(engagement.completed_at) : null

  const phaseState: PhaseState = PHASE_BY_STATUS[engagement.status] ?? 'pending'
  const phases = [
    { id: 'plan',    label: 'Planning',       state: (phaseState === 'pending' ? 'pending' : 'complete') as PhaseState },
    { id: 'recon',   label: 'Reconnaissance', state: (phaseState === 'pending' ? 'pending' : phaseState === 'active' ? 'complete' : 'complete') as PhaseState },
    { id: 'exploit', label: 'Exploitation',   state: (phaseState === 'complete' ? 'complete' : phaseState) as PhaseState },
    { id: 'post',    label: 'Post-Exploit',   state: (phaseState === 'complete' ? 'complete' : phaseState === 'active' ? 'active' : 'pending') as PhaseState },
    { id: 'report',  label: 'Report',         state: (phaseState === 'complete' ? 'complete' : 'pending') as PhaseState },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bjhunt-bg)',
        color: 'var(--bjhunt-text)',
        fontFamily: 'var(--bjhunt-font-sans)',
        padding: 'var(--bjhunt-space-10)',
      }}
      className="bjhunt-report-view"
    >
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #0A0A0F !important; }
          .bjhunt-report-view { background: #ffffff !important; color: #0A0A0F !important; padding: 24px !important; }
          .bjhunt-report-view a { color: #0A0A0F !important; }
          .bjhunt-report-no-print { display: none !important; }
          .bjhunt-sev-badge { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          * { box-shadow: none !important; }
        }
      `}</style>

      {/* Top bar — back link + actions (hidden in print) */}
      <div
        className="bjhunt-report-no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--bjhunt-space-4)',
          marginBottom: 'var(--bjhunt-space-8)',
          maxWidth: 1180,
        }}
      >
        <Link
          href={`/dashboard/audits/${id}/report`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 'var(--bjhunt-text-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--bjhunt-text-muted)',
            textDecoration: 'none',
          }}
          className="hover:text-[var(--bjhunt-text)]"
        >
          <ChevronLeft style={{ width: 12, height: 12 }} />
          Back to report hub
        </Link>

        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`/api/proxy/reports/${id}/executive`}
            download={`${engagement.name.replace(/[^a-z0-9-]/gi, '_')}-executive.md`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontFamily: 'var(--bjhunt-font-mono)',
              fontSize: 'var(--bjhunt-text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--bjhunt-text-muted)',
              border: '1px solid var(--bjhunt-border-strong)',
              textDecoration: 'none',
            }}
            className="hover:text-[var(--bjhunt-text)] hover:bg-white/[0.03]"
          >
            <Download style={{ width: 12, height: 12 }} />
            Export .md
          </a>
          <PrintButton />
        </div>
      </div>

      <main style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* HERO — engagement identity */}
        <section
          style={{
            display: 'flex',
            gap: 'var(--bjhunt-space-8)',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            paddingBottom: 'var(--bjhunt-space-8)',
            borderBottom: '1px solid var(--bjhunt-border)',
            marginBottom: 'var(--bjhunt-space-8)',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 'var(--bjhunt-text-xs)',
                color: 'var(--bjhunt-text-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.24em',
                margin: 0,
              }}
            >
              Engagement report · BJHUNT ALPHA 1.0
            </p>
            <h1
              style={{
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                margin: '8px 0 0 0',
                color: 'var(--bjhunt-text)',
                textWrap: 'balance',
              }}
            >
              {engagement.name}
            </h1>
            {engagement.target && (
              <p
                style={{
                  fontFamily: 'var(--bjhunt-font-mono)',
                  fontSize: 'var(--bjhunt-text-sm)',
                  color: 'var(--bjhunt-text-muted)',
                  margin: '10px 0 0 0',
                }}
              >
                <span style={{ color: 'var(--bjhunt-text-subtle)' }}>target:</span>{' '}
                <span style={{ color: 'var(--bjhunt-text)' }}>{engagement.target}</span>
              </p>
            )}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--bjhunt-space-6)',
                marginTop: 'var(--bjhunt-space-5)',
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 'var(--bjhunt-text-xs)',
              }}
            >
              <Meta label="Status" value={engagement.status} />
              {createdAt && <Meta label="Started" value={createdAt.toLocaleString(locale)} />}
              {completedAt && <Meta label="Completed" value={completedAt.toLocaleString(locale)} />}
              <Meta label="Findings" value={String(total)} />
              {engagement.security_score != null && (
                <Meta label="Score" value={`${Number(engagement.security_score).toFixed(1)} / 10`} />
              )}
            </div>
          </div>

          {/* Severity score card — giant number + mini histogram */}
          <ScoreCard counts={counts} total={total} />
        </section>

        {/* Progression phases */}
        <section style={{ marginBottom: 'var(--bjhunt-space-10)' }}>
          <SectionTitle>Kill chain progression</SectionTitle>
          <ProgressBarPhases phases={phases} />
        </section>

        {/* Findings list grouped by severity (interactive — client) */}
        <section>
          <SectionTitle>Detailed findings ({total})</SectionTitle>
          <ReportFindings findings={typedFindings} />
        </section>

        {/* Footer — AI disclosure (EU AI Act Art. 50) */}
        <footer
          style={{
            marginTop: 'var(--bjhunt-space-12)',
            paddingTop: 'var(--bjhunt-space-6)',
            borderTop: '1px solid var(--bjhunt-border)',
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 'var(--bjhunt-text-xs)',
            color: 'var(--bjhunt-text-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
          }}
        >
          AI-generated report · Verify findings against ground truth before acting ·{' '}
          <Link href="/legal/ai-policy" style={{ color: 'var(--bjhunt-text-muted)' }} className="hover:text-[var(--bjhunt-text)] underline">
            AI Policy
          </Link>
        </footer>
      </main>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 'var(--bjhunt-text-xs)',
        color: 'var(--bjhunt-text-subtle)',
        textTransform: 'uppercase',
        letterSpacing: '0.24em',
        fontWeight: 500,
        marginBottom: 'var(--bjhunt-space-4)',
        paddingBottom: 'var(--bjhunt-space-2)',
        borderBottom: '1px solid var(--bjhunt-border)',
      }}
    >
      {children}
    </h2>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline' }}>
      <span style={{ color: 'var(--bjhunt-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
        {label}
      </span>
      <span style={{ color: 'var(--bjhunt-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </span>
  )
}

function ScoreCard({ counts, total }: { counts: Record<Severity, number>; total: number }) {
  const worst: Severity =
    counts.critical > 0 ? 'critical' :
    counts.high > 0 ? 'high' :
    counts.medium > 0 ? 'medium' :
    counts.low > 0 ? 'low' : 'info'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 'var(--bjhunt-space-5)',
        border: '1px solid var(--bjhunt-border)',
        background: 'var(--bjhunt-bg-secondary)',
        minWidth: 320,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span
          style={{
            fontSize: 48,
            fontWeight: 200,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            color: 'var(--bjhunt-text)',
          }}
        >
          {total}
        </span>
        <span
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 'var(--bjhunt-text-xs)',
            color: 'var(--bjhunt-text-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.24em',
          }}
        >
          total findings
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SEVERITY_ORDER.map((sev) => (
          <SeverityBadge
            key={sev}
            severity={sev}
            variant={sev === worst && counts[sev] > 0 ? 'solid' : 'outline'}
            size="sm"
            pulse={sev === 'critical' && counts.critical > 0}
          >
            {sev} · {counts[sev]}
          </SeverityBadge>
        ))}
      </div>
    </div>
  )
}
