// components/animations/api-circuit.tsx
"use client";

import { useEffect, useRef } from "react";

const PATH_POINTS = [
  [20,  140], [80,  140], [80,  80],  [160, 80],
  [160, 40],  [240, 40],  [240, 100], [300, 100],
  [300, 160], [380, 160], [380, 100], [420, 100],
];

function pointsToD(pts: number[][]) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
}

export function APICircuitSVG({ className }: { className?: string }) {
  const dotRef = useRef<SVGCircleElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!dotRef.current || !pathRef.current) return;
    const totalLength = pathRef.current.getTotalLength();

    let progress = 0;
    const speed = 1.5;

    function animate() {
      progress = (progress + speed) % totalLength;
      const pt = pathRef.current!.getPointAtLength(progress);
      if (dotRef.current) {
        dotRef.current.setAttribute("cx", String(pt.x));
        dotRef.current.setAttribute("cy", String(pt.y));
      }
      requestAnimationFrame(animate);
    }

    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      viewBox="0 0 440 200"
      className={className}
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <pattern id="cg" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a1a" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="440" height="200" fill="url(#cg)" opacity="0.5" />

      <path
        ref={pathRef}
        d={pointsToD(PATH_POINTS)}
        fill="none"
        stroke="#2a2a2a"
        strokeWidth="1.5"
      />

      {[PATH_POINTS[0], PATH_POINTS[PATH_POINTS.length - 1]].map(([x, y], i) => (
        <rect key={i} x={x - 4} y={y - 4} width="8" height="8" fill="none" stroke="var(--success)" strokeWidth="1" opacity="0.6" />
      ))}

      <circle ref={dotRef} r="4" fill="white" />
    </svg>
  );
}
