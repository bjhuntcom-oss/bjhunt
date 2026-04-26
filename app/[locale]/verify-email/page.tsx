'use client'

import { useEffect, useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, Check, AlertTriangle } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

type State = 'verifying' | 'success' | 'error' | 'no-token'

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
          {state === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--bjhunt-text-muted)' }} />
              <p
                className="m-0 font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: '0.28em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? 'Vérification en cours…' : 'Verifying your email…'}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Check className="h-7 w-7" style={{ color: '#30D158' }} />
              <h1 style={{ fontSize: 28, fontWeight: 200, letterSpacing: '-0.02em', margin: 0 }}>
                {isFr ? 'Email vérifié.' : 'Email verified.'}
              </h1>
              <p
                className="m-0 font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.28em', color: 'var(--bjhunt-text-subtle)' }}
              >
                {isFr ? 'Redirection vers le dashboard…' : 'Redirecting to your dashboard…'}
              </p>
            </div>
          )}

          {(state === 'error' || state === 'no-token') && (
            <>
              <div className="mb-5 flex items-center gap-3" style={{ color: '#FF9F0A' }}>
                <AlertTriangle className="h-4 w-4" />
                <p
                  className="m-0 font-mono uppercase"
                  style={{ fontSize: 10, letterSpacing: '0.32em' }}
                >
                  {state === 'no-token'
                    ? isFr ? 'Lien invalide' : 'Invalid link'
                    : isFr ? 'Vérification impossible' : 'Verification failed'}
                </p>
              </div>
              <h1
                className="m-0 mb-3"
                style={{ fontSize: 28, fontWeight: 200, letterSpacing: '-0.02em' }}
              >
                {isFr ? 'Demander un nouveau lien.' : 'Request a fresh link.'}
              </h1>
              <p
                className="m-0 mb-7"
                style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.55, color: 'var(--bjhunt-text-muted)' }}
              >
                {state === 'no-token'
                  ? isFr ? 'Aucun token fourni. Vérifiez le lien dans votre email.' : 'No token provided. Check the link in your email.'
                  : errorMessage === 'INVALID_TOKEN'
                  ? isFr ? 'Lien expiré ou déjà utilisé.' : 'Link expired or already used.'
                  : isFr ? `Erreur : ${errorMessage}.` : `Error: ${errorMessage}.`}
              </p>

              {!resendSent ? (
                <form onSubmit={submitResend} className="flex flex-col gap-7">
                  <div>
                    <label style={LABEL_STYLE}>{isFr ? 'Renvoyer le lien à' : 'Resend link to'}</label>
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={FIELD_STYLE}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resending}
                    className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-mono uppercase disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.22em',
                      color: 'var(--bjhunt-text)',
                      border: '1px solid var(--bjhunt-border-strong)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isFr ? 'Renvoyer →' : 'Resend →'}
                  </button>
                </form>
              ) : (
                <div
                  className="px-4 py-3 text-[12px]"
                  style={{
                    border: '1px solid rgba(48,209,88,0.30)',
                    background: 'rgba(48,209,88,0.06)',
                    color: '#7CE8A0',
                    fontWeight: 300,
                  }}
                >
                  {isFr
                    ? "Si un compte non vérifié existe pour cette adresse, un nouveau lien a été envoyé."
                    : 'If an unverified account exists for that email, a fresh link has been sent.'}
                </div>
              )}

              <div
                className="mt-9 pt-7 text-center"
                style={{ borderTop: '1px solid var(--bjhunt-border)' }}
              >
                <Link
                  href="/login"
                  className="font-mono uppercase transition-colors hover:text-white"
                  style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-subtle)' }}
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
