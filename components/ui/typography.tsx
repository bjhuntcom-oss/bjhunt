/**
 * Typography primitives — refonte 2026 §2.
 *
 * Display + H1 + H2 use `system-ui` (instant render). Body + UI use Inter.
 * Eyebrow is mono 12 / +0.18em / UPPERCASE / muted. Mono for IDs, IPs,
 * timestamps, paths, severities.
 */
import { type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const DISPLAY_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

export function Display({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      {...rest}
      className={cn('bjhunt-typo-display', className)}
      style={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 400,
        fontSize: 'clamp(40px, 5vw, 60px)',
        lineHeight: 1.0,
        letterSpacing: '-0.011em',
        color: 'var(--bjhunt-text)',
        margin: 0,
        ...rest.style,
      }}
    >
      {children}
    </h1>
  )
}

export function H1({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      {...rest}
      className={cn('bjhunt-typo-h1', className)}
      style={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 400,
        fontSize: 'clamp(28px, 3vw, 36px)',
        lineHeight: 1.11,
        letterSpacing: '-0.025em',
        color: 'var(--bjhunt-text)',
        margin: 0,
        ...rest.style,
      }}
    >
      {children}
    </h1>
  )
}

export function H2({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      {...rest}
      className={cn('bjhunt-typo-h2', className)}
      style={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 600,
        fontSize: 'clamp(22px, 2.4vw, 24px)',
        lineHeight: 1.33,
        letterSpacing: '-0.025em',
        color: 'var(--bjhunt-text)',
        margin: 0,
        ...rest.style,
      }}
    >
      {children}
    </h2>
  )
}

export function H3({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      {...rest}
      className={cn('bjhunt-typo-h3', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-sans)',
        fontWeight: 600,
        fontSize: 20,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        color: 'var(--bjhunt-text)',
        margin: 0,
        ...rest.style,
      }}
    >
      {children}
    </h3>
  )
}

export function H4({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      {...rest}
      className={cn('bjhunt-typo-h4', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-sans)',
        fontWeight: 600,
        fontSize: 16,
        lineHeight: 1.5,
        color: 'var(--bjhunt-text)',
        margin: 0,
        ...rest.style,
      }}
    >
      {children}
    </h4>
  )
}

export function Body({
  children,
  className,
  muted = false,
  size = 'md',
  ...rest
}: {
  children: ReactNode
  muted?: boolean
  size?: 'lg' | 'md' | 'sm'
} & HTMLAttributes<HTMLParagraphElement>) {
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 13 : 14
  return (
    <p
      {...rest}
      className={cn('bjhunt-typo-body', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-sans)',
        fontWeight: 400,
        fontSize,
        lineHeight: size === 'lg' ? 1.6 : size === 'sm' ? 1.4 : 1.5,
        color: muted ? 'var(--bjhunt-text-muted)' : 'var(--bjhunt-text)',
        margin: 0,
        ...rest.style,
      }}
    >
      {children}
    </p>
  )
}

export function Eyebrow({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn('bjhunt-typo-eyebrow', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--bjhunt-text-muted)',
        ...rest.style,
      }}
    >
      {children}
    </span>
  )
}

export function Code({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <code
      {...rest}
      className={cn('bjhunt-typo-code', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 13,
        lineHeight: 1.45,
        color: 'var(--bjhunt-text)',
        ...rest.style,
      }}
    >
      {children}
    </code>
  )
}

export function Micro({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn('bjhunt-typo-micro', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.3,
        color: 'var(--bjhunt-text-muted)',
        ...rest.style,
      }}
    >
      {children}
    </span>
  )
}
