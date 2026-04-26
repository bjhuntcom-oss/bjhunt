'use client'

import { Fragment, useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react'
import { StateText } from '../_components/admin-primitives'
import type { AdminState } from '../_components/admin-primitives'

interface AuditLog {
  id: string
  userId: string | null
  orgId: string | null
  action: string
  resource: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

interface AuditLogsData {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

interface UserOption {
  id: string
  email: string
}

function actionState(action: string): AdminState {
  if (/delete|revoke|breach|fail|denied|error/i.test(action)) return 'critical'
  if (/update|patch|reset|grant|create|enable|disable/i.test(action)) return 'warning'
  if (/login|logout|view|read|export/i.test(action)) return 'success'
  return 'neutral'
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

  const fetchLogs = (page = 1) => {
    startTransition(async () => {
      const q = new URLSearchParams({ limit: '50', page: String(page) })
      if (filterUserId) q.set('user_id', filterUserId)
      if (filterAction) q.set('action', filterAction)
      if (filterResourceType) q.set('resource', filterResourceType)
      if (filterFrom) q.set('from', filterFrom)
      if (filterTo) q.set('to', filterTo)
      const res = await browserBackendFetch(`/api/admin/logs?${q}`)
      if (res.ok) setData(await res.json())
    })
  }

  const exportCsv = () => {
    const q = new URLSearchParams()
    if (filterUserId) q.set('user_id', filterUserId)
    if (filterAction) q.set('action', filterAction)
    if (filterResourceType) q.set('resource', filterResourceType)
    if (filterFrom) q.set('from', filterFrom)
    if (filterTo) q.set('to', filterTo)
    window.location.href = `/api/proxy/admin/logs/export?${q}`
  }

  const inputClass =
    'bg-[var(--bjhunt-bg-tertiary)] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] font-mono text-[12px] px-3 h-10 w-full focus:outline-none focus:border-[var(--bjhunt-status-success)] focus:ring-1 focus:ring-[var(--bjhunt-status-success)]/30 transition-colors'

  const labelClass =
    'block mb-1.5 font-mono text-[11px] font-medium text-[var(--bjhunt-text-muted)] uppercase'

  const page = data.page ?? 1
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit))

  return (
    <div>
      {/* Filters */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-4 md:p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div>
            <label className={labelClass}>Actor</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className={inputClass}
            >
              <option value="">All</option>
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
              placeholder="login"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Resource</label>
            <input
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              placeholder="user"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchLogs(1)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-50"
          >
            <Filter className="w-3 h-3" />
            Apply
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
          <span
            className="ml-auto font-mono text-[12px]"
            style={{ color: 'var(--bjhunt-text-muted)' }}
          >
            {data.total} result{data.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] overflow-hidden">
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
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="hidden md:table-cell px-4 py-3">Resource</th>
              <th className="hidden lg:table-cell px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center font-mono text-[13px] text-[var(--bjhunt-text-muted)]"
                >
                  No logs match the current filters.
                </td>
              </tr>
            )}
            {data.logs.map((log) => {
              const userEmail =
                users.find((u) => u.id === log.userId)?.email ?? log.userId ?? '—'
              const isExpanded = expandedId === log.id
              const state = actionState(log.action)
              return (
                <Fragment key={log.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="border-b border-[var(--bjhunt-border)] last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td
                      className="px-4 py-3 font-mono align-middle"
                      style={{
                        fontSize: 13,
                        color: 'var(--bjhunt-text-muted)',
                      }}
                    >
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 flex items-center justify-center border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-tertiary)] font-mono"
                          style={{
                            fontSize: 10,
                            color: 'var(--bjhunt-text-muted)',
                          }}
                        >
                          {String(userEmail).slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className="font-mono truncate"
                          style={{
                            fontSize: 13,
                            color: 'var(--bjhunt-text)',
                          }}
                        >
                          {userEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StateText state={state} mono>
                        <span style={{ fontSize: 13 }}>{log.action}</span>
                      </StateText>
                    </td>
                    <td
                      className="hidden md:table-cell px-4 py-3 font-mono truncate align-middle"
                      style={{
                        fontSize: 13,
                        color: 'var(--bjhunt-text-muted)',
                      }}
                    >
                      {log.resource ?? '—'}
                    </td>
                    <td
                      className="hidden lg:table-cell px-4 py-3 font-mono align-middle"
                      style={{
                        fontSize: 13,
                        color: 'var(--bjhunt-text-subtle)',
                      }}
                    >
                      {log.ipAddress ?? '—'}
                    </td>
                  </tr>
                  {isExpanded && log.details && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-3 bg-[var(--bjhunt-bg-tertiary)] border-b border-[var(--bjhunt-border)]"
                      >
                        <pre
                          className="font-mono whitespace-pre-wrap break-all"
                          style={{
                            fontSize: 12,
                            color: 'var(--bjhunt-text-muted)',
                          }}
                        >
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span
          className="font-mono"
          style={{ fontSize: 12, color: 'var(--bjhunt-text-muted)' }}
        >
          Page {page} / {totalPages}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={isPending || page <= 1}
            title="Previous page"
            className="inline-flex items-center justify-center w-9 h-9 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={isPending || page >= totalPages}
            title="Next page"
            className="inline-flex items-center justify-center w-9 h-9 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
