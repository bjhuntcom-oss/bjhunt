"use client"

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { Button } from '@/components/ui/button'

interface Props {
  initialName: string
  initialDescription: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function PlatformSettingsForm({ initialName, initialDescription }: Props) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setStatus('saving')
    startTransition(async () => {
      const res = await browserBackendFetch('/api/admin/platform-defaults', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityName: name, identityDescription: description }),
      })
      setStatus(res.ok ? 'saved' : 'error')
    })
  }

  const labelClass = "text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-1.5"
  const inputClass = "bg-[var(--bg-input)] border border-[var(--border)] text-white font-mono text-[11px] px-3 py-2 w-full focus:outline-none focus:border-[var(--border-strong)]"
  const sectionClass = "border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6"

  return (
    <div className={sectionClass}>
      <p className={labelClass + " mb-4"}>Identité</p>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Nom de la plateforme</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description de la plateforme</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Plateforme de cybersécurité..."
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
        {status === 'saved' && (
          <span className="text-[10px] font-mono text-[var(--success)]">✓ Sauvegardé</span>
        )}
        {status === 'error' && (
          <span className="text-[10px] font-mono text-[var(--danger)]">✗ Erreur</span>
        )}
      </div>
    </div>
  )
}
