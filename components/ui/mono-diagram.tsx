// components/ui/mono-diagram.tsx
//
// BJHUNT 2026 — Monospaced ASCII rule-art diagram primitive.
// Renders ASCII boxes connected by `─ │ ┌ ┐ └ ┘` glyphs in a <pre>
// styled with mono font + token colors. Replaces the inline neural-net
// SVGs on /technology + /technology/deep-dive (~950 LOC saved).
//
// Usage:
//   <MonoDiagram
//     ascii={`
//   ┌──────────────┐
//   │   BJHUNT     │
//   │   ORCHESTR.  │
//   └──────┬───────┘
//          │
//   ┌──────┴──────┐
//   │   AGENTS    │
//   └─────────────┘
//   `}
//   />

interface MonoDiagramProps {
  ascii: string;
  className?: string;
  /** Optional caption shown below the diagram in mono UPPERCASE. */
  caption?: string;
  /** Highlight regex match in state-success (e.g. /BJHUNT|AGENT/). */
  highlight?: RegExp;
}

export function MonoDiagram({ ascii, className, caption, highlight }: MonoDiagramProps) {
  // Trim leading newline + trailing whitespace, but preserve internal indentation.
  const cleaned = ascii.replace(/^\n+/, "").replace(/\s+$/, "");

  // Apply highlight by wrapping matches in <span class="highlight">.
  const rendered = highlight
    ? cleaned.replace(
        new RegExp(highlight.source, highlight.flags.includes("g") ? highlight.flags : highlight.flags + "g"),
        (m) => `${m}`,
      )
    : cleaned;

  const parts = highlight ? rendered.split(/|/) : [cleaned];

  return (
    <figure className={className} style={{ margin: 0 }}>
      <pre
        aria-hidden
        style={{
          margin: 0,
          padding: "20px 24px",
          fontFamily: 'var(--bjhunt-2026-font-mono, "SF Mono", Menlo, monospace)',
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--bjhunt-2026-text-muted)",
          background: "var(--bjhunt-2026-bg-surface)",
          border: "1px solid var(--bjhunt-2026-border)",
          borderRadius: 8,
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {highlight
          ? parts.map((part, i) => (
              <span
                key={i}
                style={i % 2 === 1 ? { color: "var(--bjhunt-2026-text)", fontWeight: 500 } : undefined}
              >
                {part}
              </span>
            ))
          : cleaned}
      </pre>
      {caption ? (
        <figcaption
          className="mt-3 font-mono uppercase"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-2026-text-muted)",
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
