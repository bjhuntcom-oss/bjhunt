'use client'

import { useEffect, useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, Check, AlertTriangle } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

type State = 'verifying' | 'success' | 'error' | 'no-token'

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
      // backend always returns 200 to avoid enumeration; ignore
      setResendSent(true)
    } finally {
      setResending(false)
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
          {state === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              <p className="text-sm text-[var(--text-muted)]">
                {isFr ? 'Vérification en cours…' : 'Verifying your email…'}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Check className="h-7 w-7 text-emerald-400" />
              <h1 className="text-base font-semibold text-white">
                {isFr ? 'Email vérifié' : 'Email verified'}
              </h1>
              <p className="text-sm text-[var(--text-muted)] text-center">
                {isFr ? 'Redirection vers le dashboard…' : 'Redirecting to your dashboard…'}
              </p>
            </div>
          )}

          {(state === 'error' || state === 'no-token') && (
            <>
              <div className="flex items-center gap-2 mb-4 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                <h1 className="text-base font-semibold text-white">
                  {state === 'no-token'
                    ? isFr
                      ? 'Lien invalide'
                      : 'Invalid link'
                    : isFr
                    ? 'Vérification impossible'
                    : 'Verification failed'}
                </h1>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                {state === 'no-token'
                  ? isFr
                    ? 'Aucun token fourni. Vérifiez le lien dans votre email.'
                    : 'No token provided. Check the link in your email.'
                  : errorMessage === 'INVALID_TOKEN'
                  ? isFr
                    ? 'Lien expiré ou déjà utilisé. Demandez un nouvel email ci-dessous.'
                    : 'Link expired or already used. Request a fresh one below.'
                  : isFr
                  ? `Erreur : ${errorMessage}.`
                  : `Error: ${errorMessage}.`}
              </p>

              {!resendSent ? (
                <form onSubmit={submitResend} className="flex flex-col gap-3">
                  <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block">
                    {isFr ? 'Renvoyer le lien à' : 'Resend link to'}
                  </label>
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                  />
                  <button
                    type="submit"
                    disabled={resending}
                    className="inline-flex w-full items-center justify-center gap-2 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90 disabled:opacity-60"
                  >
                    {resending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isFr ? 'Renvoyer' : 'Resend'}
                  </button>
                </form>
              ) : (
                <div className="border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {isFr
                    ? 'Si un compte non vérifié existe pour cette adresse, un nouveau lien a été envoyé.'
                    : 'If an unverified account exists for that email, a fresh link has been sent.'}
                </div>
              )}

              <p className="text-xs text-[var(--text-muted)] mt-6 text-center">
                <Link href="/login" className="underline hover:text-white">
                  {isFr ? 'Retour à la connexion' : 'Back to sign in'}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
