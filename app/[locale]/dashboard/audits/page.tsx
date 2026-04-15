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

  const runsRes = await serverBackendFetch('/api/audit/runs?limit=20&offset=0', {}, cookieHeader)
  const data = runsRes.ok ? await runsRes.json() : { runs: [], total: 0 }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Audit Runs</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Historique et gestion des audits de sécurité
        </p>
      </div>
      <AuditsClient initialRuns={data.runs} initialTotal={data.total} locale={locale} />
    </div>
  )
}
