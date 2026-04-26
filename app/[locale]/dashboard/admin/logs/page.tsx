import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { AuditLogsViewer } from './audit-logs-viewer'
import { AdminHero, KpiCard } from '../_components/admin-primitives'

export default async function AdminLogsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const [logsRes, usersRes] = await Promise.all([
    serverBackendFetch('/api/admin/settings/audit-logs?limit=50', {}, cookieHeader),
    serverBackendFetch('/api/admin/users?limit=200', {}, cookieHeader),
  ])

  const initial = logsRes.ok
    ? await logsRes.json()
    : { logs: [], total: 0, limit: 50, page: 1 }
  const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
  const users: { id: string; email: string }[] = (usersData.users ?? []).map(
    (u: { id: string; email: string }) => ({ id: u.id, email: u.email }),
  )

  // KPI rough counts derived from current page (server-side total is the
  // canonical event count). Severity counts re-derive client-side once the
  // user filters; here we show the snapshot.
  const total = initial.total ?? initial.logs?.length ?? 0
  const last24h = (initial.logs ?? []).filter(
    (l: { createdAt: string }) =>
      Date.now() - new Date(l.createdAt).getTime() < 24 * 60 * 60 * 1000,
  ).length
  const distinctActors = new Set(
    (initial.logs ?? [])
      .map((l: { userId: string | null }) => l.userId)
      .filter(Boolean),
  ).size
  const writeOps = (initial.logs ?? []).filter(
    (l: { action: string }) =>
      /create|delete|update|patch|revoke|reset|grant/i.test(l.action),
  ).length

  return (
    <div className="p-6 md:p-10 max-w-[1440px] mx-auto">
      <AdminHero
        eyebrow="ADMIN / LOGS"
        title="Audit Trail"
        description="Toutes les mutations sur la plateforme — connexions, mutations admin, accès secrets, exports. Cap 50k lignes par export."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        <KpiCard eyebrow="Total Events" value={total} />
        <KpiCard eyebrow="Last 24h" value={last24h} state="success" />
        <KpiCard eyebrow="Distinct Actors" value={distinctActors} />
        <KpiCard eyebrow="Write Ops" value={writeOps} state="warning" />
      </div>

      <AuditLogsViewer initialData={initial} users={users} />
    </div>
  )
}
