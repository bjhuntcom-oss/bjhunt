'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, Trash2, Edit, Zap } from 'lucide-react'
import { Eyebrow, StatusDot, StateText } from '../_components/admin-primitives'

interface ModelConfig {
  id: string
  name: string
  reasoning: boolean
  input: string[]
  contextWindow: number
  maxTokens: number
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number }
}
interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  api?: 'ollama'
  models: ModelConfig[]
  enabled: boolean
}
interface GatewayConfig {
  providers: Record<string, ProviderConfig>
  defaults: { model: string }
  ui: { assistant: { name: string; avatar: string } }
}

const iconBtn =
  'inline-flex items-center justify-center w-9 h-9 border border-transparent hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-40 disabled:pointer-events-none'

export function GatewayProvidersClient({
  initialConfig,
  locale,
}: {
  initialConfig: GatewayConfig
  locale: string
}) {
  const [config, setConfig] = useState(initialConfig)
  const [defaultModel, setDefaultModel] = useState(initialConfig.defaults.model)
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; latencyMs?: number; error?: string }>
  >({})
  const [isPending, startTransition] = useTransition()

  const providers = Object.values(config.providers)
  const allModels = providers.flatMap((p) =>
    p.models.map((m) => `${p.id}/${m.id}`),
  )

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
    if (!confirm(`Delete provider "${id}"?`)) return
    startTransition(async () => {
      const res = await browserBackendFetch(
        `/api/admin/gateway/providers/${id}`,
        { method: 'DELETE' },
      )
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
      const res = await browserBackendFetch(
        `/api/admin/gateway/providers/${providerId}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(provider),
        },
      )
      const result = await res.json()
      setTestResults((prev) => ({ ...prev, [providerId]: result }))
    })
  }

  return (
    <div>
      {/* Default model selector */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6 mb-6">
        <Eyebrow>Default Model</Eyebrow>
        <select
          value={defaultModel}
          onChange={(e) => handleSetDefault(e.target.value)}
          disabled={isPending}
          className="mt-3 bg-[var(--bjhunt-bg-tertiary)] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] font-mono text-[12px] px-3 h-10 w-full max-w-md focus:outline-none focus:border-[var(--bjhunt-status-success)]"
        >
          {allModels.length === 0 ? (
            <option value="">— no model configured —</option>
          ) : (
            allModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Provider list toolbar */}
      <div className="flex items-center justify-between mb-5">
        <Eyebrow>
          {providers.length} provider{providers.length !== 1 ? 's' : ''}
        </Eyebrow>
        <Link
          href={`/${locale}/dashboard/admin/gateway/new`}
          className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add provider
        </Link>
      </div>

      {/* Providers table */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)]">
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
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden md:table-cell px-4 py-3">Base URL</th>
              <th className="hidden lg:table-cell px-4 py-3">Models</th>
              <th className="hidden lg:table-cell px-4 py-3">Last Test</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center font-mono text-[13px] text-[var(--bjhunt-text-muted)]"
                >
                  No provider configured.
                </td>
              </tr>
            )}
            {providers.map((p) => {
              const testResult = testResults[p.id]
              return (
                <tr
                  key={p.id}
                  className="border-b border-[var(--bjhunt-border)] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col">
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 13,
                          color: 'var(--bjhunt-text)',
                          fontWeight: 600,
                        }}
                      >
                        {p.id}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--bjhunt-text-muted)',
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <StatusDot
                        state={p.enabled ? 'success' : 'critical'}
                        pulse={p.enabled}
                      />
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 13,
                          color: p.enabled
                            ? 'var(--bjhunt-status-success)'
                            : 'var(--bjhunt-status-danger)',
                        }}
                      >
                        {p.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {p.api === 'ollama' && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: 'var(--bjhunt-text-muted)',
                          }}
                        >
                          OLLAMA
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="hidden md:table-cell px-4 py-3 font-mono align-middle truncate max-w-[280px]"
                    style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
                  >
                    {p.baseUrl}
                  </td>
                  <td
                    className="hidden lg:table-cell px-4 py-3 font-mono align-middle"
                    style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
                  >
                    {p.models.length}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 font-mono align-middle">
                    {testResult ? (
                      <StateText
                        state={testResult.ok ? 'success' : 'critical'}
                        mono
                      >
                        <span style={{ fontSize: 13 }}>
                          {testResult.ok
                            ? `OK ${testResult.latencyMs}ms`
                            : testResult.error}
                        </span>
                      </StateText>
                    ) : (
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--bjhunt-text-subtle)',
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleTest(p.id, p)}
                        disabled={isPending}
                        title="Test connection"
                        className={iconBtn}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color =
                            'var(--bjhunt-status-success)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color =
                            'var(--bjhunt-text-muted)')
                        }
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/${locale}/dashboard/admin/gateway/${p.id}`}
                        title="Edit"
                        className={iconBtn}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                        title="Delete"
                        className={iconBtn}
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
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
