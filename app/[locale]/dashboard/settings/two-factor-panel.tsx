'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ShieldCheck, ShieldOff, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/page-hero'
import { browserBackendFetch } from '@/lib/backend-client'

interface TwoFactorPanelProps {
  locale: string
}

type PanelState = 'loading' | 'disabled' | 'setup' | 'verify' | 'enabled'

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--bjhunt-bg-secondary, var(--surface, #101010))',
  borderColor: 'var(--bjhunt-border, #3d3a39)',
  borderRadius: 'var(--bjhunt-radius-md, 8px)',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--bjhunt-font-sans)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--bjhunt-text)',
}

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
      const res = await browserBackendFetch('/api/auth/2fa/setup', { method: 'POST' })
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
      const res = await browserBackendFetch('/api/auth/2fa/disable', { method: 'POST' })
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
      <div className="border p-4" style={CARD_STYLE}>
        <span
          className="inline-flex items-center gap-2"
          style={{ fontFamily: 'var(--bjhunt-font-sans)', fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          {isFr ? 'Chargement...' : 'Loading...'}
        </span>
      </div>
    )
  }

  return (
    <div className="border" style={CARD_STYLE}>
      {/* Status row */}
      <div
        className="p-6 flex items-center justify-between flex-wrap gap-3 border-b"
        style={{ borderColor: 'var(--bjhunt-border, #3d3a39)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {state === 'enabled' ? (
            <ShieldCheck
              className="w-5 h-5 shrink-0"
              style={{ color: 'var(--bjhunt-status-success, #00d992)' }}
            />
          ) : (
            <ShieldOff className="w-5 h-5 shrink-0" style={{ color: 'var(--bjhunt-text-muted)' }} />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="m-0"
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: 'var(--bjhunt-text)',
                }}
              >
                {isFr ? 'Authentification a deux facteurs' : 'Two-Factor Authentication'}
              </h3>
              <StatusDot
                state={state === 'enabled' ? 'success' : 'neutral'}
                label={
                  <span
                    style={{
                      fontFamily: 'var(--bjhunt-font-sans)',
                      fontSize: 13,
                      color:
                        state === 'enabled'
                          ? 'var(--bjhunt-status-success, #00d992)'
                          : 'var(--bjhunt-text-muted)',
                    }}
                  >
                    {state === 'enabled'
                      ? isFr
                        ? 'Active'
                        : 'Active'
                      : isFr
                        ? 'Desactivee'
                        : 'Disabled'}
                  </span>
                }
              />
            </div>
            <p
              className="mt-1"
              style={{
                fontFamily: 'var(--bjhunt-font-sans)',
                fontSize: 13,
                color: 'var(--bjhunt-text-muted)',
              }}
            >
              {state === 'enabled'
                ? isFr
                  ? 'Votre compte est protege par un code TOTP.'
                  : 'Your account is protected by TOTP.'
                : isFr
                  ? 'Ajoutez une couche de securite supplementaire.'
                  : 'Add an extra layer of security.'}
            </p>
          </div>
        </div>

        {state === 'enabled' ? (
          <Button
            variant="state" state="critical"
            size="md"
            onClick={disable2FA}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
            {isFr ? 'Desactiver' : 'Disable'}
          </Button>
        ) : state === 'disabled' ? (
          <Button variant="state" state="success" size="md" onClick={startSetup} disabled={submitting}>
            {submitting && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
            {isFr ? 'Activer 2FA' : 'Enable 2FA'}
          </Button>
        ) : null}
      </div>

      {/* Setup / Verify flow */}
      {(state === 'setup' || state === 'verify') && (
        <div
          className="p-6 border-b"
          style={{ borderColor: 'var(--bjhunt-border, #3d3a39)' }}
        >
          {otpauthUri && (
            <div className="mb-4">
              <label className="block mb-2" style={LABEL_STYLE}>
                {isFr ? 'URI OTP (scannez avec votre app)' : 'OTP URI (scan with your app)'}
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2 border"
                style={{
                  background: 'var(--bjhunt-bg-tertiary, var(--bjhunt-bg, #050507))',
                  borderColor: 'var(--bjhunt-border, #3d3a39)',
                  borderRadius: 'var(--bjhunt-radius, 6px)',
                }}
              >
                <code
                  className="flex-1 break-all select-all"
                  style={{
                    fontFamily: 'var(--bjhunt-font-mono)',
                    fontSize: 13,
                    color: 'var(--bjhunt-text)',
                  }}
                >
                  {otpauthUri}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(otpauthUri)}
                  className="shrink-0 transition-colors"
                  style={{ color: 'var(--bjhunt-text-muted)' }}
                  aria-label={isFr ? 'Copier' : 'Copy'}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p
                className="mt-2"
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontSize: 13,
                  color: 'var(--bjhunt-text-muted)',
                }}
              >
                {isFr
                  ? 'Copiez cette URI dans Google Authenticator, Authy ou 1Password.'
                  : 'Copy this URI into Google Authenticator, Authy, or 1Password.'}
              </p>
            </div>
          )}

          <form onSubmit={verifyAndEnable}>
            <label htmlFor="totp-code" className="block mb-2" style={LABEL_STYLE}>
              {isFr ? 'Code a 6 chiffres' : '6-digit code'}
            </label>
            <div className="flex items-end gap-3">
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                className="w-36 text-center font-mono tracking-[0.3em]"
                style={{ height: 40, borderRadius: 'var(--bjhunt-radius, 6px)' }}
                autoComplete="one-time-code"
              />
              <Button
                variant="state" state="success"
                size="md"
                type="submit"
                disabled={submitting || code.length !== 6}
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                {isFr ? 'Verifier' : 'Verify'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Backup codes */}
      {backupCodes.length > 0 && (
        <div className="p-6">
          <div
            className="px-4 py-4 border"
            style={{
              borderColor: 'var(--bjhunt-status-warning, #ffba00)',
              background: 'var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))',
              borderRadius: 'var(--bjhunt-radius, 6px)',
            }}
          >
            <p
              className="mb-3"
              style={{
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--bjhunt-status-warning, #ffba00)',
              }}
            >
              {isFr
                ? 'Codes de secours — sauvegardez-les maintenant'
                : 'Backup codes — save these now'}
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {backupCodes.map((bc) => (
                <code
                  key={bc}
                  className="px-2 py-1 text-center"
                  style={{
                    fontFamily: 'var(--bjhunt-font-mono)',
                    fontSize: 13,
                    color: 'var(--bjhunt-text)',
                    background: 'var(--bjhunt-bg, #050507)',
                    borderRadius: 'var(--bjhunt-radius-sm, 4px)',
                  }}
                >
                  {bc}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{
                fontFamily: 'var(--bjhunt-font-sans)',
                fontSize: 13,
                color: 'var(--bjhunt-text-muted)',
              }}
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
          <div
            role="alert"
            className="px-4 py-3"
            style={{
              border: '1px solid var(--bjhunt-status-danger, #fb565b)',
              background: 'var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))',
              borderRadius: 'var(--bjhunt-radius, 6px)',
              color: 'var(--bjhunt-status-danger, #fb565b)',
              fontFamily: 'var(--bjhunt-font-sans)',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        </div>
      )}
    </div>
  )
}
