"use client";

export function GrowthLineSVG({ className = "" }: { className?: string }) {
  const points = "10,80 25,72 40,65 55,50 65,42 75,30 90,22 110,10";

  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="5" y1={y} x2="115" y2={y} stroke="#1a1a1a" strokeWidth="0.5" />
      ))}
      <polygon
        points={`${points} 110,90 10,90`}
        fill="#00cc8a"
        opacity="0.06"
      />
      <polyline
        points={points}
        stroke="#00cc8a"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: 300,
          animation: "growth-draw 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards",
        }}
      />
      <circle
        cx="110"
        cy="10"
        r="3"
        fill="#00cc8a"
        opacity="0"
        style={{ animation: "growth-dot 0.4s ease 1.8s forwards" }}
      />
    </svg>
  );
}
