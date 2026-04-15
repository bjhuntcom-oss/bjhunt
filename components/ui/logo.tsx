// Tactical scan frame — nested squares + crosshair, no curves
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
      {/* Outer square frame */}
      <rect x="1" y="1" width="30" height="30" stroke="white" strokeWidth="1.5" />
      {/* Inner targeting square */}
      <rect x="10" y="10" width="12" height="12" stroke="white" strokeWidth="1" />
      {/* Crosshair lines — outer to inner */}
      <line x1="16" y1="1"  x2="16" y2="10" stroke="white" strokeWidth="1" />
      <line x1="16" y1="22" x2="16" y2="31" stroke="white" strokeWidth="1" />
      <line x1="1"  y1="16" x2="10" y2="16" stroke="white" strokeWidth="1" />
      <line x1="22" y1="16" x2="31" y2="16" stroke="white" strokeWidth="1" />
      {/* Center — acquired target */}
      <rect x="14" y="14" width="4" height="4" fill="#00cc8a" />
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-black tracking-[0.08em] text-white text-[15px] leading-none ${className}`}
      style={{ fontFamily: "var(--font-inter, sans-serif)", letterSpacing: "0.1em" }}
    >
      BJHUNT
    </span>
  );
}
