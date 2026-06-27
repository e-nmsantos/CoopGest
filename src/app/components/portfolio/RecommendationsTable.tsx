import { Link } from "react-router";
import { Card } from "../ui/card";
import { priorityColor } from "./portfolio.helpers";
import type { CrossRecommendation } from "./portfolio.types";

interface RecommendationsTableProps {
  recommendations: CrossRecommendation[];
}

export function RecommendationsTable({ recommendations }: RecommendationsTableProps) {
  if (recommendations.length === 0) return null;

  const sorted = recommendations
    .slice()
    .sort((a, b) => {
      const order: Record<string, number> = { alta: 0, média: 1, media: 1, baixa: 2 };
      return (order[a.priority?.toLowerCase()] ?? 3) - (order[b.priority?.toLowerCase()] ?? 3);
    });

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Ações Prioritárias — Todos os projetos</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm text-left">
          <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="py-2 pr-3">Prioridade</th>
              <th className="py-2 pr-3">Projeto</th>
              <th className="py-2 pr-3">Título</th>
              <th className="py-2 pr-3">Descrição</th>
              <th className="py-2 pr-3">Saúde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((rec, i) => (
              <tr key={i}>
                <td className="py-3 pr-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${priorityColor(rec.priority)}`}>
                    {rec.priority}
                  </span>
                </td>
                <td className="py-3 pr-3 text-gray-700">
                  <Link to={`/projeto/${rec.project_id}`} className="hover:underline text-blue-600">
                    {rec.project_name}
                  </Link>
                </td>
                <td className="py-3 pr-3 font-medium text-gray-900">{rec.title}</td>
                <td className="py-3 pr-3 text-gray-600 max-w-xs">{rec.description}</td>
                <td className="py-3 pr-3 text-gray-600">{rec.health_score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
