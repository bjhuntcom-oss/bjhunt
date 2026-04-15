import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { AuditLogsViewer } from './audit-logs-viewer'

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
    : { logs: [], total: 0, limit: 50, offset: 0 }
  const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
  const users: { id: string; email: string }[] = (usersData.users ?? []).map(
    (u: { id: string; email: string }) => ({ id: u.id, email: u.email })
  )

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Audit Logs</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Historique complet des actions sur la plateforme
        </p>
      </div>
      <AuditLogsViewer initialData={initial} users={users} />
    </div>
  )
}
