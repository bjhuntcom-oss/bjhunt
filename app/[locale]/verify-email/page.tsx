'use client'

import { useEffect, useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, Check, AlertTriangle } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

type State = 'verifying' | 'success' | 'error' | 'no-token'

const fieldClass =
  'w-full bg-transparent border-0 border-b border-[var(--bjhunt-border)] ' +
  'text-[var(--bjhunt-text)] text-[14px] font-normal py-3 px-0 outline-none ' +
  'min-h-[44px] md:min-h-[40px] transition-colors ' +
  'focus:border-[var(--success)] placeholder:text-[var(--bjhunt-text-subtle)] ' +
  '[font-family:var(--bjhunt-font-sans)]'

const labelClass =
  'block mb-2 [font-family:var(--bjhunt-font-mono)] text-[12px] font-semibold ' +
  'uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]'

export default function VerifyEmailPage() {
  const params = useParams<{ locale: string }>()
  const search = useSearchParams()
  const locale = params.locale
  const isFr = locale === 'fr'
  const token = search.get('token')

  const [state, setState] = useState<State>(token ? 'verifying' : 'no-token')
  const [errorMessage, setErrorMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await browserBackendFetch('/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        })
        if (cancelled) return
        if (res.ok) {
          setState('success')
          setTimeout(() => {
            window.location.assign(`/${locale}/dashboard`)
          }, 1500)
        } else {
          const body = await res.json().catch(() => ({}))
          setErrorMessage(body?.error?.code ?? `HTTP ${res.status}`)
          setState('error')
        }
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : 'NETWORK_ERROR')
        setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, locale])

  const submitResend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResending(true)
    try {
      await browserBackendFetch('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail }),
      })
      setResendSent(true)
    } catch {
      setResendSent(true)
    } finally {
      setResending(false)
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
          {state === 'verifying' && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-4 py-8"
            >
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--bjhunt-text-muted)' }} />
              <p
                className="m-0 [font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? 'Vérification en cours…' : 'Verifying your email…'}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Check className="h-7 w-7" style={{ color: 'var(--success)' }} />
              <h1
                className="m-0 font-normal"
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontSize: 28,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.11,
                }}
              >
                {isFr ? 'Email vérifié' : 'Email verified'}
              </h1>
              <p
                className="m-0 [font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? 'Redirection vers le dashboard…' : 'Redirecting to your dashboard…'}
              </p>
            </div>
          )}

          {(state === 'error' || state === 'no-token') && (
            <>
              <div className="mb-4 flex items-center gap-3" style={{ color: 'var(--severity-high)' }}>
                <AlertTriangle className="h-4 w-4" />
                <p
                  className="m-0 [font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
                  style={{ fontSize: 12, letterSpacing: '0.18em' }}
                >
                  {state === 'no-token'
                    ? isFr ? 'Lien invalide' : 'Invalid link'
                    : isFr ? 'Vérification impossible' : 'Verification failed'}
                </p>
              </div>
              <h1
                className="m-0 mb-3 font-normal"
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontSize: 28,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.11,
                }}
              >
                {isFr ? 'Demander un nouveau lien' : 'Request a fresh link'}
              </h1>
              <p
                className="m-0 mb-7 font-normal"
                style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--bjhunt-text-muted)' }}
              >
                {state === 'no-token'
                  ? isFr ? 'Aucun token fourni. Vérifiez le lien dans votre email.' : 'No token provided. Check the link in your email.'
                  : errorMessage === 'INVALID_TOKEN'
                  ? isFr ? 'Lien expiré ou déjà utilisé.' : 'Link expired or already used.'
                  : isFr ? `Erreur : ${errorMessage}.` : `Error: ${errorMessage}.`}
              </p>

              {!resendSent ? (
                <form onSubmit={submitResend} className="flex flex-col gap-6" noValidate>
                  <div>
                    <label htmlFor="resendEmail" className={labelClass}>
                      {isFr ? 'Renvoyer le lien à' : 'Resend link to'}
                    </label>
                    <input
                      id="resendEmail"
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resending}
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
                      if (!resending) e.currentTarget.style.background = 'var(--success-dim)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isFr ? 'Renvoyer' : 'Resend'}
                  </button>
                </form>
              ) : (
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
                    ? "Si un compte non vérifié existe pour cette adresse, un nouveau lien a été envoyé."
                    : 'If an unverified account exists for that email, a fresh link has been sent.'}
                </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
