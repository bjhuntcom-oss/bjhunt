// components/animations/isometric-server.tsx
export function IsometricServerSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      className={className}
      style={{ width: "100%", height: "100%", animation: "float 4s ease-in-out infinite" }}
    >
      <polygon
        points="100,20 160,50 100,80 40,50"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.6"
      />
      <polygon
        points="40,50 100,80 100,150 40,120"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.3"
      />
      <polygon
        points="100,80 160,50 160,120 100,150"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.4"
      />
      {[0, 1, 2].map((i) => (
        <g key={i} opacity="0.3">
          <line
            x1="40" y1={70 + i * 20}
            x2="100" y2={100 + i * 20}
            stroke="white" strokeWidth="0.5"
          />
          <line
            x1="100" y1={100 + i * 20}
            x2="160" y2={70 + i * 20}
            stroke="white" strokeWidth="0.5"
          />
        </g>
      ))}
      <circle cx="148" cy="62" r="3" fill="var(--success)" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
