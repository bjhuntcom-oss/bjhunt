"use client";

import { useEffect, useRef, useState } from "react";

interface RobotAvatarProps {
  className?: string;
  size?: number;
}

export function RobotAvatar({ className = "", size = 280 }: RobotAvatarProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [antennaGlow, setAntennaGlow] = useState(0.4);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      setEyeOffset({ x: dx * 3, y: dy * 2.5 });
      setAntennaGlow(0.4 + Math.abs(dx) * 0.6);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ambient glow */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <line x1="100" y1="28" x2="100" y2="52" stroke="#2a2a2a" strokeWidth="2" />
      <circle
        cx="100" cy="24" r="4"
        fill="#00cc8a"
        opacity={antennaGlow}
        filter="url(#glow)"
        style={{ transition: "opacity 0.15s ease" }}
      />
      <circle cx="100" cy="24" r="2" fill="#00cc8a">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Head */}
      <rect x="58" y="52" width="84" height="60" fill="url(#bodyGrad)" stroke="#2a2a2a" strokeWidth="1.5" />

      {/* Forehead line */}
      <line x1="68" y1="62" x2="132" y2="62" stroke="#1f1f1f" strokeWidth="0.5" />

      {/* Left eye socket */}
      <rect x="72" y="70" width="20" height="14" fill="#0d0d0d" stroke="#333" strokeWidth="0.5" />
      {/* Left eye — tracks mouse */}
      <rect
        x={80 + eyeOffset.x}
        y={74 + eyeOffset.y}
        width="6" height="4"
        fill="#00cc8a"
        style={{ transition: "x 0.1s ease, y 0.1s ease" }}
      >
        <animate attributeName="opacity" values="1;1;0.3;1" dur="3s" repeatCount="indefinite" />
      </rect>

      {/* Right eye socket */}
      <rect x="108" y="70" width="20" height="14" fill="#0d0d0d" stroke="#333" strokeWidth="0.5" />
      {/* Right eye — tracks mouse */}
      <rect
        x={116 + eyeOffset.x}
        y={74 + eyeOffset.y}
        width="6" height="4"
        fill="#00cc8a"
        style={{ transition: "x 0.1s ease, y 0.1s ease" }}
      >
        <animate attributeName="opacity" values="1;1;0.3;1" dur="3s" repeatCount="indefinite" />
      </rect>

      {/* Mouth — status bar */}
      <rect x="80" y="96" width="40" height="3" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
      <rect x="80" y="96" width="24" height="3" fill="#00cc8a" opacity="0.5">
        <animate attributeName="width" values="10;30;18;24" dur="4s" repeatCount="indefinite" />
      </rect>

      {/* Body */}
      <rect x="64" y="118" width="72" height="44" fill="url(#bodyGrad)" stroke="#2a2a2a" strokeWidth="1.5" />

      {/* Chest panel lines */}
      <line x1="74" y1="128" x2="126" y2="128" stroke="#222" strokeWidth="0.5" />
      <line x1="74" y1="136" x2="126" y2="136" stroke="#222" strokeWidth="0.5" />
      <line x1="74" y1="144" x2="126" y2="144" stroke="#222" strokeWidth="0.5" />

      {/* Chest indicator lights */}
      <circle cx="80" cy="132" r="2" fill="#00cc8a" opacity="0.7">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="132" r="2" fill="#ff9900" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="96" cy="132" r="2" fill="#00cc8a" opacity="0.6" />

      {/* Chest BJHUNT arrow logo */}
      <path
        d="M106 129 L118 135 L106 141 L106 137 L111 135 L106 133 Z"
        fill="#00cc8a"
        opacity="0.3"
      />

      {/* Arms */}
      <rect x="44" y="122" width="16" height="6" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
      <rect x="44" y="130" width="12" height="28" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 130;2 50 130;0 50 130;-1 50 130;0 50 130"
          dur="5s"
          repeatCount="indefinite"
        />
      </rect>

      <rect x="140" y="122" width="16" height="6" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
      <rect x="144" y="130" width="12" height="28" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1">
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 150 130;-2 150 130;0 150 130;1 150 130;0 150 130"
          dur="5s"
          repeatCount="indefinite"
        />
      </rect>

      {/* Legs */}
      <rect x="76" y="166" width="16" height="16" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
      <rect x="108" y="166" width="16" height="16" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />

      {/* Feet */}
      <rect x="72" y="182" width="24" height="6" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
      <rect x="104" y="182" width="24" height="6" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />

      {/* Shadow / ground line */}
      <ellipse cx="100" cy="194" rx="40" ry="3" fill="#0a0a0a" opacity="0.5" />
    </svg>
  );
}
