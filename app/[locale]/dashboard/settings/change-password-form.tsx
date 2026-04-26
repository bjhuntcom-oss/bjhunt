'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserBackendFetch } from '@/lib/backend-client'

interface ChangePasswordFormProps {
  locale: string
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

export function ChangePasswordForm({ locale }: ChangePasswordFormProps) {
  const isFr = locale === 'fr'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await browserBackendFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const code =
          (typeof body?.error === 'string' ? body.error : body?.error?.code) ??
          'CHANGE_PASSWORD_FAILED'
        if (code === 'INVALID_CURRENT_PASSWORD') {
          setError(isFr ? 'Mot de passe actuel incorrect.' : 'Current password is incorrect.')
        } else if (code === 'PASSWORD_TOO_SHORT' || res.status === 400) {
          setError(
            isFr
              ? 'Utilisez au moins 14 caracteres avec majuscule, minuscule et chiffre.'
              : 'Use at least 14 characters with upper, lower and digit.',
          )
        } else if (code === 'PASSWORD_TOO_WEAK') {
          setError(isFr ? 'Choisissez un mot de passe plus unique.' : 'Choose a more unique password.')
        } else if (res.status === 401) {
          setError(isFr ? 'Mot de passe actuel incorrect.' : 'Current password is incorrect.')
        } else if (res.status === 429) {
          setError(
            isFr
              ? 'Trop de tentatives. Reessayez dans quelques minutes.'
              : 'Too many attempts. Try again in a few minutes.',
          )
        } else {
          setError(
            isFr
              ? `Echec du changement (HTTP ${res.status}).`
              : `Change failed (HTTP ${res.status}).`,
          )
        }
        return
      }

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch {
      setError(isFr ? 'Erreur reseau.' : 'Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="p-6 flex flex-col gap-4">
      <div>
        <label htmlFor="current-password" className="block mb-2" style={LABEL_STYLE}>
          {isFr ? 'Mot de passe actuel' : 'Current password'}
        </label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={INPUT_STYLE}
        />
      </div>
      <div>
        <label htmlFor="new-password" className="block mb-2" style={LABEL_STYLE}>
          {isFr ? 'Nouveau mot de passe' : 'New password'}
        </label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={14}
          placeholder={isFr ? '14 caracteres minimum' : '14 characters minimum'}
          autoComplete="new-password"
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
          {isFr ? 'Mot de passe mis a jour.' : 'Password updated.'}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="state" state="success" size="md" type="submit" disabled={loading}>
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
          {isFr ? 'Sauvegarder' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
