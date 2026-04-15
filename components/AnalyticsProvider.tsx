'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initTracking, trackPageView, getVisitorInfo, trackEvent } from '@/lib/tracking'
import { hasAnalyticsConsent } from '@/lib/cookies'

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!hasAnalyticsConsent()) return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)

    // Track visitor info on first page load
    const visitorInfo = getVisitorInfo()
    if (Object.keys(visitorInfo).length > 0) {
      trackEvent('visitor_info', visitorInfo)
    }
  }, [pathname, searchParams])

  return null
}

function SessionTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasAnalyticsConsent()) return

    // Track session start
    const sessionId = sessionStorage.getItem('bjhunt_session_id')
    if (!sessionId) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('bjhunt_session_id', newSessionId)

      trackEvent('session_start', {
        session_id: newSessionId,
        entry_page: window.location.pathname,
        referrer: document.referrer || 'direct',
        timestamp: new Date().toISOString(),
      })
    }

    // Track time on page
    const startTime = Date.now()

    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000)
      trackEvent('page_exit', {
        page: window.location.pathname,
        time_spent_seconds: timeSpent,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return null
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTracking()
  }, [])

  return (
    <>
      {children}
      <PageViewTracker />
      <SessionTracker />
    </>
  )
}
