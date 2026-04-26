'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--bjhunt-border)',
  color: 'var(--bjhunt-text)',
  padding: '12px 2px',
  fontSize: 14,
  fontWeight: 300,
  outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  marginBottom: 8,
  fontFamily: 'var(--bjhunt-font-mono)',
  fontSize: 9,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: 'var(--bjhunt-text-subtle)',
}

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
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.06), transparent 55%)',
        }}
      />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-12 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5" aria-label="BJHUNT">
            <LogoSymbol size={22} />
            <LogoWordmark />
          </Link>
        </div>

        <div
          className="px-9 py-10"
          style={{
            border: '1px solid var(--bjhunt-border)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.003))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <p
            className="m-0 mb-5 font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '0.32em', color: 'var(--bjhunt-text-subtle)' }}
          >
            New password
          </p>
          <h1 className="m-0 mb-3" style={{ fontSize: 32, fontWeight: 200, letterSpacing: '-0.02em' }}>
            {isFr ? 'Nouveau mot de passe.' : 'New password.'}
          </h1>
          <p
            className="m-0 mb-9"
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.55, color: 'var(--bjhunt-text-muted)' }}
          >
            {isFr ? 'Choisissez votre nouveau mot de passe.' : 'Choose your new password.'}
          </p>

          {success ? (
            <div className="flex flex-col gap-6">
              <div
                className="px-4 py-3 text-[12px]"
                style={{
                  border: '1px solid rgba(48,209,88,0.30)',
                  background: 'rgba(48,209,88,0.06)',
                  color: '#7CE8A0',
                  fontWeight: 300,
                }}
              >
                {isFr ? 'Mot de passe réinitialisé avec succès.' : 'Password reset successfully.'}
              </div>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-mono uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  color: 'var(--bjhunt-text)',
                  border: '1px solid var(--bjhunt-border-strong)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {isFr ? 'Se connecter →' : 'Sign in →'}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-7">
              <div>
                <label style={LABEL_STYLE}>{isFr ? 'Nouveau mot de passe' : 'New password'}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                  placeholder={isFr ? '14 caractères minimum' : '14 characters minimum'}
                  style={FIELD_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>{isFr ? 'Confirmer' : 'Confirm'}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={14}
                  autoComplete="new-password"
                  placeholder={isFr ? 'Retapez le mot de passe' : 'Re-enter password'}
                  style={FIELD_STYLE}
                />
              </div>

              {error && (
                <div
                  className="px-4 py-3 text-[12px]"
                  style={{
                    border: '1px solid rgba(255,69,58,0.30)',
                    background: 'rgba(255,69,58,0.06)',
                    color: '#FF8A82',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-mono uppercase disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  color: 'var(--bjhunt-text)',
                  border: '1px solid var(--bjhunt-border-strong)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? (isFr ? 'Réinitialisation…' : 'Resetting…') : isFr ? 'Réinitialiser →' : 'Reset password →'}
              </button>
            </form>
          )}

          <div className="mt-9 pt-7 text-center" style={{ borderTop: '1px solid var(--bjhunt-border)' }}>
            <Link
              href="/login"
              className="font-mono uppercase transition-colors hover:text-white"
              style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-subtle)' }}
            >
              {isFr ? '← Retour à la connexion' : '← Back to sign in'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
