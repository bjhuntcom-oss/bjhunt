/**
 * FindingCard — atomic finding display per docs/architecture/17-DESIGN-SYSTEM.md §Finding Card.
 *
 * Reads from design-tokens.css via CSS variables. Palette refreshes land in W8
 * by editing tokens, not this component.
 *
 * Two density modes:
 *   - full    (default) — 20px padding, full description, action buttons visible
 *   - compact           — 12px padding, clamped description, actions collapsed to icons
 *
 * Respects prefers-reduced-motion via the --bjhunt-duration-* tokens (already
 * zeroed in design-tokens.css under the reduced-motion media query).
 */
'use client'

import { useTranslations } from 'next-intl'
import { ExternalLink, ShieldCheck, FileSearch, Wrench, Bot } from 'lucide-react'
import { type CSSProperties, type KeyboardEvent } from 'react'
import { SeverityBadge, type Severity } from './severity-badge'
import { Badge } from './badge'
import { agentMeta, type AgentId } from '@/lib/agent-labels'
import { cn } from '@/lib/utils'

export interface FindingCardProps {
  severity: Severity
  title: string
  /** CVE identifier (e.g. "CVE-2021-44228"). Rendered as link to NVD. */
  cve?: string | null
  /** CVSS 3.1 base score (0.0-10.0). */
  cvss?: number
  /** MITRE ATT&CK technique id (e.g. "T1190"). */
  mitre?: string | null
  /** Source agent upstream id — resolved via agentMeta(). */
  agent?: AgentId | string | null
  /** Verifier agent confirmed this is exploitable (zero-FP label). */
  verified?: boolean
  description: string
  onViewEvidence?: () => void
  onViewRecommendation?: () => void
  onClick?: () => void
  /** Density — default full. */
  compact?: boolean
  /** Highlight ring (e.g. when this finding just arrived over SSE). */
  justArrived?: boolean
  className?: string
}

const NVD_BASE = 'https://nvd.nist.gov/vuln/detail/'
const ATTACK_BASE = 'https://attack.mitre.org/techniques/'

export function FindingCard({
  severity,
  title,
  cve,
  cvss,
  mitre,
  agent,
  verified,
  description,
  onViewEvidence,
  onViewRecommendation,
  onClick,
  compact = false,
  justArrived = false,
  className,
}: FindingCardProps) {
  const t = useTranslations('components.findingCard')
  const meta = agent ? agentMeta(agent) : null
  const interactive = typeof onClick === 'function'

  const accent = `var(--bjhunt-severity-${severity})`
  const pad = compact ? 16 : 24

  const wrap: CSSProperties = {
    backgroundColor: 'var(--bjhunt-bg-surface)',
    borderRadius: 'var(--bjhunt-radius-md)',
    borderLeft: `4px solid ${accent}`,
    border: '1px solid var(--bjhunt-border)',
    borderLeftWidth: 4,
    padding: pad,
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? 8 : 12,
    cursor: interactive ? 'pointer' : 'default',
    transition: `border-color var(--bjhunt-duration-base) var(--bjhunt-ease-out)`,
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      role={interactive ? 'button' : 'article'}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKey}
      aria-label={`${severity} finding: ${title}`}
      style={wrap}
      className={cn('bjhunt-finding-card group', className)}
    >
      {/* Row 1 — severity + title */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <SeverityBadge severity={severity} size={compact ? 'sm' : 'md'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              color: 'var(--bjhunt-text)',
              fontSize: compact ? 'var(--bjhunt-text-base)' : 'var(--bjhunt-text-lg)',
              fontWeight: 600,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              textWrap: 'pretty',
            }}
          >
            {title}
          </h3>
          {cve && (
            <a
              href={`${NVD_BASE}${cve}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 'var(--bjhunt-text-xs)',
                color: 'var(--bjhunt-text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 2,
              }}
              className="hover:underline hover:text-[var(--bjhunt-text)]"
            >
              {cve}
              <ExternalLink style={{ width: 10, height: 10 }} />
            </a>
          )}
        </div>
        {verified && (
          <span
            title={t('verifiedTooltip')}
            aria-label={t('verified')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              fontSize: 'var(--bjhunt-text-xs)',
              fontFamily: 'var(--bjhunt-font-mono)',
              color: 'var(--state-success)',
              border: '1px solid var(--state-success)',
              borderRadius: 'var(--bjhunt-radius-sm)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            <ShieldCheck style={{ width: 10, height: 10 }} />
            {t('verified')}
          </span>
        )}
      </div>

      {/* Row 2 — metadata strip */}
      {(cvss != null || mitre || meta) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: compact ? 8 : 12,
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 'var(--bjhunt-text-xs)',
            color: 'var(--bjhunt-text-muted)',
          }}
        >
          {cvss != null && (
            <span>
              <span style={{ color: 'var(--bjhunt-text-muted)' }}>{t('cvss')}</span>{' '}
              <span style={{ color: 'var(--bjhunt-text)', fontWeight: 600 }}>
                {cvss.toFixed(1)}
              </span>
            </span>
          )}
          {cvss != null && (mitre || meta) && (
            <span aria-hidden style={{ color: 'var(--bjhunt-border-strong)' }}>│</span>
          )}
          {mitre && (
            <a
              href={`${ATTACK_BASE}${mitre.replace('.', '/')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: 'none' }}
            >
              <Badge variant="default" className="hover:text-white transition-colors">
                {mitre}
              </Badge>
            </a>
          )}
          {mitre && meta && (
            <span aria-hidden style={{ color: 'var(--bjhunt-border-strong)' }}>│</span>
          )}
          {meta && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Bot style={{ width: 11, height: 11, color: `var(--bjhunt-text-muted)` }} />
              <span style={{ color: 'var(--bjhunt-text-muted)' }}>{t('agent')}</span>{' '}
              <span style={{ color: 'var(--bjhunt-text)' }}>{meta.label}</span>
            </span>
          )}
        </div>
      )}

      {/* Row 3 — description */}
      {!compact && (
        <p
          style={{
            color: 'var(--bjhunt-text-muted)',
            fontSize: 'var(--bjhunt-text-sm)',
            lineHeight: 1.55,
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          {description}
        </p>
      )}
      {compact && (
        <p
          style={{
            color: 'var(--bjhunt-text-muted)',
            fontSize: 'var(--bjhunt-text-xs)',
            lineHeight: 1.5,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {description}
        </p>
      )}

      {/* Row 4 — actions */}
      {(onViewEvidence || onViewRecommendation) && (
        <div
          style={{
            display: 'flex',
            gap: compact ? 4 : 8,
            marginTop: compact ? 0 : 4,
          }}
        >
          {onViewEvidence && (
            <ActionButton
              compact={compact}
              icon={FileSearch}
              label={t('viewEvidence')}
              onClick={(e) => {
                e.stopPropagation()
                onViewEvidence()
              }}
            />
          )}
          {onViewRecommendation && (
            <ActionButton
              compact={compact}
              icon={Wrench}
              label={t('viewRecommendation')}
              onClick={(e) => {
                e.stopPropagation()
                onViewRecommendation()
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  compact,
  icon: Icon,
  label,
  onClick,
}: {
  compact: boolean
  icon: typeof FileSearch
  label: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '4px 8px' : '6px 10px',
        fontSize: 'var(--bjhunt-text-xs)',
        fontFamily: 'var(--bjhunt-font-sans)',
        fontWeight: 500,
        color: 'var(--bjhunt-text-muted)',
        backgroundColor: 'transparent',
        border: '1px solid var(--bjhunt-border)',
        borderRadius: 'var(--bjhunt-radius-sm)',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        transition: `color var(--bjhunt-duration-fast) var(--bjhunt-ease-out), border-color var(--bjhunt-duration-fast) var(--bjhunt-ease-out), background-color var(--bjhunt-duration-fast) var(--bjhunt-ease-out)`,
      }}
      className="hover:text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.02]"
    >
      <Icon style={{ width: 12, height: 12 }} aria-hidden />
      {compact ? null : label}
      <span className="sr-only">{compact ? label : ''}</span>
    </button>
  )
}
