'use client'

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import {
  Plus,
  Trash2,
  Zap,
  Edit2,
  Check,
  Bot,
  Save,
  X,
} from 'lucide-react'
import { Eyebrow, StatusDot } from '../_components/admin-primitives'

interface AgentProfile {
  id: string
  name: string
  description: string | null
  soul_md: string
  agents_md: string
  identity_name: string | null
  identity_emoji: string | null
  is_default: boolean
  is_active: boolean
  visible_to_users: boolean
  updated_at: string
}

type AgentSummary = Pick<
  AgentProfile,
  'id' | 'name' | 'description' | 'is_active' | 'is_default' | 'updated_at'
>

const emptyForm = {
  name: '',
  description: '',
  soul_md: '',
  agents_md: '',
  identity_name: '',
  identity_emoji: '',
  visible_to_users: false,
}

const inputCls =
  'w-full bg-[var(--bjhunt-bg-tertiary)] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] font-mono text-[12px] px-3 h-10 focus:outline-none focus:border-[var(--bjhunt-status-success)] focus:ring-1 focus:ring-[var(--bjhunt-status-success)]/30 transition-colors'

const labelCls =
  'block mb-1.5 font-mono text-[11px] font-medium uppercase text-[var(--bjhunt-text-muted)]'

const iconBtn =
  'inline-flex items-center justify-center w-9 h-9 border border-transparent hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-40 disabled:pointer-events-none'

export function AgentsClient({
  initialProfiles,
}: {
  initialProfiles: AgentSummary[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [, setFullProfile] = useState<AgentProfile | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const openNew = () => {
    setForm(emptyForm)
    setFullProfile(null)
    setEditingId('new')
  }

  const openEdit = (p: AgentSummary) => {
    setError(null)
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/agents/${p.id}`)
      if (!res.ok) {
        setError(`Failed to load profile: ${res.status}`)
        return
      }
      const { profile } = await res.json()
      setFullProfile(profile)
      setForm({
        name: profile.name,
        description: profile.description ?? '',
        soul_md: profile.soul_md,
        agents_md: profile.agents_md,
        identity_name: profile.identity_name ?? '',
        identity_emoji: profile.identity_emoji ?? '',
        visible_to_users: profile.visible_to_users,
      })
      setEditingId(p.id)
    })
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const isNew = editingId === 'new'
      const url = isNew ? '/api/admin/agents' : `/api/admin/agents/${editingId}`
      const method = isNew ? 'POST' : 'PATCH'
      const body = {
        name: form.name,
        description: form.description || null,
        soul_md: form.soul_md,
        agents_md: form.agents_md,
        identity_name: form.identity_name || null,
        identity_emoji: form.identity_emoji || null,
        visible_to_users: form.visible_to_users,
      }
      const res = await browserBackendFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        setError(errBody?.error ?? `Save failed (${res.status})`)
        return
      }
      const { profile } = await res.json()
      if (isNew) {
        setProfiles((prev) => [profile, ...prev])
      } else {
        setProfiles((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...profile } : p)),
        )
      }
      setEditingId(null)
      setFullProfile(null)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this profile?')) return
    setError(null)
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/agents/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id))
      } else {
        const errBody = await res.json().catch(() => null)
        setError(errBody?.error ?? `Delete failed (${res.status})`)
      }
    })
  }

  const handleActivate = (id: string) => {
    setError(null)
    startTransition(async () => {
      const res = await browserBackendFetch(
        `/api/admin/agents/${id}/activate`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        setError(errBody?.error ?? `Activation failed (${res.status})`)
        return
      }
      setProfiles((prev) =>
        prev.map((p) => ({ ...p, is_active: p.id === id })),
      )
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <Eyebrow>{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</Eyebrow>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New profile
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center justify-between border bg-[var(--bjhunt-bg-secondary)] px-4 py-2.5 mb-5"
          style={{
            borderColor: 'var(--bjhunt-status-danger)',
            background: 'rgba(239,68,68,0.08)',
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--bjhunt-status-danger)' }}
          >
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="font-mono text-[11px] hover:opacity-70"
            style={{ color: 'var(--bjhunt-status-danger)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit / Create form */}
      {editingId !== null && (
        <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6 mb-6 space-y-4">
          <Eyebrow>
            {editingId === 'new' ? 'New profile' : 'Edit profile'}
          </Eyebrow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={inputCls}
                placeholder="ex: Pentest Expert"
              />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className={inputCls}
                placeholder="Short description"
              />
            </div>
            <div>
              <label className={labelCls}>Identity name</label>
              <input
                value={form.identity_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, identity_name: e.target.value }))
                }
                className={inputCls}
                placeholder="ex: BJHUNT"
              />
            </div>
            <div>
              <label className={labelCls}>Emoji</label>
              <input
                value={form.identity_emoji}
                onChange={(e) =>
                  setForm((f) => ({ ...f, identity_emoji: e.target.value }))
                }
                className={inputCls}
                placeholder="🤖"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>SOUL.md</label>
            <textarea
              value={form.soul_md}
              onChange={(e) =>
                setForm((f) => ({ ...f, soul_md: e.target.value }))
              }
              rows={8}
              className={`${inputCls} h-auto py-2.5 resize-y`}
              placeholder="Personality and directives"
            />
          </div>
          <div>
            <label className={labelCls}>AGENTS.md</label>
            <textarea
              value={form.agents_md}
              onChange={(e) =>
                setForm((f) => ({ ...f, agents_md: e.target.value }))
              }
              rows={8}
              className={`${inputCls} h-auto py-2.5 resize-y`}
              placeholder="Available agents and their capabilities"
            />
          </div>

          <label className="inline-flex items-center gap-2 font-mono text-[12px] cursor-pointer text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)]">
            <input
              type="checkbox"
              checked={form.visible_to_users}
              onChange={(e) =>
                setForm((f) => ({ ...f, visible_to_users: e.target.checked }))
              }
              className="accent-[var(--bjhunt-status-success)]"
            />
            Visible to users
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-4 border font-mono text-[11px] uppercase tracking-[0.18em] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              style={{
                borderColor: 'var(--bjhunt-status-success)',
                color: 'var(--bjhunt-status-success)',
                background: 'transparent',
              }}
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditingId(null)
                setFullProfile(null)
              }}
              className="inline-flex items-center gap-1.5 h-9 px-4 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile cards grid */}
      {profiles.length === 0 ? (
        <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-8 text-center">
          <Bot className="w-6 h-6 mx-auto mb-3 text-[var(--bjhunt-text-subtle)]" />
          <p
            className="font-mono"
            style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
          >
            No profile — create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 hover:border-[var(--bjhunt-border-strong)] transition-colors"
              style={
                profile.is_active
                  ? { borderColor: 'var(--bjhunt-status-success)' }
                  : undefined
              }
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 flex items-center justify-center border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-tertiary)]">
                  <Bot className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
                </div>
                <div className="flex items-center gap-1">
                  {profile.is_active && <StatusDot state="success" pulse />}
                </div>
              </div>

              <div
                className="truncate"
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--bjhunt-text)',
                }}
              >
                {profile.name}
              </div>
              {profile.description && (
                <p
                  className="mt-1 line-clamp-2"
                  style={{
                    fontSize: 13,
                    color: 'var(--bjhunt-text-muted)',
                  }}
                >
                  {profile.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {profile.is_active && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--bjhunt-status-success)',
                    }}
                  >
                    Active
                  </span>
                )}
                {profile.is_default && (
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
                    Default
                  </span>
                )}
              </div>
              <div
                className="mt-2 font-mono"
                style={{ fontSize: 12, color: 'var(--bjhunt-text-subtle)' }}
              >
                Updated {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
              </div>

              <div className="flex items-center justify-end gap-1 mt-4 pt-4 border-t border-[var(--bjhunt-border)]">
                {!profile.is_active && (
                  <button
                    onClick={() => handleActivate(profile.id)}
                    disabled={isPending}
                    title="Activate"
                    className={iconBtn}
                    style={{ color: 'var(--bjhunt-status-success)' }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}
                {profile.is_active && (
                  <span className={iconBtn} style={{ color: 'var(--bjhunt-status-success)' }}>
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
                <button
                  onClick={() => openEdit(profile)}
                  disabled={isPending}
                  title="Edit"
                  className={iconBtn}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  disabled={isPending || profile.is_default || profile.is_active}
                  title={
                    profile.is_active
                      ? 'Cannot delete an active profile'
                      : profile.is_default
                        ? 'Cannot delete the default profile'
                        : 'Delete'
                  }
                  className={iconBtn}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--bjhunt-status-danger)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--bjhunt-text-muted)')
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
