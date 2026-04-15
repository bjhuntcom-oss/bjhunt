'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserBackendFetch } from '@/lib/backend-client'

interface DisplayNameFormProps {
  locale: string
  initialName: string
}

export function DisplayNameForm({ locale, initialName }: DisplayNameFormProps) {
  const isFr = locale === 'fr'
  const [displayName, setDisplayName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await browserBackendFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'UPDATE_FAILED' }))
        setError(body.error ?? (isFr ? 'Mise a jour echouee.' : 'Update failed.'))
        return
      }

      setSuccess(true)
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError(isFr ? 'Erreur reseau.' : 'Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="p-6 flex flex-col gap-4">
      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
          {isFr ? 'Nom d\'affichage' : 'Display name'}
        </label>
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={1}
          maxLength={100}
          placeholder={isFr ? 'Votre nom' : 'Your name'}
        />
      </div>

      {error && (
        <div className="border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="border border-[var(--success)]/25 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
          {isFr ? 'Nom mis a jour.' : 'Display name updated.'}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={loading || displayName.trim().length === 0}>
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          {isFr ? 'Sauvegarder' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
