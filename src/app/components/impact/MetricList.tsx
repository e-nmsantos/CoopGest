import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { HistoryChart } from "./HistoryChart";
import { type ApiImpactMetric, type MetricHistory } from "./impactTypes";

interface MetricListProps {
  metrics: ApiImpactMetric[];
  isLoading: boolean;
  metricHistories: Record<number, MetricHistory[]>;
  expandedMetric: number | null;
  onExpandMetric: (id: number) => void;
  onEdit: (metric: ApiImpactMetric) => void;
  onDelete: (id: number) => void;
}

export function MetricList({
  metrics,
  isLoading,
  metricHistories,
  expandedMetric,
  onExpandMetric,
  onEdit,
  onDelete,
}: MetricListProps) {
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas registadas</h2>
      {isLoading ? (
        <p className="text-sm text-gray-500">A carregar...</p>
      ) : metrics.length === 0 ? (
        <p className="text-sm text-gray-500">Ainda não existem métricas.</p>
      ) : (
        <div className="space-y-3">
          {metrics.map((metric) => {
            const pct = metric.meta > 0 ? Math.min(100, Math.round((metric.valor_atual / metric.meta) * 100)) : 0;
            const isExpanded = expandedMetric === metric.id;
            const hist = metricHistories[metric.id] || [];
            return (
              <div key={metric.id} className="rounded-md border bg-white">
                <div className="flex items-center justify-between p-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{metric.nome}</p>
                    <p className="text-sm text-gray-600">
                      {metric.valor_atual} / {metric.meta} {metric.unidade} • {metric.categoria}
                      {metric.ods?.length > 0 && ` • ODS ${metric.ods.join(", ")}`}
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 w-full max-w-xs">
                      <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => onExpandMetric(metric.id)}>
                      {isExpanded ? "Fechar" : "Histórico"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(metric)}>Editar</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onDelete(metric.id)}>Eliminar</Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800 mb-2">Evolução histórica</p>
                    <HistoryChart data={hist} meta={metric.meta} baseline={0} unidade={metric.unidade} />
                    {hist.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                        {[...hist].reverse().map((h) => (
                          <div key={h.id} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="text-gray-400">{new Date(h.criado_em).toLocaleDateString("pt-PT")}</span>
                            <span className="font-medium">{h.valor} {metric.unidade}</span>
                            {h.notas && <span className="text-gray-400">— {h.notas}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
