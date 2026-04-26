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

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--bjhunt-font-sans)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--bjhunt-text)',
}

const INPUT_STYLE: React.CSSProperties = {
  height: 40,
  borderRadius: 'var(--bjhunt-radius, 6px)',
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
        <label htmlFor="display-name" className="block mb-2" style={LABEL_STYLE}>
          {isFr ? "Nom d'affichage" : 'Display name'}
        </label>
        <Input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={1}
          maxLength={100}
          placeholder={isFr ? 'Votre nom' : 'Your name'}
          style={INPUT_STYLE}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3"
          style={{
            border: '1px solid var(--bjhunt-status-danger, #fb565b)',
            background: 'var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))',
            borderRadius: 'var(--bjhunt-radius, 6px)',
            color: 'var(--bjhunt-status-danger, #fb565b)',
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="px-4 py-3"
          style={{
            border: '1px solid var(--bjhunt-status-success, #00d992)',
            background: 'var(--bjhunt-severity-low-bg, rgba(0,217,146,0.12))',
            borderRadius: 'var(--bjhunt-radius, 6px)',
            color: 'var(--bjhunt-status-success, #00d992)',
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 13,
          }}
        >
          {isFr ? 'Nom mis a jour.' : 'Display name updated.'}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="state" state="success"
          size="md"
          type="submit"
          disabled={loading || displayName.trim().length === 0}
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
          {isFr ? 'Sauvegarder' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
