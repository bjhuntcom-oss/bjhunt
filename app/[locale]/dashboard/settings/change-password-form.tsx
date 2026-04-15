'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserBackendFetch } from '@/lib/backend-client'

interface ChangePasswordFormProps {
  locale: string
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
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'CHANGE_PASSWORD_FAILED' }))
        const code = body.error ?? 'CHANGE_PASSWORD_FAILED'
        if (code === 'INVALID_CURRENT_PASSWORD') {
          setError(isFr ? 'Mot de passe actuel incorrect.' : 'Current password is incorrect.')
        } else if (code === 'PASSWORD_TOO_SHORT') {
          setError(isFr ? 'Utilisez au moins 14 caracteres.' : 'Use at least 14 characters.')
        } else if (code === 'PASSWORD_TOO_WEAK') {
          setError(isFr ? 'Choisissez un mot de passe plus unique.' : 'Choose a more unique password.')
        } else {
          setError(isFr ? 'Echec du changement.' : 'Change failed.')
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
        <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
          {isFr ? 'Mot de passe actuel' : 'Current password'}
        </label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
          {isFr ? 'Nouveau mot de passe' : 'New password'}
        </label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={14}
          placeholder={isFr ? '14 caracteres minimum' : '14 characters minimum'}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="border border-[var(--success)]/25 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
          {isFr ? 'Mot de passe mis a jour.' : 'Password updated.'}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={loading}>
          {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          {isFr ? 'Sauvegarder' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
