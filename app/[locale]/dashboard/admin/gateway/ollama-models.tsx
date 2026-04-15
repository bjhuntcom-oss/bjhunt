'use client'

import { useState, useTransition, useCallback } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { Trash2, Download } from 'lucide-react'

interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

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
    if (!confirm(`Supprimer le modèle "${name}" ?`)) return
    startTransition(async () => {
      const encodedName = encodeURIComponent(name)
      const res = await browserBackendFetch(`/api/admin/ollama/models/${encodedName}?name=${encodedName}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setModels(prev => prev.filter(m => m.name !== name))
      } else {
        setError('Erreur lors de la suppression')
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
        setError('Erreur lors du téléchargement')
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
              const parsed = JSON.parse(data) as { status?: string; completed?: number; total?: number }
              const msg = parsed.total
                ? `${parsed.status} — ${Math.round(((parsed.completed ?? 0) / parsed.total) * 100)}%`
                : parsed.status ?? ''
              if (msg) setPullLog(prev => [...prev.slice(-20), msg])
            } catch { /* ignore parse errors */ }
          }
        }
      }

      setPullName('')
      loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setIsPulling(false)
    }
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mt-6">
      <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">
        Modèles Ollama installés
      </p>

      {/* Model list */}
      <div className="divide-y divide-[var(--border)] mb-4">
        {models.length === 0 && (
          <p className="text-[10px] font-mono text-[var(--text-muted)] py-2">Aucun modèle installé.</p>
        )}
        {models.map(m => (
          <div key={m.name} className="flex items-center justify-between py-2.5">
            <div>
              <span className="text-[11px] font-mono text-white">{m.name}</span>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[9px] font-mono text-[var(--text-muted)]">{formatSize(m.size)}</span>
                <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                  {new Date(m.modified_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDelete(m.name)}
              disabled={isPending || isPulling}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Pull new model */}
      <div className="border-t border-[var(--border)] pt-4">
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em] mb-2">
          Installer un modèle
        </p>
        <div className="flex gap-2 mb-2">
          <input
            value={pullName}
            onChange={e => setPullName(e.target.value)}
            placeholder="ex: llama3.2:3b"
            disabled={isPulling}
            className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] text-white font-mono text-[11px] px-3 py-2 focus:outline-none focus:border-[var(--border-strong)] disabled:opacity-50"
            onKeyDown={e => { if (e.key === 'Enter' && !isPulling) handlePull() }}
          />
          <button
            onClick={handlePull}
            disabled={isPulling || !pullName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] text-[9px] font-mono uppercase tracking-[0.1em] hover:text-white disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3 h-3" />
            {isPulling ? 'Téléchargement...' : 'Installer'}
          </button>
        </div>

        {/* Pull progress log */}
        {pullLog.length > 0 && (
          <div className="bg-[var(--bg-input)] border border-[var(--border)] p-2 max-h-24 overflow-y-auto">
            {pullLog.map((line, i) => (
              <div key={i} className="text-[9px] font-mono text-[var(--text-muted)]">{line}</div>
            ))}
          </div>
        )}
        {error && <p className="text-[9px] font-mono text-[var(--danger)] mt-1">{error}</p>}
      </div>
    </div>
  )
}
