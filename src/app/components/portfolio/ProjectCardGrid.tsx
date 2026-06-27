import { Link } from "react-router";
import { Card } from "../ui/card";
import { healthColor, priorityColor, money } from "./portfolio.helpers";
import type { ProjectEntry } from "./portfolio.types";

interface ProjectCardGridProps {
  projects: ProjectEntry[];
}

export function ProjectCardGrid({ projects }: ProjectCardGridProps) {
  if (projects.length === 0) {
    return (
      <Card className="p-10 text-center text-gray-500">
        Nenhum projeto disponível.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {projects.map((p) => {
        const finPct = p.finance.despesa_execucao ?? 0;
        const taskPct =
          p.summary.tarefas_total > 0
            ? Math.round((p.summary.tarefas_concluidas / p.summary.tarefas_total) * 100)
            : 0;
        const topRec = p.top_recommendations?.[0];

        return (
          <Card key={p.project_id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{p.project_name}</h3>
                <span className="text-xs text-gray-500">{p.estado}</span>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${healthColor(p.health.status)}`}
              >
                {p.health.score}% — {p.health.status}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Execução financeira</span>
                <span>{finPct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${
                    finPct > 100 ? "bg-red-500" : finPct >= 75 ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(finPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {money(p.finance.despesas_reais)} de {money(p.finance.despesas_previstas)}
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-xs text-gray-500">Tarefas:</span>
              <span className="font-medium">
                {p.summary.tarefas_concluidas}/{p.summary.tarefas_total}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${taskPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{taskPct}%</span>
            </div>

            {p.summary.beneficiarios > 0 && (
              <p className="text-xs text-gray-500">
                Beneficiários: <span className="font-medium text-gray-700">{p.summary.beneficiarios.toLocaleString("pt-PT")}</span>
              </p>
            )}

            {topRec && (
              <div className={`rounded-md px-3 py-2 text-xs ${priorityColor(topRec.priority)}`}>
                <span className="font-semibold">{topRec.priority}:</span> {topRec.title}
              </div>
            )}

            <div className="mt-auto pt-1">
              <Link
                to={`/projeto/${p.project_id}`}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver projeto →
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
