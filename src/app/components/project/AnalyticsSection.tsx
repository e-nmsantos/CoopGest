import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { toast } from "sonner";
import { apiGet } from "../../lib/apiClient";
import { formatMoneyCompact } from "../../lib/currency";

interface DbTask {
  id: number;
  nome: string;
  estado?: string;
  prioridade?: string;
  responsavel?: string;
}

interface DbBudgetItem {
  id: number;
  tipo: string;
  categoria: string;
  descricao: string;
  valor_previsto: number;
  valor_real: number;
}

interface HourLog {
  id: number;
  tarefa_id: number;
  tarefa_nome: string;
  user_nome: string;
  horas: number;
  data_registo: string;
}

interface AnalyticsSectionProps {
  projectId: string;
  tasks: DbTask[];
  budget: DbBudgetItem[];
}

const STATUS_COLORS: Record<string, string> = {
  "Por fazer": "#94a3b8",
  "Em curso": "#3b82f6",
  "Concluída": "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
}) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function AnalyticsSection({ projectId, tasks, budget }: AnalyticsSectionProps) {
  const [hours, setHours] = useState<HourLog[]>([]);
  const [loadingHours, setLoadingHours] = useState(true);

  useEffect(() => {
    apiGet<{ logs?: HourLog[] }>(`/api/projects/${projectId}/hours`)
      .then(data => setHours(data.logs || []))
      .catch(() => toast.error("Erro ao carregar horas"))
      .finally(() => setLoadingHours(false));
  }, [projectId]);

  // --- Task status distribution ---
  const statusData = Object.entries(
    tasks.reduce<Record<string, number>>((acc, t) => {
      const s = t.estado || "Por fazer";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // --- Task priority distribution ---
  const priorityLabels: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };
  const priorityData = Object.entries(
    tasks.reduce<Record<string, number>>((acc, t) => {
      const p = t.prioridade || "medium";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {})
  ).map(([key, value]) => ({ name: priorityLabels[key] || key, value, key }));

  // --- Budget by category (despesas only) ---
  const despesas = budget.filter(b => b.tipo === "Despesa");
  const budgetByCategory = Object.entries(
    despesas.reduce<Record<string, { previsto: number; real: number }>>((acc, b) => {
      if (!acc[b.categoria]) acc[b.categoria] = { previsto: 0, real: 0 };
      acc[b.categoria].previsto += b.valor_previsto || 0;
      acc[b.categoria].real += b.valor_real || 0;
      return acc;
    }, {})
  ).map(([cat, vals]) => ({ categoria: cat.length > 12 ? cat.substring(0, 12) + "…" : cat, ...vals }));

  // --- Hours by person ---
  const hoursByPerson = Object.entries(
    hours.reduce<Record<string, number>>((acc, h) => {
      acc[h.user_nome] = (acc[h.user_nome] || 0) + h.horas;
      return acc;
    }, {})
  ).map(([nome, horas]) => ({ nome: nome.split(" ")[0], horas }))
    .sort((a, b) => b.horas - a.horas);

  // --- Hours over time (last 8 weeks) ---
  const hoursOverTime = (() => {
    const weekMap: Record<string, number> = {};
    hours.forEach(h => {
      if (!h.data_registo) return;
      const d = new Date(h.data_registo);
      const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate()) / 7)).padStart(2, '0')}`;
      weekMap[week] = (weekMap[week] || 0) + h.horas;
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([semana, horas]) => ({ semana, horas }));
  })();

  const totalHours = hours.reduce((s, h) => s + h.horas, 0);
  const completedTasks = tasks.filter(t => t.estado === "Concluída").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{tasks.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Total de Tarefas</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{completionRate}%</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Taxa de Conclusão</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{totalHours}h</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Horas Registadas</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">
            {formatMoneyCompact(budget.filter(b => b.tipo === "Despesa").reduce((s, b) => s + (b.valor_previsto || 0), 0))}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Despesas Previstas</div>
        </Card>
      </div>

      {/* Row 1: Task charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status pie */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Estado das Tarefas</h3>
          {statusData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sem tarefas</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} tarefas`, ""]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Priority bar */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tarefas por Prioridade</h3>
          {priorityData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sem tarefas</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Tarefas" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.key} fill={PRIORITY_COLORS[entry.key] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 2: Budget */}
      {budgetByCategory.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Orcamento por Categoria - Previsto vs Real (USD)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={budgetByCategory} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
              <Legend />
              <Bar dataKey="previsto" name="Previsto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="real" name="Real" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Row 3: Hours */}
      {!loadingHours && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hoursByPerson.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Horas por Pessoa</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hoursByPerson} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip formatter={(v: number) => `${v}h`} />
                  <Bar dataKey="horas" name="Horas" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {hoursByPerson.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hoursOverTime.length > 1 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolução de Horas Registadas</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={hoursOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${v}h`} />
                  <Line type="monotone" dataKey="horas" name="Horas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {hoursByPerson.length === 0 && hoursOverTime.length <= 1 && (
            <Card className="p-8 text-center col-span-2">
              <p className="text-gray-400 text-sm">Sem horas registadas para gráficos</p>
              <p className="text-gray-300 text-xs mt-1">Registe horas no separador ⏱ Horas</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
