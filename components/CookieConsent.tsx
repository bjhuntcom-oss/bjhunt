'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Shield, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getConsent, setConsent, CookieConsent as CookieConsentType, defaultConsent } from '@/lib/cookies'
import { initTracking, shutdownTracking } from '@/lib/tracking'

export default function CookieConsentBanner() {
  const t = useTranslations('cookies')
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsentState] = useState<CookieConsentType>(defaultConsent)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const existingConsent = getConsent()
    if (!existingConsent) {
      setTimeout(() => {
        setIsVisible(true)
        setIsAnimating(true)
      }, 500)
    } else {
      setConsentState(existingConsent)
      if (existingConsent.analytics) {
        initTracking()
      }
    }
  }, [])

  const handleAcceptAll = () => {
    const fullConsent: CookieConsentType = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: new Date().toISOString(),
    }
    setConsent(fullConsent)
    setConsentState(fullConsent)
    initTracking()
    closeBanner()
  }

  const handleRejectAll = () => {
    const minimalConsent: CookieConsentType = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString(),
    }
    setConsent(minimalConsent)
    setConsentState(minimalConsent)
    shutdownTracking()
    closeBanner()
  }

  const handleSavePreferences = () => {
    setConsent(consent)
    if (consent.analytics) {
      initTracking()
    } else {
      shutdownTracking()
    }
    closeBanner()
  }

  const toggleOption = (id: keyof Omit<CookieConsentType, 'timestamp'>) => {
    if (id === 'necessary') return
    setConsentState(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const closeBanner = () => {
    setIsAnimating(false)
    setTimeout(() => setIsVisible(false), 200)
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[9999] transition-all duration-200 ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="max-w-3xl mx-auto p-4">
        <div
          className="border"
          style={{
            background: 'var(--bjhunt-bg-surface)',
            borderColor: 'var(--bjhunt-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--bjhunt-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 flex items-center justify-center border"
                style={{
                  borderColor: 'var(--bjhunt-border-strong)',
                  background: 'var(--bjhunt-bg)',
                }}
              >
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--bjhunt-text)' }} />
              </div>
              <div>
                <h3
                  className="font-mono font-semibold text-[11px] uppercase tracking-[0.2em]"
                  style={{ color: 'var(--bjhunt-text)' }}
                >
                  {t('title')}
                </h3>
              </div>
            </div>
            <button
              onClick={handleRejectAll}
              className="p-1 hover:bg-white/[0.04] transition-colors"
              aria-label={t('close')}
            >
              <X className="w-4 h-4" style={{ color: 'var(--bjhunt-text-muted)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p
              className="font-sans text-[13px] leading-relaxed mb-4"
              style={{ color: 'var(--bjhunt-text-secondary)' }}
            >
              {t('intro')}
            </p>

            {/* Options détaillées */}
            {showDetails && (
              <div
                className="border-t border-b space-y-0 mb-4"
                style={{ borderColor: 'var(--bjhunt-border)' }}
              >
                {[
                  { id: 'necessary' as const, label: t('categories.necessary.name'), desc: t('categories.necessary.description'), required: true },
                  { id: 'analytics' as const, label: t('categories.analytics.name'), desc: t('categories.analytics.description'), required: false },
                  { id: 'marketing' as const, label: t('categories.marketing.name'), desc: t('categories.marketing.description'), required: false },
                  { id: 'preferences' as const, label: t('categories.preferences.name'), desc: t('categories.preferences.description'), required: false },
                ].map((option, index) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      borderBottom: index < 3 ? '1px solid var(--bjhunt-border)' : 'none',
                    }}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="font-mono font-medium text-[11px] uppercase tracking-[0.15em]"
                          style={{ color: 'var(--bjhunt-text)' }}
                        >
                          {option.label}
                        </span>
                        {option.required && (
                          <span
                            className="font-mono text-[9px] px-1.5 py-0.5 border"
                            style={{
                              borderColor: 'var(--bjhunt-border)',
                              color: 'var(--bjhunt-text-muted)',
                            }}
                          >
                            {t('required')}
                          </span>
                        )}
                      </div>
                      <p
                        className="font-sans text-[12px]"
                        style={{ color: 'var(--bjhunt-text-muted)' }}
                      >
                        {option.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleOption(option.id)}
                      disabled={option.required}
                      className={`w-9 h-5 relative transition-colors shrink-0 ${
                        option.required ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                      }`}
                      style={{
                        background: consent[option.id] ? 'var(--bjhunt-text)' : 'var(--bjhunt-border-strong)',
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 transition-all"
                        style={{
                          left: consent[option.id] ? '18px' : '2px',
                          background: consent[option.id] ? 'var(--bjhunt-bg-surface)' : 'var(--bjhunt-bg)',
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center gap-1.5 h-9 px-3 font-mono text-[11px] tracking-[0.15em] uppercase hover:bg-white/[0.04] transition-colors order-3 sm:order-1"
                style={{
                  color: 'var(--bjhunt-text-muted)',
                }}
              >
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDetails ? t('hide') : t('customize')}
              </button>

              <div className="flex-1 order-1 sm:order-2" />

              <div className="flex gap-2 order-2 sm:order-3">
                {showDetails ? (
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center justify-center gap-1.5 h-9 px-5 font-mono font-semibold text-[11px] tracking-[0.15em] uppercase transition-colors"
                    style={{
                      background: 'var(--bjhunt-text)',
                      color: 'var(--bjhunt-bg-surface)',
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('save')}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleRejectAll}
                      className="flex items-center justify-center h-9 px-5 border font-mono font-semibold text-[11px] tracking-[0.15em] uppercase hover:bg-white/[0.04] transition-colors"
                      style={{
                        borderColor: 'var(--bjhunt-border-strong)',
                        color: 'var(--bjhunt-text)',
                      }}
                    >
                      {t('rejectAll')}
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="flex items-center justify-center h-9 px-5 font-mono font-semibold text-[11px] tracking-[0.15em] uppercase transition-colors"
                      style={{
                        background: 'var(--bjhunt-text)',
                        color: 'var(--bjhunt-bg-surface)',
                      }}
                    >
                      {t('acceptAll')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--bjhunt-border)' }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.15em] uppercase"
              style={{ color: 'var(--bjhunt-text-muted)' }}
            >
              {t('footerLearnMore')}{' '}
              <a href="/legal" className="underline hover:text-[var(--bjhunt-text)] transition-colors">
                {t('footerPolicy')}
              </a>
            </p>
            <div
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] uppercase"
              style={{ color: 'var(--bjhunt-text-muted)' }}
            >
              <Shield className="w-3 h-3" />
              <span>{t('footerCompliance')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
