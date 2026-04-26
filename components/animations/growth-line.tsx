"use client";

// BJHUNT 2026 refonte — clean polyline, no fill area, token colors only.
// Used on /investors. Body weight 400 sibling text (caller controls).

interface GrowthLineSVGProps {
  className?: string;
}

export function GrowthLineSVG({ className = "" }: GrowthLineSVGProps) {
  const points = "10,80 25,72 40,65 55,50 65,42 75,30 90,22 110,10";

  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Growth trend line"
    >
      {/* Hairline horizontal grid in border token */}
      {[20, 40, 60, 80].map((y) => (
        <line
          key={y}
          x1="5"
          y1={y}
          x2="115"
          y2={y}
          stroke="var(--bjhunt-2026-border)"
          strokeWidth="0.5"
        />
      ))}

      {/* Clean polyline — no fill area, single state-success stroke */}
      <polyline
        points={points}
        stroke="var(--state-success)"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Endpoint dot in state-success */}
      <circle cx="110" cy="10" r="2.5" fill="var(--state-success)" />
    </svg>
  );
}
