"use client"

import { useState, useTransition, useEffect } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isBlocked: boolean
}

export function UserActionsPanel({ userId, isBlocked }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [revokeResult, setRevokeResult] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleToggleBlock = async () => {
    setActionError(null)
    // Toggle role to 'viewer' (blocked) or 'member' (active)
    const res = await browserBackendFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: isBlocked ? 'member' : 'viewer' }),
    })
    if (!res.ok) { setActionError('Erreur'); return }
    startTransition(() => router.refresh())
  }

  const handleRevokeSessions = async () => {
    const res = await browserBackendFetch(`/api/admin/users/${userId}/revoke-sessions`, {
      method: 'POST',
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({})) as { revokedSessions?: number }
      setRevokeResult(data.revokedSessions ?? 0)
    }
  }

  useEffect(() => {
    if (!confirmDelete) return
    const timer = setTimeout(() => setConfirmDelete(false), 8000)
    return () => clearTimeout(timer)
  }, [confirmDelete])

  const handleDelete = async () => {
    setActionError(null)
    const res = await browserBackendFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (!res.ok) { setActionError('Erreur'); return }
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {revokeResult !== null ? (
        <span className="text-[9px] font-mono text-[var(--success)]">
          {revokeResult} session(s) révoquée(s)
        </span>
      ) : (
        <button
          onClick={handleRevokeSessions}
          disabled={isPending}
          className="text-[9px] font-mono text-[var(--text-muted)] hover:text-white uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          Révoquer sessions
        </button>
      )}
      <button
        onClick={handleToggleBlock}
        disabled={isPending}
        className={`text-[9px] font-mono uppercase tracking-widest transition-colors disabled:opacity-50 ${
          isBlocked
            ? 'text-[var(--success)] hover:text-white'
            : 'text-[var(--warning)] hover:text-[var(--danger)]'
        }`}
      >
        {isBlocked ? 'Débloquer' : 'Bloquer'}
      </button>
      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-[9px] font-mono text-[var(--danger)] uppercase tracking-widest disabled:opacity-50"
          >
            Confirmer
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-[9px] font-mono text-[var(--text-muted)] hover:text-white uppercase tracking-widest transition-colors"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-[9px] font-mono text-[var(--text-subtle)] hover:text-[var(--danger)] uppercase tracking-widest transition-colors"
        >
          Supprimer
        </button>
      )}
      {actionError && <span className="text-[9px] font-mono text-[var(--danger)]">{actionError}</span>}
    </div>
  )
}
