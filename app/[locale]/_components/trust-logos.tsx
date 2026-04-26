// app/[locale]/_components/trust-logos.tsx
//
// BJHUNT 2026 refonte — token-pinned colors, gap-12 mobile / gap-16 desktop.

"use client";

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
        background: "var(--bjhunt-2026-bg)",
        borderTop: "1px solid var(--bjhunt-2026-border)",
        borderBottom: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <div className="mx-auto mb-7 flex max-w-[1280px] items-center gap-4 px-6 md:px-8 lg:px-12">
        <div className="h-px flex-1" style={{ background: "var(--bjhunt-2026-border)" }} />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-2026-text-muted)",
          }}
        >
          Trusted infrastructure / Production stack
        </span>
        <div className="h-px flex-1" style={{ background: "var(--bjhunt-2026-border)" }} />
      </div>

      <div className="relative overflow-hidden">
        <div className="marquee flex w-max gap-12 sm:gap-14 md:gap-16">
          {REPEATED.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="flex-shrink-0 font-mono uppercase transition-colors duration-150"
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.18em",
                color: "var(--bjhunt-2026-text-muted)",
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
