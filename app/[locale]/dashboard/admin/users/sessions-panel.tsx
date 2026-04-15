'use client'

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
      const res = await browserBackendFetch(`/api/admin/users/${userId}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    })
  }

  const revokeAll = () => {
    if (!confirm('Révoquer toutes les sessions de cet utilisateur ?')) return
    startTransition(async () => {
      await browserBackendFetch(`/api/admin/users/${userId}/revoke-sessions`, { method: 'POST' })
      setSessions([])
    })
  }

  return (
    <div>
      <button
        onClick={load}
        disabled={isPending}
        className="flex items-center gap-1 text-[9px] font-mono text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-50"
      >
        Sessions {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 border border-[var(--border)] bg-[var(--bg-input)] p-3">
          {isPending && sessions === null && (
            <p className="text-[9px] font-mono text-[var(--text-muted)]">Chargement...</p>
          )}
          {sessions !== null && sessions.length === 0 && (
            <p className="text-[9px] font-mono text-[var(--text-muted)]">Aucune session active.</p>
          )}
          {sessions !== null && sessions.length > 0 && (
            <>
              <div className="space-y-2 mb-3">
                {sessions.map((s) => (
                  <div key={s.id} className="flex justify-between text-[9px] font-mono">
                    <span className="text-[var(--text-muted)]">
                      {new Date(s.createdAt).toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[var(--text-subtle)]">
                      expire {new Date(s.expiresAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={revokeAll}
                disabled={isPending}
                className="text-[9px] font-mono text-[var(--danger)] hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                Révoquer toutes les sessions
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
