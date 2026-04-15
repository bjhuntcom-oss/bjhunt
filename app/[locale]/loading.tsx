"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Arrow logo — pulses gently */}
        <div className="relative" style={{ width: 48, height: 48 }}>
          <svg
            width="48" height="48" viewBox="0 0 32 32" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="animate-pulse"
            style={{ animationDuration: "1.8s" }}
          >
            <path
              d="M6 4 L24 16 L6 28 L6 20 L14 16 L6 12 Z"
              fill="white"
              opacity="0.6"
            />
            <rect x="26" y="6" width="2" height="20" fill="#00cc8a" opacity="0.8" />
          </svg>
        </div>

        <p
          className="text-[9px] uppercase tracking-[0.2em] text-[#666]"
          style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
