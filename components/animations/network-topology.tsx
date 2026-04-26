// components/animations/network-topology.tsx
//
// Refonte 2026: replaced the dot-and-line graph with a monospaced ASCII-style
// topology rendered inline as an SVG <text> grid. Same export name + props
// as before. No animation — flat hairline aesthetic per spec §9.

const LINES = [
  "  [01]──────[02]      [03]",
  "    │         │         │",
  "    └────[HUB]┘         │",
  "          │             │",
  "    ┌─────┼─────┐       │",
  "    │     │     │       │",
  "  [04]  [05]  [06]────[07]",
  "    │           │       │",
  "    └────[08]───┘     [09]",
];

export function NetworkTopologySVG({ className }: { className?: string }) {
  const charW = 7.6;
  const lineH = 16;
  const padX = 12;
  const padY = 14;
  const maxLen = Math.max(...LINES.map((l) => l.length));
  const w = maxLen * charW + padX * 2;
  const h = LINES.length * lineH + padY * 2;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="ASCII network topology with eight nodes connected through a central hub"
    >
      <rect
        x="1"
        y="1"
        width={w - 2}
        height={h - 2}
        fill="none"
        stroke="var(--bjhunt-border)"
        strokeWidth="1"
      />
      {LINES.map((line, i) => (
        <text
          key={i}
          x={padX}
          y={padY + (i + 1) * lineH - 4}
          fill="var(--bjhunt-text-muted)"
          fontSize="13"
          fontFamily="var(--bjhunt-font-mono)"
          xmlSpace="preserve"
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
