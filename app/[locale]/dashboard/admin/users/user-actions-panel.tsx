'use client'

import { useState, useTransition, useEffect } from 'react'
import { Loader2, Ban, Power, Trash2, RefreshCcw, Check } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isBlocked: boolean
}

const iconBtn =
  'p-1.5 inline-flex items-center justify-center transition-colors hover:bg-white/[0.04] disabled:opacity-40 disabled:pointer-events-none'

export function UserActionsPanel({ userId, isBlocked }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [revokeResult, setRevokeResult] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // 2-step confirmation auto-reset (DASH-P1-3 — keeps original logic)
  useEffect(() => {
    if (!confirmBlock) return
    const t = setTimeout(() => setConfirmBlock(false), 6000)
    return () => clearTimeout(t)
  }, [confirmBlock])

  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 8000)
    return () => clearTimeout(t)
  }, [confirmDelete])

  const handleToggleBlock = async () => {
    setActionError(null)
    setConfirmBlock(false)
    const res = await browserBackendFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: isBlocked ? 'member' : 'viewer' }),
    })
    if (!res.ok) {
      setActionError('Erreur')
      return
    }
    startTransition(() => router.refresh())
  }

  const handleRevokeSessions = async () => {
    const res = await browserBackendFetch(
      `/api/admin/users/${userId}/revoke-sessions`,
      { method: 'POST' },
    )
    if (res.ok) {
      const data = (await res
        .json()
        .catch(() => ({}))) as { revokedSessions?: number }
      setRevokeResult(data.revokedSessions ?? 0)
    }
  }

  const handleDelete = async () => {
    setActionError(null)
    const res = await browserBackendFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      setActionError('Erreur')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="inline-flex items-center gap-1 justify-end">
      {revokeResult !== null ? (
        <span
          className="font-mono text-[11px] px-2"
          style={{ color: 'var(--bjhunt-status-success)' }}
        >
          {revokeResult} revoked
        </span>
      ) : (
        <button
          onClick={handleRevokeSessions}
          disabled={isPending}
          title="Revoke sessions"
          className={iconBtn}
          style={{ color: 'var(--bjhunt-text-muted)' }}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {confirmBlock ? (
        <div className="inline-flex items-center gap-0.5">
          <button
            onClick={handleToggleBlock}
            disabled={isPending}
            className={iconBtn}
            style={{ color: 'var(--bjhunt-status-warning)' }}
            title="Confirm"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmBlock(false)}
            className="px-1.5 font-mono text-[11px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)]"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmBlock(true)}
          disabled={isPending}
          title={isBlocked ? 'Unblock user' : 'Block user'}
          className={iconBtn}
          style={{
            color: isBlocked
              ? 'var(--bjhunt-status-success)'
              : 'var(--bjhunt-status-warning)',
          }}
        >
          {isBlocked ? (
            <Power className="w-3.5 h-3.5" />
          ) : (
            <Ban className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {confirmDelete ? (
        <div className="inline-flex items-center gap-0.5">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className={iconBtn}
            style={{ color: 'var(--bjhunt-status-danger)' }}
            title="Confirm delete"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-1.5 font-mono text-[11px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)]"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          title="Delete user"
          className={iconBtn}
          style={{ color: 'var(--bjhunt-text-muted)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = 'var(--bjhunt-status-danger)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--bjhunt-text-muted)')
          }
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {actionError && (
        <span
          className="font-mono text-[11px] ml-1"
          style={{ color: 'var(--bjhunt-status-danger)' }}
        >
          {actionError}
        </span>
      )}
    </div>
  )
}
