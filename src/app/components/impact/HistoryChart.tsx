import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface HistoryChartProps {
  data: { criado_em: string; valor: number }[];
  meta: number;
  baseline: number;
  unidade: string;
}

export function HistoryChart({ data, meta, baseline, unidade }: HistoryChartProps) {
  if (data.length === 0) return <p className="text-xs text-gray-400">Sem medições registadas.</p>;

  const chartData = data.map((d) => ({
    data: new Date(d.criado_em).toLocaleDateString("pt-PT", { month: "short", day: "numeric" }),
    valor: d.valor,
  }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => [`${v} ${unidade}`, "Valor"]}
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={meta} stroke="#16a34a" strokeDasharray="4 2" label={{ value: "Meta", fontSize: 10, fill: "#16a34a" }} />
        {baseline > 0 && (
          <ReferenceLine y={baseline} stroke="#9ca3af" strokeDasharray="4 2" label={{ value: "Baseline", fontSize: 10, fill: "#9ca3af" }} />
        )}
        <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
