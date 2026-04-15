"use client";

export function SignalWaveSVG({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M10 30 Q25 ${10 - i * 6} 40 30 Q55 ${50 + i * 6} 70 30 Q85 ${10 - i * 6} 100 30 Q110 ${50 + i * 6} 115 30`}
          stroke="#00cc8a"
          strokeWidth={1.5 - i * 0.3}
          fill="none"
          opacity={1 - i * 0.3}
          style={{
            animation: `signal-pulse 2s ease-in-out ${i * 0.3}s infinite alternate`,
          }}
        />
      ))}
      <circle cx="60" cy="30" r="3" fill="#00cc8a" opacity="0.9" />
      {[10, 20, 30].map((r, i) => (
        <circle
          key={r}
          cx="60"
          cy="30"
          r={r}
          stroke="#00cc8a"
          strokeWidth="0.5"
          fill="none"
          opacity={0.3 - i * 0.08}
          style={{
            animation: `signal-ring 2s ease-out ${i * 0.5}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}
