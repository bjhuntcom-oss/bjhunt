/**
 * StatusDot — refonte 2026 §7 Component primitives.
 *
 * Replaces pill badges. 6px circle in state color (success/warning/critical/
 * neutral) optionally with a 2px outer tint ring that pulses on `live`. A 13px
 * label rendered in body color follows.
 *
 * Use this anywhere status used to be a colored pill (table cells, card
 * eyebrows, list badges). Severity columns should keep StateText, not this.
 */
'use client'

import { type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type DotState = 'success' | 'warning' | 'critical' | 'neutral'

const COLOR: Record<DotState, string> = {
  success: 'var(--state-success)',
  warning: 'var(--state-warning)',
  critical: 'var(--state-critical)',
  neutral: 'var(--bjhunt-text-muted)',
}

const TINT: Record<DotState, string> = {
  success: 'var(--state-success-tint)',
  warning: 'var(--state-warning-tint)',
  critical: 'var(--state-critical-tint)',
  neutral: 'rgba(255,255,255,0.06)',
}

export interface StatusDotProps {
  state: DotState
  /** Optional inline label (Body 13 in default body color). */
  label?: string
  /** Pulse the outer ring — used for "running"/"live". */
  live?: boolean
  /** Smaller dot variant (4px instead of 6px) for dense rows. */
  compact?: boolean
  className?: string
}

const KEYFRAMES = `
@keyframes bjhunt-status-pulse {
  0%   { box-shadow: 0 0 0 0 var(--bjhunt-pulse-color, currentColor); opacity: 1; }
  70%  { box-shadow: 0 0 0 6px transparent; opacity: 0.4; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .bjhunt-status-dot-live::after { animation: none !important; }
}
`

export function StatusDot({
  state,
  label,
  live = false,
  compact = false,
  className,
}: StatusDotProps) {
  const color = COLOR[state]
  const tint = TINT[state]
  const size = compact ? 4 : 6

  const dotStyle: CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    background: color,
    borderRadius: 9999,
    flexShrink: 0,
    position: 'relative',
    boxShadow: live ? `0 0 0 2px ${tint}` : undefined,
  }

  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      role="status"
      aria-label={label ?? `${state}`}
    >
      <style>{KEYFRAMES}</style>
      <span
        aria-hidden
        className={live ? 'bjhunt-status-dot-live' : undefined}
        style={dotStyle}
      >
        {live && (
          <span
            aria-hidden
            style={
              {
                position: 'absolute',
                inset: -2,
                borderRadius: 9999,
                animation: 'bjhunt-status-pulse 1.6s ease-out infinite',
                ['--bjhunt-pulse-color' as string]: color,
              } as CSSProperties
            }
          />
        )}
      </span>
      {label && (
        <span
          style={{
            fontSize: 13,
            fontFamily: 'var(--bjhunt-font-sans)',
            color: 'var(--bjhunt-text)',
            lineHeight: 1.4,
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}
