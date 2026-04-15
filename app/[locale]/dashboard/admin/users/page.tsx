import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { UserActionsPanel } from './user-actions-panel'
import { SessionsPanel } from './sessions-panel'

type User = {
  id: string
  email: string
  displayName: string
  role: string
  status: string
  sessions: { lastLoginAt: string | null; isOnline: boolean }
}

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''

  if (!cookieHeader) redirect(`/${locale}/login`)

  const cpResponse = await serverBackendFetch('/api/admin/overview', {}, cookieHeader)
  const cpData = cpResponse.ok ? await cpResponse.json() : {}

  const users: User[] = cpData.users ?? []
  const counts = cpData.counts ?? {}

  const total    = counts.users         ?? users.length
  const active   = counts.usersActive   ?? users.filter((u) => u.status === 'active').length
  const blocked  = counts.usersSuspended ?? users.filter((u) => u.status === 'blocked' || u.status === 'suspended').length
  const admins   = counts.platformAdmins ?? users.filter((u) => u.role === 'platform_admin').length

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Utilisateurs</h1>
          <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
            Gestion des comptes, rôles et accès
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] mb-8">
        {[
          { label: 'Total',   value: total   },
          { label: 'Actifs',  value: active  },
          { label: 'Bloqués', value: blocked },
          { label: 'Admins',  value: admins  },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--bg-card)] p-6">
            <div className="text-3xl font-black font-mono text-white">{value}</div>
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="grid grid-cols-6 bg-[var(--bg-card)] px-4 py-2">
          {['EMAIL', 'RÔLE', 'STATUT', 'DERNIÈRE ACTIVITÉ', 'SESSIONS', 'ACTIONS'].map((h) => (
            <span key={h} className="text-[8px] font-mono text-[var(--text-subtle)] uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
            Aucun utilisateur trouvé.
          </div>
        )}

        {users.map((user) => {
          const isBlocked = user.status === 'blocked' || user.status === 'suspended'
          const lastSeen = user.sessions?.lastLoginAt
            ? new Date(user.sessions.lastLoginAt).toLocaleDateString('fr-FR')
            : '—'

          return (
            <div key={user.id} className="grid grid-cols-6 px-4 py-3 items-center hover:bg-[var(--bg-card)]/50 transition-colors">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-white truncate">{user.email}</div>
                {user.displayName && (
                  <div className="text-[9px] text-[var(--text-muted)] truncate">{user.displayName}</div>
                )}
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                {user.role === 'platform_admin' ? 'Admin' : 'User'}
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 flex-shrink-0"
                  style={{ background: isBlocked ? 'var(--danger)' : user.sessions?.isOnline ? 'var(--success)' : 'var(--text-subtle)' }}
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {isBlocked ? 'Bloqué' : user.sessions?.isOnline ? 'En ligne' : 'Actif'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{lastSeen}</span>
              <SessionsPanel userId={user.id} />
              <UserActionsPanel userId={user.id} isBlocked={isBlocked} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
