'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserBackendFetch } from '@/lib/backend-client'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

interface ApiKeysPanelProps {
  locale: string
}

export function ApiKeysPanel({ locale }: ApiKeysPanelProps) {
  const isFr = locale === 'fr'
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchKeys = useCallback(async () => {
    try {
      const res = await browserBackendFetch('/api/keys')
      if (res.ok) {
        const body = await res.json()
        setKeys(body.keys ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    setRevealedKey(null)

    try {
      const res = await browserBackendFetch('/api/keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      })

      if (!res.ok) {
        setError(isFr ? 'Echec de la creation.' : 'Creation failed.')
        return
      }

      const body = await res.json()
      setRevealedKey(body.key)
      setNewKeyName('')
      setShowCreate(false)
      await fetchKeys()
    } catch {
      setError(isFr ? 'Erreur reseau.' : 'Network error.')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: string) => {
    try {
      const res = await browserBackendFetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
      }
    } catch {
      // silent
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {isFr ? 'Cles API' : 'API Keys'}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setShowCreate(!showCreate)}>
          {isFr ? '+ Creer une cle' : '+ Create key'}
        </Button>
      </div>

      {revealedKey && (
        <div className="border border-[var(--warning)]/25 bg-[var(--warning)]/10 p-4 mb-4">
          <p className="text-[9px] font-mono text-[var(--warning)] uppercase tracking-widest mb-2">
            {isFr ? 'Copiez cette cle — elle ne sera plus affichee' : 'Copy this key — it will not be shown again'}
          </p>
          <div className="flex items-center gap-2">
            <code className="text-[11px] font-mono text-white flex-1 break-all">{revealedKey}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(revealedKey)}
              className="text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={createKey} className="border border-[var(--border)] p-4 mb-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
              {isFr ? 'Nom de la cle' : 'Key name'}
            </label>
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
              placeholder={isFr ? 'Ex: CI/CD Pipeline' : 'E.g. CI/CD Pipeline'}
            />
          </div>
          <Button size="sm" type="submit" disabled={creating}>
            {creating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {isFr ? 'Creer' : 'Create'}
          </Button>
        </form>
      )}

      {error && (
        <div className="border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="border border-[var(--border)] p-4 text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isFr ? 'Chargement...' : 'Loading...'}
        </div>
      ) : keys.length === 0 ? (
        <div className="border border-[var(--border)] p-4 text-[11px] font-mono text-[var(--text-muted)]">
          {isFr ? 'Aucune cle API configuree.' : 'No API keys configured.'}
        </div>
      ) : (
        <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
          {keys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[11px] font-mono text-white">{apiKey.name}</div>
                <div className="text-[9px] font-mono text-[var(--text-muted)]">
                  {apiKey.keyPrefix}... · {isFr ? 'Creee le' : 'Created'} {new Date(apiKey.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revokeKey(apiKey.id)}
                className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                title={isFr ? 'Revoquer' : 'Revoke'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
