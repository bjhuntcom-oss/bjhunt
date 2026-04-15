"use client";

export function HexGridSVG({ className = "" }: { className?: string }) {
  const hexes: Array<{ cx: number; cy: number; active: boolean; delay: string }> = [
    { cx: 25,  cy: 22, active: false, delay: "0s" },
    { cx: 55,  cy: 22, active: true,  delay: "0.15s" },
    { cx: 85,  cy: 22, active: false, delay: "0.3s" },
    { cx: 40,  cy: 44, active: true,  delay: "0.1s" },
    { cx: 70,  cy: 44, active: false, delay: "0.25s" },
    { cx: 25,  cy: 66, active: false, delay: "0.2s" },
    { cx: 55,  cy: 66, active: false, delay: "0.35s" },
    { cx: 85,  cy: 66, active: true,  delay: "0.05s" },
    { cx: 40,  cy: 88, active: false, delay: "0.4s" },
    { cx: 70,  cy: 88, active: false, delay: "0.15s" },
  ];

  function hexPath(cx: number, cy: number, r: number): string {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    });
    return `M${pts.join("L")}Z`;
  }

  return (
    <svg
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {hexes.map((hex, i) => (
        <path
          key={i}
          d={hexPath(hex.cx, hex.cy, 14)}
          stroke={hex.active ? "#00cc8a" : "#1a1a1a"}
          strokeWidth="1"
          fill={hex.active ? "#00cc8a" : "transparent"}
          fillOpacity={hex.active ? 0.08 : 0}
          style={{
            animation: `hex-pulse 3s ease-in-out ${hex.delay} infinite alternate`,
          }}
        />
      ))}
    </svg>
  );
}
