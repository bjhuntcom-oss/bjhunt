"use client";

/**
 * Loading — global suspense fallback (refonte 2026 §B9).
 *
 * Centered spinner using `--state-success`. Tokens only — no hardcoded hex.
 * Respects prefers-reduced-motion via the global rule in design-tokens.css.
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bjhunt-bg)" }}
    >
      <div className="flex flex-col items-center gap-5">
        <div
          aria-hidden
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid var(--bjhunt-border)",
            borderTopColor: "var(--state-success)",
            animationDuration: "0.8s",
          }}
        />
        <p
          className="font-mono text-[12px] uppercase"
          style={{
            letterSpacing: "0.18em",
            color: "var(--bjhunt-text-muted)",
          }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
