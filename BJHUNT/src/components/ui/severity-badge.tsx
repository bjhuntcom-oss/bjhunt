/**
 * SeverityBadge — five severity tiers × three visual variants × three sizes.
 *
 * Variants (per docs/architecture/17-DESIGN-SYSTEM.md §Severity):
 *   - solid    default emphasis; pulses on critical when `pulse` is true
 *   - outline  filter pills + dashboard tiles where color coexists with dense chrome
 *   - minimal  dot + label for tables and dense lists
 *
 * Colors are surfaced as CSS variables (--bjhunt-severity-*) in design-tokens.css
 * so palette tweaks in W8 land without touching this file.
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

const COLOR_RGB: Record<Severity, string> = {
  critical: '255,69,58',
  high: '255,159,10',
  medium: '255,214,10',
  low: '48,209,88',
  info: '100,210,255',
}

const INTENSITY: Record<Severity, number> = {
  critical: 1,
  high: 0.78,
  medium: 0.58,
  low: 0.4,
  info: 0.3,
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
  const rgb = COLOR_RGB[severity]
  const intensity = INTENSITY[severity]
  const s = SIZE[size]
  const color = `var(--bjhunt-severity-${severity}, rgb(${rgb}))`

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
    transition: 'box-shadow var(--bjhunt-duration-fast, 180ms) var(--bjhunt-easing-out, ease), border-color var(--bjhunt-duration-fast, 180ms) var(--bjhunt-easing-out, ease)',
  }

  let variantStyle: CSSProperties = {}
  let innerDot: ReactNode = null

  if (variant === 'solid') {
    variantStyle = {
      backgroundColor: color,
      color: '#07070B',
      fontWeight: 600,
      boxShadow: `0 0 0 1px rgba(${rgb},0.4), 0 0 ${16 * intensity}px rgba(${rgb},${0.35 * intensity})`,
      animation: pulse && severity === 'critical' ? 'sev-pulse 2.4s var(--bjhunt-easing-out, ease) infinite' : undefined,
    }
  } else if (variant === 'outline') {
    variantStyle = {
      backgroundColor: `rgba(${rgb},0.06)`,
      color,
      border: `1px solid rgba(${rgb},0.28)`,
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
          boxShadow: `0 0 ${8 * intensity}px rgba(${rgb},0.6)`,
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
        ? '1px solid rgba(7,7,11,0.18)'
        : '1px solid rgba(255,255,255,0.1)',
    color: variant === 'solid' ? 'rgba(7,7,11,0.7)' : 'var(--bjhunt-text-muted)',
    letterSpacing: '0.1em',
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <>
      {/* keyframes injected once at module level via a <style> sibling is awkward —
          define here so the component is fully self-contained. */}
      <style>{`@keyframes sev-pulse {
        0%, 100% { box-shadow: 0 0 0 1px rgba(${rgb},0.4), 0 0 16px rgba(${rgb},0.35), 0 0 0 0 rgba(${rgb},0.5); }
        50% { box-shadow: 0 0 0 1px rgba(${rgb},0.5), 0 0 24px rgba(${rgb},0.55), 0 0 0 6px rgba(${rgb},0); }
      }`}</style>
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
    </>
  )
}
