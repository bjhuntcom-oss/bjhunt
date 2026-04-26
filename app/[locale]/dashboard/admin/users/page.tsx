import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { UserActionsPanel } from './user-actions-panel'
import { SessionsPanel } from './sessions-panel'
import { AdminHero, KpiCard, StatusDot } from '../_components/admin-primitives'

type User = {
  id: string
  email: string
  displayName: string
  role: string
  status: string
  twoFactorEnabled?: boolean
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

  const usersRes = await serverBackendFetch('/api/admin/users', {}, cookieHeader)
  const cpData = usersRes.ok ? await usersRes.json() : { users: [], total: 0 }

  const users: User[] = (cpData.users ?? []).map((u: any) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName || u.email.split('@')[0],
    role: u.isPlatformAdmin ? 'platform_admin' : u.role,
    status: u.role === 'viewer' ? 'blocked' : 'active',
    twoFactorEnabled: u.twoFactorEnabled ?? false,
    sessions: {
      lastLoginAt: u.lastLogin || null,
      isOnline: u.lastLogin
        ? Date.now() - new Date(u.lastLogin).getTime() < 15 * 60 * 1000
        : false,
    },
  }))
  const counts = { users: cpData.total ?? 0 }

  const total = counts.users ?? users.length
  const activeSessions = users.filter((u) => u.sessions?.isOnline).length
  const twoFa = users.filter((u) => u.twoFactorEnabled).length
  const admins = users.filter((u) => u.role === 'platform_admin').length

  return (
    <div className="p-6 md:p-10 max-w-[1440px] mx-auto">
      <AdminHero
        eyebrow="ADMIN / USERS"
        title="Identity"
        description="Comptes, rôles et sessions actives. Mutations critiques : block / unblock / delete protégées par confirmation 2-step."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        <KpiCard eyebrow="Total Users" value={total} />
        <KpiCard eyebrow="Active Now" value={activeSessions} state="success" />
        <KpiCard eyebrow="2FA Enabled" value={twoFa} state="success" />
        <KpiCard eyebrow="Platform Admins" value={admins} state="warning" />
      </div>

      {/* Users table */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className="border-b border-[var(--bjhunt-border)]"
              style={{
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--bjhunt-text-muted)',
              }}
            >
              <th className="px-4 py-3">User</th>
              <th className="hidden md:table-cell px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden lg:table-cell px-4 py-3">2FA</th>
              <th className="hidden md:table-cell px-4 py-3">Last Login</th>
              <th className="hidden lg:table-cell px-4 py-3">Sessions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center font-mono text-[13px] text-[var(--bjhunt-text-muted)]"
                >
                  Aucun utilisateur.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isBlocked =
                user.status === 'blocked' || user.status === 'suspended'
              const lastSeen = user.sessions?.lastLoginAt
                ? new Date(user.sessions.lastLoginAt).toLocaleString('fr-FR')
                : '—'
              const initials = (user.displayName || user.email)
                .slice(0, 2)
                .toUpperCase()
              return (
                <tr
                  key={user.id}
                  className="border-b border-[var(--bjhunt-border)] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-tertiary)]"
                        style={{
                          fontFamily: 'var(--bjhunt-font-mono)',
                          fontSize: 11,
                          color: 'var(--bjhunt-text-muted)',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-[14px] truncate"
                          style={{ color: 'var(--bjhunt-text)' }}
                        >
                          {user.displayName}
                        </div>
                        <div
                          className="font-mono truncate"
                          style={{
                            fontSize: 13,
                            color: 'var(--bjhunt-text-muted)',
                          }}
                        >
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 align-middle">
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color:
                          user.role === 'platform_admin'
                            ? 'var(--bjhunt-status-warning)'
                            : 'var(--bjhunt-text-muted)',
                      }}
                    >
                      {user.role === 'platform_admin' ? 'PLATFORM_ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <StatusDot
                        state={
                          isBlocked
                            ? 'critical'
                            : user.sessions?.isOnline
                              ? 'success'
                              : 'neutral'
                        }
                        pulse={user.sessions?.isOnline}
                      />
                      <span
                        className="text-[13px]"
                        style={{ color: 'var(--bjhunt-text)' }}
                      >
                        {isBlocked
                          ? 'Blocked'
                          : user.sessions?.isOnline
                            ? 'Online'
                            : 'Idle'}
                      </span>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 align-middle">
                    <StatusDot
                      state={user.twoFactorEnabled ? 'success' : 'critical'}
                    />
                  </td>
                  <td
                    className="hidden md:table-cell px-4 py-3 align-middle font-mono"
                    style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
                  >
                    {lastSeen}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 align-middle">
                    <SessionsPanel userId={user.id} />
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <UserActionsPanel
                      userId={user.id}
                      isBlocked={isBlocked}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
