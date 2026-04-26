'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, Trash2, Eye, EyeOff, Save, Zap, Check } from 'lucide-react'
import { Eyebrow, StateText } from '../../_components/admin-primitives'

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

const emptyModel = (): ModelConfig => ({
  id: '',
  name: '',
  reasoning: false,
  input: ['text'],
  contextWindow: 32768,
  maxTokens: 8192,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
})

const inputCls =
  'bg-[var(--bjhunt-bg-tertiary)] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] font-mono text-[12px] px-3 h-10 w-full focus:outline-none focus:border-[var(--bjhunt-status-success)] focus:ring-1 focus:ring-[var(--bjhunt-status-success)]/30 transition-colors disabled:opacity-50'

const labelCls =
  'block mb-1.5 font-mono text-[11px] font-medium uppercase text-[var(--bjhunt-text-muted)]'

export function ProviderEditForm({
  providerId,
  initialProvider,
  locale,
}: {
  providerId: string
  initialProvider: ProviderConfig | null
  locale: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [id, setId] = useState(providerId)
  const [name, setName] = useState(initialProvider?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(initialProvider?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(initialProvider?.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [isOllama, setIsOllama] = useState(initialProvider?.api === 'ollama')
  const [enabled, setEnabled] = useState(initialProvider?.enabled ?? true)
  const [models, setModels] = useState<ModelConfig[]>(
    initialProvider?.models ?? [emptyModel()],
  )
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    latencyMs?: number
    error?: string
  } | null>(null)

  const handleSave = () => {
    setSaveStatus('saving')
    setSaveError(null)
    startTransition(async () => {
      const provider: ProviderConfig = {
        id,
        name,
        baseUrl,
        apiKey,
        enabled,
        models,
        ...(isOllama ? { api: 'ollama' as const } : {}),
      }
      const res = await browserBackendFetch(
        `/api/admin/gateway/providers/${id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(provider),
        },
      )
      if (res.ok) {
        setSaveStatus('saved')
        router.push(`/${locale}/dashboard/admin/gateway`)
      } else {
        setSaveStatus('error')
        const errBody = await res.json().catch(() => null)
        setSaveError(errBody?.error ?? `Error ${res.status}`)
      }
    })
  }

  const handleTest = () => {
    startTransition(async () => {
      const provider: ProviderConfig = {
        id,
        name,
        baseUrl,
        apiKey,
        enabled,
        models,
        ...(isOllama ? { api: 'ollama' as const } : {}),
      }
      const res = await browserBackendFetch(
        `/api/admin/gateway/providers/${id}/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(provider),
        },
      )
      setTestResult(await res.json())
    })
  }

  const updateModel = (i: number, patch: Partial<ModelConfig>) => {
    setModels((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }

  return (
    <div className="space-y-5">
      {/* Provider fields */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6">
        <Eyebrow className="mb-5">Provider</Eyebrow>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Provider ID</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              className={inputCls}
              placeholder="ex: zai"
              disabled={!!providerId}
            />
          </div>
          <div>
            <label className={labelCls}>Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="ex: Z.AI"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className={inputCls}
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={inputCls}
                placeholder="sk-…"
                autoComplete="new-password"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="inline-flex items-center justify-center w-10 h-10 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                title={showKey ? 'Hide' : 'Reveal'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-5 pt-5 border-t border-[var(--bjhunt-border)]">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOllama}
              onChange={(e) => setIsOllama(e.target.checked)}
              className="accent-[var(--bjhunt-status-success)]"
            />
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
              Ollama protocol
            </span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="accent-[var(--bjhunt-status-success)]"
            />
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
              Enabled
            </span>
          </label>
        </div>
      </div>

      {/* Models */}
      <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <Eyebrow>Models ({models.length})</Eyebrow>
          <button
            onClick={() => setModels((prev) => [...prev, emptyModel()])}
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add model
          </button>
        </div>
        <div className="space-y-4">
          {models.map((m, i) => (
            <div
              key={i}
              className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg)] p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
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
                  Model {i + 1}
                </span>
                <button
                  onClick={() =>
                    setModels((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  title="Remove model"
                  className="inline-flex items-center justify-center w-7 h-7 hover:bg-white/[0.04] transition-colors"
                  style={{ color: 'var(--bjhunt-status-danger)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>ID</label>
                  <input
                    value={m.id}
                    onChange={(e) => updateModel(i, { id: e.target.value })}
                    className={inputCls}
                    placeholder="gpt-4o"
                  />
                </div>
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    value={m.name}
                    onChange={(e) => updateModel(i, { name: e.target.value })}
                    className={inputCls}
                    placeholder="GPT-4o"
                  />
                </div>
                <div>
                  <label className={labelCls}>Context window</label>
                  <input
                    type="number"
                    value={m.contextWindow}
                    onChange={(e) =>
                      updateModel(i, { contextWindow: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Max tokens</label>
                  <input
                    type="number"
                    value={m.maxTokens}
                    onChange={(e) =>
                      updateModel(i, { maxTokens: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.reasoning}
                    onChange={(e) =>
                      updateModel(i, { reasoning: e.target.checked })
                    }
                    className="accent-[var(--bjhunt-status-success)]"
                  />
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--bjhunt-text-muted)',
                    }}
                  >
                    Reasoning
                  </span>
                </label>
                {(['text', 'image', 'file'] as const).map((t) => (
                  <label
                    key={t}
                    className="inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={m.input.includes(t)}
                      onChange={(e) =>
                        updateModel(i, {
                          input: e.target.checked
                            ? [...m.input, t]
                            : m.input.filter((x) => x !== t),
                        })
                      }
                      className="accent-[var(--bjhunt-status-success)]"
                    />
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--bjhunt-text-muted)',
                      }}
                    >
                      {t}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isPending || !id}
          className="inline-flex items-center gap-1.5 h-10 px-4 border font-mono text-[11px] uppercase tracking-[0.18em] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          style={{
            borderColor:
              saveStatus === 'saved'
                ? 'var(--bjhunt-status-success)'
                : 'var(--bjhunt-border-strong)',
            color:
              saveStatus === 'saved'
                ? 'var(--bjhunt-status-success)'
                : 'var(--bjhunt-text)',
            background: 'transparent',
          }}
        >
          {saveStatus === 'saved' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'saved'
              ? 'Saved'
              : 'Save'}
        </button>
        <button
          onClick={handleTest}
          disabled={isPending || !baseUrl}
          className="inline-flex items-center gap-1.5 h-10 px-4 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Zap className="w-3.5 h-3.5" />
          Test connection
        </button>
        {saveStatus === 'error' && saveError && (
          <StateText state="critical" mono>
            <span style={{ fontSize: 13 }}>{saveError}</span>
          </StateText>
        )}
        {testResult && (
          <StateText state={testResult.ok ? 'success' : 'critical'} mono>
            <span style={{ fontSize: 13 }}>
              {testResult.ok
                ? `OK ${testResult.latencyMs}ms`
                : testResult.error}
            </span>
          </StateText>
        )}
      </div>
    </div>
  )
}
