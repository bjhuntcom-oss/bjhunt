'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

export default function ResetPasswordPage() {
  const params = useParams<{ locale: string }>()
  const searchParams = useSearchParams()
  const locale = params.locale
  const isFr = locale === 'fr'
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError(isFr ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.')
      return
    }

    if (!token) {
      setError(isFr ? 'Lien de reinitialisation invalide.' : 'Invalid reset link.')
      return
    }

    setLoading(true)

    try {
      const res = await browserBackendFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'RESET_FAILED' }))
        const code = body.error ?? 'RESET_FAILED'
        if (code === 'INVALID_RESET_TOKEN' || code === 'RESET_TOKEN_ALREADY_USED' || code === 'RESET_TOKEN_EXPIRED') {
          setError(
            isFr
              ? 'Ce lien est invalide ou a expire. Demandez un nouveau lien.'
              : 'This link is invalid or expired. Request a new link.'
          )
        } else if (code === 'PASSWORD_TOO_SHORT') {
          setError(isFr ? 'Utilisez au moins 14 caracteres.' : 'Use at least 14 characters.')
        } else if (code === 'PASSWORD_TOO_WEAK') {
          setError(
            isFr
              ? 'Choisissez un mot de passe plus unique.'
              : 'Choose a more unique password.'
          )
        } else {
          setError(isFr ? 'Echec de la reinitialisation.' : 'Reset failed.')
        }
        return
      }

      setSuccess(true)
    } catch {
      setError(isFr ? 'Erreur reseau. Reessayez.' : 'Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="bg-grid absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoSymbol size={22} />
            <LogoWordmark />
          </Link>
        </div>

        <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <h1 className="text-xl font-black mb-1 tracking-tight">
            {isFr ? 'Nouveau mot de passe' : 'New password'}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mb-8">
            {isFr ? 'Choisissez votre nouveau mot de passe.' : 'Choose your new password.'}
          </p>

          {success ? (
            <div>
              <div className="border border-[var(--success)]/25 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)] mb-4">
                {isFr
                  ? 'Mot de passe reinitialise avec succes.'
                  : 'Password reset successfully.'}
              </div>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90"
              >
                {isFr ? 'Se connecter' : 'Sign in'}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
                  {isFr ? 'Nouveau mot de passe' : 'New password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                  className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                  placeholder={isFr ? '14 caracteres minimum' : '14 characters minimum'}
                />
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
                  {isFr ? 'Confirmer' : 'Confirm'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                  className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                  placeholder={isFr ? 'Retapez le mot de passe' : 'Re-enter password'}
                />
              </div>

              {error && (
                <div className="border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? isFr ? 'Reinitialisation...' : 'Resetting...'
                  : isFr ? 'Reinitialiser' : 'Reset password'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
            <span className="text-[10px] text-[var(--text-muted)]">
              <Link
                href="/login"
                className="text-white hover:underline underline-offset-2"
              >
                {isFr ? 'Retour a la connexion' : 'Back to sign in'}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
