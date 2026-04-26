'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Cookie, Shield, BarChart3, Target, Settings, Check } from 'lucide-react'
import { getConsent, setConsent, CookieConsent as CookieConsentType, defaultConsent } from '@/lib/cookies'
import { initTracking, shutdownTracking } from '@/lib/tracking'

type ConsentKey = keyof Omit<CookieConsentType, 'timestamp'>

interface ConsentOption {
  id: ConsentKey
  icon: React.ReactNode
  required?: boolean
}

// Strings come from messages/{en,fr}.json#cookies — DOC-A3 + DOC-20 P1.
const consentOptions: ConsentOption[] = [
  { id: 'necessary', icon: <Shield className="w-4 h-4" />, required: true },
  { id: 'analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'marketing', icon: <Target className="w-4 h-4" /> },
  { id: 'preferences', icon: <Settings className="w-4 h-4" /> },
]

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
      }, 1000)
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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'var(--bjhunt-bg-overlay, rgba(0,0,0,0.7))' }}
        onClick={() => setShowDetails(false)}
      />

      {/* Banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 transition-all duration-300 ${
          isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-md)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[var(--bjhunt-border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--bjhunt-bg)] border border-[var(--bjhunt-border-strong)] rounded-[var(--bjhunt-radius-sm)] flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-[var(--bjhunt-text)]" />
                  </div>
                  <div>
                    <h3 className="font-mono font-semibold text-[14px] uppercase tracking-[0.18em] text-[var(--bjhunt-text)]">
                      {t('title')}
                    </h3>
                    <p className="font-mono font-semibold text-[10px] tracking-[0.18em] uppercase text-[var(--bjhunt-text-muted)] mt-0.5">
                      {t('subtitle')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRejectAll}
                  className="p-2 rounded-[var(--bjhunt-radius-sm)] hover:bg-white/[0.04] transition-colors"
                  aria-label={t('close')}
                >
                  <X className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
                </button>
              </div>

              <p className="font-sans text-[14px] text-[var(--bjhunt-text-muted)] mt-4 leading-relaxed">
                {t('intro')}
              </p>
            </div>

            {/* Options détaillées */}
            {showDetails && (
              <div className="p-4 md:p-6 border-b border-[var(--bjhunt-border)] space-y-3 max-h-[40vh] overflow-y-auto">
                {consentOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between p-3 border rounded-[var(--bjhunt-radius)] transition-colors ${
                      consent[option.id]
                        ? 'border-[var(--bjhunt-border-strong)] bg-white/[0.04]'
                        : 'border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center border rounded-[var(--bjhunt-radius-sm)] ${
                        consent[option.id]
                          ? 'border-[var(--bjhunt-border-strong)] text-[var(--bjhunt-text)]'
                          : 'border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)]'
                      }`}>
                        {option.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[12px] text-[var(--bjhunt-text)] uppercase tracking-[0.18em]">
                            {t(`categories.${option.id}.name`)}
                          </span>
                          {option.required && (
                            <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-xs)] text-[var(--bjhunt-text-muted)] uppercase tracking-[0.18em]">
                              {t('required')}
                            </span>
                          )}
                        </div>
                        <p className="font-sans text-[12px] text-[var(--bjhunt-text-muted)] mt-0.5 max-w-xs">
                          {t(`categories.${option.id}.description`)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleOption(option.id)}
                      disabled={option.required}
                      className={`w-12 h-6 relative transition-colors rounded-full ${
                        option.required ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${consent[option.id] ? 'bg-[var(--state-success)]' : 'bg-[var(--bjhunt-border-strong)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                          consent[option.id]
                            ? 'left-7 bg-[var(--bjhunt-bg)]'
                            : 'left-1 bg-[var(--bjhunt-text-muted)]'
                        }`}
                      >
                        {consent[option.id] && (
                          <Check className="w-4 h-4 p-0.5 text-[var(--state-success)]" />
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="p-4 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Customize / hide details — ghost variant */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center gap-2 h-10 md:h-9 px-4 border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] font-mono font-semibold text-[12px] tracking-[0.18em] uppercase text-[var(--bjhunt-text)] hover:bg-white/[0.04] hover:border-[var(--bjhunt-border-strong)] transition-colors order-3 sm:order-1"
              >
                <Settings className="w-3.5 h-3.5" />
                {showDetails ? t('hide') : t('customize')}
              </button>

              <div className="flex-1 order-1 sm:order-2" />

              <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-3">
                {showDetails ? (
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center justify-center gap-2 h-10 md:h-9 px-6 border border-[var(--state-success)] bg-[var(--bjhunt-bg-surface)] rounded-[var(--bjhunt-radius)] font-mono font-semibold text-[12px] tracking-[0.18em] uppercase text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('save')}
                  </button>
                ) : (
                  <>
                    {/* CNIL 2026 : "Refuser" aussi facile/visible/rapide qu'"Accepter".
                        Equal-prominence — both ghost variants, same height, same padding,
                        same typography. NO bias toward Accept. Order Refuser -> Accepter. */}
                    <button
                      onClick={handleRejectAll}
                      className="flex items-center justify-center gap-2 h-10 md:h-9 px-5 border border-[var(--bjhunt-border-strong)] bg-transparent rounded-[var(--bjhunt-radius)] font-mono font-semibold text-[12px] tracking-[0.18em] uppercase text-[var(--bjhunt-text)] hover:bg-white/[0.04] transition-colors"
                    >
                      {t('rejectAll')}
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="flex items-center justify-center gap-2 h-10 md:h-9 px-5 border border-[var(--bjhunt-border-strong)] bg-transparent rounded-[var(--bjhunt-radius)] font-mono font-semibold text-[12px] tracking-[0.18em] uppercase text-[var(--bjhunt-text)] hover:bg-white/[0.04] transition-colors"
                    >
                      {t('acceptAll')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Footer info */}
            <div className="px-4 md:px-6 pb-4 flex items-center justify-between">
              <p className="font-mono font-semibold text-[10px] tracking-[0.18em] text-[var(--bjhunt-text-muted)] uppercase">
                {t('footerLearnMore')}{' '}
                <a href="/legal" className="underline hover:text-[var(--bjhunt-text)]">
                  {t('footerPolicy')}
                </a>
              </p>
              <div className="flex items-center gap-2 font-mono font-semibold text-[10px] tracking-[0.18em] text-[var(--bjhunt-text-muted)] uppercase">
                <Shield className="w-3 h-3" />
                <span>{t('footerCompliance')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
