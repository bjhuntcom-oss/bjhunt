'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, Trash2, Edit, Zap } from 'lucide-react'

interface ModelConfig {
  id: string; name: string; reasoning: boolean
  input: string[]; contextWindow: number; maxTokens: number
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number }
}
interface ProviderConfig {
  id: string; name: string; baseUrl: string; apiKey: string
  api?: 'ollama'; models: ModelConfig[]; enabled: boolean
}
interface GatewayConfig {
  providers: Record<string, ProviderConfig>
  defaults: { model: string }
  ui: { assistant: { name: string; avatar: string } }
}

export function GatewayProvidersClient({
  initialConfig,
  locale,
}: {
  initialConfig: GatewayConfig
  locale: string
}) {
  const [config, setConfig] = useState(initialConfig)
  const [defaultModel, setDefaultModel] = useState(initialConfig.defaults.model)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs?: number; error?: string }>>({})
  const [isPending, startTransition] = useTransition()

  const providers = Object.values(config.providers)
  const allModels = providers.flatMap((p) => p.models.map((m) => `${p.id}/${m.id}`))

  const handleSetDefault = (model: string) => {
    setDefaultModel(model)
    startTransition(async () => {
      await browserBackendFetch('/api/admin/gateway/defaults', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      })
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm(`Supprimer le provider "${id}" ?`)) return
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/gateway/providers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfig((prev) => {
          const next = { ...prev, providers: { ...prev.providers } }
          delete next.providers[id]
          return next
        })
      }
    })
  }

  const handleTest = (providerId: string, provider: ProviderConfig) => {
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/gateway/providers/${providerId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
      })
      const result = await res.json()
      setTestResults((prev) => ({ ...prev, [providerId]: result }))
    })
  }

  return (
    <div>
      {/* Default model selector */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6">
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
          Modèle par défaut
        </p>
        <select
          value={defaultModel}
          onChange={(e) => handleSetDefault(e.target.value)}
          disabled={isPending}
          className="bg-[var(--bg-input)] border border-[var(--border)] text-white font-mono text-[11px] px-3 py-2 w-full max-w-sm focus:outline-none focus:border-[var(--border-strong)]"
        >
          {allModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Provider list */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">
          Providers ({providers.length})
        </p>
        <Link
          href={`/${locale}/dashboard/admin/gateway/new`}
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.1em] border border-[var(--border)] px-3 py-1.5 hover:border-[var(--border-strong)] hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3" />
          Ajouter
        </Link>
      </div>

      <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
        {providers.length === 0 && (
          <div className="px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
            Aucun provider configuré.
          </div>
        )}
        {providers.map((p) => {
          const testResult = testResults[p.id]
          return (
            <div key={p.id} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-white font-bold">{p.id}</span>
                  <span
                    className="text-[8px] font-mono uppercase px-1.5 py-0.5"
                    style={{
                      background: p.enabled ? 'var(--success)' : 'var(--danger)',
                      color: 'black',
                    }}
                  >
                    {p.enabled ? 'actif' : 'désactivé'}
                  </span>
                  {p.api === 'ollama' && (
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 border border-[var(--border)] text-[var(--text-muted)]">
                      ollama
                    </span>
                  )}
                </div>
                <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5 truncate">{p.baseUrl}</div>
                <div className="text-[9px] font-mono text-[var(--text-subtle)] mt-0.5">
                  {p.models.length} modèle{p.models.length !== 1 ? 's' : ''}
                </div>
                {testResult && (
                  <div
                    className={`text-[9px] font-mono mt-0.5 ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
                  >
                    {testResult.ok ? `✓ OK ${testResult.latencyMs}ms` : `✗ ${testResult.error}`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(p.id, p)}
                  disabled={isPending}
                  title="Tester"
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--success)] transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>
                <Link
                  href={`/${locale}/dashboard/admin/gateway/${p.id}`}
                  title="Modifier"
                  className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending}
                  title="Supprimer"
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
