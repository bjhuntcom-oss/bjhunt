'use client'

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'

interface AuditLog {
  id: string
  userId: string | null
  organizationId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

interface AuditLogsData {
  logs: AuditLog[]
  total: number
  limit: number
  offset: number
}

interface UserOption {
  id: string
  email: string
}

export function AuditLogsViewer({
  initialData,
  users,
}: {
  initialData: AuditLogsData
  users: UserOption[]
}) {
  const [data, setData] = useState(initialData)
  const [filterUserId, setFilterUserId] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterResourceType, setFilterResourceType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchLogs = (offset = 0) => {
    startTransition(async () => {
      const q = new URLSearchParams({ limit: '50', offset: String(offset) })
      if (filterUserId) q.set('userId', filterUserId)
      if (filterAction) q.set('action', filterAction)
      if (filterResourceType) q.set('resourceType', filterResourceType)
      if (filterFrom) q.set('from', filterFrom)
      if (filterTo) q.set('to', filterTo)
      const res = await browserBackendFetch(`/api/admin/settings/audit-logs?${q}`)
      if (res.ok) setData(await res.json())
    })
  }

  const exportCsv = () => {
    const header = 'Date,Utilisateur,Action,Type,Resource ID\n'
    const rows = data.logs
      .map((l) =>
        [
          new Date(l.createdAt).toISOString(),
          users.find((u) => u.id === l.userId)?.email ?? l.userId ?? '—',
          l.action,
          l.resourceType ?? '—',
          l.resourceId ?? '—',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputClass =
    'bg-[var(--bg-input)] border border-[var(--border)] text-white font-mono text-[11px] px-2 py-1.5 focus:outline-none focus:border-[var(--border-strong)]'
  const labelClass =
    'text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1'

  const page = Math.floor(data.offset / data.limit) + 1
  const totalPages = Math.ceil(data.total / data.limit)

  return (
    <div>
      {/* Filters */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          <div>
            <label className={labelClass}>Utilisateur</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className={inputClass + ' w-full'}
            >
              <option value="">Tous</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Action</label>
            <input
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="ex: login"
              className={inputClass + ' w-full'}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <input
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              placeholder="ex: user"
              className={inputClass + ' w-full'}
            />
          </div>
          <div>
            <label className={labelClass}>Depuis</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={inputClass + ' w-full'}
            />
          </div>
          <div>
            <label className={labelClass}>Jusqu&apos;à</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className={inputClass + ' w-full'}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs(0)}
            disabled={isPending}
            className="px-3 py-1.5 bg-white text-black text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
          >
            Filtrer
          </button>
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 border border-[var(--border)] text-[9px] font-mono uppercase tracking-[0.1em] hover:text-white transition-colors"
          >
            Export CSV
          </button>
          <span className="text-[9px] font-mono text-[var(--text-muted)] ml-auto">
            {data.total} résultat{data.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="grid grid-cols-5 bg-[var(--bg-card)] px-4 py-2">
          {['DATE', 'UTILISATEUR', 'ACTION', 'TYPE', 'RESOURCE'].map((h) => (
            <span
              key={h}
              className="text-[8px] font-mono text-[var(--text-subtle)] uppercase tracking-widest"
            >
              {h}
            </span>
          ))}
        </div>
        {data.logs.length === 0 && (
          <div className="px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
            Aucun log trouvé.
          </div>
        )}
        {data.logs.map((log) => {
          const userEmail =
            users.find((u) => u.id === log.userId)?.email ?? log.userId ?? '—'
          const isExpanded = expandedId === log.id
          return (
            <div key={log.id}>
              <div
                className="grid grid-cols-5 px-4 py-2.5 hover:bg-[var(--bg-card)]/50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {new Date(log.createdAt).toLocaleString('fr-FR')}
                </span>
                <span className="text-[10px] font-mono text-white truncate">{userEmail}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{log.action}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {log.resourceType ?? '—'}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-subtle)] truncate">
                  {log.resourceId ?? '—'}
                </span>
              </div>
              {isExpanded && log.payload && (
                <div className="px-4 pb-3 bg-[var(--bg-input)]">
                  <pre className="text-[9px] font-mono text-[var(--text-muted)] overflow-x-auto">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[9px] font-mono text-[var(--text-muted)]">
          Page {page} / {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(data.offset - data.limit)}
            disabled={isPending || data.offset === 0}
            className="px-3 py-1.5 border border-[var(--border)] text-[9px] font-mono disabled:opacity-30 hover:text-white transition-colors"
          >
            ← Précédent
          </button>
          <button
            onClick={() => fetchLogs(data.offset + data.limit)}
            disabled={isPending || data.offset + data.limit >= data.total}
            className="px-3 py-1.5 border border-[var(--border)] text-[9px] font-mono disabled:opacity-30 hover:text-white transition-colors"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
