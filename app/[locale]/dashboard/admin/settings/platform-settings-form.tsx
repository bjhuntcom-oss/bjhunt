'use client'

import { useState, useTransition } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { Save, Check } from 'lucide-react'
import { Eyebrow, StateText } from '../_components/admin-primitives'

interface Props {
  initialName: string
  initialDescription: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const inputCls =
  'bg-[var(--bjhunt-bg-tertiary)] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text)] font-mono text-[12px] px-3 h-10 w-full focus:outline-none focus:border-[var(--bjhunt-status-success)] focus:ring-1 focus:ring-[var(--bjhunt-status-success)]/30 transition-colors'

const labelCls =
  'block mb-1.5 font-mono text-[11px] font-medium uppercase text-[var(--bjhunt-text-muted)]'

export function PlatformSettingsForm({ initialName, initialDescription }: Props) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setStatus('saving')
    startTransition(async () => {
      const [nameRes, descRes] = await Promise.all([
        browserBackendFetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'platform_name', value: name }),
        }),
        browserBackendFetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'platform_description',
            value: description,
          }),
        }),
      ])
      const ok = nameRes.ok && descRes.ok
      setStatus(ok ? 'saved' : 'error')
    })
  }

  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6 mb-5">
      <Eyebrow className="mb-5">Identity</Eyebrow>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Platform name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
          <p
            className="mt-1.5"
            style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
          >
            Affiché dans le navigateur, les emails et la barre supérieure.
          </p>
        </div>
        <div>
          <label className={labelCls}>Platform description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            placeholder="AI-powered cybersecurity platform…"
          />
          <p
            className="mt-1.5"
            style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
          >
            Tagline metadata pour OG / SEO et le footer marketing.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[var(--bjhunt-border)]">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 h-10 px-4 border font-mono text-[11px] uppercase tracking-[0.18em] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          style={{
            borderColor:
              status === 'saved'
                ? 'var(--bjhunt-status-success)'
                : 'var(--bjhunt-border-strong)',
            color:
              status === 'saved'
                ? 'var(--bjhunt-status-success)'
                : 'var(--bjhunt-text)',
            background: 'transparent',
          }}
        >
          {status === 'saved' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {isPending ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save'}
        </button>
        {status === 'error' && (
          <StateText state="critical" mono>
            <span style={{ fontSize: 13 }}>Save failed</span>
          </StateText>
        )}
      </div>
    </div>
  )
}
