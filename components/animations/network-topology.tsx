// components/animations/network-topology.tsx
"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  id: number;
}

const NODES: Node[] = [
  { id: 0, x: 50,  y: 50  },
  { id: 1, x: 150, y: 30  },
  { id: 2, x: 250, y: 70  },
  { id: 3, x: 350, y: 40  },
  { id: 4, x: 100, y: 140 },
  { id: 5, x: 200, y: 160 },
  { id: 6, x: 300, y: 130 },
  { id: 7, x: 400, y: 160 },
  { id: 8, x: 150, y: 240 },
  { id: 9, x: 280, y: 230 },
];

const EDGES = [
  [0,1],[1,2],[2,3],[0,4],[1,5],[2,6],[3,7],[4,5],[5,6],[6,7],[4,8],[5,9],[8,9],[6,9],
];

export function NetworkTopologySVG({ className }: { className?: string }) {
  const activeRef = useRef<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let frame: number;
    let tick = 0;

    function animate() {
      tick++;
      if (tick % 20 === 0) {
        const newNode = Math.floor(Math.random() * NODES.length);
        activeRef.current = [...activeRef.current, newNode].slice(-4);

        if (svgRef.current) {
          NODES.forEach((n) => {
            const el = svgRef.current!.querySelector(`#node-${n.id}`);
            if (el) {
              const isActive = activeRef.current.includes(n.id);
              el.setAttribute("fill", isActive ? "var(--success)" : "#2a2a2a");
              el.setAttribute("r", isActive ? "6" : "4");
            }
          });

          EDGES.forEach(([a, b], i) => {
            const el = svgRef.current!.querySelector(`#edge-${i}`);
            if (el) {
              const isActive = activeRef.current.includes(a) && activeRef.current.includes(b);
              el.setAttribute("stroke", isActive ? "var(--success)" : "#1a1a1a");
              el.setAttribute("stroke-width", isActive ? "1.5" : "1");
            }
          });
        }
      }
      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 450 280"
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          id={`edge-${i}`}
          x1={NODES[a].x} y1={NODES[a].y}
          x2={NODES[b].x} y2={NODES[b].y}
          stroke="#1a1a1a"
          strokeWidth="1"
        />
      ))}
      {NODES.map((n) => (
        <circle
          key={n.id}
          id={`node-${n.id}`}
          cx={n.x}
          cy={n.y}
          r="4"
          fill="#2a2a2a"
          style={{ transition: "fill 0.4s, r 0.4s" }}
        />
      ))}
    </svg>
  );
}
