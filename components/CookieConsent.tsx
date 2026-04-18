'use client'

import { useState, useEffect } from 'react'
import { X, Cookie, Shield, BarChart3, Target, Settings, ChevronRight, Check } from 'lucide-react'
import { getConsent, setConsent, CookieConsent as CookieConsentType, defaultConsent } from '@/lib/cookies'
import { initTracking, shutdownTracking } from '@/lib/tracking'

interface ConsentOption {
  id: keyof Omit<CookieConsentType, 'timestamp'>
  name: string
  description: string
  icon: React.ReactNode
  required?: boolean
}

const consentOptions: ConsentOption[] = [
  {
    id: 'necessary',
    name: 'Essentiels',
    description: 'Cookies nécessaires au fonctionnement du site. Toujours actifs.',
    icon: <Shield className="w-4 h-4" />,
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analytiques',
    description: 'Nous aident à comprendre comment vous utilisez le site pour l\'améliorer.',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Utilisés pour vous proposer des publicités pertinentes.',
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: 'preferences',
    name: 'Préférences',
    description: 'Permettent de mémoriser vos choix et personnaliser votre expérience.',
    icon: <Settings className="w-4 h-4" />,
  },
]

export default function CookieConsentBanner() {
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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setShowDetails(false)}
      />

      {/* Banner */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 transition-all duration-300 ${
          isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-black border border-white/20 backdrop-blur-xl shadow-2xl">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 border border-white/20 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                      Paramètres de confidentialité
                    </h3>
                    <p className="text-[10px] text-white/50 tracking-widest uppercase mt-0.5">
                      BJHUNT respecte votre vie privée
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRejectAll}
                  className="p-2 hover:bg-white/10 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <p className="text-xs text-white/70 mt-4 leading-relaxed">
                Nous utilisons des cookies pour analyser le trafic, améliorer votre expérience et personnaliser le contenu. 
                Vous pouvez choisir les cookies que vous acceptez.
              </p>
            </div>

            {/* Options détaillées */}
            {showDetails && (
              <div className="p-4 md:p-6 border-b border-white/10 space-y-3 max-h-[40vh] overflow-y-auto">
                {consentOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between p-3 border transition-colors ${
                      consent[option.id] 
                        ? 'border-white/30 bg-white/5' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center border ${
                        consent[option.id] ? 'border-white/40 text-white' : 'border-white/20 text-white/50'
                      }`}>
                        {option.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {option.name}
                          </span>
                          {option.required && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-white/10 text-white/50 uppercase tracking-widest">
                              Requis
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50 mt-0.5 max-w-xs">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleOption(option.id)}
                      disabled={option.required}
                      className={`w-12 h-6 relative transition-colors ${
                        option.required ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${consent[option.id] ? 'bg-white' : 'bg-white/20'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 transition-all ${
                          consent[option.id] 
                            ? 'left-7 bg-black' 
                            : 'left-1 bg-white/50'
                        }`}
                      >
                        {consent[option.id] && (
                          <Check className="w-4 h-4 text-white p-0.5" style={{ filter: 'invert(1)' }} />
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="p-4 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/20 text-[10px] font-bold tracking-wider uppercase hover:bg-white/5 transition-colors order-3 sm:order-1"
              >
                <Settings className="w-3 h-3" />
                {showDetails ? 'Masquer les options' : 'Personnaliser'}
              </button>

              <div className="flex-1 order-1 sm:order-2" />

              <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-3">
                {showDetails ? (
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-wider uppercase hover:bg-white/90 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Enregistrer mes choix
                  </button>
                ) : (
                  <>
                    {/* CNIL guidance (mise à jour 2026) : "Refuser" doit être aussi facile, */}
                    {/* visible et rapide qu'"Accepter". Styles identiques, ordre Refuser→Accepter. */}
                    {/* Cf. https://www.cnil.fr/fr/cookies-et-traceurs (recommandations 2026). */}
                    <button
                      onClick={handleRejectAll}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black text-[10px] font-bold tracking-wider uppercase hover:bg-white/90 transition-colors"
                    >
                      Refuser tout
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black text-[10px] font-bold tracking-wider uppercase hover:bg-white/90 transition-colors"
                    >
                      Tout accepter
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Footer info */}
            <div className="px-4 md:px-6 pb-4 flex items-center justify-between">
              <p className="text-[9px] text-white/30 tracking-widest uppercase">
                En savoir plus dans notre{' '}
                <a href="/legal" className="underline hover:text-white/50">
                  politique de confidentialité
                </a>
              </p>
              <div className="flex items-center gap-2 text-[9px] text-white/30">
                <Shield className="w-3 h-3" />
                <span>RGPD Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
