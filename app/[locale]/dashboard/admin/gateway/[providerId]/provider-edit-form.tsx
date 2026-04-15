'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, Trash2 } from 'lucide-react'

interface ModelConfig {
  id: string; name: string; reasoning: boolean
  input: string[]; contextWindow: number; maxTokens: number
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number }
}
interface ProviderConfig {
  id: string; name: string; baseUrl: string; apiKey: string
  api?: 'ollama'; models: ModelConfig[]; enabled: boolean
}

const emptyModel = (): ModelConfig => ({
  id: '', name: '', reasoning: false, input: ['text'],
  contextWindow: 32768, maxTokens: 8192,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
})

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
  const [models, setModels] = useState<ModelConfig[]>(initialProvider?.models ?? [emptyModel()])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs?: number; error?: string } | null>(null)

  const handleSave = () => {
    setSaveStatus('saving')
    startTransition(async () => {
      const provider: ProviderConfig = {
        id, name, baseUrl, apiKey, enabled, models,
        ...(isOllama ? { api: 'ollama' as const } : {}),
      }
      const res = await browserBackendFetch(`/api/admin/gateway/providers/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
      })
      if (res.ok) {
        setSaveStatus('saved')
        router.push(`/${locale}/dashboard/admin/gateway`)
      } else {
        setSaveStatus('error')
      }
    })
  }

  const handleTest = () => {
    startTransition(async () => {
      const provider: ProviderConfig = {
        id, name, baseUrl, apiKey, enabled, models,
        ...(isOllama ? { api: 'ollama' as const } : {}),
      }
      const res = await browserBackendFetch(`/api/admin/gateway/providers/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
      })
      setTestResult(await res.json())
    })
  }

  const updateModel = (i: number, patch: Partial<ModelConfig>) => {
    setModels((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }

  const inputClass =
    'bg-[var(--bg-input)] border border-[var(--border)] text-white font-mono text-[11px] px-3 py-2 w-full focus:outline-none focus:border-[var(--border-strong)]'
  const labelClass =
    'text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5'

  return (
    <div>
      {/* Provider fields */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-4 space-y-4">
        <div>
          <label className={labelClass}>ID du provider</label>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            className={inputClass}
            placeholder="ex: zai"
            disabled={!!providerId}
          />
        </div>
        <div>
          <label className={labelClass}>Nom d&apos;affichage</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="ex: Z.AI" />
        </div>
        <div>
          <label className={labelClass}>Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputClass}
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div>
          <label className={labelClass}>API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={inputClass}
              placeholder="sk-..."
            />
            <button
              onClick={() => setShowKey((s) => !s)}
              className="px-3 text-[9px] font-mono text-[var(--text-muted)] border border-[var(--border)] hover:text-white transition-colors whitespace-nowrap"
            >
              {showKey ? 'Masquer' : 'Révéler'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isOllama} onChange={(e) => setIsOllama(e.target.checked)} />
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em]">
              Protocole Ollama
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em]">Activé</span>
          </label>
        </div>
      </div>

      {/* Models */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className={labelClass}>Modèles ({models.length})</p>
          <button
            onClick={() => setModels((prev) => [...prev, emptyModel()])}
            className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" /> Ajouter un modèle
          </button>
        </div>
        <div className="space-y-4">
          {models.map((m, i) => (
            <div key={i} className="border border-[var(--border)] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Modèle {i + 1}</span>
                <button
                  onClick={() => setModels((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[var(--danger)] hover:opacity-80"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ID</label>
                  <input
                    value={m.id}
                    onChange={(e) => updateModel(i, { id: e.target.value })}
                    className={inputClass}
                    placeholder="gpt-4o"
                  />
                </div>
                <div>
                  <label className={labelClass}>Nom</label>
                  <input
                    value={m.name}
                    onChange={(e) => updateModel(i, { name: e.target.value })}
                    className={inputClass}
                    placeholder="GPT-4o"
                  />
                </div>
                <div>
                  <label className={labelClass}>Context window</label>
                  <input
                    type="number"
                    value={m.contextWindow}
                    onChange={(e) => updateModel(i, { contextWindow: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max tokens</label>
                  <input
                    type="number"
                    value={m.maxTokens}
                    onChange={(e) => updateModel(i, { maxTokens: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.reasoning}
                    onChange={(e) => updateModel(i, { reasoning: e.target.checked })}
                  />
                  <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em]">
                    Reasoning
                  </span>
                </label>
                {(['text', 'image', 'file'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={m.input.includes(t)}
                      onChange={(e) =>
                        updateModel(i, {
                          input: e.target.checked ? [...m.input, t] : m.input.filter((x) => x !== t),
                        })
                      }
                    />
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em]">
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
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !id}
          className="px-4 py-2 bg-white text-black text-[10px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button
          onClick={handleTest}
          disabled={isPending || !baseUrl}
          className="px-4 py-2 border border-[var(--border)] text-[10px] font-mono uppercase tracking-[0.1em] hover:border-[var(--border-strong)] hover:text-white disabled:opacity-50 transition-colors"
        >
          Tester la connexion
        </button>
        {saveStatus === 'saved' && (
          <span className="text-[10px] font-mono text-[var(--success)]">✓ Sauvegardé</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-[10px] font-mono text-[var(--danger)]">✗ Erreur</span>
        )}
        {testResult && (
          <span
            className={`text-[10px] font-mono ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
          >
            {testResult.ok ? `✓ OK ${testResult.latencyMs}ms` : `✗ ${testResult.error}`}
          </span>
        )}
      </div>
    </div>
  )
}
