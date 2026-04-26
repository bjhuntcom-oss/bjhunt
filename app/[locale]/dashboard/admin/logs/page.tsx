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
    <div className="p-6 md:p-10">
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
          <span aria-hidden style={{ width: 6, height: 6, background: 'var(--bjhunt-brand-primary)', boxShadow: '0 0 8px var(--bjhunt-brand-primary)', display: 'inline-block' }} />
          <span>Admin · Audit Trail</span>
        </div>
        <h1 style={{ fontFamily: 'var(--bjhunt-font-sans)', fontWeight: 200, fontSize: 'clamp(48px, 7vw, 80px)', letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--bjhunt-text)', margin: 0 }}>
          Audit Logs
        </h1>
        <p className="mt-5 max-w-2xl" style={{ fontFamily: 'var(--bjhunt-font-sans)', fontWeight: 300, fontSize: 17, lineHeight: 1.5, color: 'var(--bjhunt-text-muted)' }}>
          Historique complet des actions sur la plateforme — connexions, mutations admin, accès secrets et exports.
        </p>
      </header>
      <AuditLogsViewer initialData={initial} users={users} />
    </div>
  )
}
