'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? ''

const fieldClass =
  'w-full bg-transparent border-0 border-b border-[var(--bjhunt-border)] ' +
  'text-[var(--bjhunt-text)] text-[14px] font-normal py-3 px-0 outline-none ' +
  'min-h-[44px] md:min-h-[40px] transition-colors ' +
  'focus:border-[var(--success)] placeholder:text-[var(--bjhunt-text-subtle)] ' +
  '[font-family:var(--bjhunt-font-sans)]'

const labelClass =
  'block mb-2 [font-family:var(--bjhunt-font-mono)] text-[12px] font-semibold ' +
  'uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]'

export default function BetaPage() {
  const { locale } = useParams<{ locale: string }>()
  const searchParams = useSearchParams()
  const isFr = locale === 'fr'
  const justRegistered = searchParams.get('registered') === 'true'

  const [formData, setFormData] = useState({ name: '', email: '', company: '', role: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(justRegistered)
  const [error, setError] = useState('')
  const [betaCount, setBetaCount] = useState<number | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<HCaptcha>(null)
  const BETA_LIMIT = 100

  useEffect(() => {
    const loadBetaCount = async () => {
      try {
        const response = await fetch('/api/beta', { cache: 'no-store' })
        if (!response.ok) {
          setBetaCount(null)
          return
        }
        const data = await response.json()
        setBetaCount(typeof (data as { count?: unknown }).count === 'number' ? (data as { count: number }).count : null)
      } catch {
        setBetaCount(null)
      }
    }
    loadBetaCount()
  }, [])

  const spotsLeft = betaCount !== null ? Math.max(0, BETA_LIMIT - betaCount) : null
  const progress = betaCount !== null ? Math.min(100, Math.round((betaCount / BETA_LIMIT) * 100)) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (HCAPTCHA_SITEKEY && !captchaToken) {
      setError(isFr ? 'Veuillez valider le captcha.' : 'Please solve the captcha.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, captchaToken }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        captchaRef.current?.resetCaptcha()
        setCaptchaToken('')
        throw new Error(payload.error || 'Failed to submit')
      }
      setSubmitted(true)
      if (betaCount !== null) setBetaCount(betaCount + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="relative min-h-screen pt-20">
        <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center">
          <div
            className="mx-auto mb-8 flex h-16 w-16 items-center justify-center"
            style={{ border: '1px solid var(--success)' }}
          >
            <Check className="h-7 w-7" style={{ color: 'var(--success)' }} />
          </div>
          <h1
            className="m-0 mb-4 font-normal"
            style={{
              fontFamily: 'var(--bjhunt-font-sans)',
              fontSize: 'clamp(28px, 3vw, 36px)',
              letterSpacing: '-0.025em',
              lineHeight: 1.11,
            }}
          >
            {isFr ? 'Demande enregistrée' : 'Request registered'}
          </h1>
          <p
            className="m-0 mb-10 mx-auto max-w-md font-normal"
            style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--bjhunt-text-muted)' }}
          >
            {isFr
              ? 'Nous sommes en phase beta fermée. Vous serez notifié par email dès que la plateforme sera pleinement opérationnelle.'
              : 'We are currently in closed beta. You will be notified as soon as the platform is fully operational.'}
          </p>
          {betaCount !== null && (
            <div
              className="mx-auto mb-10 max-w-sm p-5"
              style={{
                border: '1px solid var(--bjhunt-border)',
                background: 'var(--bjhunt-bg-secondary)',
              }}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span
                  className="[font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
                  style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
                >
                  {isFr ? 'Places beta' : 'Beta spots'}
                </span>
                <span
                  className="[font-family:var(--bjhunt-font-mono)] font-normal"
                  style={{ fontSize: 13, color: 'var(--bjhunt-text)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {betaCount}/{BETA_LIMIT}
                </span>
              </div>
              <div className="h-px overflow-hidden" style={{ background: 'var(--bjhunt-border)' }}>
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: 'var(--success)' }}
                />
              </div>
              <p
                className="mt-3 m-0 [font-family:var(--bjhunt-font-mono)] flex items-center gap-2 justify-center"
                style={{ fontSize: 12, color: 'var(--bjhunt-text-muted)' }}
              >
                <span
                  aria-hidden
                  className="inline-block rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: 'var(--success)',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--bjhunt-text)' }}>
                  {spotsLeft !== null && spotsLeft > 0
                    ? isFr ? `${spotsLeft} places restantes` : `${spotsLeft} spots remaining`
                    : isFr ? "Liste d'attente active" : 'Waitlist active'}
                </span>
              </p>
            </div>
          )}
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 [font-family:var(--bjhunt-font-mono)] uppercase transition-colors hover:text-[var(--bjhunt-text)]"
            style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            {isFr ? "Retour à l'accueil" : 'Back to home'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative pt-14">
      {/* Hero — eyebrow + H1 + Body */}
      <header className="relative z-10 mx-auto max-w-4xl px-6 md:px-12 py-16 md:py-20">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p
            className="m-0 [font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
            style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
          >
            07 / Early access
          </p>
          <span
            className="[font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
            style={{
              fontSize: 12,
              letterSpacing: '0.18em',
              padding: '4px 10px',
              color: 'var(--warning)',
              border: '1px solid var(--warning)',
              background: 'var(--warning-dim)',
            }}
          >
            {isFr ? 'Places limitées' : 'Limited seats'}
          </span>
        </div>
        <h1
          className="m-0 max-w-3xl font-normal"
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 'clamp(28px, 3vw, 36px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.11,
          }}
        >
          {isFr ? 'Rejoignez la Beta' : 'Join the Beta'}
          <em className="not-italic" style={{ color: 'var(--bjhunt-text-muted)' }}>.</em>
        </h1>
        <p
          className="mt-6 max-w-xl font-normal"
          style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--bjhunt-text-muted)' }}
        >
          {isFr
            ? 'Accès prioritaire aux nouvelles fonctionnalités, support direct de l’équipe fondatrice.'
            : 'Priority access to new features, direct support from the founding team.'}
        </p>
      </header>

      {/* Form card */}
      <div className="relative z-10 mx-auto max-w-2xl px-6 pb-20">
        {betaCount !== null && (
          <div
            className="mb-10 p-5"
            style={{
              border: '1px solid var(--bjhunt-border)',
              background: 'var(--bjhunt-bg-secondary)',
            }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <span
                className="[font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-muted)' }}
              >
                {isFr ? 'Progression beta' : 'Beta progress'}
              </span>
              <span
                className="[font-family:var(--bjhunt-font-mono)] font-normal"
                style={{ fontSize: 14, color: 'var(--bjhunt-text)', fontVariantNumeric: 'tabular-nums' }}
              >
                {betaCount}
                <span style={{ color: 'var(--bjhunt-text-disabled)' }}>/{BETA_LIMIT}</span>
              </span>
            </div>
            <div className="h-px overflow-hidden" style={{ background: 'var(--bjhunt-border)' }}>
              <div
                className="h-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%`, background: 'var(--success)' }}
              />
            </div>
            <p className="mt-3 m-0 flex items-center gap-2" style={{ fontSize: 13 }}>
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: 'var(--success)',
                }}
              />
              <span style={{ color: 'var(--bjhunt-text)' }}>
                {spotsLeft !== null && spotsLeft > 0
                  ? isFr ? `${spotsLeft} places restantes sur ${BETA_LIMIT}` : `${spotsLeft} spots remaining out of ${BETA_LIMIT}`
                  : isFr ? "Liste d'attente — vous serez notifié" : 'Waitlist — you will be notified'}
              </span>
            </p>
          </div>
        )}

        <ul className="m-0 mb-10 flex flex-col gap-3 p-0 list-none">
          {[
            isFr ? 'Scans illimités pendant la Beta' : 'Unlimited scans during Beta',
            isFr ? 'Accès API complet' : 'Full API access',
            isFr ? 'Rapport de vulnérabilités PDF' : 'PDF vulnerability report',
            isFr ? "Support direct de l'équipe fondatrice" : 'Direct support from the founding team',
          ].map((item) => (
            <li
              key={item}
              className="flex items-baseline gap-3 font-normal"
              style={{
                fontSize: 14,
                color: 'var(--bjhunt-text-muted)',
                lineHeight: 1.5,
              }}
            >
              <span
                aria-hidden
                className="[font-family:var(--bjhunt-font-mono)] flex-shrink-0"
                style={{ fontSize: 12, color: 'var(--bjhunt-text-disabled)' }}
              >
                ─
              </span>
              {item}
            </li>
          ))}
        </ul>

        <div
          className="px-6 md:px-8 py-8"
          style={{
            border: '1px solid var(--bjhunt-border)',
            background: 'var(--bjhunt-bg-secondary)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="beta-name" className={labelClass}>{isFr ? 'Nom complet' : 'Full name'} *</label>
                <input
                  id="beta-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isFr ? 'Jean Dupont' : 'John Doe'}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="beta-email" className={labelClass}>{isFr ? 'Email professionnel' : 'Professional email'} *</label>
                <input
                  id="beta-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={isFr ? 'jean@entreprise.com' : 'john@company.com'}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="beta-company" className={labelClass}>
                {isFr ? 'Entreprise' : 'Company'}{' '}
                <span style={{ color: 'var(--bjhunt-text-disabled)' }}>
                  ({isFr ? 'optionnel' : 'optional'})
                </span>
              </label>
              <input
                id="beta-company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder={isFr ? 'Nom de votre entreprise' : 'Your company name'}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="beta-role" className={labelClass}>
                {isFr ? 'Pourquoi rejoindre la beta ?' : 'Why join the beta?'} *
              </label>
              <textarea
                id="beta-role"
                required
                rows={4}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder={isFr ? 'Ex: Je suis pentester et je veux tester vos outils...' : "Ex: I'm a pentester and want to test your tools..."}
                className={`${fieldClass} resize-y leading-relaxed`}
              />
            </div>

            {HCAPTCHA_SITEKEY ? (
              <div className="pt-2 overflow-x-auto">
                <HCaptcha
                  sitekey={HCAPTCHA_SITEKEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken('')}
                  onError={() => setCaptchaToken('')}
                  ref={captchaRef}
                  theme="dark"
                />
              </div>
            ) : (
              <p
                className="m-0 [font-family:var(--bjhunt-font-mono)] uppercase italic font-medium"
                style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--bjhunt-text-disabled)' }}
              >
                {isFr ? 'Captcha désactivé en développement.' : 'Captcha disabled in development.'}
              </p>
            )}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                id="beta-error"
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
              disabled={submitting}
              aria-describedby={error ? 'beta-error' : undefined}
              className="inline-flex w-full items-center justify-center gap-3 mt-2 px-5 font-medium uppercase tracking-[0.16em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bjhunt-bg-secondary)]"
              style={{
                fontSize: 12,
                color: 'var(--success)',
                border: '1px solid var(--success)',
                background: 'transparent',
                minHeight: 44,
                fontFamily: 'var(--bjhunt-font-mono)',
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.background = 'var(--success-dim)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {submitting
                ? (isFr ? 'Envoi…' : 'Submitting…')
                : (isFr ? "Demander l'accès" : 'Request access')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
