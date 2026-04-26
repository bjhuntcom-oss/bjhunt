'use client'

import { useState, useTransition, useCallback } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { Trash2, Download, Loader2 } from 'lucide-react'
import { Eyebrow } from '../_components/admin-primitives'

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

const inputCls =
  'flex-1 bg-[var(--bjhunt-bg-tertiary)] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] font-mono text-[12px] px-3 h-10 focus:outline-none focus:border-[var(--bjhunt-status-success)] focus:ring-1 focus:ring-[var(--bjhunt-status-success)]/30 transition-colors disabled:opacity-50'

export function OllamaModels({ initialModels }: { initialModels: OllamaModel[] }) {
  const [models, setModels] = useState(initialModels)
  const [pullName, setPullName] = useState('')
  const [pullLog, setPullLog] = useState<string[]>([])
  const [isPulling, setIsPulling] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const formatSize = (bytes: number) => {
    const gb = bytes / 1e9
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
  }

  const loadModels = useCallback(() => {
    startTransition(async () => {
      const res = await browserBackendFetch('/api/admin/ollama/models')
      if (res.ok) {
        const data = await res.json()
        setModels(data.models ?? [])
      }
    })
  }, [])

  const handleDelete = (name: string) => {
    if (!confirm(`Delete model "${name}"?`)) return
    startTransition(async () => {
      const encodedName = encodeURIComponent(name)
      const res = await browserBackendFetch(
        `/api/admin/ollama/models/${encodedName}?name=${encodedName}`,
        { method: 'DELETE' },
      )
      if (res.ok) {
        setModels((prev) => prev.filter((m) => m.name !== name))
      } else {
        setError('Delete failed')
      }
    })
  }

  const handlePull = async () => {
    if (!pullName.trim()) return
    setIsPulling(true)
    setPullLog([])
    setError(null)

    try {
      const res = await browserBackendFetch('/api/admin/ollama/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pullName.trim() }),
      })
      if (!res.ok || !res.body) {
        setError('Download failed')
        setIsPulling(false)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      while (!done) {
        const { done: streamDone, value } = await reader.read()
        done = streamDone
        if (value) {
          const text = decoder.decode(value, { stream: true })
          for (const line of text.split('\n\n')) {
            const data = line.replace(/^data: /, '').trim()
            if (!data) continue
            try {
              const parsed = JSON.parse(data) as {
                status?: string
                completed?: number
                total?: number
              }
              const msg = parsed.total
                ? `${parsed.status} — ${Math.round(((parsed.completed ?? 0) / parsed.total) * 100)}%`
                : parsed.status ?? ''
              if (msg) setPullLog((prev) => [...prev.slice(-20), msg])
            } catch {
              /* ignore */
            }
          }
        }
      }
      setPullName('')
      loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsPulling(false)
    }
  }

  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6 mt-6">
      <Eyebrow className="mb-4">Installed Ollama Models</Eyebrow>

      {/* Model list */}
      <div className="border border-[var(--bjhunt-border)] mb-5">
        {models.length === 0 ? (
          <p
            className="px-4 py-6 text-center font-mono"
            style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
          >
            No model installed.
          </p>
        ) : (
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
                <th className="px-4 py-3">Name</th>
                <th className="hidden sm:table-cell px-4 py-3">Size</th>
                <th className="hidden md:table-cell px-4 py-3">Modified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr
                  key={m.name}
                  className="border-b border-[var(--bjhunt-border)] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td
                    className="px-4 py-3 font-mono align-middle"
                    style={{ fontSize: 13, color: 'var(--bjhunt-text)' }}
                  >
                    {m.name}
                  </td>
                  <td
                    className="hidden sm:table-cell px-4 py-3 font-mono align-middle"
                    style={{
                      fontSize: 13,
                      color: 'var(--bjhunt-text-muted)',
                    }}
                  >
                    {formatSize(m.size)}
                  </td>
                  <td
                    className="hidden md:table-cell px-4 py-3 font-mono align-middle"
                    style={{
                      fontSize: 13,
                      color: 'var(--bjhunt-text-subtle)',
                    }}
                  >
                    {new Date(m.modified_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <button
                      onClick={() => handleDelete(m.name)}
                      disabled={isPending || isPulling}
                      title="Delete"
                      className="inline-flex items-center justify-center w-9 h-9 hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] transition-colors disabled:opacity-40"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color =
                          'var(--bjhunt-status-danger)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color =
                          'var(--bjhunt-text-muted)')
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pull new model */}
      <Eyebrow className="mb-2">Install a model</Eyebrow>
      <div className="flex gap-2 mb-2 flex-wrap sm:flex-nowrap">
        <input
          value={pullName}
          onChange={(e) => setPullName(e.target.value)}
          placeholder="ex: llama3.2:3b"
          disabled={isPulling}
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isPulling) handlePull()
          }}
        />
        <button
          onClick={handlePull}
          disabled={isPulling || !pullName.trim()}
          className="inline-flex items-center gap-1.5 h-10 px-4 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {isPulling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {isPulling ? 'Pulling…' : 'Install'}
        </button>
      </div>

      {pullLog.length > 0 && (
        <div className="bg-[var(--bjhunt-bg)] border border-[var(--bjhunt-border)] p-3 max-h-32 overflow-y-auto">
          {pullLog.map((line, i) => (
            <div
              key={i}
              className="font-mono"
              style={{ fontSize: 12, color: 'var(--bjhunt-text-muted)' }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
      {error && (
        <p
          className="mt-2 font-mono"
          style={{ fontSize: 12, color: 'var(--bjhunt-status-danger)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
