import posthog from 'posthog-js'
import { hasAnalyticsConsent, getConsent } from './cookies'

let isInitialized = false

export function initTracking(): void {
  if (typeof window === 'undefined') return
  if (isInitialized) return
  if (!hasAnalyticsConsent()) return

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage+cookie',
      bootstrap: {
        distinctID: undefined,
      },
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
      },
    })
    isInitialized = true
  }
}

export function trackPageView(url: string): void {
  if (!hasAnalyticsConsent()) return
  if (typeof window === 'undefined') return

  posthog.capture('$pageview', {
    $current_url: url,
    timestamp: new Date().toISOString(),
  })
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!hasAnalyticsConsent()) return
  if (typeof window === 'undefined') return

  posthog.capture(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!hasAnalyticsConsent()) return
  if (typeof window === 'undefined') return

  posthog.identify(userId, traits)
}

export function trackFormSubmission(formName: string, success: boolean): void {
  trackEvent('form_submission', {
    form_name: formName,
    success,
  })
}

export function getVisitorInfo(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}

  const consent = getConsent()
  if (!consent?.analytics) return {}

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer,
    currentUrl: window.location.href,
    pathname: window.location.pathname,
  }
}

export function shutdownTracking(): void {
  if (typeof window === 'undefined') return
  if (!isInitialized) return

  posthog.reset()
  isInitialized = false
}
