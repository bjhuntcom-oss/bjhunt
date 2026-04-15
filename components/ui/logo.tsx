/**
 * BJHUNT Logo — Angular arrowhead pointing right.
 * Sharp, squared, tech-forward. Enterprise-grade simplicity.
 */

export function LogoSymbol({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Arrowhead — sharp angular pointer, squared edges */}
      <path
        d="M6 4 L24 16 L6 28 L6 20 L14 16 L6 12 Z"
        fill="white"
      />
      {/* Vertical accent bar — tech precision */}
      <rect x="26" y="6" width="2" height="20" fill="#00cc8a" />
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-[0.06em] text-white text-[15px] leading-none ${className}`}
      style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
    >
      BJHUNT
    </span>
  );
}
