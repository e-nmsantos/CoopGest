import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "../ui/card";
import { healthBarColor } from "./portfolio.helpers";
import type { ProjectEntry } from "./portfolio.types";

interface PortfolioHealthChartProps {
  projects: ProjectEntry[];
}

export function PortfolioHealthChart({ projects }: PortfolioHealthChartProps) {
  const chartData = projects.map((p) => ({
    name: p.project_name.length > 20 ? p.project_name.slice(0, 18) + "…" : p.project_name,
    score: p.health.score,
    status: p.health.status,
  }));

  if (chartData.length === 0) return null;

  return (
    <Card className="p-5 mb-6">
      <h2 className="font-semibold text-gray-900 mb-3">Índice de saúde por projeto</h2>
      <ResponsiveContainer width="100%" height={Math.max(100, chartData.length * 36)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [`${v}%`, "Saúde"]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={healthBarColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
