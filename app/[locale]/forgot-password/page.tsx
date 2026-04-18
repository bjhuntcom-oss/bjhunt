'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'

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
      setError(
        isFr
          ? "Impossible d'envoyer le lien. Reessayez."
          : 'Unable to send reset link. Try again.'
      )
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
            {isFr ? 'Mot de passe oublie' : 'Forgot password'}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mb-8">
            {isFr
              ? 'Entrez votre email pour recevoir un lien de reinitialisation.'
              : 'Enter your email to receive a reset link.'}
          </p>

          {sent ? (
            <div className="border border-[var(--success)]/25 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
              {isFr
                ? 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.'
                : 'If an account exists with this email, a reset link has been sent.'}
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                  placeholder="you@company.com"
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
                  ? isFr ? 'Envoi...' : 'Sending...'
                  : isFr ? 'Envoyer le lien' : 'Send reset link'}
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
