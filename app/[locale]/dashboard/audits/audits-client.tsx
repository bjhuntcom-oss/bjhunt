'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, X, ChevronRight } from 'lucide-react'

interface AuditRun {
  id: string
  title: string
  target: string | null
  status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled'
  scanConfig: Record<string, unknown>
  resultSummary: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-muted)',
  running: 'var(--warning)',
  completed: 'var(--success)',
  failed: 'var(--danger)',
  cancelled: 'var(--text-subtle)',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  running: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
  cancelled: 'Annulé',
}

export function AuditsClient({
  initialRuns,
  initialTotal,
  locale,
}: {
  initialRuns: AuditRun[]
  initialTotal: number
  locale: string
}) {
  const [runs, setRuns] = useState(initialRuns)
  const [total, setTotal] = useState(initialTotal)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', target: '' })
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    startTransition(async () => {
      const res = await browserBackendFetch('/api/audit/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, target: form.target || undefined }),
      })
      if (!res.ok) return
      const { run } = await res.json()
      setRuns((prev) => [run, ...prev])
      setTotal((t) => t + 1)
      setForm({ title: '', target: '' })
      setShowForm(false)
    })
  }

  const handleCancel = (id: string) => {
    if (!confirm('Annuler cet audit ?')) return
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/audit/runs/${id}/cancel`, { method: 'POST' })
      if (!res.ok) return
      const { run } = await res.json()
      setRuns((prev) => prev.map((r) => (r.id === id ? run : r)))
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {total} audit{total !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-[11px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Nouvel audit
        </button>
      </div>

      {showForm && (
        <div className="border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-6 space-y-4">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Créer un audit
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Titre *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full bg-transparent border border-[var(--border)] px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="Ex: Audit application web Q2"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Cible (optionnel)
              </label>
              <input
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                className="w-full bg-transparent border border-[var(--border)] px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="Ex: https://example.com"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={isPending || !form.title.trim()}
              className="px-4 py-1.5 bg-[var(--accent)] text-white text-[11px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isPending ? 'Création...' : 'Créer'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-[var(--border)] text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest hover:text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="border border-[var(--border)] px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
          Aucun audit — créez-en un pour commencer.
        </div>
      ) : (
        <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
          {runs.map((run) => (
            <div key={run.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-card)] transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-1.5 h-1.5 flex-shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[run.status] ?? 'var(--text-subtle)' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/${locale}/dashboard/audits/${run.id}`}
                      className="text-[12px] font-mono font-bold text-white hover:text-[var(--accent)] transition-colors truncate"
                    >
                      {run.title}
                    </Link>
                    <span
                      className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border flex-shrink-0"
                      style={{ borderColor: STATUS_COLORS[run.status], color: STATUS_COLORS[run.status] }}
                    >
                      {STATUS_LABELS[run.status] ?? run.status}
                    </span>
                  </div>
                  {run.target && (
                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                      {run.target}
                    </div>
                  )}
                  <div className="text-[9px] text-[var(--text-subtle)] font-mono mt-0.5">
                    {new Date(run.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(run.status === 'draft' || run.status === 'running') && (
                  <button
                    onClick={() => handleCancel(run.id)}
                    disabled={isPending}
                    title="Annuler"
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
                  >
                    <X size={13} />
                  </button>
                )}
                <Link
                  href={`/${locale}/dashboard/audits/${run.id}`}
                  className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
                  title="Voir le détail"
                >
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
