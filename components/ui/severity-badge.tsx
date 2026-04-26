/**
 * SeverityBadge — five severity tiers × three visual variants × three sizes.
 *
 * Refonte 2026: severity now maps to the tri-state palette
 * (critical/high → critical, medium → warning, low → success, info → muted).
 * Colors are surfaced as CSS variables via `--bjhunt-severity-*` so palette
 * tweaks land without touching this file.
 *
 * Variants:
 *   - solid    — filled chip; pulses on critical when `pulse` is true
 *   - outline  — tinted bg + state-color border (filter pills, dashboard tiles)
 *   - minimal  — dot + label (tables, dense lists)
 */
'use client'

import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type SeverityVariant = 'solid' | 'outline' | 'minimal'
export type SeveritySize = 'sm' | 'md' | 'lg'

export interface SeverityBadgeProps {
  severity: Severity
  variant?: SeverityVariant
  size?: SeveritySize
  /** Pulse the border/glow — critical on live SSE stream. Only meaningful on solid. */
  pulse?: boolean
  /** Optional CVSS score rendered to the right, separated by a mono divider. */
  cvss?: number
  /** Override label copy. Defaults to the capitalised severity name. */
  children?: ReactNode
  className?: string
  title?: string
}

const LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

/** Map each severity to a tri-state CSS variable used for color/tint. */
const STATE_VAR: Record<Severity, { color: string; tint: string }> = {
  critical: { color: 'var(--state-critical)', tint: 'var(--state-critical-tint)' },
  high:     { color: 'var(--state-critical)', tint: 'var(--state-critical-tint)' },
  medium:   { color: 'var(--state-warning)',  tint: 'var(--state-warning-tint)'  },
  low:      { color: 'var(--state-success)',  tint: 'var(--state-success-tint)'  },
  info:     { color: 'var(--bjhunt-text-muted)', tint: 'rgba(139,148,158,0.12)' },
}

const SIZE: Record<SeveritySize, { padY: number; padX: number; font: number; gap: number; tracking: string; dot: number }> = {
  sm: { padY: 3, padX: 8,  font: 9,  gap: 6,  tracking: '0.2em',  dot: 5 },
  md: { padY: 5, padX: 11, font: 10, gap: 8,  tracking: '0.24em', dot: 6 },
  lg: { padY: 7, padX: 14, font: 11, gap: 10, tracking: '0.26em', dot: 8 },
}

export function SeverityBadge({
  severity,
  variant = 'solid',
  size = 'md',
  pulse = false,
  cvss,
  children,
  className,
  title,
}: SeverityBadgeProps) {
  const { color, tint } = STATE_VAR[severity]
  const s = SIZE[size]

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--bjhunt-font-mono)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: s.tracking,
    fontSize: s.font,
    gap: s.gap,
    padding: `${s.padY}px ${s.padX}px`,
    verticalAlign: 'middle',
    borderRadius: 'var(--bjhunt-radius-sm)',
    transition: 'border-color var(--bjhunt-duration-fast) var(--bjhunt-ease-out)',
  }

  let variantStyle: CSSProperties = {}
  let innerDot: ReactNode = null

  if (variant === 'solid') {
    variantStyle = {
      backgroundColor: color,
      color: 'var(--bjhunt-bg)',
      fontWeight: 600,
      animation: pulse && severity === 'critical' ? 'pulse-dot 1.5s ease-in-out infinite' : undefined,
    }
  } else if (variant === 'outline') {
    variantStyle = {
      backgroundColor: tint,
      color,
      border: `1px solid ${color}`,
    }
  } else {
    // minimal
    variantStyle = {
      background: 'transparent',
      color,
      paddingLeft: 0,
      paddingRight: 0,
    }
    innerDot = (
      <span
        aria-hidden
        style={{
          width: s.dot,
          height: s.dot,
          backgroundColor: color,
          borderRadius: '9999px',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    )
  }

  const dividerStyle: CSSProperties = {
    fontFamily: 'var(--bjhunt-font-mono)',
    fontSize: s.font,
    paddingLeft: 8,
    marginLeft: 4,
    borderLeft:
      variant === 'solid'
        ? '1px solid rgba(0,0,0,0.18)'
        : '1px solid var(--bjhunt-border)',
    color: variant === 'solid' ? 'rgba(0,0,0,0.7)' : 'var(--bjhunt-text-muted)',
    letterSpacing: '0.1em',
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <span
      role="status"
      aria-label={`Severity ${LABELS[severity]}${cvss != null ? ` · CVSS ${cvss.toFixed(1)}` : ''}`}
      title={title}
      style={{ ...base, ...variantStyle }}
      className={cn('bjhunt-sev-badge', className)}
    >
      {innerDot}
      <span>{children ?? LABELS[severity]}</span>
      {cvss != null && <span style={dividerStyle}>{cvss.toFixed(1)}</span>}
    </span>
  )
}
