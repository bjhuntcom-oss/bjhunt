import Cookies from 'js-cookie'

export interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
  timestamp: string
}

const CONSENT_COOKIE_NAME = 'bjhunt_cookie_consent'
const CONSENT_EXPIRY_DAYS = 365

export const defaultConsent: CookieConsent = {
  necessary: true, // Always required
  analytics: false,
  marketing: false,
  preferences: false,
  timestamp: '',
}

export function getConsent(): CookieConsent | null {
  const consent = Cookies.get(CONSENT_COOKIE_NAME)
  if (!consent) return null
  try {
    return JSON.parse(consent) as CookieConsent
  } catch {
    return null
  }
}

export function setConsent(consent: CookieConsent): void {
  const consentWithTimestamp = {
    ...consent,
    necessary: true, // Always true
    timestamp: new Date().toISOString(),
  }
  Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(consentWithTimestamp), {
    expires: CONSENT_EXPIRY_DAYS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export function hasAnalyticsConsent(): boolean {
  const consent = getConsent()
  return consent?.analytics ?? false
}
