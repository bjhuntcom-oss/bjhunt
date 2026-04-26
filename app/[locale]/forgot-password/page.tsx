'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams } from 'next/navigation'
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

export default function ForgotPasswordPage() {
  const params = useParams<{ locale: string }>()
  const locale = params.locale
  const isFr = locale === 'fr'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await browserBackendFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        throw new Error('REQUEST_FAILED')
      }
      setSent(true)
    } catch {
      setError(isFr ? "Impossible d'envoyer le lien. Réessayez." : 'Unable to send reset link. Try again.')
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
            {isFr ? 'Réinitialisation' : 'Reset'}
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
            {isFr ? 'Mot de passe oublié' : 'Forgot password'}
          </h1>
          <p
            className="m-0 mb-8 font-normal"
            style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--bjhunt-text-muted)' }}
          >
            {isFr
              ? 'Entrez votre email pour recevoir un lien de réinitialisation.'
              : 'Enter your email to receive a reset link.'}
          </p>

          {sent ? (
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
              {isFr
                ? "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."
                : 'If an account exists with this email, a reset link has been sent.'}
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
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
                {loading ? (isFr ? 'Envoi…' : 'Sending…') : isFr ? 'Envoyer le lien' : 'Send reset link'}
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
