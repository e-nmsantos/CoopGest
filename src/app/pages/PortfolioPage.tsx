import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { apiGet } from "../lib/apiClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortfolioSummary {
  total_projects: number;
  average_health: number;
  critical_projects: number;
  attention_projects: number;
  high_priority_actions: number;
  total_beneficiaries: number;
  total_budget: number;
  executed_budget: number;
}

interface ProjectHealth {
  score: number;
  status: "Bom" | "Atenção" | "Crítico" | "Excelente";
}

interface ProjectSummary {
  tarefas_total: number;
  tarefas_concluidas: number;
  riscos_altos: number;
  beneficiarios: number;
}

interface ProjectFinance {
  despesas_previstas: number;
  despesas_reais: number;
  despesa_execucao: number;
}

interface Recommendation {
  kind: string;
  title: string;
  priority: string;
}

interface CrossRecommendation {
  kind: string;
  title: string;
  description: string;
  priority: string;
  project_id: number;
  project_name: string;
  health_score: number;
}

interface ProjectEntry {
  project_id: number;
  project_name: string;
  estado: string;
  health: ProjectHealth;
  summary: ProjectSummary;
  finance: ProjectFinance;
  top_recommendations: Recommendation[];
}

interface PortfolioData {
  generated_at: string;
  summary: PortfolioSummary;
  projects: ProjectEntry[];
  recommendations: CrossRecommendation[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthColor(status: string) {
  switch (status) {
    case "Excelente":
    case "Bom":
      return "bg-green-100 text-green-800";
    case "Atenção":
      return "bg-amber-100 text-amber-800";
    case "Crítico":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function healthBarColor(status: string) {
  switch (status) {
    case "Excelente":
    case "Bom":
      return "#16a34a";
    case "Atenção":
      return "#d97706";
    case "Crítico":
      return "#dc2626";
    default:
      return "#9ca3af";
  }
}

function priorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case "alta":
      return "bg-red-100 text-red-800";
    case "média":
    case "media":
      return "bg-amber-100 text-amber-800";
    case "baixa":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

const moneyFmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function money(v: number) {
  return moneyFmt.format(Number(v || 0));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<PortfolioData>("/api/portfolio/dashboard")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => {
        setError("Não foi possível carregar o portfólio. Verifica a tua sessão.");
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary;
  const projects = data?.projects ?? [];
  const recommendations = data?.recommendations ?? [];

  const chartData = projects.map((p) => ({
    name: p.project_name.length > 20 ? p.project_name.slice(0, 18) + "…" : p.project_name,
    score: p.health.score,
    status: p.health.status,
  }));

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Portfólio de Projetos</h1>
          <p className="text-gray-600 mt-1">Visão consolidada de todos os projetos</p>
        </div>

        {/* Loading / Error */}
        {loading && (
          <Card className="p-10 text-center text-gray-500">A carregar...</Card>
        )}

        {error && !loading && (
          <Card className="p-10 text-center text-red-600">{error}</Card>
        )}

        {!loading && !error && data && (
          <>
            {/* Summary KPI strip */}
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

            {/* Health chart */}
            {chartData.length > 0 && (
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
            )}

            {/* Project cards grid */}
            {projects.length === 0 ? (
              <Card className="p-10 text-center text-gray-500">
                Nenhum projeto disponível.
              </Card>
            ) : (
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
                      {/* Header */}
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

                      {/* Financial execution */}
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

                      {/* Tasks */}
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

                      {/* Beneficiaries */}
                      {p.summary.beneficiarios > 0 && (
                        <p className="text-xs text-gray-500">
                          Beneficiários: <span className="font-medium text-gray-700">{p.summary.beneficiarios.toLocaleString("pt-PT")}</span>
                        </p>
                      )}

                      {/* Top recommendation */}
                      {topRec && (
                        <div className={`rounded-md px-3 py-2 text-xs ${priorityColor(topRec.priority)}`}>
                          <span className="font-semibold">{topRec.priority}:</span> {topRec.title}
                        </div>
                      )}

                      {/* Link */}
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
            )}

            {/* Cross-project recommendations table */}
            {recommendations.length > 0 && (
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
                      {recommendations
                        .slice()
                        .sort((a, b) => {
                          const order: Record<string, number> = { alta: 0, média: 1, media: 1, baixa: 2 };
                          return (order[a.priority?.toLowerCase()] ?? 3) - (order[b.priority?.toLowerCase()] ?? 3);
                        })
                        .map((rec, i) => (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
