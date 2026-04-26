import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { AuditsClient } from './audits-client'

export default async function AuditsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const meRes = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meRes.ok) redirect(`/${locale}/login`)

  const engRes = await serverBackendFetch('/api/engagements?limit=20', {}, cookieHeader)
  const engData = engRes.ok ? await engRes.json() : { engagements: [] }
  const data = { runs: engData.engagements ?? [], total: (engData.engagements ?? []).length }

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <header className="mb-12 md:mb-16">
        <div
          className="mb-5 inline-flex items-center gap-2"
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 10,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'var(--bjhunt-text-subtle)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              background: 'var(--bjhunt-brand-primary)',
              boxShadow: '0 0 8px var(--bjhunt-brand-primary)',
              display: 'inline-block',
            }}
          />
          <span>Engagements · Audit Runs</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 200,
            fontSize: 'clamp(48px, 8vw, 96px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            color: 'var(--bjhunt-text)',
            margin: 0,
          }}
        >
          Audits
        </h1>
        <p
          className="mt-5 max-w-2xl"
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 300,
            fontSize: 17,
            lineHeight: 1.5,
            color: 'var(--bjhunt-text-muted)',
          }}
        >
          History and lifecycle of every security engagement — from intake
          through orchestrator hand-off to verified findings.
        </p>
      </header>
      <AuditsClient initialRuns={data.runs} initialTotal={data.total} locale={locale} />
    </div>
  )
}
