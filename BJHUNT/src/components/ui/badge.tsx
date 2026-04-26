/**
 * Badge — minimal outlined chip. Used inline in FindingCard metadata strip.
 */
import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps {
  variant?: 'default' | 'accent'
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Badge({ variant = 'default', children, className, style }: BadgeProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: 'var(--bjhunt-text-xs)',
    fontFamily: 'var(--bjhunt-font-mono)',
    fontWeight: 500,
    color: variant === 'accent' ? 'var(--bjhunt-brand-primary)' : 'var(--bjhunt-text-muted)',
    border: '1px solid var(--bjhunt-border-strong)',
    borderRadius: 'var(--bjhunt-radius-sm)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    ...style,
  }
  return (
    <span style={base} className={cn('bjhunt-badge', className)}>
      {children}
    </span>
  )
}
