import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { serverBackendFetch } from '@/lib/backend-client'
import { ChevronLeft, FileText, Bug, Clock, Download, Eye } from 'lucide-react'

interface Engagement {
  id: string
  name: string
  target: string | null
  status: string
  created_at: string
  completed_at: string | null
  findings_count: number | null
  security_score: number | null
}

const REPORT_FORMATS = [
  {
    id: 'executive',
    label: 'Executive Summary',
    description: 'High-level overview for non-technical stakeholders. Risk score, key findings, recommendations.',
    icon: FileText,
    extension: 'md',
    mediaType: 'text/markdown',
  },
  {
    id: 'hackerone',
    label: 'HackerOne Report',
    description: 'Vulnerability disclosure format compatible with HackerOne / Bugcrowd intake.',
    icon: Bug,
    extension: 'md',
    mediaType: 'text/markdown',
  },
  {
    id: 'timeline',
    label: 'Engagement Timeline',
    description: 'Chronological reconstruction of every agent action, tool call, and finding.',
    icon: Clock,
    extension: 'md',
    mediaType: 'text/markdown',
  },
  {
    id: 'csv',
    label: 'Findings CSV',
    description: 'All findings in a spreadsheet-ready CSV (severity, CVSS, MITRE, agent, status…).',
    icon: Download,
    extension: 'csv',
    mediaType: 'text/csv',
  },
] as const

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const res = await serverBackendFetch(`/api/engagements/${id}`, {}, cookieHeader)
  if (res.status === 404) notFound()
  if (!res.ok) redirect(`/${locale}/dashboard/audits`)
  const { engagement } = (await res.json()) as { engagement: Engagement }

  const completed = engagement.status === 'completed'

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href={`/dashboard/audits/${id}`}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted)] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-3 h-3" /> Back to engagement
      </Link>

      <header className="mt-6 mb-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted)]">Reports</p>
        <h1 className="text-3xl font-black mt-1 tracking-[-0.02em]">{engagement.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-[var(--bjhunt-text-muted)] font-mono">
          <span>Target: <span className="text-white">{engagement.target ?? '—'}</span></span>
          <span>Status: <span className="text-white">{engagement.status}</span></span>
          <span>Findings: <span className="text-white">{engagement.findings_count ?? 0}</span></span>
          {engagement.security_score != null && (
            <span>Score: <span className="text-white">{Number(engagement.security_score).toFixed(1)}/10</span></span>
          )}
        </div>
        {!completed && (
          <p className="mt-4 inline-block px-3 py-1.5 border border-[var(--bjhunt-status-warning,#F59E0B)] text-[10px] uppercase tracking-[0.15em] text-[var(--bjhunt-status-warning,#F59E0B)]">
            Engagement still in progress — reports reflect partial state.
          </p>
        )}
      </header>

      {/* Standalone online viewer — complements the download formats below */}
      <Link
        href={`/dashboard/audits/${id}/report/view`}
        className="mb-6 flex items-center justify-between gap-4 px-6 py-5 border border-[var(--bjhunt-brand-primary)] bg-[var(--bjhunt-brand-primary-soft)] hover:bg-[var(--bjhunt-brand-primary)]/20 transition-colors group"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 border border-[var(--bjhunt-brand-primary)] flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-[var(--bjhunt-brand-primary)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide text-white">View online</h2>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted)] mt-0.5 font-mono">
              Interactive report · grouped by severity · print-ready
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bjhunt-brand-primary)] group-hover:translate-x-1 transition-transform">
          Open →
        </span>
      </Link>

      <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--bjhunt-text-subtle)] font-mono mb-3">
        Or download as file
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border)]">
        {REPORT_FORMATS.map((fmt) => {
          const Icon = fmt.icon
          const href = `/api/proxy/reports/${id}/${fmt.id}`
          return (
            <article key={fmt.id} className="bg-[var(--bjhunt-bg-secondary)] p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[var(--bjhunt-border-strong)] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-wide">{fmt.label}</h2>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted)] mt-0.5">
                      .{fmt.extension} · {fmt.mediaType}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--bjhunt-text-muted)] leading-relaxed flex-1">{fmt.description}</p>
              <div className="flex gap-2">
                <a
                  href={href}
                  download={`${engagement.name.replace(/[^a-z0-9-]/gi, '_')}-${fmt.id}.${fmt.extension}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[var(--bjhunt-border-strong)] text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors"
                >
                  Preview
                </a>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-[var(--bjhunt-text-muted)]">
        Reports are AI-generated from the engagement record — see{' '}
        <Link href="/legal/ai-policy" className="underline hover:text-white">
          AI Acceptable Use Policy
        </Link>
        . Verify findings against ground truth before acting.
      </p>
    </div>
  )
}
