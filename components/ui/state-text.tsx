/**
 * StateText — refonte 2026 §7 Table.
 *
 * Severity / status columns render TEXT colored by state, not pill backgrounds.
 * Defaults to mono 11px UPPERCASE +0.18em tracking (eyebrow micro form) — the
 * canonical look for severity cells. `as` lets you switch to body for inline
 * use.
 */
'use client'

import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TextState =
  | 'success'
  | 'warning'
  | 'critical'
  | 'neutral'
  // Severity aliases (per design-tokens 2026 §1)
  | 'severity-critical'
  | 'severity-high'
  | 'severity-medium'
  | 'severity-low'
  | 'severity-info'

const COLOR: Record<TextState, string> = {
  success:           'var(--state-success)',
  warning:           'var(--state-warning)',
  critical:          'var(--state-critical)',
  neutral:           'var(--bjhunt-text-muted)',
  'severity-critical': 'var(--state-critical)',
  'severity-high':   'var(--state-critical)',
  'severity-medium': 'var(--state-warning)',
  'severity-low':    'var(--state-success)',
  'severity-info':   'var(--bjhunt-text-muted)',
}

export interface StateTextProps {
  state: TextState
  /**
   * Visual register:
   *   - "micro"  — mono 11px UPPERCASE +0.18em (default — for severity cells / chips)
   *   - "body"   — 14px sans, no transform (for inline phrases)
   *   - "code"   — 13px mono, no transform
   */
  as?: 'micro' | 'body' | 'code'
  className?: string
  children: ReactNode
}

export function StateText({
  state,
  as = 'micro',
  className,
  children,
}: StateTextProps) {
  const color = COLOR[state]

  const baseStyle: CSSProperties = (() => {
    switch (as) {
      case 'body':
        return {
          fontSize: 14,
          fontFamily: 'var(--bjhunt-font-sans)',
          fontWeight: 500,
          lineHeight: 1.5,
          color,
        }
      case 'code':
        return {
          fontSize: 13,
          fontFamily: 'var(--bjhunt-font-mono)',
          lineHeight: 1.45,
          color,
        }
      case 'micro':
      default:
        return {
          fontSize: 11,
          fontFamily: 'var(--bjhunt-font-mono)',
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color,
        }
    }
  })()

  return (
    <span
      className={cn('bjhunt-state-text', className)}
      style={baseStyle}
    >
      {children}
    </span>
  )
}
