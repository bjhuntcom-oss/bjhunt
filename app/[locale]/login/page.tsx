'use client'

import { useState } from 'react'
import { LogoSymbol, LogoWordmark } from '@/components/ui/logo'
import { Link } from '@/i18n/routing'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { loginAction, registerAction, verifyTwoFactorAction } from '@/app/actions/auth'

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

// 2026 spec: bottom-border on transparent background, min-h 44px (touch target)
const fieldClass =
  'w-full bg-transparent border-0 border-b border-[var(--bjhunt-border)] ' +
  'text-[var(--bjhunt-text)] text-[14px] font-normal py-3 px-0 outline-none ' +
  'min-h-[44px] md:min-h-[40px] transition-colors ' +
  'focus:border-[var(--success)] placeholder:text-[var(--bjhunt-text-subtle)] ' +
  '[font-family:var(--bjhunt-font-sans)]'

const labelClass =
  'block mb-2 [font-family:var(--bjhunt-font-mono)] text-[12px] font-semibold ' +
  'uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]'

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
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const isTwoFactor = mode === 'login' && Boolean(twoFactorToken)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        if (twoFactorToken) {
          await verifyTwoFactorAction(twoFactorCode, twoFactorToken)
        } else {
          const result = await loginAction(email, password)
          if (result.requiresTwoFactor) {
            setTwoFactorToken(result.tempToken)
            setPassword('')
            return
          }
        }
      } else {
        await registerAction(email, password, displayName)
        setInfo(
          isFr
            ? 'Compte créé. Un lien de vérification vient d’être envoyé à votre email — cliquez dessus pour activer votre compte.'
            : 'Account created. A verification link was just emailed to you — click it to activate your account.',
        )
        setMode('login')
        setPassword('')
        setLoading(false)
        return
      }

      window.location.assign(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AUTH_FAILED'
      if (message === 'EMAIL_ALREADY_IN_USE') {
        setError(isFr ? 'Cet email est deja utilise.' : 'This email is already in use.')
      } else if (message === 'EMAIL_NOT_VERIFIED') {
        setError(
          isFr
            ? 'Email non vérifié. Cliquez sur le lien envoyé à votre adresse pour activer le compte.'
            : 'Email not verified. Click the link in the email we sent you to activate your account.',
        )
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
      } else if (message === 'INVALID_TOTP' || message === 'Invalid verification code') {
        setError(isFr ? 'Code de verification invalide.' : 'Invalid verification code.')
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

  const eyebrow = isTwoFactor ? '2FA' : mode === 'login' ? (isFr ? 'Connexion' : 'Sign in') : (isFr ? 'Inscription' : 'Register')

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
            {eyebrow}
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
            {isTwoFactor
              ? isFr ? 'Vérification' : 'Verify'
              : mode === 'login'
              ? isFr ? 'Connexion' : 'Sign in'
              : isFr ? 'Créer un compte' : 'Create account'}
          </h1>
          <p
            className="m-0 mb-8 font-normal"
            style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--bjhunt-text-muted)' }}
          >
            {isTwoFactor
              ? isFr ? 'Entrez le code de votre application authentificateur.' : 'Enter the code from your authenticator app.'
              : isFr ? 'Accédez à votre espace BJHUNT.' : 'Access your BJHUNT workspace.'}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
            {mode === 'register' && !isTwoFactor && (
              <div>
                <label htmlFor="displayName" className={labelClass}>
                  {isFr ? 'Nom affiché' : 'Display name'}
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Alice Martin"
                  className={fieldClass}
                />
              </div>
            )}

            {!isTwoFactor && (
              <>
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
                <div>
                  <label htmlFor="password" className={labelClass}>
                    {isFr ? 'Mot de passe' : 'Password'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === 'register' ? 14 : 1}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={
                      mode === 'register'
                        ? isFr ? '14 caractères minimum' : '14 characters minimum'
                        : '••••••••••••'
                    }
                    className={fieldClass}
                  />
                </div>
              </>
            )}

            {isTwoFactor && (
              <div>
                <label htmlFor="totp" className={labelClass}>
                  {isFr ? 'Code 2FA' : '2FA code'}
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className={`${fieldClass} [font-family:var(--bjhunt-font-mono)] tracking-[0.4em] text-[18px]`}
                />
              </div>
            )}

            {mode === 'login' && !isTwoFactor && (
              <div className="-mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="[font-family:var(--bjhunt-font-mono)] uppercase transition-colors hover:text-[var(--bjhunt-text)]"
                  style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
                >
                  {isFr ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </Link>
              </div>
            )}

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

            {info && (
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
                {info}
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
              {loading
                ? isTwoFactor
                  ? isFr ? 'Vérification…' : 'Verifying…'
                  : isFr ? 'Connexion…' : 'Signing in…'
                : isTwoFactor
                  ? isFr ? 'Vérifier' : 'Verify'
                  : mode === 'login'
                  ? isFr ? 'Se connecter' : 'Sign in'
                  : isFr ? 'Créer le compte' : 'Create account'}
            </button>
          </form>

          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: '1px solid var(--bjhunt-border)' }}
          >
            {isTwoFactor ? (
              <button
                type="button"
                onClick={() => {
                  setTwoFactorToken('')
                  setTwoFactorCode('')
                  setError('')
                }}
                className="[font-family:var(--bjhunt-font-mono)] uppercase transition-colors hover:text-[var(--bjhunt-text)]"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? '← Retour à la connexion' : '← Back to sign in'}
              </button>
            ) : mode === 'login' ? (
              <span
                className="[font-family:var(--bjhunt-font-mono)] uppercase font-normal"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? 'Pas de compte ? ' : 'No account? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError('')
                  }}
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--bjhunt-text)' }}
                >
                  {isFr ? "S'inscrire" : 'Register'}
                </button>
              </span>
            ) : (
              <span
                className="[font-family:var(--bjhunt-font-mono)] uppercase font-normal"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? 'Déjà inscrit ? ' : 'Already registered? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                  className="hover:underline transition-colors"
                  style={{ color: 'var(--bjhunt-text)' }}
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </button>
              </span>
            )}
          </div>
        </div>

        <p
          className="mt-8 text-center [font-family:var(--bjhunt-font-mono)] uppercase font-medium"
          style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--bjhunt-text-disabled)' }}
        >
          BJHUNT · Secured by design
        </p>
      </div>
    </div>
  )
}
