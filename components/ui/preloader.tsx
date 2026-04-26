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
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--bjhunt-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        animation: "preloader-fade 0.5s ease-out 2.2s forwards",
      }}
    >
      <svg width="80" height="80" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 4 L24 16 L6 28 L6 20 L14 16 L6 12 Z"
          stroke="var(--bjhunt-text)"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="100"
          strokeDashoffset="100"
          strokeLinejoin="miter"
          style={{ animation: "arrow-draw 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards" }}
        />
        <path
          d="M6 4 L24 16 L6 28 L6 20 L14 16 L6 12 Z"
          fill="var(--bjhunt-text)"
          opacity="0"
          style={{ animation: "arrow-fill 0.4s ease 1.1s forwards" }}
        />
        <rect
          x="26" y="6" width="2" height="20"
          fill="var(--state-success)"
          opacity="0"
          style={{ animation: "bar-slide 0.3s ease 1.3s forwards" }}
        />
      </svg>

      <div
        style={{
          opacity: 0,
          animation: "fade-up 0.4s ease 1.0s forwards",
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: "11px",
          letterSpacing: "0.15em",
          color: "var(--bjhunt-text-muted)",
          marginTop: "16px",
          textTransform: "uppercase",
        }}
      >
        BJHUNT ALPHA 1.0
      </div>

      <div
        style={{
          width: 120,
          height: 1,
          background: "var(--bjhunt-border)",
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--state-success)",
            animation:
              "progress-fill 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s forwards",
            width: "0%",
          }}
        />
      </div>
    </div>
  );
}
