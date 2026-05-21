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
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #e8e8e8' }}
        >
          <h3
            className="font-mono text-[13px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: '#111111' }}
          >
            {t('title')}
          </h3>
          <button
            onClick={handleRejectAll}
            className="p-1 transition-colors hover:bg-gray-100"
            aria-label={t('close')}
          >
            <X className="w-4 h-4" style={{ color: '#999999' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p
            className="font-sans text-[14px] leading-relaxed mb-5"
            style={{ color: '#555555' }}
          >
            {t('intro')}
          </p>

          {/* Options détaillées */}
          {showDetails && (
            <div
              className="mb-5"
              style={{ borderTop: '1px solid #e8e8e8', borderBottom: '1px solid #e8e8e8' }}
            >
              {[
                { id: 'necessary' as const, label: t('categories.necessary.name'), desc: t('categories.necessary.description'), required: true },
                { id: 'analytics' as const, label: t('categories.analytics.name'), desc: t('categories.analytics.description'), required: false },
                { id: 'marketing' as const, label: t('categories.marketing.name'), desc: t('categories.marketing.description'), required: false },
                { id: 'preferences' as const, label: t('categories.preferences.name'), desc: t('categories.preferences.description'), required: false },
              ].map((option, index) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between py-3.5"
                  style={{
                    borderBottom: index < 3 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-mono text-[12px] font-medium uppercase tracking-[0.1em]"
                        style={{ color: '#111111' }}
                      >
                        {option.label}
                      </span>
                      {option.required && (
                        <span
                          className="font-mono text-[9px] px-1.5 py-0.5"
                          style={{
                            background: '#f5f5f5',
                            color: '#888888',
                          }}
                        >
                          {t('required')}
                        </span>
                      )}
                    </div>
                    <p
                      className="font-sans text-[12px] leading-relaxed"
                      style={{ color: '#777777' }}
                    >
                      {option.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleOption(option.id)}
                    disabled={option.required}
                    className={`w-10 h-5 relative transition-colors shrink-0 rounded-full ${
                      option.required ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
                    }`}
                    style={{
                      background: consent[option.id] ? '#e56f00' : '#d0d0d0',
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-all bg-white"
                      style={{
                        left: consent[option.id] ? '22px' : '2px',
                        boxShadow: consent[option.id] ? 'none' : '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="font-mono text-[11px] uppercase tracking-[0.15em] transition-colors order-3 sm:order-1 text-center sm:text-left"
              style={{
                color: '#888888',
              }}
            >
              {showDetails ? t('hide') : t('customize')}
            </button>

            <div className="flex-1 order-1 sm:order-2" />

            <div className="flex gap-2 order-2 sm:order-3 w-full sm:w-auto">
              {showDetails ? (
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-10 px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors"
                  style={{
                    background: '#e56f00',
                    color: '#ffffff',
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  {t('save')}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleRejectAll}
                    className="flex-1 sm:flex-none flex items-center justify-center h-10 px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors"
                    style={{
                      border: '1px solid #d0d0d0',
                      color: '#555555',
                      background: '#ffffff',
                    }}
                  >
                    {t('rejectAll')}
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 sm:flex-none flex items-center justify-center h-10 px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors"
                    style={{
                      background: '#e56f00',
                      color: '#ffffff',
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
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #e8e8e8' }}
        >
          <p
            className="font-mono text-[10px] tracking-[0.15em] uppercase"
            style={{ color: '#999999' }}
          >
            {t('footerLearnMore')}{' '}
            <a href="/legal" className="underline hover:text-[#555555] transition-colors">
              {t('footerPolicy')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
