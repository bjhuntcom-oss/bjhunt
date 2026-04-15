"use client";

import { useEffect, useRef } from "react";

export function ScanRadarSVG({ className = "" }: { className?: string }) {
  const sweepRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const el = sweepRef.current;
    if (!el) return;

    let angle = 0;
    let raf: number;

    const tick = () => {
      angle = (angle + 0.8) % 360;
      const rad = (angle * Math.PI) / 180;
      const x2 = 60 + Math.cos(rad) * 50;
      const y2 = 60 + Math.sin(rad) * 50;
      el.setAttribute("x2", String(x2));
      el.setAttribute("y2", String(y2));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="60" cy="60" r="50" stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="60" cy="60" r="35" stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="60" cy="60" r="20" stroke="#1a1a1a" strokeWidth="1" />
      <line x1="10" y1="60" x2="110" y2="60" stroke="#1a1a1a" strokeWidth="0.5" />
      <line x1="60" y1="10" x2="60" y2="110" stroke="#1a1a1a" strokeWidth="0.5" />
      <line
        ref={sweepRef}
        x1="60"
        y1="60"
        x2="110"
        y2="60"
        stroke="#00cc8a"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="85" cy="42" r="2.5" fill="#00cc8a" opacity="0.7" />
      <circle cx="38" cy="75" r="1.5" fill="#00cc8a" opacity="0.5" />
      <circle cx="70" cy="30" r="1" fill="white" opacity="0.4" />
      <circle cx="60" cy="60" r="3" fill="#00cc8a" />
    </svg>
  );
}
