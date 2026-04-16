import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { serverBackendFetch } from '@/lib/backend-client'
import { ChevronLeft } from 'lucide-react'
import { ReportExportBar } from '@/components/dashboard/report-export-bar'

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-muted)',
  running: 'var(--warning)',
  completed: 'var(--success)',
  failed: 'var(--danger)',
  cancelled: 'var(--text-subtle)',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  running: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
  cancelled: 'Annulé',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--danger)',
  high: '#f97316',
  medium: 'var(--warning)',
  low: '#60a5fa',
  info: 'var(--text-muted)',
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

      {/* Export bar */}
      <div className="mb-6">
        <ReportExportBar engagementId={id} />
      </div>

      {/* Scan results */}
      <div>
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Résultats ({results.length})
        </h2>

        {results.length === 0 ? (
          <div className="border border-[var(--border)] px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
            Aucun résultat de scan pour cet audit.
          </div>
        ) : (
          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {results.map((r: {
              id: string
              severity: string
              category: string
              title: string
              description: string | null
              cve: string | null
              cvssScore: number | null
              remediation: string | null
              createdAt: string
            }) => (
              <div key={r.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-1.5 h-1.5 mt-1.5 flex-shrink-0 rounded-full"
                    style={{ background: SEVERITY_COLORS[r.severity] ?? 'var(--text-muted)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[12px] font-mono font-bold text-white">{r.title}</span>
                      <span
                        className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border flex-shrink-0"
                        style={{ borderColor: SEVERITY_COLORS[r.severity], color: SEVERITY_COLORS[r.severity] }}
                      >
                        {r.severity}
                      </span>
                      <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-[var(--border)] text-[var(--text-muted)] flex-shrink-0">
                        {r.category}
                      </span>
                      {r.cve && (
                        <span className="text-[8px] font-mono text-[var(--text-subtle)]">{r.cve}</span>
                      )}
                      {r.cvssScore != null && (
                        <span className="text-[8px] font-mono text-[var(--text-subtle)]">CVSS {r.cvssScore}</span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-[11px] text-[var(--text-muted)] font-mono mb-2">{r.description}</p>
                    )}
                    {r.remediation && (
                      <p className="text-[10px] text-[var(--text-subtle)] font-mono border-l-2 border-[var(--border)] pl-2">
                        {r.remediation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
