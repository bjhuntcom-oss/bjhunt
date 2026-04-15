'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { loginAction, registerAction } from '@/app/actions/auth'

type Mode = 'login' | 'register'

function normalizeRedirectTarget(value: string | null, locale: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return `/${locale}/dashboard`
  }

  try {
    const redirectUrl = new URL(value, 'https://www.bjhunt.com')
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
  } catch {
    return `/${locale}/dashboard`
  }
}

export default function LoginPage() {
  const params = useParams<{ locale: string }>()
  const searchParams = useSearchParams()
  const locale = params.locale
  const isFr = locale === 'fr'
  const redirectTo = normalizeRedirectTarget(searchParams.get('redirect'), locale)

  const [mode, setMode] = useState<Mode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        await loginAction(email, password)
      } else {
        await registerAction(email, password, displayName)
      }

      window.location.assign(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AUTH_FAILED'
      if (message === 'EMAIL_ALREADY_IN_USE') {
        setError(isFr ? 'Cet email est deja utilise.' : 'This email is already in use.')
      } else if (message === 'INVALID_CREDENTIALS') {
        setError(isFr ? 'Identifiants invalides.' : 'Invalid credentials.')
      } else if (message === 'PASSWORD_TOO_SHORT') {
        setError(
          isFr
            ? 'Utilisez une passphrase d au moins 14 caracteres.'
            : 'Use a passphrase of at least 14 characters.'
        )
      } else if (message === 'PASSWORD_TOO_WEAK') {
        setError(
          isFr
            ? 'Choisissez une passphrase plus unique et non liee a votre identite.'
            : 'Choose a more unique passphrase that is not tied to your identity.'
        )
      } else if (message.startsWith('AUTH_RATE_LIMITED')) {
        setError(
          isFr
            ? 'Trop de tentatives. Reessayez dans quelques minutes.'
            : 'Too many attempts. Try again in a few minutes.'
        )
      } else {
        setError(
          isFr
            ? 'Connexion impossible pour le moment.'
            : 'Unable to complete authentication right now.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Grille background */}
      <div className="bg-grid absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <LogoSymbol size={22} />
            <LogoWordmark />
          </Link>
        </div>

        {/* Carte */}
        <div className="border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <h1 className="text-xl font-black mb-1 tracking-tight">
            {mode === 'login'
              ? isFr ? 'Connexion' : 'Sign in'
              : isFr ? 'Créer un compte' : 'Create account'}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mb-8">
            {isFr ? 'Accédez à votre espace BJHUNT' : 'Access your BJHUNT workspace'}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
                  {isFr ? 'Nom affiché' : 'Display name'}
                </label>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                  placeholder="Alice Martin"
                />
              </div>
            )}

            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
                {isFr ? 'Mot de passe' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === 'register' ? 14 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                placeholder={
                  mode === 'register'
                    ? isFr ? '14 caractères minimum' : '14 characters minimum'
                    : isFr ? 'Votre mot de passe' : 'Your password'
                }
              />
            </div>

            {mode === 'login' && (
              <div className="text-right -mt-2">
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  {isFr ? 'Mot de passe oublie ?' : 'Forgot password?'}
                </Link>
              </div>
            )}

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
                ? isFr ? 'Connexion...' : 'Signing in...'
                : mode === 'login'
                  ? isFr ? 'Se connecter' : 'Sign in'
                  : isFr ? 'Créer et démarrer' : 'Create and launch'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
            {mode === 'login' ? (
              <span className="text-[10px] text-[var(--text-muted)]">
                {isFr ? 'Première connexion ? ' : 'First time here? '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-white hover:underline underline-offset-2"
                >
                  {isFr ? 'Créer un compte' : 'Create an account'}
                </button>
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-muted)]">
                {isFr ? 'Déjà inscrit ? ' : 'Already registered? '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-white hover:underline underline-offset-2"
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
