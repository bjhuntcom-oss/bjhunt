// app/[locale]/_components/trust-logos.tsx
"use client";

/**
 * W8 trust strip — minimal, hairline-bordered, JetBrains Mono caption.
 * Logos render as plain wordmarks with reduced opacity to keep the
 * visual hierarchy on the H1 above. Marquee retained for motion variety
 * but throttled to a slower duration.
 */

const TECH = [
  "Next.js",
  "TypeScript",
  "PostgreSQL",
  "Docker",
  "Redis",
  "Kubernetes",
  "Vercel",
  "Linux",
  "Neo4j",
  "LangGraph",
];

const REPEATED = [...TECH, ...TECH];

export function TrustLogos() {
  return (
    <section
      className="overflow-hidden py-10"
      style={{
        borderTop: "1px solid var(--bjhunt-border)",
        borderBottom: "1px solid var(--bjhunt-border)",
      }}
    >
      <div className="mb-7 flex items-center gap-4 px-8">
        <div className="h-px flex-1" style={{ background: "var(--bjhunt-border)" }} />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.32em",
            color: "var(--bjhunt-text-subtle)",
          }}
        >
          Trusted infrastructure / Production stack
        </span>
        <div className="h-px flex-1" style={{ background: "var(--bjhunt-border)" }} />
      </div>

      <div className="relative overflow-hidden">
        <div className="marquee flex w-max gap-16">
          {REPEATED.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="flex-shrink-0 font-mono uppercase transition-colors duration-300 hover:text-white"
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "var(--bjhunt-text-subtle)",
                fontWeight: 400,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
