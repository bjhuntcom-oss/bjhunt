'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { browserBackendFetch } from '@/lib/backend-client'

// W10 frontend client-side actions: drives Stripe checkout + portal.
// Both buttons fall back to an info banner with a Contact link when
// the backend reports stripe_not_configured (env vars unset).
//
// Refonte 2026 (Wave B8) — refactored to use the shared <Button> primitive
// (state-success "Upgrade", ghost "Manage") and design-token banners.

interface Props {
  plan: string
  locale: string
}

export function BillingActions({ plan, locale }: Props) {
  const isFr = locale === 'fr'
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const [stripeOff, setStripeOff] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onUpgrade = async (priceTier: 'pro' | 'enterprise') => {
    setLoading('checkout')
    setError(null)
    try {
      const res = await browserBackendFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: priceTier }),
      })
      if (res.status === 501) {
        setStripeOff(true)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.message ?? `HTTP ${res.status}`)
        return
      }
      const { url } = (await res.json()) as { url: string }
      window.location.assign(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(null)
    }
  }

  const onPortal = async () => {
    setLoading('portal')
    setError(null)
    try {
      const res = await browserBackendFetch('/api/billing/portal', { method: 'POST' })
      if (res.status === 501) {
        setStripeOff(true)
        return
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        return
      }
      const { url } = (await res.json()) as { url: string }
      window.location.assign(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className="px-3 py-2"
          style={{
            border: '1px solid var(--bjhunt-status-danger, #fb565b)',
            background: 'var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))',
            color: 'var(--bjhunt-status-danger, #fb565b)',
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 13,
            borderRadius: 'var(--bjhunt-radius, 6px)',
          }}
        >
          {error}
        </div>
      )}

      {stripeOff && (
        <div
          className="px-3 py-2"
          style={{
            border: '1px solid var(--bjhunt-status-warning, #ffba00)',
            background: 'var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))',
            color: 'var(--bjhunt-status-warning, #ffba00)',
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 13,
            borderRadius: 'var(--bjhunt-radius, 6px)',
          }}
        >
          {isFr
            ? "Le paiement automatique n'est pas encore actif. Contactez l'equipe pour activer Pro / Enterprise manuellement — c'est immediat."
            : 'Self-service checkout is not active yet. Contact the team to activate Pro / Enterprise manually — same-day turnaround.'}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {plan === 'free' && (
          <>
            <Button
              variant="success"
              size="md"
              onClick={() => onUpgrade('pro')}
              disabled={loading !== null}
            >
              {loading === 'checkout' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              {isFr ? 'Passer en Pro' : 'Upgrade to Pro'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onUpgrade('enterprise')}
              disabled={loading !== null}
            >
              {isFr ? 'Demander Enterprise' : 'Request Enterprise'}
            </Button>
          </>
        )}
        {plan !== 'free' && (
          <Button
            variant="ghost"
            size="md"
            onClick={onPortal}
            disabled={loading !== null}
          >
            {loading === 'portal' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
            {isFr ? 'Gerer mon abonnement' : 'Manage subscription'}
          </Button>
        )}
        <Link
          href="/pricing"
          className="inline-flex items-center transition-colors"
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 13,
            color: 'var(--bjhunt-text-muted)',
            padding: '0 16px',
            height: 36,
            lineHeight: '36px',
          }}
        >
          {isFr ? 'Voir les plans' : 'View plans'}
        </Link>
      </div>
    </div>
  )
}
