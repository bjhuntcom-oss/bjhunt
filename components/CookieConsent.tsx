'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Shield, BarChart3, Target, Settings, Check } from 'lucide-react'
import { getConsent, setConsent, CookieConsent as CookieConsentType, defaultConsent } from '@/lib/cookies'
import { initTracking, shutdownTracking } from '@/lib/tracking'

type ConsentKey = keyof Omit<CookieConsentType, 'timestamp'>

interface ConsentOption {
  id: ConsentKey
  icon: React.ReactNode
  required?: boolean
}

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
      className={`fixed bottom-0 left-0 right-0 z-[9999] transition-all duration-200 ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="max-w-3xl mx-auto p-4">
        <div
          className="border"
          style={{
            background: '#ffffff',
            borderColor: '#e0e0e0',
            boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #eeeeee' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center border"
                style={{
                  borderColor: '#e56f00',
                  background: 'rgba(229, 111, 0, 0.08)',
                }}
              >
                <Shield className="w-4 h-4" style={{ color: '#e56f00' }} />
              </div>
              <div>
                <h3
                  className="font-mono font-semibold text-[12px] uppercase tracking-[0.15em]"
                  style={{ color: '#111111' }}
                >
                  {t('title')}
                </h3>
                <p
                  className="font-mono text-[10px] tracking-[0.15em] uppercase mt-0.5"
                  style={{ color: '#888888' }}
                >
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectAll}
              className="p-1.5 transition-colors hover:bg-gray-50"
              aria-label={t('close')}
            >
              <X className="w-4 h-4" style={{ color: '#999999' }} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p
              className="font-sans text-[13px] leading-relaxed mb-4"
              style={{ color: '#555555' }}
            >
              {t('intro')}
            </p>

            {/* Options détaillées */}
            {showDetails && (
              <div
                className="mb-4"
                style={{ borderTop: '1px solid #eeeeee', borderBottom: '1px solid #eeeeee' }}
              >
                {consentOptions.map((option, index) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      borderBottom: index < 3 ? '1px solid #f5f5f5' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-7 h-7 flex items-center justify-center border shrink-0"
                        style={{
                          borderColor: consent[option.id] ? '#e56f00' : '#e0e0e0',
                          background: consent[option.id] ? 'rgba(229, 111, 0, 0.06)' : 'transparent',
                        }}
                      >
                        {option.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono font-medium text-[11px] uppercase tracking-[0.12em]"
                            style={{ color: '#111111' }}
                          >
                            {t(`categories.${option.id}.name`)}
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
                          className="font-sans text-[11px] mt-0.5"
                          style={{ color: '#777777' }}
                        >
                          {t(`categories.${option.id}.description`)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleOption(option.id)}
                      disabled={option.required}
                      className={`w-9 h-5 relative transition-colors shrink-0 ml-3 ${
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center gap-1.5 h-9 px-3 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors order-3 sm:order-1"
                style={{
                  color: '#888888',
                }}
              >
                <Settings className="w-3.5 h-3.5" />
                {showDetails ? t('hide') : t('customize')}
              </button>

              <div className="flex-1 order-1 sm:order-2" />

              <div className="flex gap-2 order-2 sm:order-3">
                {showDetails ? (
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center justify-center gap-1.5 h-9 px-5 font-mono font-semibold text-[11px] tracking-[0.12em] uppercase transition-colors"
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
                      className="flex items-center justify-center h-9 px-5 border font-mono font-semibold text-[11px] tracking-[0.12em] uppercase transition-colors"
                      style={{
                        borderColor: '#d0d0d0',
                        color: '#555555',
                        background: '#ffffff',
                      }}
                    >
                      {t('rejectAll')}
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="flex items-center justify-center h-9 px-5 font-mono font-semibold text-[11px] tracking-[0.12em] uppercase transition-colors"
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
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #eeeeee' }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.12em] uppercase"
              style={{ color: '#999999' }}
            >
              {t('footerLearnMore')}{' '}
              <a href="/legal" className="underline hover:text-[#555555] transition-colors">
                {t('footerPolicy')}
              </a>
            </p>
            <div
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase"
              style={{ color: '#999999' }}
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
