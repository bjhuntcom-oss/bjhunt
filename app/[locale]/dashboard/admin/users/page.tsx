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

  const usersRes = await serverBackendFetch('/api/admin/users', {}, cookieHeader)
  const cpData = usersRes.ok ? await usersRes.json() : { users: [], total: 0 }

  const users: User[] = (cpData.users ?? []).map((u: any) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName || u.email.split('@')[0],
    role: u.isPlatformAdmin ? 'platform_admin' : u.role,
    status: u.role === 'viewer' ? 'blocked' : 'active',
    sessions: {
      lastLoginAt: u.lastLogin || null,
      isOnline: u.lastLogin ? (Date.now() - new Date(u.lastLogin).getTime() < 15 * 60 * 1000) : false,
    },
    plan: u.plan || 'free',
  }))
  const counts = { users: cpData.total ?? 0 }

  const total    = counts.users ?? users.length
  const active   = users.filter((u: User) => u.status === 'active').length
  const blocked  = users.filter((u: User) => u.status === 'blocked' || u.status === 'suspended').length
  const admins   = users.filter((u: User) => u.role === 'platform_admin').length

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
          <span>Admin · Identity</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 200,
            fontSize: 'clamp(48px, 7vw, 80px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            color: 'var(--bjhunt-text)',
            margin: 0,
          }}
        >
          Utilisateurs
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
          Gestion des comptes, rôles et accès — sessions actives et statut de connexion en temps réel.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[rgba(255,255,255,0.06)] mb-12">
        {[
          { label: 'Total',   value: total   },
          { label: 'Actifs',  value: active  },
          { label: 'Bloqués', value: blocked },
          { label: 'Admins',  value: admins  },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--bjhunt-bg)] p-6">
            <div
              style={{
                fontFamily: 'var(--bjhunt-font-sans)',
                fontWeight: 200,
                fontSize: 40,
                letterSpacing: '-0.03em',
                color: 'var(--bjhunt-text)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </div>
            <div
              className="mt-2"
              style={{
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--bjhunt-text-subtle)',
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="grid grid-cols-6 px-4 py-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--bjhunt-text-subtle)',
          }}
        >
          {['Email', 'Rôle', 'Statut', 'Dernière activité', 'Sessions', 'Actions'].map((h) => (
            <span key={h}>{h}</span>
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
            <div
              key={user.id}
              className="grid grid-cols-6 px-4 py-4 items-center transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.012)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
            >
              <div className="min-w-0">
                <div
                  style={{
                    fontFamily: 'var(--bjhunt-font-mono)',
                    fontSize: 12,
                    color: 'var(--bjhunt-text)',
                  }}
                  className="truncate"
                >
                  {user.email}
                </div>
                {user.displayName && (
                  <div
                    style={{
                      fontFamily: 'var(--bjhunt-font-sans)',
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'var(--bjhunt-text-muted)',
                    }}
                    className="truncate"
                  >
                    {user.displayName}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontFamily: 'var(--bjhunt-font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--bjhunt-text-muted)',
                }}
              >
                {user.role === 'platform_admin' ? 'Admin' : 'User'}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 flex-shrink-0"
                  style={{ background: isBlocked ? 'var(--bjhunt-status-danger)' : user.sessions?.isOnline ? 'var(--bjhunt-status-success)' : 'var(--bjhunt-text-subtle)' }}
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
