'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? ''

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
}

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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(48,209,88,0.05), transparent 55%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-xl px-8 py-24 text-center">
          <div
            className="mx-auto mb-8 flex h-16 w-16 items-center justify-center"
            style={{ border: '1px solid rgba(48,209,88,0.40)' }}
          >
            <Check className="h-7 w-7" style={{ color: '#30D158' }} />
          </div>
          <h1
            className="m-0 mb-4"
            style={{ fontSize: 44, fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.0 }}
          >
            {isFr ? 'Demande enregistrée.' : 'Request registered.'}
          </h1>
          <p
            className="m-0 mb-10 mx-auto max-w-md"
            style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: 'var(--bjhunt-text-muted)' }}
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
                background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.003))',
              }}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.24em', color: 'var(--bjhunt-text-subtle)' }}
                >
                  {isFr ? 'Places beta' : 'Beta spots'}
                </span>
                <span className="font-mono" style={{ fontSize: 12, color: 'var(--bjhunt-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {betaCount}/{BETA_LIMIT}
                </span>
              </div>
              <div className="h-px overflow-hidden" style={{ background: 'var(--bjhunt-border)' }}>
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: 'var(--bjhunt-brand-primary)' }}
                />
              </div>
              <p
                className="mt-2.5 m-0 font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-disabled)' }}
              >
                {spotsLeft !== null && spotsLeft > 0
                  ? isFr ? `${spotsLeft} places restantes` : `${spotsLeft} spots remaining`
                  : isFr ? "Liste d'attente active" : 'Waitlist active'}
              </p>
            </div>
          )}
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 font-mono uppercase transition-colors hover:text-white"
            style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--bjhunt-text-subtle)' }}
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 80% 0%, rgba(99,102,241,0.06), transparent 55%)',
        }}
      />
      <header
        className="relative z-10 px-8 py-20 md:px-12 lg:px-16"
        style={{ borderBottom: '1px solid var(--bjhunt-border)' }}
      >
        <div className="mb-6 flex items-center gap-3">
          <p
            className="m-0 font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: '0.32em', color: 'var(--bjhunt-text-subtle)' }}
          >
            07 / Early access
          </p>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9,
              letterSpacing: '0.22em',
              padding: '4px 10px',
              color: '#FFD60A',
              border: '1px solid rgba(255,214,10,0.30)',
              background: 'rgba(255,214,10,0.08)',
            }}
          >
            {isFr ? 'Places limitées' : 'Limited seats'}
          </span>
        </div>
        <h1
          className="m-0 max-w-3xl"
          style={{
            fontSize: 'clamp(40px, 7vw, 72px)',
            fontWeight: 200,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
          }}
        >
          {isFr ? 'Rejoignez la Beta' : 'Join the Beta'}
          <em className="not-italic" style={{ color: 'var(--bjhunt-text-muted)', fontWeight: 200 }}>.</em>
        </h1>
        <p
          className="mt-6 max-w-xl"
          style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, color: 'var(--bjhunt-text-muted)' }}
        >
          {isFr
            ? 'Accès prioritaire aux nouvelles fonctionnalités, support direct de l’équipe fondatrice.'
            : 'Priority access to new features, direct support from the founding team.'}
        </p>
      </header>

      <div className="relative z-10 mx-auto max-w-xl px-8 py-20">
        {betaCount !== null && (
          <div
            className="mb-12 p-5"
            style={{
              border: '1px solid var(--bjhunt-border)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.003))',
            }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <span
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: '0.28em', color: 'var(--bjhunt-text-subtle)' }}
              >
                {isFr ? 'Progression beta' : 'Beta progress'}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 14, color: 'var(--bjhunt-text)', fontVariantNumeric: 'tabular-nums', fontWeight: 300 }}
              >
                {betaCount}
                <span style={{ color: 'var(--bjhunt-text-disabled)' }}>/{BETA_LIMIT}</span>
              </span>
            </div>
            <div className="h-px overflow-hidden" style={{ background: 'var(--bjhunt-border)' }}>
              <div
                className="h-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%`, background: 'var(--bjhunt-brand-primary)' }}
              />
            </div>
            <p
              className="mt-3 m-0 font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-disabled)' }}
            >
              {spotsLeft !== null && spotsLeft > 0
                ? isFr ? `${spotsLeft} places restantes sur ${BETA_LIMIT}` : `${spotsLeft} spots remaining out of ${BETA_LIMIT}`
                : isFr ? "Liste d'attente — vous serez notifié" : 'Waitlist — you will be notified'}
            </p>
          </div>
        )}

        <ul className="m-0 mb-12 flex flex-col gap-3 p-0">
          {[
            isFr ? 'Scans illimités pendant la Beta' : 'Unlimited scans during Beta',
            isFr ? 'Accès API complet' : 'Full API access',
            isFr ? 'Rapport de vulnérabilités PDF' : 'PDF vulnerability report',
            isFr ? "Support direct de l'équipe fondatrice" : 'Direct support from the founding team',
          ].map((item) => (
            <li
              key={item}
              className="flex items-baseline gap-3"
              style={{
                fontSize: 13,
                fontWeight: 300,
                color: 'var(--bjhunt-text-muted)',
                lineHeight: 1.55,
                listStyle: 'none',
              }}
            >
              <span
                aria-hidden
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--bjhunt-text-disabled)', flexShrink: 0 }}
              >
                ─
              </span>
              {item}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <label style={LABEL_STYLE}>{isFr ? 'Nom complet' : 'Full name'} *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isFr ? 'Jean Dupont' : 'John Doe'}
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>{isFr ? 'Email professionnel' : 'Professional email'} *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={isFr ? 'jean@entreprise.com' : 'john@company.com'}
                style={FIELD_STYLE}
              />
            </div>
          </div>

          <div>
            <label style={LABEL_STYLE}>
              {isFr ? 'Entreprise' : 'Company'} <span style={{ color: 'var(--bjhunt-text-disabled)' }}>({isFr ? 'optionnel' : 'optional'})</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder={isFr ? 'Nom de votre entreprise' : 'Your company name'}
              style={FIELD_STYLE}
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>{isFr ? 'Pourquoi rejoindre la beta ?' : 'Why join the beta?'} *</label>
            <textarea
              required
              rows={4}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder={isFr ? 'Ex: Je suis pentester et je veux tester vos outils...' : "Ex: I'm a pentester and want to test your tools..."}
              style={{ ...FIELD_STYLE, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {HCAPTCHA_SITEKEY ? (
            <div className="pt-2">
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
              className="m-0 font-mono uppercase italic"
              style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--bjhunt-text-disabled)' }}
            >
              {isFr ? 'Captcha désactivé en développement.' : 'Captcha disabled in development.'}
            </p>
          )}

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
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-3 px-5 py-3.5 font-mono uppercase disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              color: 'var(--bjhunt-text)',
              border: '1px solid var(--bjhunt-border-strong)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {submitting
              ? (isFr ? 'Envoi…' : 'Submitting…')
              : (isFr ? "Demander l'accès →" : 'Request access →')}
          </button>
        </form>
      </div>
    </div>
  )
}
