'use client'

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

interface Session {
  id: string
  createdAt: string
  expiresAt: string
}

export function SessionsPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = () => {
    if (sessions !== null) {
      setOpen((s) => !s)
      return
    }
    setOpen(true)
    startTransition(async () => {
      try {
        const res = await browserBackendFetch(
          `/api/admin/users/${userId}/sessions`,
        )
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions ?? [])
        } else {
          setSessions([])
        }
      } catch {
        setSessions([])
      }
    })
  }

  const revokeAll = () => {
    if (!confirm('Révoquer toutes les sessions de cet utilisateur ?')) return
    startTransition(async () => {
      await browserBackendFetch(
        `/api/admin/users/${userId}/revoke-sessions`,
        { method: 'POST' },
      )
      setSessions([])
    })
  }

  return (
    <div>
      <button
        onClick={load}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-50"
      >
        <span>{sessions === null ? 'Show' : sessions.length}</span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      {open && (
        <div className="mt-2 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-tertiary)] p-3 min-w-[240px]">
          {isPending && sessions === null && (
            <p className="font-mono text-[12px] text-[var(--bjhunt-text-muted)]">
              Loading…
            </p>
          )}
          {sessions !== null && sessions.length === 0 && (
            <p className="font-mono text-[12px] text-[var(--bjhunt-text-muted)]">
              No active sessions.
            </p>
          )}
          {sessions !== null && sessions.length > 0 && (
            <>
              <div className="space-y-2 mb-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between font-mono text-[12px]"
                  >
                    <span style={{ color: 'var(--bjhunt-text-muted)' }}>
                      {new Date(s.createdAt).toLocaleString('fr-FR')}
                    </span>
                    <span style={{ color: 'var(--bjhunt-text-subtle)' }}>
                      exp {new Date(s.expiresAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={revokeAll}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 font-mono text-[12px] hover:opacity-80 disabled:opacity-50 transition-opacity"
                style={{ color: 'var(--bjhunt-status-danger)' }}
                title="Revoke all sessions"
              >
                <Trash2 className="w-3 h-3" />
                Revoke all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
