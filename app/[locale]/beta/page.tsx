'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? ''

const fieldClass =
  'w-full bg-transparent border-0 border-b text-[14px] font-normal py-3 px-0 outline-none ' +
  'min-h-[44px] md:min-h-[40px] transition-colors ' +
  'focus:border-bjhunt-brand placeholder:text-bjhunt-text-disabled font-sans'

const labelClass =
  'block mb-2 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted'

function BetaFormContent() {
  const t = useTranslations('beta')
  const locale = useLocale()
  const searchParams = useSearchParams()
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
        if (!response.ok) { setBetaCount(null); return }
        const data = await response.json()
        setBetaCount(typeof (data as { count?: unknown }).count === 'number' ? (data as { count: number }).count : null)
      } catch { setBetaCount(null) }
    }
    loadBetaCount()
  }, [])

  const spotsLeft = betaCount !== null ? Math.max(0, BETA_LIMIT - betaCount) : null
  const progress = betaCount !== null ? Math.min(100, Math.round((betaCount / BETA_LIMIT) * 100)) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (HCAPTCHA_SITEKEY && !captchaToken) { setError(t('captchaError')); return }
    setSubmitting(true)
    try {
      const response = await fetch('/api/beta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, captchaToken }) })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        captchaRef.current?.resetCaptcha(); setCaptchaToken('')
        throw new Error(payload.error || 'Failed to submit')
      }
      setSubmitted(true)
      if (betaCount !== null) setBetaCount(betaCount + 1)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <div className="relative min-h-screen pt-20" style={{ background: "var(--bjhunt-bg)" }}>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center border" style={{ borderColor: "var(--bjhunt-success)" }}>
            <Check className="h-7 w-7 text-bjhunt-success" />
          </div>
          <h1 className="m-0 mb-4 font-sans font-normal text-[clamp(28px,3vw,36px)] leading-[1.11] tracking-[-0.025em] text-bjhunt-text">{t('requestRegistered')}</h1>
          <p className="m-0 mb-10 max-w-md mx-auto font-sans text-[16px] leading-[1.6] text-bjhunt-text-muted">{t('confirmationMsg')}</p>
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-bjhunt-text-muted hover:text-bjhunt-brand transition-colors">
            <ArrowRight className="h-3 w-3 rotate-180" /> {t('backHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative pt-14" style={{ background: "var(--bjhunt-bg)", minHeight: "100vh" }}>
      <header className="mx-auto max-w-4xl px-6 md:px-12 py-16 md:py-20">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <p className="m-0 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted">
            {t('eyebrow')}
          </p>
          <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] px-3 py-1" style={{ color: "var(--bjhunt-warning)", border: "1px solid var(--bjhunt-warning)", background: "var(--bjhunt-warning-tint)" }}>
            {t('limitedSeats')}
          </span>
        </div>
        <h1 className="m-0 max-w-3xl font-sans font-normal text-[clamp(28px,3vw,36px)] leading-[1.11] tracking-[-0.025em] text-bjhunt-text">
          {t('title')}<span className="text-bjhunt-text-muted">.</span>
        </h1>
        <p className="mt-5 max-w-xl font-sans text-[16px] leading-[1.6] text-bjhunt-text-muted m-0">{t('description')}</p>
      </header>

      <div className="mx-auto max-w-2xl px-6 pb-20">
        {betaCount !== null && (
          <div className="mb-10 p-5 border" style={{ borderColor: "var(--bjhunt-border)", background: "var(--bjhunt-bg-surface)" }}>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted">{t('progressLabel')}</span>
              <span className="font-mono text-[14px] text-bjhunt-text tabular-nums">{betaCount}<span className="text-bjhunt-text-disabled">/{BETA_LIMIT}</span></span>
            </div>
            <div className="h-px overflow-hidden bg-bjhunt-border">
              <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${progress}%`, background: "var(--bjhunt-success)" }} />
            </div>
            <p className="mt-3 m-0 flex items-center gap-2 text-[13px] text-bjhunt-text">
              <span aria-hidden className="inline-block w-[6px] h-[6px] rounded-full bg-bjhunt-success" />
              {spotsLeft !== null && spotsLeft > 0 ? t('spotsRemaining', { count: spotsLeft, limit: BETA_LIMIT }) : t('waitlistActive')}
            </p>
          </div>
        )}

        <ul className="m-0 mb-10 flex flex-col gap-3 p-0 list-none">
          {[t('benefitScans'), t('benefitApi'), t('benefitReport'), t('benefitSupport')].map((item) => (
            <li key={item} className="flex items-baseline gap-3 font-sans text-[14px] text-bjhunt-text-muted leading-[1.5]">
              <span aria-hidden className="font-mono text-[12px] text-bjhunt-text-disabled flex-shrink-0">─</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="px-6 md:px-8 py-8 border" style={{ borderColor: "var(--bjhunt-border)", background: "var(--bjhunt-bg-surface)" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="beta-name" className={labelClass}>{t('fullName')} *</label>
                <input id="beta-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('namePlaceholder')} className={fieldClass} style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }} />
              </div>
              <div>
                <label htmlFor="beta-email" className={labelClass}>{t('professionalEmail')} *</label>
                <input id="beta-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t('emailPlaceholder')} className={fieldClass} style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }} />
              </div>
            </div>

            <div>
              <label htmlFor="beta-company" className={labelClass}>{t('company')} <span className="text-bjhunt-text-disabled">({t('optional')})</span></label>
              <input id="beta-company" type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder={t('companyPlaceholder')} className={fieldClass} style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }} />
            </div>

            <div>
              <label htmlFor="beta-role" className={labelClass}>{t('whyJoin')} *</label>
              <textarea id="beta-role" required rows={4} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder={t('whyJoinPlaceholder')} className={`${fieldClass} resize-y leading-relaxed`} style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }} />
            </div>

            {HCAPTCHA_SITEKEY ? (
              <div className="pt-2 overflow-x-auto">
                <HCaptcha sitekey={HCAPTCHA_SITEKEY} onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} ref={captchaRef} theme="dark" />
              </div>
            ) : (
              <p className="m-0 font-mono text-[12px] uppercase italic font-medium tracking-[0.18em] text-bjhunt-text-disabled">{t('captchaDisabled')}</p>
            )}

            {error && (
              <div role="alert" aria-live="polite" className="px-4 py-3 text-[13px] font-normal" style={{ border: "1px solid var(--bjhunt-critical)", background: "var(--bjhunt-critical-tint)", color: "var(--bjhunt-critical)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-3 mt-2 px-5 min-h-[44px] font-mono text-[12px] font-medium uppercase tracking-[0.16em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: "var(--bjhunt-text-inverted)", background: "var(--bjhunt-brand)", border: "none", borderRadius: "var(--bjhunt-radius-sm)" }}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {submitting ? t('submitting') : t('requestAccess')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function BetaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bjhunt-bg" />}>
      <BetaFormContent />
    </Suspense>
  )
}
