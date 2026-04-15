'use client'

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { Plus, Trash2, Zap, Edit2, Check } from 'lucide-react'

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

type AgentSummary = Pick<AgentProfile, 'id' | 'name' | 'description' | 'is_active' | 'is_default' | 'updated_at'>

const emptyForm = {
  name: '',
  description: '',
  soul_md: '',
  agents_md: '',
  identity_name: '',
  identity_emoji: '',
  visible_to_users: false,
}

export function AgentsClient({ initialProfiles }: { initialProfiles: AgentSummary[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [fullProfile, setFullProfile] = useState<AgentProfile | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isPending, startTransition] = useTransition()

  const openNew = () => {
    setForm(emptyForm)
    setFullProfile(null)
    setEditingId('new')
  }

  const openEdit = (p: AgentSummary) => {
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/agents/${p.id}`)
      if (!res.ok) return
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
      if (!res.ok) return
      const { profile } = await res.json()

      if (isNew) {
        setProfiles((prev) => [profile, ...prev])
      } else {
        setProfiles((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...profile } : p)))
      }
      setEditingId(null)
      setFullProfile(null)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce profil ?')) return
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/agents/${id}`, { method: 'DELETE' })
      if (res.ok) setProfiles((prev) => prev.filter((p) => p.id !== id))
    })
  }

  const handleActivate = (id: string) => {
    startTransition(async () => {
      const res = await browserBackendFetch(`/api/admin/agents/${id}/activate`, { method: 'POST' })
      if (!res.ok) return
      setProfiles((prev) => prev.map((p) => ({ ...p, is_active: p.id === id })))
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-[11px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Nouveau profil
        </button>
      </div>

      {/* Edit / Create form */}
      {editingId !== null && (
        <div className="border border-[var(--border)] bg-[var(--bg-card)] p-5 mb-6 space-y-4">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {editingId === 'new' ? 'Nouveau profil' : 'Modifier le profil'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Nom *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-transparent border border-[var(--border)] px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="Ex: Pentest Expert"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-transparent border border-[var(--border)] px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="Description courte"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Nom identité</label>
              <input
                value={form.identity_name}
                onChange={(e) => setForm((f) => ({ ...f, identity_name: e.target.value }))}
                className="w-full bg-transparent border border-[var(--border)] px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="Ex: BJHUNT"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Emoji</label>
              <input
                value={form.identity_emoji}
                onChange={(e) => setForm((f) => ({ ...f, identity_emoji: e.target.value }))}
                className="w-full bg-transparent border border-[var(--border)] px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="🤖"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">SOUL.md</label>
            <textarea
              value={form.soul_md}
              onChange={(e) => setForm((f) => ({ ...f, soul_md: e.target.value }))}
              rows={8}
              className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)] resize-y"
              placeholder="Personnalité et directives de l'agent"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">AGENTS.md</label>
            <textarea
              value={form.agents_md}
              onChange={(e) => setForm((f) => ({ ...f, agents_md: e.target.value }))}
              rows={8}
              className="w-full bg-transparent border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--accent)] resize-y"
              placeholder="Agents disponibles et leurs capacités"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.visible_to_users}
                onChange={(e) => setForm((f) => ({ ...f, visible_to_users: e.target.checked }))}
                className="accent-[var(--accent)]"
              />
              Visible aux utilisateurs
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
              className="px-4 py-1.5 bg-[var(--accent)] text-white text-[11px] font-mono font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => { setEditingId(null); setFullProfile(null) }}
              className="px-4 py-1.5 border border-[var(--border)] text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest hover:text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Profiles list */}
      {profiles.length === 0 ? (
        <div className="border border-[var(--border)] px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
          Aucun profil — créez-en un pour commencer.
        </div>
      ) : (
        <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-card)] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {profile.is_active && (
                  <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full" style={{ background: 'var(--success)' }} />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-bold text-white truncate">{profile.name}</span>
                    {profile.is_active && (
                      <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-[var(--success)] text-[var(--success)]">ACTIF</span>
                    )}
                    {profile.is_default && (
                      <span className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-[var(--text-muted)] text-[var(--text-muted)]">DÉFAUT</span>
                    )}
                  </div>
                  {profile.description && (
                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">{profile.description}</div>
                  )}
                  <div className="text-[9px] text-[var(--text-subtle)] font-mono mt-0.5">
                    Modifié le {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!profile.is_active && (
                  <button
                    onClick={() => handleActivate(profile.id)}
                    disabled={isPending}
                    title="Activer ce profil"
                    className="flex items-center gap-1 px-2 py-1 border border-[var(--border)] text-[var(--text-muted)] text-[10px] font-mono uppercase tracking-widest hover:border-[var(--success)] hover:text-[var(--success)] transition-colors disabled:opacity-40"
                  >
                    <Zap size={10} />
                    Activer
                  </button>
                )}
                {profile.is_active && (
                  <span className="flex items-center gap-1 px-2 py-1 text-[var(--success)] text-[10px] font-mono">
                    <Check size={10} />
                    Actif
                  </span>
                )}
                <button
                  onClick={() => openEdit(profile)}
                  disabled={isPending}
                  className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-40"
                  title="Modifier"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  disabled={isPending || profile.is_default || profile.is_active}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-30"
                  title={profile.is_active ? 'Impossible de supprimer un profil actif' : profile.is_default ? 'Impossible de supprimer le profil par défaut' : 'Supprimer'}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
