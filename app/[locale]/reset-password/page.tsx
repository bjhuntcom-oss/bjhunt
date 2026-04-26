'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

const fieldClass =
  'w-full bg-transparent border-0 border-b border-[var(--bjhunt-border)] ' +
  'text-[var(--bjhunt-text)] text-[14px] font-normal py-3 px-0 outline-none ' +
  'min-h-[44px] md:min-h-[40px] transition-colors ' +
  'focus:border-[var(--success)] placeholder:text-[var(--bjhunt-text-subtle)] ' +
  '[font-family:var(--bjhunt-font-sans)]'

const labelClass =
  'block mb-2 [font-family:var(--bjhunt-font-mono)] text-[12px] font-semibold ' +
  'uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]'

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
      setError(isFr ? 'Lien de réinitialisation invalide.' : 'Invalid reset link.')
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
          setError(isFr ? 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.' : 'This link is invalid or expired. Request a new link.')
        } else if (code === 'PASSWORD_TOO_SHORT') {
          setError(isFr ? 'Utilisez au moins 14 caractères.' : 'Use at least 14 characters.')
        } else if (code === 'PASSWORD_TOO_WEAK') {
          setError(isFr ? 'Choisissez un mot de passe plus unique.' : 'Choose a more unique password.')
        } else {
          setError(isFr ? 'Échec de la réinitialisation.' : 'Reset failed.')
        }
        return
      }
      setSuccess(true)
    } catch {
      setError(isFr ? 'Erreur réseau. Réessayez.' : 'Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="mb-10 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5" aria-label="BJHUNT">
            <LogoSymbol size={22} />
            <LogoWordmark />
          </Link>
        </div>

        <div
          className="px-6 md:px-8 py-8 md:w-[420px] md:mx-auto"
          style={{
            border: '1px solid var(--bjhunt-border)',
            background: 'var(--bjhunt-bg-secondary)',
          }}
        >
          <p
            className="m-0 mb-4 [font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
            style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
          >
            {isFr ? 'Nouveau mot de passe' : 'New password'}
          </p>
          <h1
            className="m-0 mb-3 font-normal"
            style={{
              fontFamily: 'var(--bjhunt-font-sans)',
              fontSize: 28,
              letterSpacing: '-0.025em',
              lineHeight: 1.11,
            }}
          >
            {isFr ? 'Réinitialiser' : 'Reset password'}
          </h1>
          <p
            className="m-0 mb-8 font-normal"
            style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--bjhunt-text-muted)' }}
          >
            {isFr ? 'Choisissez votre nouveau mot de passe.' : 'Choose your new password.'}
          </p>

          {success ? (
            <div className="flex flex-col gap-6">
              <div
                role="status"
                aria-live="polite"
                className="px-4 py-3 text-[13px] font-normal"
                style={{
                  border: '1px solid var(--success)',
                  background: 'var(--success-dim)',
                  color: 'var(--success)',
                }}
              >
                {isFr ? 'Mot de passe réinitialisé avec succès.' : 'Password reset successfully.'}
              </div>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 px-5 [font-family:var(--bjhunt-font-mono)] uppercase tracking-[0.16em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bjhunt-bg-secondary)]"
                style={{
                  fontSize: 12,
                  color: 'var(--success)',
                  border: '1px solid var(--success)',
                  background: 'transparent',
                  minHeight: 44,
                }}
              >
                {isFr ? 'Se connecter' : 'Sign in'}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
              <div>
                <label htmlFor="newPassword" className={labelClass}>
                  {isFr ? 'Nouveau mot de passe' : 'New password'}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                  placeholder={isFr ? '14 caractères minimum' : '14 characters minimum'}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  {isFr ? 'Confirmer' : 'Confirm'}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                  placeholder={isFr ? 'Retapez le mot de passe' : 'Re-enter password'}
                  className={fieldClass}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  id="form-error"
                  className="px-4 py-3 text-[13px] font-normal"
                  style={{
                    border: '1px solid var(--severity-critical)',
                    background: 'var(--severity-critical-bg)',
                    color: 'var(--severity-critical)',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-describedby={error ? 'form-error' : undefined}
                className="inline-flex w-full items-center justify-center gap-2 mt-2 px-5 font-medium uppercase tracking-[0.16em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bjhunt-bg-secondary)]"
                style={{
                  fontSize: 12,
                  color: 'var(--success)',
                  border: '1px solid var(--success)',
                  background: 'transparent',
                  minHeight: 44,
                  fontFamily: 'var(--bjhunt-font-mono)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = 'var(--success-dim)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? (isFr ? 'Réinitialisation…' : 'Resetting…') : isFr ? 'Réinitialiser' : 'Reset password'}
              </button>
            </form>
          )}

          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: '1px solid var(--bjhunt-border)' }}
          >
            <Link
              href="/login"
              className="[font-family:var(--bjhunt-font-mono)] uppercase transition-colors hover:text-[var(--bjhunt-text)]"
              style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
            >
              {isFr ? '← Retour à la connexion' : '← Back to sign in'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
