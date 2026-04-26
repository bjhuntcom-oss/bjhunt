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

// W8 minimal field — bottom-border style on transparent bg.
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
  fontFamily: 'var(--bjhunt-font-sans)',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  marginBottom: 8,
  fontFamily: 'var(--bjhunt-font-mono)',
  fontSize: 9,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: 'var(--bjhunt-text-subtle)',
  fontWeight: 400,
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

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.07), transparent 55%),'
            + 'radial-gradient(ellipse 40% 40% at 50% 100%, rgba(100,210,255,0.03), transparent 55%)',
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
            {isTwoFactor ? '2FA' : mode === 'login' ? 'Sign in' : 'Create account'}
          </p>
          <h1
            className="m-0 mb-3"
            style={{ fontSize: 36, fontWeight: 200, letterSpacing: '-0.02em', lineHeight: 1.0 }}
          >
            {isTwoFactor
              ? isFr ? 'Vérification.' : 'Verify.'
              : mode === 'login'
              ? isFr ? 'Bienvenue.' : 'Welcome back.'
              : isFr ? 'Créer un compte.' : 'Create account.'}
          </h1>
          <p
            className="m-0 mb-9"
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.55, color: 'var(--bjhunt-text-muted)' }}
          >
            {isTwoFactor
              ? isFr ? 'Entrez le code de votre application authentificateur.' : 'Enter the code from your authenticator app.'
              : isFr ? 'Accédez à votre espace BJHUNT.' : 'Access your BJHUNT workspace.'}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-7">
            {mode === 'register' && !isTwoFactor && (
              <div>
                <label style={LABEL_STYLE}>{isFr ? 'Nom affiché' : 'Display name'}</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Alice Martin"
                  style={FIELD_STYLE}
                />
              </div>
            )}

            {!isTwoFactor && (
              <>
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
                <div>
                  <label style={LABEL_STYLE}>{isFr ? 'Mot de passe' : 'Password'}</label>
                  <input
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
                    style={FIELD_STYLE}
                  />
                </div>
              </>
            )}

            {isTwoFactor && (
              <div>
                <label style={LABEL_STYLE}>{isFr ? 'Code 2FA' : '2FA code'}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  placeholder="123456"
                  style={{ ...FIELD_STYLE, fontFamily: 'var(--bjhunt-font-mono)', letterSpacing: '0.4em', fontSize: 18 }}
                />
              </div>
            )}

            {mode === 'login' && !isTwoFactor && (
              <div className="-mt-3 text-right">
                <Link
                  href="/forgot-password"
                  className="font-mono uppercase transition-colors hover:text-white"
                  style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-subtle)' }}
                >
                  {isFr ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </Link>
              </div>
            )}

            {error && (
              <div
                className="px-4 py-3 text-[12px]"
                style={{
                  border: '1px solid rgba(255,69,58,0.30)',
                  background: 'rgba(255,69,58,0.06)',
                  color: '#FF8A82',
                  fontWeight: 300,
                }}
              >
                {error}
              </div>
            )}

            {info && (
              <div
                className="px-4 py-3 text-[12px]"
                style={{
                  border: '1px solid rgba(48,209,88,0.30)',
                  background: 'rgba(48,209,88,0.06)',
                  color: '#7CE8A0',
                  fontWeight: 300,
                }}
              >
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-mono uppercase transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                fontSize: 11,
                letterSpacing: '0.22em',
                color: 'var(--bjhunt-text)',
                border: '1px solid var(--bjhunt-border-strong)',
                background: 'rgba(255,255,255,0.03)',
                marginTop: 8,
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
                  ? isFr ? 'Se connecter →' : 'Sign in →'
                  : isFr ? 'Créer et démarrer →' : 'Create and launch →'}
            </button>
          </form>

          <div
            className="mt-9 pt-7 text-center"
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
                className="font-mono uppercase transition-colors hover:text-white"
                style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-subtle)' }}
              >
                {isFr ? '← Retour à la connexion' : '← Back to sign in'}
              </button>
            ) : mode === 'login' ? (
              <span style={{ fontSize: 11, color: 'var(--bjhunt-text-muted)', fontWeight: 300 }}>
                {isFr ? 'Première connexion ? ' : 'First time here? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError('')
                  }}
                  className="hover:underline"
                  style={{ color: 'var(--bjhunt-text)', fontWeight: 400 }}
                >
                  {isFr ? 'Créer un compte' : 'Create an account'}
                </button>
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--bjhunt-text-muted)', fontWeight: 300 }}>
                {isFr ? 'Déjà inscrit ? ' : 'Already registered? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                  className="hover:underline"
                  style={{ color: 'var(--bjhunt-text)', fontWeight: 400 }}
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </button>
              </span>
            )}
          </div>
        </div>

        <p
          className="mt-8 text-center font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.32em', color: 'var(--bjhunt-text-disabled)' }}
        >
          BJHUNT · Secured by design
        </p>
      </div>
    </div>
  )
}
