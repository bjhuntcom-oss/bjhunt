'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Check } from 'lucide-react'
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
    setTimeout(() => setIsVisible(false), 200)
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRejectAll()
      }}
    >
      <div
        className="w-full max-w-[480px]"
        style={{
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid #eeeeee' }}
        >
          <div>
            <h3
              className="font-mono text-[14px] font-semibold tracking-[0.1em]"
              style={{ color: '#111111' }}
            >
              {t('title')}
            </h3>
            <p
              className="font-sans text-[12px] mt-1"
              style={{ color: '#888888' }}
            >
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={handleRejectAll}
            className="p-1.5 transition-colors hover:bg-gray-50"
            aria-label={t('close')}
          >
            <X className="w-4 h-4" style={{ color: '#aaaaaa' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p
            className="font-sans text-[13px] leading-[1.6]"
            style={{ color: '#555555' }}
          >
            {t('intro')}
          </p>

          {/* Options détaillées */}
          {showDetails && (
            <div className="mt-5 space-y-0">
              {[
                { id: 'necessary' as const, label: t('categories.necessary.name'), desc: t('categories.necessary.description'), required: true },
                { id: 'analytics' as const, label: t('categories.analytics.name'), desc: t('categories.analytics.description'), required: false },
                { id: 'marketing' as const, label: t('categories.marketing.name'), desc: t('categories.marketing.description'), required: false },
                { id: 'preferences' as const, label: t('categories.preferences.name'), desc: t('categories.preferences.description'), required: false },
              ].map((option, index) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderTop: index === 0 ? '1px solid #eeeeee' : 'none',
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-mono text-[12px] font-medium"
                        style={{ color: '#111111' }}
                      >
                        {option.label}
                      </span>
                      {option.required && (
                        <span
                          className="font-mono text-[9px] px-1.5 py-0.5"
                          style={{
                            background: '#f5f5f5',
                            color: '#999999',
                          }}
                        >
                          {t('required')}
                        </span>
                      )}
                    </div>
                    <p
                      className="font-sans text-[11px] leading-relaxed"
                      style={{ color: '#777777' }}
                    >
                      {option.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleOption(option.id)}
                    disabled={option.required}
                    className={`w-9 h-5 relative transition-colors shrink-0 ${
                      option.required ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
                    }`}
                    style={{
                      background: consent[option.id] ? '#e56f00' : '#d8d8d8',
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 transition-all bg-white"
                      style={{
                        left: consent[option.id] ? '18px' : '2px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="font-mono text-[11px] tracking-[0.1em] transition-colors hover:text-[#555555]"
              style={{
                color: '#999999',
              }}
            >
              {showDetails ? t('hide') : t('customize')}
            </button>

            <div className="flex-1" />

            <button
              onClick={handleRejectAll}
              className="font-mono text-[11px] font-medium tracking-[0.1em] transition-colors hover:text-[#555555]"
              style={{
                color: '#777777',
              }}
            >
              {t('rejectAll')}
            </button>

            <button
              onClick={showDetails ? handleSavePreferences : handleAcceptAll}
              className="flex items-center gap-1.5 px-5 py-2 font-mono text-[11px] font-semibold tracking-[0.1em] transition-colors"
              style={{
                background: '#e56f00',
                color: '#ffffff',
              }}
            >
              <Check className="w-3.5 h-3.5" />
              {showDetails ? t('save') : t('acceptAll')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #eeeeee' }}
        >
          <p
            className="font-mono text-[10px] tracking-[0.1em]"
            style={{ color: '#aaaaaa' }}
          >
            {t('footerLearnMore')}{' '}
            <a href="/legal" className="underline hover:text-[#777777] transition-colors">
              {t('footerPolicy')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
