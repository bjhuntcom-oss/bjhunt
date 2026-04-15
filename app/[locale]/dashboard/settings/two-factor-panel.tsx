'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ShieldCheck, ShieldOff, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserBackendFetch } from '@/lib/backend-client'

interface TwoFactorPanelProps {
  locale: string
}

type PanelState = 'loading' | 'disabled' | 'setup' | 'verify' | 'enabled'

export function TwoFactorPanel({ locale }: TwoFactorPanelProps) {
  const isFr = locale === 'fr'
  const [state, setState] = useState<PanelState>('loading')
  const [otpauthUri, setOtpauthUri] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const checkStatus = useCallback(async () => {
    try {
      const res = await browserBackendFetch('/api/auth/me')
      if (res.ok) {
        const body = await res.json()
        setState(body.user?.totpEnabled ? 'enabled' : 'disabled')
      } else {
        setState('disabled')
      }
    } catch {
      setState('disabled')
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const startSetup = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await browserBackendFetch('/api/auth/2fa/setup', {
        method: 'POST',
      })
      if (res.ok) {
        const body = await res.json()
        setOtpauthUri(body.otpauthUri ?? body.uri ?? '')
        setState('verify')
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? (isFr ? 'Echec de la configuration.' : 'Setup failed.'))
      }
    } catch {
      setError(isFr ? 'Erreur reseau.' : 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  const verifyAndEnable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await browserBackendFetch('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      if (res.ok) {
        const body = await res.json()
        setBackupCodes(body.backupCodes ?? [])
        setState('enabled')
        setCode('')
      } else {
        const body = await res.json().catch(() => ({}))
        if (body.error === 'INVALID_CODE') {
          setError(isFr ? 'Code invalide. Reessayez.' : 'Invalid code. Try again.')
        } else {
          setError(body.error ?? (isFr ? 'Echec de la verification.' : 'Verification failed.'))
        }
      }
    } catch {
      setError(isFr ? 'Erreur reseau.' : 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  const disable2FA = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await browserBackendFetch('/api/auth/2fa/disable', {
        method: 'POST',
      })
      if (res.ok) {
        setState('disabled')
        setBackupCodes([])
        setOtpauthUri('')
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? (isFr ? 'Echec de la desactivation.' : 'Disable failed.'))
      }
    } catch {
      setError(isFr ? 'Erreur reseau.' : 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (state === 'loading') {
    return (
      <section className="mb-8">
        <h2 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          {isFr ? 'Authentification a deux facteurs' : 'Two-Factor Authentication'}
        </h2>
        <div className="border border-[var(--border)] p-4 text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isFr ? 'Chargement...' : 'Loading...'}
        </div>
      </section>
    )
  }

  return (
    <section className="mb-8">
      <h2 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
        {isFr ? 'Authentification a deux facteurs' : 'Two-Factor Authentication'}
      </h2>

      <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
        {/* Status row */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {state === 'enabled' ? (
              <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
            ) : (
              <ShieldOff className="w-4 h-4 text-[var(--text-muted)]" />
            )}
            <div>
              <div className="text-[11px] font-mono text-white">
                {state === 'enabled'
                  ? (isFr ? '2FA est active' : '2FA is active')
                  : (isFr ? '2FA est desactivee' : '2FA is disabled')}
              </div>
              <div className="text-[9px] font-mono text-[var(--text-muted)]">
                {state === 'enabled'
                  ? (isFr ? 'Votre compte est protege par TOTP' : 'Your account is protected by TOTP')
                  : (isFr ? 'Ajoutez une couche de securite supplementaire' : 'Add an extra layer of security')}
              </div>
            </div>
          </div>

          {state === 'enabled' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={disable2FA}
              disabled={submitting}
              className="text-[var(--danger)] hover:text-[var(--danger)]"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {isFr ? 'Desactiver' : 'Disable'}
            </Button>
          ) : state === 'disabled' ? (
            <Button size="sm" onClick={startSetup} disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {isFr ? 'Activer 2FA' : 'Enable 2FA'}
            </Button>
          ) : null}
        </div>

        {/* Setup / Verify flow */}
        {(state === 'setup' || state === 'verify') && (
          <div className="p-6">
            {otpauthUri && (
              <div className="mb-4">
                <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
                  {isFr ? 'URI OTP (scannez avec votre app)' : 'OTP URI (scan with your app)'}
                </label>
                <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2">
                  <code className="text-[10px] font-mono text-white flex-1 break-all select-all">
                    {otpauthUri}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(otpauthUri)}
                    className="text-[var(--text-muted)] hover:text-white transition-colors shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1.5">
                  {isFr
                    ? 'Copiez cette URI dans Google Authenticator, Authy ou 1Password.'
                    : 'Copy this URI into Google Authenticator, Authy, or 1Password.'}
                </p>
              </div>
            )}

            <form onSubmit={verifyAndEnable}>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
                {isFr ? 'Code a 6 chiffres' : '6-digit code'}
              </label>
              <div className="flex items-end gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  className="w-32 text-center font-mono tracking-[0.3em]"
                  autoComplete="one-time-code"
                />
                <Button size="sm" type="submit" disabled={submitting || code.length !== 6}>
                  {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  {isFr ? 'Verifier' : 'Verify'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Backup codes */}
        {backupCodes.length > 0 && (
          <div className="p-6">
            <div className="border border-[var(--warning)]/25 bg-[var(--warning)]/10 p-4">
              <p className="text-[9px] font-mono text-[var(--warning)] uppercase tracking-widest mb-3">
                {isFr
                  ? 'Codes de secours — sauvegardez-les maintenant'
                  : 'Backup codes — save these now'}
              </p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {backupCodes.map((bc) => (
                  <code key={bc} className="text-[11px] font-mono text-white bg-black/30 px-2 py-1 text-center">
                    {bc}
                  </code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <Copy className="w-3 h-3" />
                {isFr ? 'Copier tous les codes' : 'Copy all codes'}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4">
            <div className="border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
