'use client'

import { useEffect, useState } from 'react'
import { Loader2, Cpu } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

// Admin-only Ollama Cloud model selector for the chat header.
//
// Renders nothing for non-platform-admin users. For admins:
//   1. Fetches /api/auth/me on mount to determine isPlatformAdmin.
//   2. If admin, fetches /api/admin/ollama/cloud-models (live catalogue
//      from https://ollama.com/v1/models) + /api/admin/ollama/active-model
//      (current platform_settings override).
//   3. Renders a dropdown showing the active model with a "(default)"
//      sentinel for "no override" — falls back to per-role mapping.
//   4. PUT on change updates platform_settings + writes an audit_log
//      entry (admin.set_active_ollama_model).
//
// The actual engine wiring that uses this override on the next agent
// run is forwarded via the LangGraph input payload (chat.ts adds
// model_override). The factory respects it when direct_ollama=true.

interface CloudModel {
  id: string
  created: number
  ownedBy: string
}

interface MeResp {
  user?: { isPlatformAdmin?: boolean }
}

export function AdminModelSelector() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [models, setModels] = useState<CloudModel[]>([])
  const [activeModel, setActiveModel] = useState<string>('') // '' = no override
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Resolve admin role
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await browserBackendFetch('/api/auth/me')
        if (!res.ok) {
          setIsAdmin(false)
          return
        }
        const body = (await res.json()) as MeResp
        if (!cancelled) setIsAdmin(Boolean(body.user?.isPlatformAdmin))
      } catch {
        if (!cancelled) setIsAdmin(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 2. Fetch cloud models + active model when admin
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [modelsRes, activeRes] = await Promise.all([
          browserBackendFetch('/api/admin/ollama/cloud-models'),
          browserBackendFetch('/api/admin/ollama/active-model'),
        ])
        if (modelsRes.ok) {
          const body = (await modelsRes.json()) as { models?: CloudModel[] }
          if (!cancelled) setModels(body.models ?? [])
        } else {
          const body = await modelsRes.json().catch(() => ({}))
          if (!cancelled) setError(body?.error ?? `models HTTP ${modelsRes.status}`)
        }
        if (activeRes.ok) {
          const body = (await activeRes.json()) as { model: string | null }
          if (!cancelled) setActiveModel(body.model ?? '')
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (isAdmin !== true) return null

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    setSaving(true)
    setError(null)
    try {
      const res = await browserBackendFetch('/api/admin/ollama/active-model', {
        method: 'PUT',
        body: JSON.stringify({ model: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? `HTTP ${res.status}`)
        return
      }
      setActiveModel(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="hidden md:flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]"
      title="Override the Ollama Cloud model used by every agent on this run (platform-admin only)."
      data-testid="admin-model-selector"
    >
      <Cpu size={11} className="text-[var(--accent)]" />
      <label htmlFor="admin-model-selector-select" className="sr-only">
        Active Ollama Cloud model
      </label>
      {loading ? (
        <Loader2 size={11} className="animate-spin" />
      ) : (
        <select
          id="admin-model-selector-select"
          value={activeModel}
          onChange={onChange}
          disabled={saving}
          className="bg-transparent border border-[var(--border)] text-white text-[9px] font-mono px-1.5 py-0.5 max-w-[180px] focus:outline-none focus:border-white/40 disabled:opacity-50"
        >
          <option value="">— default per-role —</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
      )}
      {saving && <Loader2 size={11} className="animate-spin" />}
      {error && <span className="text-red-400 truncate max-w-[120px]">{error}</span>}
    </div>
  )
}
