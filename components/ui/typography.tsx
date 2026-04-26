/**
 * Typography primitives — refonte 2026 §2.
 *
 * Tailwind-only sizing/weight/tracking — never inline style (framer-motion v12
 * strips inline style on motion.* components). Display + H1 + H2 use
 * system-ui via `font-display`; Body + UI use Inter via `font-sans`.
 *
 * Usage:
 *   <Display>BJHUNT</Display>
 *   <H1>Findings</H1>
 *   <Eyebrow>System status</Eyebrow>
 */
import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

/** Hero — `clamp(40px, 5vw, 60px)` / 1.0 / -0.011em / 400 / display */
export function Display({ children, className, as: Tag = "h1" }: BaseProps) {
  return (
    <Tag
      className={cn(
        "font-display font-normal leading-none tracking-[-0.011em]",
        "text-[clamp(40px,5vw,60px)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** H1 — `clamp(28px, 3vw, 36px)` / 1.11 / -0.025em / 400 / display */
export function H1({ children, className, as: Tag = "h1" }: BaseProps) {
  return (
    <Tag
      className={cn(
        "font-display font-normal leading-[1.11] tracking-[-0.025em]",
        "text-[clamp(28px,3vw,36px)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** H2 — `clamp(22px, 2.4vw, 24px)` / 1.33 / -0.025em / 600 / display */
export function H2({ children, className, as: Tag = "h2" }: BaseProps) {
  return (
    <Tag
      className={cn(
        "font-display font-semibold leading-[1.33] tracking-[-0.025em]",
        "text-[clamp(22px,2.4vw,24px)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** H3 — 20px / 1.4 / -0.01em / 600 / sans */
export function H3({ children, className, as: Tag = "h3" }: BaseProps) {
  return (
    <Tag
      className={cn(
        "font-sans font-semibold text-[20px] leading-[1.4] tracking-[-0.01em]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** H4 — 16px / 1.5 / 0 / 600 / sans */
export function H4({ children, className, as: Tag = "h4" }: BaseProps) {
  return (
    <Tag
      className={cn(
        "font-sans font-semibold text-[16px] leading-[1.5]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** Body large — 16px / 1.6 / 400 / sans */
export function BodyL({ children, className, as: Tag = "p" }: BaseProps) {
  return (
    <Tag className={cn("font-sans font-normal text-[16px] leading-[1.6]", className)}>
      {children}
    </Tag>
  );
}

/** Body — 14px / 1.5 / 400 / sans */
export function Body({ children, className, as: Tag = "p" }: BaseProps) {
  return (
    <Tag className={cn("font-sans font-normal text-[14px] leading-[1.5]", className)}>
      {children}
    </Tag>
  );
}

/** Caption — 13px / 1.4 / 400 / sans */
export function Caption({ children, className, as: Tag = "span" }: BaseProps) {
  return (
    <Tag className={cn("font-sans font-normal text-[13px] leading-[1.4]", className)}>
      {children}
    </Tag>
  );
}

/** Eyebrow — 12px / 1.4 / +0.18em / 600 / mono UPPERCASE */
export function Eyebrow({ children, className, as: Tag = "span" }: BaseProps) {
  return (
    <Tag
      className={cn(
        "font-mono font-semibold text-[12px] leading-[1.4] uppercase tracking-[0.18em]",
        "text-[var(--bjhunt-text-muted)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** Code — 13px / 1.45 / 400 / mono */
export function Code({ children, className, as: Tag = "code" }: BaseProps) {
  return (
    <Tag className={cn("font-mono font-normal text-[13px] leading-[1.45]", className)}>
      {children}
    </Tag>
  );
}

/** Micro — 11px / 1.3 / 500 / mono */
export function Micro({ children, className, as: Tag = "span" }: BaseProps) {
  return (
    <Tag className={cn("font-mono font-medium text-[11px] leading-[1.3]", className)}>
      {children}
    </Tag>
  );
}
