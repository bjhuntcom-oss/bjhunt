// components/dashboard/bar-chart.tsx

interface BarChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

export function BarChart({ data, labels, color = "var(--success)", height = 48 }: BarChartProps) {
  const max = Math.max(...data, 1);

  return (
    <div
      className="flex items-end gap-px"
      style={{ height }}
      role="img"
      aria-label="Bar chart"
    >
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div
            key={i}
            className="bar-item flex-1 origin-bottom"
            style={{
              height: `${pct}%`,
              background: color,
              minHeight: 2,
              animation: "price-bar-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
              animationDelay: `${i * 40}ms`,
            }}
            title={labels?.[i] ? `${labels[i]}: ${v}` : String(v)}
          />
        );
      })}
    </div>
  );
}
