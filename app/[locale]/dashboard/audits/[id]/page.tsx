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
  completed: 'Terminé',
  failed: 'Échoué',
  cancelled: 'Annulé',
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

function clampSeverity(s: string): Severity {
  return (SEVERITY_ORDER as string[]).includes(s) ? (s as Severity) : 'info'
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

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/${locale}/dashboard/audits`}
          className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={12} />
          Retour aux audits
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{run.title}</h1>
            {run.target && (
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">{run.target}</p>
            )}
          </div>
          <span
            className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 border flex-shrink-0"
            style={{ borderColor: STATUS_COLORS[run.status], color: STATUS_COLORS[run.status] }}
          >
            {STATUS_LABELS[run.status] ?? run.status}
          </span>
        </div>

        <p className="text-[10px] text-[var(--text-subtle)] font-mono mt-2">
          Créé le {new Date(run.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* OPPLAN link + Export bar */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Link
          href={`/${locale}/dashboard/audits/${id}/opplan`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] hover:bg-[var(--bg-input)] transition-colors"
        >
          View OPPLAN &rarr;
        </Link>
        <Link
          href={`/${locale}/dashboard/audits/${id}/graph`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] hover:bg-[var(--bg-input)] transition-colors"
        >
          View Knowledge Graph &rarr;
        </Link>
        <Link
          href={`/${locale}/dashboard/audits/${id}/config`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] hover:bg-[var(--bg-input)] transition-colors"
        >
          Config &rarr;
        </Link>
      </div>
      <div className="mb-6">
        <ReportExportBar engagementId={id} />
      </div>

      {/* Vaccine loop monitor — shown when running or has findings */}
      {(run.status === 'running' || results.length > 0) && (
        <div className="mb-6">
          <VaccineMonitor engagementId={id} />
        </div>
      )}

      {/* Defense brief — shown when engagement has findings */}
      {results.length > 0 && (
        <div className="mb-6">
          <DefenseBriefPanel engagementId={id} />
        </div>
      )}

      {/* Scan results */}
      <div>
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--bjhunt-text-muted)] mb-4">
          Résultats ({results.length})
        </h2>

        {results.length === 0 ? (
          <div className="border border-[var(--bjhunt-border)] px-4 py-10 text-center text-[11px] font-mono text-[var(--bjhunt-text-muted)] uppercase tracking-[0.2em]">
            Aucun résultat de scan pour cet audit.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
