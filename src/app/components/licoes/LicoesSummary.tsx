interface Props {
  counts: {
    positivas: number;
    negativas: number;
    neutras: number;
  };
}

export function LicoesSummary({ counts }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { label: "Positivas", count: counts.positivas, color: "text-green-700", bg: "bg-green-50 border border-green-200" },
        { label: "Negativas", count: counts.negativas, color: "text-red-700", bg: "bg-red-50 border border-red-200" },
        { label: "Neutras", count: counts.neutras, color: "text-gray-700", bg: "bg-gray-50 border border-gray-200" },
      ].map((s) => (
        <div key={s.label} className={`rounded-lg p-4 text-center ${s.bg}`}>
          <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          <p className="text-xs text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
