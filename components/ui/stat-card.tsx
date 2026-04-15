interface StatCardProps {
  value: string;
  label: string;
  prefix?: string;
}

export function StatCard({ value, label, prefix }: StatCardProps) {
  return (
    <div className="border border-white/10 p-8 bg-black">
      <div className="text-5xl font-bold text-white">
        {prefix}
        {value}
      </div>
      <div className="text-sm text-white/60 mt-3 leading-relaxed">{label}</div>
    </div>
  );
}
