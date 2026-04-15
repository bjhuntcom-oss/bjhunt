'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, Loader2, Mail, User, Building2, MessageSquare, Bell, Shield, ArrowRight, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionLabel } from '@/components/ui/section-label'
import { HexGridSVG } from '@/components/animations/hex-grid'

export default function BetaPage() {
  const { locale } = useParams<{ locale: string }>()
  const searchParams = useSearchParams()
  const isFr = locale === 'fr'
  const justRegistered = searchParams.get('registered') === 'true'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(justRegistered)
  const [error, setError] = useState('')
  const [betaCount, setBetaCount] = useState<number | null>(null)
  const BETA_LIMIT = 100

  useEffect(() => {
    const loadBetaCount = async () => {
      try {
        const response = await fetch('/api/beta', { cache: 'no-store' })
        if (!response.ok) {
          setBetaCount(null)
          return
        }
        const data = await response.json()
        setBetaCount(typeof (data as { count?: unknown }).count === 'number' ? (data as { count: number }).count : null)
      } catch {
        setBetaCount(null)
      }
    }

    loadBetaCount()
  }, [])

  const spotsLeft = betaCount !== null ? Math.max(0, BETA_LIMIT - betaCount) : null
  const progress = betaCount !== null ? Math.min(100, Math.round((betaCount / BETA_LIMIT) * 100)) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to submit')
      }

      setSubmitted(true)
      if (betaCount !== null) setBetaCount(betaCount + 1)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="pt-14 min-h-screen">
        <div className="max-w-lg mx-auto px-8 py-20 text-center">
          <div className="w-16 h-16 border border-[var(--success)] bg-[var(--success)]/10 mx-auto mb-6 flex items-center justify-center">
            <Check className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-4">
            {isFr ? 'Demande enregistrée !' : 'Request registered!'}
          </h1>
          <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6 text-left flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                {isFr
                  ? 'Nous sommes actuellement en phase beta fermée. Vous serez notifié par email dès que la plateforme sera pleinement opérationnelle.'
                  : 'We are currently in closed beta phase. You will be notified by email as soon as the platform is fully operational.'}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                {isFr
                  ? 'Notre équipe examine chaque demande individuellement. Si votre profil correspond, vous recevrez vos identifiants de connexion.'
                  : 'Our team reviews each request individually. If your profile matches, you will receive your login credentials.'}
              </p>
            </div>
          </div>
          {betaCount !== null && (
            <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                  {isFr ? 'Places beta' : 'Beta spots'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">{betaCount}/{BETA_LIMIT}</span>
              </div>
              <div className="h-1.5 bg-[var(--border)] overflow-hidden">
                <div className="h-full bg-[var(--text)] transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                {spotsLeft !== null && spotsLeft > 0
                  ? (isFr ? `${spotsLeft} places restantes` : `${spotsLeft} spots remaining`)
                  : (isFr ? "Liste d'attente active" : 'Waitlist active')}
              </p>
            </div>
          )}
          <Link href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            {isFr ? "Retour à l'accueil" : 'Back to home'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-14 min-h-screen">
      {/* Hero */}
      <div className="border-b border-[var(--border)] grid lg:grid-cols-2">
        <div className="px-8 md:px-12 py-16">
          <div className="flex items-center gap-3 mb-4">
            <SectionLabel>Accès anticipé</SectionLabel>
            <Badge variant="warning">Places limitées</Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Rejoignez la Beta.</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Accès prioritaire aux nouvelles fonctionnalités, support direct de l'équipe.
          </p>
        </div>
        <div className="hidden lg:flex items-center justify-center border-l border-[var(--border)] p-12">
          <HexGridSVG className="w-48 h-48 opacity-70" />
        </div>
      </div>
      {/* Form content */}
      <div className="max-w-lg mx-auto px-8 py-16">
        {betaCount !== null && (
          <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-8">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">
                  {isFr ? 'Progression beta' : 'Beta progress'}
                </span>
              </div>
              <span className="text-sm font-bold font-mono">
                {betaCount}<span className="text-[var(--text-muted)]">/{BETA_LIMIT}</span>
              </span>
            </div>
            <div className="h-2 bg-[var(--border)] overflow-hidden">
              <div className="h-full bg-[var(--text)] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              {spotsLeft !== null && spotsLeft > 0
                ? (isFr ? `${spotsLeft} places restantes sur ${BETA_LIMIT}` : `${spotsLeft} spots remaining out of ${BETA_LIMIT}`)
                : (isFr ? "Liste d'attente — vous serez notifié" : 'Waitlist — you will be notified')}
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-2 mb-10 border border-[var(--border)] bg-[var(--bg-card)] p-6">
          {[
            isFr ? 'Scans illimités pendant la Beta' : 'Unlimited scans during Beta',
            isFr ? 'Accès API complet' : 'Full API access',
            isFr ? 'Rapport de vulnérabilités PDF' : 'PDF vulnerability report',
            isFr ? "Support direct de l'équipe fondatrice" : 'Direct support from the founding team',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span className="text-[var(--success)]">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">
                {isFr ? 'Nom complet' : 'Full name'} *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isFr ? 'Jean Dupont' : 'John Doe'}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">
                {isFr ? 'Email professionnel' : 'Professional email'} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={isFr ? 'jean@entreprise.com' : 'john@company.com'}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text)] transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">
              {isFr ? 'Entreprise' : 'Company'}{' '}
              <span className="text-[var(--text-muted)]">({isFr ? 'optionnel' : 'optional'})</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder={isFr ? 'Nom de votre entreprise' : 'Your company name'}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] block mb-2">
              {isFr ? 'Pourquoi rejoindre la beta ?' : 'Why join the beta?'} *
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
              <textarea
                required
                rows={3}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder={isFr ? 'Ex: Je suis pentester et je veux tester vos outils...' : "Ex: I'm a pentester and want to test your tools..."}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text)] transition-colors resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-[11px] border border-red-500/20 bg-red-500/5 px-3 py-2.5">
              <span className="text-red-400 mt-px">!</span>
              <span className="text-red-400/80">{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              isFr ? "Demander l'accès" : 'Request access'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
