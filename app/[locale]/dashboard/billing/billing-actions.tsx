'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { browserBackendFetch } from '@/lib/backend-client'

// W10 frontend client-side actions: drives Stripe checkout + portal.
// Both buttons fall back to a /contact link with explanatory text when
// the backend reports stripe_not_configured (env vars unset).

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
      // The backend reads priceId from the request body; the actual price
      // ids come from the STRIPE_PRICE_PRO / STRIPE_PRICE_ENTERPRISE env
      // vars on the server side. We pass the tier as a hint and let the
      // backend translate.
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
      const res = await browserBackendFetch('/api/billing/portal', {
        method: 'POST',
      })
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
    <div className="flex flex-col gap-3 mt-2">
      {error && (
        <div
          role="alert"
          className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] font-mono text-red-300"
        >
          {error}
        </div>
      )}

      {stripeOff && (
        <div className="border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] font-mono text-amber-200">
          {isFr
            ? "Le paiement automatique n'est pas encore actif. Contactez l'équipe pour activer Pro / Enterprise manuellement — c'est immédiat."
            : 'Self-service checkout is not active yet. Contact the team to activate Pro / Enterprise manually — same-day turnaround.'}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {plan === 'free' && (
          <>
            <button
              type="button"
              onClick={() => onUpgrade('pro')}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {loading === 'checkout' && <Loader2 className="h-3 w-3 animate-spin" />}
              {isFr ? 'Passer en Pro' : 'Upgrade to Pro'}
            </button>
            <button
              type="button"
              onClick={() => onUpgrade('enterprise')}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--border)] text-white hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
            >
              {isFr ? 'Demander Enterprise' : 'Request Enterprise'}
            </button>
          </>
        )}
        {plan !== 'free' && (
          <button
            type="button"
            onClick={onPortal}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-[var(--border)] text-white hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            {loading === 'portal' && <Loader2 className="h-3 w-3 animate-spin" />}
            {isFr ? 'Gérer mon abonnement' : 'Manage subscription'}
          </button>
        )}
        <Link
          href="/pricing"
          className="inline-flex items-center px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors"
        >
          {isFr ? 'Voir les plans' : 'View plans'}
        </Link>
      </div>
    </div>
  )
}
