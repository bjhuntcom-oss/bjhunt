"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Abstract network/connection visual — nodes connected by lines,
 * reacting to mouse proximity. Evokes communication, network, connectivity.
 * Enterprise-grade, minimal, tech.
 */
export function ContactVisual({ className = "", size = 300 }: { className?: string; size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mouse, setMouse] = useState({ x: 150, y: 150 });

  // Fixed node positions (communication network topology)
  const nodes = [
    { x: 150, y: 60, r: 6, main: true },    // top center — "you"
    { x: 80, y: 120, r: 4, main: false },    // left
    { x: 220, y: 120, r: 4, main: false },   // right
    { x: 150, y: 150, r: 8, main: true },    // center — "BJHUNT"
    { x: 60, y: 200, r: 3, main: false },    // bottom-left
    { x: 240, y: 200, r: 3, main: false },   // bottom-right
    { x: 150, y: 240, r: 5, main: false },   // bottom center
    { x: 110, y: 180, r: 3, main: false },
    { x: 190, y: 180, r: 3, main: false },
  ];

  const edges = [
    [0, 1], [0, 2], [0, 3],
    [1, 3], [2, 3], [1, 4], [2, 5],
    [3, 4], [3, 5], [3, 6], [3, 7], [3, 8],
    [4, 7], [5, 8], [7, 6], [8, 6],
  ];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 300;
      const y = ((e.clientY - rect.top) / rect.height) * 300;
      setMouse({ x: Math.max(0, Math.min(300, x)), y: Math.max(0, Math.min(300, y)) });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Compute node displacement based on mouse proximity
  const getDisplaced = (nx: number, ny: number) => {
    const dx = mouse.x - nx;
    const dy = mouse.y - ny;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = Math.max(0, 1 - dist / 120);
    return {
      x: nx + dx * force * 0.08,
      y: ny + dy * force * 0.08,
    };
  };

  const displaced = nodes.map((n) => getDisplaced(n.x, n.y));

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="pulseGrad">
          <stop offset="0%" stopColor="#00cc8a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00cc8a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pulse rings from center node */}
      <circle cx={displaced[3]!.x} cy={displaced[3]!.y} r="40" fill="url(#pulseGrad)">
        <animate attributeName="r" values="20;60;20" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx={displaced[3]!.x} cy={displaced[3]!.y} r="30" fill="url(#pulseGrad)">
        <animate attributeName="r" values="15;45;15" dur="4s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" begin="1s" repeatCount="indefinite" />
      </circle>

      {/* Edges — connection lines */}
      {edges.map(([i, j], idx) => {
        const a = displaced[i!]!;
        const b = displaced[j!]!;
        const midDist = Math.sqrt(
          Math.pow(mouse.x - (a.x + b.x) / 2, 2) +
          Math.pow(mouse.y - (a.y + b.y) / 2, 2)
        );
        const brightness = Math.min(0.6, 0.1 + Math.max(0, 1 - midDist / 150) * 0.5);
        return (
          <line
            key={idx}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#00cc8a"
            strokeWidth="0.8"
            opacity={brightness}
            style={{ transition: "x1 0.15s, y1 0.15s, x2 0.15s, y2 0.15s, opacity 0.2s" }}
          />
        );
      })}

      {/* Data flow particles on some edges */}
      {[0, 3, 5, 9].map((edgeIdx) => {
        const [i, j] = edges[edgeIdx]!;
        const a = displaced[i!]!;
        const b = displaced[j!]!;
        return (
          <circle key={`p-${edgeIdx}`} r="1.5" fill="#00cc8a" opacity="0.7">
            <animateMotion
              dur={`${2 + edgeIdx * 0.5}s`}
              repeatCount="indefinite"
              path={`M${a.x},${a.y} L${b.x},${b.y}`}
            />
          </circle>
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const d = displaced[i]!;
        const distToMouse = Math.sqrt(
          Math.pow(mouse.x - d.x, 2) + Math.pow(mouse.y - d.y, 2)
        );
        const glow = Math.max(0.4, 1 - distToMouse / 120);

        return (
          <g key={i}>
            {/* Node circle */}
            <circle
              cx={d.x} cy={d.y} r={node.r}
              fill={node.main ? "#00cc8a" : "#1a1a1a"}
              stroke="#00cc8a"
              strokeWidth={node.main ? 1.5 : 0.8}
              opacity={glow}
              filter={glow > 0.6 ? "url(#nodeGlow)" : undefined}
              style={{ transition: "cx 0.15s ease, cy 0.15s ease, opacity 0.2s" }}
            />
            {/* Label on main nodes */}
            {i === 0 && (
              <text x={d.x} y={d.y - 14} textAnchor="middle"
                fill="#666" fontSize="7" fontFamily="var(--font-mono, monospace)"
                style={{ textTransform: "uppercase", letterSpacing: "0.15em" }}
              >
                YOU
              </text>
            )}
            {i === 3 && (
              <text x={d.x} y={d.y + 22} textAnchor="middle"
                fill="#00cc8a" fontSize="8" fontFamily="var(--font-mono, monospace)"
                fontWeight="bold" opacity="0.7"
                style={{ letterSpacing: "0.12em" }}
              >
                BJHUNT
              </text>
            )}
          </g>
        );
      })}

      {/* Mouse cursor indicator — subtle ring */}
      <circle
        cx={mouse.x} cy={mouse.y} r="8"
        fill="none" stroke="#00cc8a" strokeWidth="0.5" opacity="0.2"
        style={{ transition: "cx 0.05s, cy 0.05s" }}
      />
    </svg>
  );
}
