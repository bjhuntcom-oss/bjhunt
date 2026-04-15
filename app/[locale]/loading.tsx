"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Tactical frame — inner square rotates slowly */}
        <div className="relative" style={{ width: 48, height: 48 }}>
          {/* Outer static frame */}
          <svg
            width="48" height="48" viewBox="0 0 32 32" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0"
          >
            <rect x="1" y="1" width="30" height="30" stroke="white" strokeWidth="1.5" opacity="0.2" />
            <line x1="16" y1="1"  x2="16" y2="10" stroke="white" strokeWidth="1" opacity="0.3" />
            <line x1="16" y1="22" x2="16" y2="31" stroke="white" strokeWidth="1" opacity="0.3" />
            <line x1="1"  y1="16" x2="10" y2="16" stroke="white" strokeWidth="1" opacity="0.3" />
            <line x1="22" y1="16" x2="31" y2="16" stroke="white" strokeWidth="1" opacity="0.3" />
          </svg>
          {/* Inner square — rotates */}
          <svg
            width="48" height="48" viewBox="0 0 32 32" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: "3s", animationTimingFunction: "linear" }}
          >
            <rect x="10" y="10" width="12" height="12" stroke="white" strokeWidth="1" />
          </svg>
          {/* Center — pulsing green */}
          <svg
            width="48" height="48" viewBox="0 0 32 32" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0"
          >
            <rect x="14" y="14" width="4" height="4" fill="#00cc8a" className="animate-pulse" />
          </svg>
        </div>

        <p className="text-[9px] uppercase tracking-[0.3em] text-[#555555]">BJHUNT</p>
      </div>
    </div>
  );
}
