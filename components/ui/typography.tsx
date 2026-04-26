/**
 * Typography primitives — refonte 2026 §2.
 *
 * Tailwind-only sizing/weight/tracking — never inline style (framer-motion v12
 * strips inline style on motion.* components). Display + H1 + H2 use
 * system-ui via `font-display`; Body + UI use Inter via `font-sans`.
 */
import {
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface BaseProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  muted?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  style?: CSSProperties;
  id?: string;
  title?: string;
}

const MUTED = "text-[var(--bjhunt-text-muted)]";

const BODY_SIZE: Record<NonNullable<BaseProps["size"]>, string> = {
  xs: "text-[11px] leading-[1.3]",
  sm: "text-[13px] leading-[1.4]",
  md: "text-[14px] leading-[1.5]",
  lg: "text-[16px] leading-[1.6]",
};

function makeProse(defaultTag: ElementType, baseClass: string, defaultSize?: string) {
  return function ProseComp({
    children,
    className,
    as,
    muted,
    size,
    ...rest
  }: BaseProps) {
    const Tag: ElementType = as ?? defaultTag;
    const sizeClass = size ? BODY_SIZE[size] : defaultSize;
    return (
      <Tag
        {...rest}
        className={cn(baseClass, sizeClass, muted && MUTED, className)}
      >
        {children}
      </Tag>
    );
  };
}

/** Hero — `clamp(40px, 5vw, 60px)` / 1.0 / -0.011em / 400 / display */
export const Display = makeProse(
  "h1",
  "font-display font-normal leading-none tracking-[-0.011em] text-[clamp(40px,5vw,60px)]"
);

/** H1 — `clamp(28px, 3vw, 36px)` / 1.11 / -0.025em / 400 / display */
export const H1 = makeProse(
  "h1",
  "font-display font-normal leading-[1.11] tracking-[-0.025em] text-[clamp(28px,3vw,36px)]"
);

/** H2 — `clamp(22px, 2.4vw, 24px)` / 1.33 / -0.025em / 600 / display */
export const H2 = makeProse(
  "h2",
  "font-display font-semibold leading-[1.33] tracking-[-0.025em] text-[clamp(22px,2.4vw,24px)]"
);

/** H3 — 20px / 1.4 / -0.01em / 600 / sans */
export const H3 = makeProse(
  "h3",
  "font-sans font-semibold text-[20px] leading-[1.4] tracking-[-0.01em]"
);

/** H4 — 16px / 1.5 / 0 / 600 / sans */
export const H4 = makeProse("h4", "font-sans font-semibold text-[16px] leading-[1.5]");

/** Body large — 16px / 1.6 / 400 / sans (size override falls back if provided) */
export const BodyL = makeProse(
  "p",
  "font-sans font-normal",
  "text-[16px] leading-[1.6]"
);

/** Body — 14px / 1.5 / 400 / sans */
export const Body = makeProse(
  "p",
  "font-sans font-normal",
  "text-[14px] leading-[1.5]"
);

/** Caption — 13px / 1.4 / 400 / sans */
export const Caption = makeProse(
  "span",
  "font-sans font-normal",
  "text-[13px] leading-[1.4]"
);

/** Eyebrow — 12px / 1.4 / +0.18em / 600 / mono UPPERCASE */
export const Eyebrow = makeProse(
  "span",
  "font-mono font-semibold text-[12px] leading-[1.4] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]"
);

/** Code — 13px / 1.45 / 400 / mono */
export const Code = makeProse("code", "font-mono font-normal text-[13px] leading-[1.45]");

/** Micro — 11px / 1.3 / 500 / mono */
export const Micro = makeProse("span", "font-mono font-medium text-[11px] leading-[1.3]");
