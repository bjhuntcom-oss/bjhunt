'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams } from 'next/navigation'
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
            Reset
          </p>
          <h1 className="m-0 mb-3" style={{ fontSize: 32, fontWeight: 200, letterSpacing: '-0.02em' }}>
            {isFr ? 'Mot de passe oublié.' : 'Forgot password.'}
          </h1>
          <p
            className="m-0 mb-9"
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.55, color: 'var(--bjhunt-text-muted)' }}
          >
            {isFr
              ? 'Entrez votre email pour recevoir un lien de réinitialisation.'
              : 'Enter your email to receive a reset link.'}
          </p>

          {sent ? (
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
                ? "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."
                : 'If an account exists with this email, a reset link has been sent.'}
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-7">
              <div>
                <label style={LABEL_STYLE}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
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
                {loading ? (isFr ? 'Envoi…' : 'Sending…') : isFr ? 'Envoyer le lien →' : 'Send reset link →'}
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
