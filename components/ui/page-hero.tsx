// components/ui/page-hero.tsx
//
// Refonte 2026 (Wave B8) page hero primitive.
//
// Renders the canonical eyebrow + H1 + body lede header that opens every
// dashboard page per `docs/refonte-2026/DESIGN-SYSTEM-2026.md` §2 + §7.
// Tokens are pulled from `app/design-tokens.css` so this stays a single
// source of truth — no inline hex.
//
// Usage:
//   <PageHero eyebrow="01 / SETTINGS" title="Paramètres" lede="…" />
//
// The eyebrow is mono +0.18em uppercase 12px @ var(--bjhunt-text-muted),
// the H1 is system-ui 400 ~36px with -0.025em tracking, and the lede is
// 16px Inter 400 @ var(--bjhunt-text-secondary, fallback muted).

import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  /** Optional right-aligned actions (buttons, badges, etc.) */
  actions?: ReactNode;
}

export function PageHero({ eyebrow, title, lede, actions }: PageHeroProps) {
  return (
    <header className="mb-10 md:mb-12 flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0 flex-1">
        <div
          className="inline-flex items-center gap-2 mb-4"
          style={{
            fontFamily: "var(--bjhunt-font-mono)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--bjhunt-text-muted)",
            lineHeight: 1.4,
          }}
        >
          <span
            aria-hidden
            className="inline-block"
            style={{
              width: 6,
              height: 6,
              borderRadius: "var(--bjhunt-radius-pill)",
              background: "var(--bjhunt-status-success, #00d992)",
            }}
          />
          <span>{eyebrow}</span>
        </div>
        <h1
          className="m-0"
          style={{
            fontFamily: "var(--bjhunt-font-display, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)",
            fontWeight: 400,
            fontSize: "clamp(28px, 3vw, 36px)",
            lineHeight: 1.11,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          {title}
        </h1>
        {lede && (
          <p
            className="mt-3 max-w-2xl"
            style={{
              fontFamily: "var(--bjhunt-font-sans)",
              fontWeight: 400,
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--bjhunt-text-muted)",
            }}
          >
            {lede}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

/**
 * Eyebrow — section-level eyebrow (above H2/H3 inside a page). Same
 * styling as the page hero eyebrow but without the leading status dot.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--bjhunt-text-muted)",
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}

/**
 * StatusDot — 6px circle in state color. Optional pulsing ring.
 * Per spec §7. Replaces inline `style={{ borderRadius: "50%" }}` patterns.
 */
type DotState = "success" | "warning" | "critical" | "neutral";

const DOT_COLORS: Record<DotState, string> = {
  success: "var(--bjhunt-status-success, #00d992)",
  warning: "var(--bjhunt-status-warning, #ffba00)",
  critical: "var(--bjhunt-status-danger, #fb565b)",
  neutral: "var(--bjhunt-text-muted, #8b949e)",
};

export function StatusDot({
  state = "neutral",
  label,
  pulse = false,
}: {
  state?: DotState;
  label?: ReactNode;
  pulse?: boolean;
}) {
  const color = DOT_COLORS[state];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={pulse ? "bjhunt-pulse" : undefined}
        style={{
          width: 6,
          height: 6,
          borderRadius: "var(--bjhunt-radius-pill)",
          background: color,
          flexShrink: 0,
        }}
      />
      {label && (
        <span
          style={{
            fontFamily: "var(--bjhunt-font-sans)",
            fontSize: 13,
            color: "var(--bjhunt-text)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
