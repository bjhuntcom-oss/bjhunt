"use client";

import { useEffect, useState } from "react";

export function Preloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => setVisible(false), 2400);
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
      <svg width="80" height="80" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 4 L24 16 L6 28 L6 20 L14 16 L6 12 Z"
          stroke="white"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="100"
          strokeDashoffset="100"
          strokeLinejoin="miter"
          style={{ animation: "arrow-draw 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards" }}
        />
        <path
          d="M6 4 L24 16 L6 28 L6 20 L14 16 L6 12 Z"
          fill="white"
          opacity="0"
          style={{ animation: "arrow-fill 0.4s ease 1.1s forwards" }}
        />
        <rect
          x="26" y="6" width="2" height="20"
          fill="#00cc8a"
          opacity="0"
          style={{ animation: "bar-slide 0.3s ease 1.3s forwards" }}
        />
      </svg>

      <div
        style={{
          opacity: 0,
          animation: "fade-up 0.4s ease 1.0s forwards",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          fontSize: "11px",
          letterSpacing: "0.15em",
          color: "#666",
          marginTop: "16px",
          textTransform: "uppercase" as const,
        }}
      >
        BJHUNT ALPHA 1.0
      </div>

      <div className="preloader-bar-track">
        <div className="preloader-bar-fill" />
      </div>
    </div>
  );
}
