"use client";

import { useEffect, useState } from "react";

// Outer square perimeter = 4 × 30 = 120
// Inner square perimeter = 4 × 12 = 48
// Each crosshair line = 9px

export function Preloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => setVisible(false), 1800);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad, { once: true });
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  if (!visible) return null;

  return (
    <div className="preloader-overlay" aria-hidden="true">
      {/* Tactical frame draws in sequentially */}
      <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer square — draws in */}
        <rect
          x="1" y="1" width="30" height="30"
          stroke="white" strokeWidth="1.5"
          strokeDasharray="120" strokeDashoffset="120"
          style={{ animation: "reticle-outer 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0ms forwards" }}
        />
        {/* Inner square — draws in after */}
        <rect
          x="10" y="10" width="12" height="12"
          stroke="white" strokeWidth="1"
          strokeDasharray="48" strokeDashoffset="48"
          style={{ animation: "reticle-inner 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.45s forwards" }}
        />
        {/* Crosshair lines — appear one by one */}
        <line x1="16" y1="1"  x2="16" y2="10" stroke="white" strokeWidth="1"
          strokeDasharray="9" strokeDashoffset="9"
          style={{ animation: "reticle-line 0.2s ease 0.55s forwards" }} />
        <line x1="16" y1="22" x2="16" y2="31" stroke="white" strokeWidth="1"
          strokeDasharray="9" strokeDashoffset="9"
          style={{ animation: "reticle-line 0.2s ease 0.65s forwards" }} />
        <line x1="1"  y1="16" x2="10" y2="16" stroke="white" strokeWidth="1"
          strokeDasharray="9" strokeDashoffset="9"
          style={{ animation: "reticle-line 0.2s ease 0.75s forwards" }} />
        <line x1="22" y1="16" x2="31" y2="16" stroke="white" strokeWidth="1"
          strokeDasharray="9" strokeDashoffset="9"
          style={{ animation: "reticle-line 0.2s ease 0.85s forwards" }} />
        {/* Center square — acquired target, pulses */}
        <rect
          x="14" y="14" width="4" height="4"
          fill="#00cc8a"
          opacity="0"
          style={{ animation: "growth-dot 0.1s ease 0.9s forwards, pulse-square 1.2s ease-in-out 1s infinite" }}
        />
      </svg>

      <div className="preloader-bar-track">
        <div className="preloader-bar-fill" />
      </div>
    </div>
  );
}
