'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Shield, Check } from 'lucide-react'
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
      }, 800)
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
    setTimeout(() => setIsVisible(false), 300)
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] transition-all duration-300 ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="max-w-2xl mx-auto p-4">
        <div
          className="border"
          style={{
            background: 'var(--bjhunt-bg-surface)',
            borderColor: 'var(--bjhunt-border)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: 'var(--bjhunt-border)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center border"
                style={{
                  borderColor: 'var(--bjhunt-border-strong)',
                  background: 'var(--bjhunt-bg)',
                }}
              >
                <Shield className="w-4 h-4" style={{ color: 'var(--bjhunt-text)' }} />
              </div>
              <div>
                <h3
                  className="font-mono font-semibold text-[12px] uppercase tracking-[0.15em]"
                  style={{ color: 'var(--bjhunt-text)' }}
                >
                  {t('title')}
                </h3>
                <p
                  className="font-mono text-[10px] tracking-[0.15em] uppercase mt-0.5"
                  style={{ color: 'var(--bjhunt-text-muted)' }}
                >
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectAll}
              className="p-1.5 hover:bg-white/[0.04] transition-colors"
              aria-label={t('close')}
            >
              <X className="w-4 h-4" style={{ color: 'var(--bjhunt-text-muted)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <p
              className="font-sans text-[13px] leading-relaxed mb-4"
              style={{ color: 'var(--bjhunt-text-muted)' }}
            >
              {t('intro')}
            </p>

            {/* Options détaillées */}
            {showDetails && (
              <div className="space-y-2 mb-4 max-h-[30vh] overflow-y-auto">
                {[
                  { id: 'necessary' as const, label: t('categories.necessary.name'), desc: t('categories.necessary.description'), required: true },
                  { id: 'analytics' as const, label: t('categories.analytics.name'), desc: t('categories.analytics.description'), required: false },
                  { id: 'marketing' as const, label: t('categories.marketing.name'), desc: t('categories.marketing.description'), required: false },
                  { id: 'preferences' as const, label: t('categories.preferences.name'), desc: t('categories.preferences.description'), required: false },
                ].map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-3 border"
                    style={{
                      borderColor: consent[option.id] ? 'var(--bjhunt-border-strong)' : 'var(--bjhunt-border)',
                      background: consent[option.id] ? 'var(--bjhunt-bg)' : 'transparent',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono font-semibold text-[11px] uppercase tracking-[0.15em]"
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
                        className="font-sans text-[11px] mt-0.5"
                        style={{ color: 'var(--bjhunt-text-muted)' }}
                      >
                        {option.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleOption(option.id)}
                      disabled={option.required}
                      className={`w-10 h-5 relative transition-colors ml-3 ${
                        option.required ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                      style={{
                        background: consent[option.id] ? 'var(--state-success)' : 'var(--bjhunt-border-strong)',
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 transition-all"
                        style={{
                          left: consent[option.id] ? '22px' : '2px',
                          background: 'var(--bjhunt-bg)',
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
                className="flex items-center justify-center gap-2 h-9 px-4 border font-mono font-semibold text-[11px] tracking-[0.15em] uppercase hover:bg-white/[0.04] transition-colors order-3 sm:order-1"
                style={{
                  borderColor: 'var(--bjhunt-border)',
                  color: 'var(--bjhunt-text)',
                }}
              >
                {showDetails ? t('hide') : t('customize')}
              </button>

              <div className="flex-1 order-1 sm:order-2" />

              <div className="flex gap-2 order-2 sm:order-3">
                {showDetails ? (
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center justify-center gap-2 h-9 px-5 border font-mono font-semibold text-[11px] tracking-[0.15em] uppercase transition-colors"
                    style={{
                      borderColor: 'var(--state-success)',
                      color: 'var(--state-success)',
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
                        color: 'var(--bjhunt-bg)',
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
            className="px-4 py-3 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--bjhunt-border)' }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.15em] uppercase"
              style={{ color: 'var(--bjhunt-text-muted)' }}
            >
              {t('footerLearnMore')}{' '}
              <a href="/legal" className="underline hover:text-[var(--bjhunt-text)]">
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
