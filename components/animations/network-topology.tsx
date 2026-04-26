// components/animations/network-topology.tsx
//
// BJHUNT 2026 refonte — hairline ASCII-style topology.
// Replaces the previous animated SVG (random fill flips) with a
// monospaced terminal-style diagram per design-system §9.
// 1px strokes only, no animation, token colors, no `#1a1a1a` legacy hex.

interface NetworkTopologySVGProps {
  className?: string;
}

export function NetworkTopologySVG({ className }: NetworkTopologySVGProps) {
  // 10-node topology, fixed coords, hairline edges, state colors only on
  // the 3 "verified" nodes (reproducible, no flicker).
  const nodes = [
    { id: 0, x: 50,  y: 50,  state: "ok"   },
    { id: 1, x: 150, y: 30,  state: "ok"   },
    { id: 2, x: 250, y: 70,  state: "ok"   },
    { id: 3, x: 350, y: 40,  state: "idle" },
    { id: 4, x: 100, y: 140, state: "ok"   },
    { id: 5, x: 200, y: 160, state: "warn" },
    { id: 6, x: 300, y: 130, state: "idle" },
    { id: 7, x: 400, y: 160, state: "idle" },
    { id: 8, x: 150, y: 240, state: "idle" },
    { id: 9, x: 280, y: 230, state: "crit" },
  ] as const;

  const edges = [
    [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 7],
    [4, 5], [5, 6], [6, 7], [4, 8], [5, 9], [8, 9], [6, 9],
  ];

  const stateColor = (s: typeof nodes[number]["state"]) => {
    switch (s) {
      case "ok":   return "var(--state-success)";
      case "warn": return "var(--state-warning)";
      case "crit": return "var(--state-critical)";
      default:     return "var(--bjhunt-2026-text-muted)";
    }
  };

  return (
    <svg
      viewBox="0 0 450 280"
      className={className}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="Network topology with 10 nodes and 14 edges"
    >
      {/* Hairline edges — single 1px stroke in border color */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="var(--bjhunt-2026-border)"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
      {/* Nodes — 4px filled state-color circle, no outer ring */}
      {nodes.map((n) => (
        <circle
          key={n.id}
          cx={n.x}
          cy={n.y}
          r={3.5}
          fill={stateColor(n.state)}
        />
      ))}
    </svg>
  );
}
