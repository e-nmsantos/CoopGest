import { Activity, AlertTriangle, Bell } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import type { ExecutiveReport } from "../../types/project";

interface Props {
  executiveReport: ExecutiveReport;
  notifyLoading: boolean;
  onNotify: () => void;
}

export function ExecutiveDashboard({ executiveReport, notifyLoading, onNotify }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 mb-6">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50">
              <Activity className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Saúde Executiva</h3>
              <p className="text-xs text-gray-500">{executiveReport.health.status}</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{executiveReport.health.score}%</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Tarefas</div>
            <div className="font-semibold text-gray-900">{executiveReport.summary.progresso_tarefas}%</div>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Financeiro</div>
            <div className="font-semibold text-gray-900">{executiveReport.finance.execucao_financeira}%</div>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Impacto</div>
            <div className="font-semibold text-gray-900">{executiveReport.summary.impacto_execucao}%</div>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Beneficiários</div>
            <div className="font-semibold text-gray-900">{executiveReport.summary.beneficiarios.toLocaleString("pt-PT")}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Ações Recomendadas</h3>
            <p className="text-xs text-gray-500">Geradas automaticamente a partir de tarefas, prazos, riscos, orçamento e impacto.</p>
          </div>
          <Button variant="outline" size="sm" disabled={notifyLoading} onClick={onNotify}>
            <Bell className="size-4 mr-2" />
            {notifyLoading ? "A notificar..." : "Notificar equipa"}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {executiveReport.recommendations.map((item) => (
            <Link key={`${item.kind}-${item.title}`} to={item.url} className="rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900">{item.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.priority === "Alta"
                    ? "bg-red-50 text-red-700"
                    : item.priority === "Média"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-700"
                }`}>
                  {item.priority}
                </span>
              </div>
              <p className="text-xs text-gray-600">{item.description}</p>
            </Link>
          ))}
        </div>

        {(executiveReport.summary.tarefas_atrasadas > 0 || executiveReport.summary.riscos_altos > 0 || executiveReport.summary.milestones_atrasados > 0) && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="size-4" />
            <span>
              {executiveReport.summary.tarefas_atrasadas} tarefa(s) atrasada(s), {executiveReport.summary.milestones_atrasados} milestone(s) atrasado(s), {executiveReport.summary.riscos_altos} risco(s) alto(s).
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
