/**
 * SeverityBadge — atomic, reusable severity pill.
 * Per docs/architecture/17-DESIGN-SYSTEM.md §Severity Badge.
 *
 * Reads from design-tokens.css via CSS variables — colour palette refreshes
 * land in W8 by editing tokens, not this component.
 */

import { type CSSProperties } from 'react'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

const LABEL: Record<Severity, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
}

const COLOR_MAP: Record<
  Severity,
  { fg: string; bg: string; border: string }
> = {
  critical: {
    fg: 'var(--bjhunt-severity-critical)',
    bg: 'var(--bjhunt-severity-critical-bg)',
    border: 'var(--bjhunt-severity-critical)',
  },
  high: {
    fg: 'var(--bjhunt-severity-high)',
    bg: 'var(--bjhunt-severity-high-bg)',
    border: 'var(--bjhunt-severity-high)',
  },
  medium: {
    fg: 'var(--bjhunt-severity-medium)',
    bg: 'var(--bjhunt-severity-medium-bg)',
    border: 'var(--bjhunt-severity-medium)',
  },
  low: {
    fg: 'var(--bjhunt-severity-low)',
    bg: 'var(--bjhunt-severity-low-bg)',
    border: 'var(--bjhunt-severity-low)',
  },
  info: {
    fg: 'var(--bjhunt-severity-info)',
    bg: 'var(--bjhunt-severity-info-bg)',
    border: 'var(--bjhunt-severity-info)',
  },
}

export interface SeverityBadgeProps {
  severity: Severity
  /** Optional CVSS score appended after the label (e.g. "CRITICAL · 9.8") */
  cvss?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_STYLE: Record<NonNullable<SeverityBadgeProps['size']>, CSSProperties> = {
  sm: { fontSize: 'var(--bjhunt-text-xs)', padding: '2px 6px', letterSpacing: '0.04em' },
  md: { fontSize: 'var(--bjhunt-text-xs)', padding: '3px 8px', letterSpacing: '0.05em' },
  lg: { fontSize: 'var(--bjhunt-text-sm)', padding: '4px 10px', letterSpacing: '0.06em' },
}

export function SeverityBadge({
  severity,
  cvss,
  size = 'md',
  className,
}: SeverityBadgeProps) {
  const colors = COLOR_MAP[severity]
  const style: CSSProperties = {
    color: colors.fg,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 'var(--bjhunt-radius-sm)',
    fontFamily: 'var(--bjhunt-font-mono)',
    fontWeight: 600,
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    lineHeight: 1.2,
    ...SIZE_STYLE[size],
  }

  return (
    <span
      role="status"
      aria-label={`Severity: ${LABEL[severity].toLowerCase()}${cvss != null ? `, CVSS ${cvss}` : ''}`}
      style={style}
      className={className}
    >
      {LABEL[severity]}
      {cvss != null && (
        <>
          <span style={{ opacity: 0.6 }}>·</span>
          <span>{cvss.toFixed(1)}</span>
        </>
      )}
    </span>
  )
}
