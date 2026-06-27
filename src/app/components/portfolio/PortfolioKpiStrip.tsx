import { Card } from "../ui/card";
import type { PortfolioSummary } from "./portfolio.types";

interface PortfolioKpiStripProps {
  summary: PortfolioSummary | undefined;
}

export function PortfolioKpiStrip({ summary }: PortfolioKpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total de projetos</p>
        <p className="text-3xl font-bold text-gray-900">{summary?.total_projects ?? 0}</p>
        {summary && summary.critical_projects > 0 && (
          <p className="text-xs text-red-600 mt-1">{summary.critical_projects} crítico(s)</p>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saúde média</p>
        <p className="text-3xl font-bold text-gray-900">{Math.round(summary?.average_health ?? 0)}%</p>
        {summary && summary.attention_projects > 0 && (
          <p className="text-xs text-amber-600 mt-1">{summary.attention_projects} em atenção</p>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Beneficiários totais</p>
        <p className="text-3xl font-bold text-gray-900">
          {(summary?.total_beneficiaries ?? 0).toLocaleString("pt-PT")}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ações prioritárias</p>
        <p className="text-3xl font-bold text-gray-900">{summary?.high_priority_actions ?? 0}</p>
        <p className="text-xs text-gray-500 mt-1">Alta prioridade</p>
      </Card>
    </div>
  );
}
