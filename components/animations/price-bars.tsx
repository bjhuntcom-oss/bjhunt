"use client";

export function PriceBarsSVG({ className = "" }: { className?: string }) {
  const bars = [
    { x: 10, height: 40, delay: "0s" },
    { x: 28, height: 65, delay: "0.1s" },
    { x: 46, height: 30, delay: "0.2s" },
    { x: 64, height: 80, delay: "0.3s" },
    { x: 82, height: 55, delay: "0.4s" },
  ];

  return (
    <svg
      viewBox="0 0 110 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="5" y1={y} x2="105" y2={y} stroke="#1a1a1a" strokeWidth="0.5" />
      ))}
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={100 - bar.height}
          width="14"
          height={bar.height}
          fill={i === 3 ? "#00cc8a" : "#1a1a1a"}
          stroke={i === 3 ? "#00cc8a" : "#333"}
          strokeWidth="0.5"
          style={{
            transformOrigin: `${bar.x + 7}px 100px`,
            animation: `price-bar-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${bar.delay} both`,
          }}
        />
      ))}
    </svg>
  );
}
