"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Abstract network visual — white nodes, green data flows.
 * Mouse-reactive: nodes attract, edges brighten on proximity.
 */
export function ContactVisual({ className = "", size = 300 }: { className?: string; size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mouse, setMouse] = useState({ x: 150, y: 150 });

  const nodes = [
    { x: 150, y: 35, r: 5 },
    { x: 65, y: 90, r: 3.5 },
    { x: 235, y: 90, r: 3.5 },
    { x: 150, y: 130, r: 7 },
    { x: 45, y: 175, r: 3 },
    { x: 255, y: 175, r: 3 },
    { x: 150, y: 220, r: 4 },
    { x: 95, y: 160, r: 2.5 },
    { x: 205, y: 160, r: 2.5 },
    { x: 110, y: 210, r: 2 },
    { x: 190, y: 210, r: 2 },
    { x: 75, y: 135, r: 2 },
    { x: 225, y: 135, r: 2 },
  ];

  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3],
    [1, 3], [2, 3], [1, 4], [2, 5], [1, 11], [2, 12],
    [3, 7], [3, 8], [3, 6],
    [4, 7], [5, 8], [7, 9], [8, 10], [9, 6], [10, 6],
    [11, 7], [12, 8], [4, 9], [5, 10],
  ];

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      setMouse({
        x: Math.max(0, Math.min(300, ((e.clientX - rect.left) / rect.width) * 300)),
        y: Math.max(0, Math.min(300, ((e.clientY - rect.top) / rect.height) * 300)),
      });
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  const displace = (nx: number, ny: number) => {
    const dx = mouse.x - nx;
    const dy = mouse.y - ny;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = Math.max(0, 1 - dist / 130) * 0.1;
    return { x: nx + dx * force, y: ny + dy * force };
  };

  const dn = nodes.map((n) => displace(n.x, n.y));

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 300 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="cNodeGlow">
          <feGaussianBlur stdDeviation="3" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="cPulse">
          <stop offset="0%" stopColor="#00cc8a" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#00cc8a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Center pulse */}
      <circle cx={dn[3]!.x} cy={dn[3]!.y} r="30" fill="url(#cPulse)">
        <animate attributeName="r" values="18;50;18" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite" />
      </circle>

      {/* Edges — white lines, subtle */}
      {edges.map(([i, j], idx) => {
        const a = dn[i]!;
        const b = dn[j]!;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dist = Math.sqrt((mouse.x - mid.x) ** 2 + (mouse.y - mid.y) ** 2);
        const op = Math.min(0.4, 0.08 + Math.max(0, 1 - dist / 140) * 0.32);
        return (
          <line key={idx}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="white" strokeWidth="0.6" opacity={op}
            style={{ transition: "opacity 0.2s" }}
          />
        );
      })}

      {/* Green data flow particles */}
      {[0, 3, 5, 9, 14, 17].map((ei) => {
        const [i, j] = edges[ei]!;
        const a = dn[i]!;
        const b = dn[j]!;
        return (
          <circle key={`f${ei}`} r="1.5" fill="#00cc8a" opacity="0.8">
            <animateMotion dur={`${1.8 + ei * 0.3}s`} repeatCount="indefinite"
              path={`M${a.x},${a.y} L${b.x},${b.y}`} />
          </circle>
        );
      })}

      {/* Reverse flow on some edges */}
      {[2, 6, 11, 16].map((ei) => {
        const [i, j] = edges[ei]!;
        const a = dn[j]!;
        const b = dn[i]!;
        return (
          <circle key={`r${ei}`} r="1" fill="#00cc8a" opacity="0.5">
            <animateMotion dur={`${2.5 + ei * 0.2}s`} repeatCount="indefinite"
              path={`M${a.x},${a.y} L${b.x},${b.y}`} />
          </circle>
        );
      })}

      {/* Nodes — white, glow on hover proximity */}
      {nodes.map((node, i) => {
        const d = dn[i]!;
        const dist = Math.sqrt((mouse.x - d.x) ** 2 + (mouse.y - d.y) ** 2);
        const glow = Math.max(0.5, Math.min(1, 1 - dist / 120 + 0.5));
        const isCenter = i === 3;
        return (
          <g key={i}>
            <circle
              cx={d.x} cy={d.y} r={node.r}
              fill={isCenter ? "white" : "#e0e0e0"}
              opacity={glow}
              filter={glow > 0.8 ? "url(#cNodeGlow)" : undefined}
              style={{ transition: "cx 0.12s ease, cy 0.12s ease, opacity 0.15s" }}
            />
            {/* Green ring on center */}
            {isCenter && (
              <circle cx={d.x} cy={d.y} r="11" fill="none" stroke="#00cc8a"
                strokeWidth="0.8" opacity="0.4"
                style={{ transition: "cx 0.12s ease, cy 0.12s ease" }}
              >
                <animate attributeName="r" values="10;14;10" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
