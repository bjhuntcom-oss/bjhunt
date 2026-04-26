// components/animations/isometric-server.tsx
//
// Refonte 2026: replaced the 3D isometric cube with a flat front-view server
// rack — 5 horizontal slots, hairline 1px strokes, status dots in tri-state
// colors per row, monospaced labels RACK-01..05. Same export name + props as
// before for caller compatibility.
const ROWS = [
  { label: "RACK-01", state: "var(--state-success)" },
  { label: "RACK-02", state: "var(--state-success)" },
  { label: "RACK-03", state: "var(--state-warning)" },
  { label: "RACK-04", state: "var(--state-success)" },
  { label: "RACK-05", state: "var(--state-critical)" },
];

const SLOT_HEIGHT = 28;
const SLOT_GAP = 4;
const ROW_HEIGHT = SLOT_HEIGHT + SLOT_GAP;
const VIEW_W = 220;
const VIEW_H = ROWS.length * ROW_HEIGHT + 8;

export function IsometricServerSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="Server rack with five slots showing system status"
    >
      {/* Outer chassis */}
      <rect
        x="1"
        y="1"
        width={VIEW_W - 2}
        height={VIEW_H - 2}
        fill="none"
        stroke="var(--bjhunt-border)"
        strokeWidth="1"
      />
      {ROWS.map((row, i) => {
        const y = 4 + i * ROW_HEIGHT;
        return (
          <g key={row.label}>
            {/* Slot frame */}
            <rect
              x="6"
              y={y}
              width={VIEW_W - 12}
              height={SLOT_HEIGHT}
              fill="none"
              stroke="var(--bjhunt-border)"
              strokeWidth="1"
            />
            {/* Status dot */}
            <circle
              cx="20"
              cy={y + SLOT_HEIGHT / 2}
              r="3"
              fill={row.state}
            />
            {/* Label */}
            <text
              x="34"
              y={y + SLOT_HEIGHT / 2 + 4}
              fill="var(--bjhunt-text-muted)"
              fontSize="11"
              fontFamily="var(--bjhunt-font-mono)"
              letterSpacing="1.4"
            >
              {row.label}
            </text>
            {/* LED strip */}
            <rect
              x={VIEW_W - 50}
              y={y + SLOT_HEIGHT / 2 - 1}
              width="38"
              height="2"
              fill="var(--bjhunt-border-strong)"
            />
          </g>
        );
      })}
    </svg>
  );
}
