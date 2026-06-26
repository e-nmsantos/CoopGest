import { Header } from "../components/layout/Header";
import { ImpactDashboard } from "../components/impact/ImpactDashboard";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiImpactMetric {
  id: number;
  nome: string;
  valor_atual: number;
  meta: number;
  unidade: string;
  categoria: "social" | "ambiental" | "economico";
  ods: number[];
}

interface MetricHistory {
  id: number;
  valor: number;
  notas: string;
  registado_por: string;
  criado_em: string;
}

interface LogframeItem {
  id: number;
  nivel: string;
  resultado: string;
  indicador: string;
  unidade: string;
  fonte_verificacao: string;
  baseline: number;
  meta: number;
  valor_atual: number;
  estado: string;
  proxima_revisao: string;
  frequencia_medicao: string;
  responsavel_medicao: string;
  pressupostos: string;
}

interface LogframeHistory {
  id: number;
  valor: number;
  notas: string;
  registado_por: string;
  criado_em: string;
}

interface Evidencia {
  id: number;
  descricao: string;
  tipo: string;
  url_externa: string;
  documento_nome: string | null;
  criado_por: string;
  criado_em: string;
}

interface MetricForm {
  name: string;
  current: string;
  target: string;
  unit: string;
  category: "social" | "ambiental" | "economico";
  sdg: string;
  notas_medicao: string;
}

interface LogframeForm {
  nivel: string;
  resultado: string;
  indicador: string;
  unidade: string;
  fonte_verificacao: string;
  baseline: string;
  meta: string;
  valor_atual: string;
  estado: string;
  proxima_revisao: string;
  frequencia_medicao: string;
  responsavel_medicao: string;
  pressupostos: string;
  notas_medicao: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NIVEIS = ["Impacto", "Resultado", "Produção", "Atividade"];
const FREQUENCIAS = ["Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"];
const ESTADOS_LFA = ["Em acompanhamento", "Alcançado", "Em risco", "Não iniciado", "Suspenso"];

const NIVEL_COLORS: Record<string, string> = {
  Impacto: "bg-purple-100 text-purple-800",
  Resultado: "bg-blue-100 text-blue-800",
  Produção: "bg-green-100 text-green-800",
  Atividade: "bg-orange-100 text-orange-800",
};

const ESTADO_COLORS: Record<string, string> = {
  "Em acompanhamento": "bg-blue-50 text-blue-700",
  Alcançado: "bg-green-50 text-green-700",
  "Em risco": "bg-red-50 text-red-700",
  "Não iniciado": "bg-gray-50 text-gray-700",
  Suspenso: "bg-yellow-50 text-yellow-700",
};

const initialForm: MetricForm = {
  name: "",
  current: "",
  target: "",
  unit: "",
  category: "social",
  sdg: "",
  notas_medicao: "",
};

const initialLogframeForm: LogframeForm = {
  nivel: "Resultado",
  resultado: "",
  indicador: "",
  unidade: "",
  fonte_verificacao: "",
  baseline: "",
  meta: "",
  valor_atual: "",
  estado: "Em acompanhamento",
  proxima_revisao: "",
  frequencia_medicao: "Trimestral",
  responsavel_medicao: "",
  pressupostos: "",
  notas_medicao: "",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HistoryChart({ data, meta, baseline, unidade }: {
  data: { criado_em: string; valor: number }[];
  meta: number;
  baseline: number;
  unidade: string;
}) {
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImpactPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [metrics, setMetrics] = useState<ApiImpactMetric[]>([]);
  const [logframe, setLogframe] = useState<LogframeItem[]>([]);
  const [form, setForm] = useState<MetricForm>(initialForm);
  const [logframeForm, setLogframeForm] = useState<LogframeForm>(initialLogframeForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLogframeId, setEditingLogframeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogframeSubmitting, setIsLogframeSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // History & evidence per logframe item
  const [expandedIndicator, setExpandedIndicator] = useState<number | null>(null);
  const [logframeHistories, setLogframeHistories] = useState<Record<number, LogframeHistory[]>>({});
  const [evidencias, setEvidencias] = useState<Record<number, Evidencia[]>>({});
  const [metricHistories, setMetricHistories] = useState<Record<number, MetricHistory[]>>({});
  const [expandedMetric, setExpandedMetric] = useState<number | null>(null);

  // Quick-register measurement form (logframe)
  const [medicaoForm, setMedicaoForm] = useState<{ indicadorId: number | null; valor: string; notas: string }>({
    indicadorId: null,
    valor: "",
    notas: "",
  });

  const loadMetrics = async () => {
    if (!activeProjectId) { setMetrics([]); return; }
    try {
      const data = await apiGet<ApiImpactMetric[]>(`/api/impact/metrics?projeto_id=${encodeURIComponent(activeProjectId)}`);
      setMetrics(data);
    } catch {
      toast.error("Não foi possível carregar métricas de impacto");
    }
  };

  const loadLogframe = async () => {
    if (!activeProjectId) { setLogframe([]); return; }
    try {
      const data = await apiGet<LogframeItem[]>(`/api/impact/logframe?projeto_id=${encodeURIComponent(activeProjectId)}`);
      setLogframe(data);
    } catch {
      toast.error("Não foi possível carregar o quadro lógico");
    }
  };

  const loadLogframeHistory = async (id: number) => {
    try {
      const data = await apiGet<LogframeHistory[]>(`/api/impact/logframe/${id}/history`);
      setLogframeHistories((prev) => ({ ...prev, [id]: data }));
    } catch {
      toast.error("Não foi possível carregar o histórico");
    }
  };

  const loadEvidencias = async (id: number) => {
    try {
      const data = await apiGet<Evidencia[]>(`/api/impact/logframe/${id}/evidencias`);
      setEvidencias((prev) => ({ ...prev, [id]: data }));
    } catch {
      toast.error("Não foi possível carregar evidências");
    }
  };

  const loadMetricHistory = async (id: number) => {
    try {
      const data = await apiGet<MetricHistory[]>(`/api/impact/metrics/${id}/history`);
      setMetricHistories((prev) => ({ ...prev, [id]: data }));
    } catch {
      toast.error("Não foi possível carregar o histórico da métrica");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void Promise.all([loadMetrics(), loadLogframe()]).finally(() => setIsLoading(false));
  }, [activeProjectId]);

  const handleExpandIndicator = async (id: number) => {
    if (expandedIndicator === id) {
      setExpandedIndicator(null);
      return;
    }
    setExpandedIndicator(id);
    await Promise.all([loadLogframeHistory(id), loadEvidencias(id)]);
  };

  const handleExpandMetric = async (id: number) => {
    if (expandedMetric === id) {
      setExpandedMetric(null);
      return;
    }
    setExpandedMetric(id);
    await loadMetricHistory(id);
  };

  // Submit metric form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sdgValues = form.sdg.split(",").map((v) => v.trim()).filter(Boolean).map(Number);
      const payload = {
        nome: form.name,
        valor_atual: Number(form.current),
        meta: Number(form.target),
        unidade: form.unit,
        categoria: form.category,
        ods: sdgValues,
        projeto_id: activeProjectId ? Number(activeProjectId) : null,
        notas_medicao: form.notas_medicao,
      };
      const endpoint = editingId ? `/api/impact/metrics/${editingId}` : "/api/impact/metrics";
      if (editingId) {
        await apiPut<ApiImpactMetric>(endpoint, payload);
      } else {
        await apiPost<ApiImpactMetric>(endpoint, payload);
      }
      toast.success(editingId ? "Métrica atualizada" : "Métrica criada");
      setForm(initialForm);
      setEditingId(null);
      await loadMetrics();
    } catch {
      toast.error("Não foi possível guardar a métrica");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit logframe form
  const handleLogframeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    setIsLogframeSubmitting(true);
    try {
      const payload = {
        ...logframeForm,
        baseline: Number(logframeForm.baseline || 0),
        meta: Number(logframeForm.meta || 0),
        valor_atual: Number(logframeForm.valor_atual || 0),
        projeto_id: Number(activeProjectId),
      };
      const endpoint = editingLogframeId
        ? `/api/impact/logframe/${editingLogframeId}`
        : "/api/impact/logframe";
      if (editingLogframeId) {
        await apiPut<LogframeItem>(endpoint, payload);
      } else {
        await apiPost<LogframeItem>(endpoint, payload);
      }
      toast.success(editingLogframeId ? "Quadro lógico atualizado" : "Elemento adicionado ao quadro lógico");
      setLogframeForm(initialLogframeForm);
      setEditingLogframeId(null);
      await loadLogframe();
    } catch {
      toast.error("Não foi possível guardar o quadro lógico");
    } finally {
      setIsLogframeSubmitting(false);
    }
  };

  // Register a quick measurement for a logframe indicator
  const handleRegistarMedicao = async (indicadorId: number) => {
    const valor = parseFloat(medicaoForm.valor);
    if (isNaN(valor)) {
      toast.error("Valor inválido");
      return;
    }
    try {
      await apiPost(`/api/impact/logframe/${indicadorId}/history`, {
        valor,
        notas: medicaoForm.notas,
      });
      toast.success("Medição registada");
      setMedicaoForm({ indicadorId: null, valor: "", notas: "" });
      await Promise.all([loadLogframe(), loadLogframeHistory(indicadorId)]);
    } catch {
      toast.error("Não foi possível registar a medição");
    }
  };

  const handleDeleteEvidencia = async (evidenciaId: number, indicadorId: number) => {
    try {
      await apiDelete(`/api/impact/evidencias/${evidenciaId}`);
      toast.success("Evidência eliminada");
      await loadEvidencias(indicadorId);
    } catch {
      toast.error("Não foi possível eliminar a evidência");
    }
  };

  const handleLogframeEdit = (item: LogframeItem) => {
    setEditingLogframeId(item.id);
    setLogframeForm({
      nivel: item.nivel || "Resultado",
      resultado: item.resultado,
      indicador: item.indicador,
      unidade: item.unidade || "",
      fonte_verificacao: item.fonte_verificacao || "",
      baseline: String(item.baseline ?? ""),
      meta: String(item.meta ?? ""),
      valor_atual: String(item.valor_atual ?? ""),
      estado: item.estado || "Em acompanhamento",
      proxima_revisao: item.proxima_revisao || "",
      frequencia_medicao: item.frequencia_medicao || "Trimestral",
      responsavel_medicao: item.responsavel_medicao || "",
      pressupostos: item.pressupostos || "",
      notas_medicao: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogframeDelete = async (id: number) => {
    try {
      await apiDelete<null>(`/api/impact/logframe/${id}`);
      toast.success("Elemento eliminado");
      if (editingLogframeId === id) {
        setEditingLogframeId(null);
        setLogframeForm(initialLogframeForm);
      }
      if (expandedIndicator === id) setExpandedIndicator(null);
      await loadLogframe();
    } catch {
      toast.error("Não foi possível eliminar o elemento");
    }
  };

  const handleEdit = (metric: ApiImpactMetric) => {
    setEditingId(metric.id);
    setForm({
      name: metric.nome,
      current: String(metric.valor_atual),
      target: String(metric.meta),
      unit: metric.unidade,
      category: metric.categoria,
      sdg: (metric.ods || []).join(","),
      notas_medicao: "",
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDelete<null>(`/api/impact/metrics/${id}`);
      toast.success("Métrica eliminada");
      if (editingId === id) { setEditingId(null); setForm(initialForm); }
      if (expandedMetric === id) setExpandedMetric(null);
      await loadMetrics();
    } catch {
      toast.error("Não foi possível eliminar a métrica");
    }
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Escolha um projeto ativo no topo para acompanhar métricas isoladas desse projeto.
          </div>
        </div>
      </div>
    );
  }

  // Group logframe items by level
  const logframeByNivel = NIVEIS.reduce<Record<string, LogframeItem[]>>((acc, n) => {
    acc[n] = logframe.filter((i) => i.nivel === n);
    return acc;
  }, {});

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard de Impacto e M&E</h1>
          <p className="text-gray-600 mt-1">
            Monitorização e avaliação de {activeProject?.name || "projeto ativo"}
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* LOGFRAME FORM                                                     */}
        {/* ---------------------------------------------------------------- */}
        <Card className="p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingLogframeId ? "Editar indicador" : "Quadro Lógico — novo indicador"}
            </h2>
            <p className="text-sm text-gray-500">
              Estruture os indicadores por nível (Impacto → Resultado → Produção → Atividade) conforme a metodologia LFA.
            </p>
          </div>

          <form onSubmit={handleLogframeSubmit} className="space-y-4">
            {/* Level + State + Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nível LFA</Label>
                <Select
                  value={logframeForm.nivel}
                  onValueChange={(v) => setLogframeForm((p) => ({ ...p, nivel: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Situação</Label>
                <Select
                  value={logframeForm.estado}
                  onValueChange={(v) => setLogframeForm((p) => ({ ...p, estado: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_LFA.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequência de medição</Label>
                <Select
                  value={logframeForm.frequencia_medicao}
                  onValueChange={(v) => setLogframeForm((p) => ({ ...p, frequencia_medicao: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Outcome + Indicator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="logframe-result">Resultado esperado</Label>
                <Input
                  id="logframe-result"
                  required
                  value={logframeForm.resultado}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, resultado: e.target.value }))}
                  placeholder="Ex: Jovens aumentam competências digitais"
                />
              </div>
              <div>
                <Label htmlFor="logframe-indicator">Indicador</Label>
                <Input
                  id="logframe-indicator"
                  required
                  value={logframeForm.indicador}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, indicador: e.target.value }))}
                  placeholder="Ex: % de participantes que concluem formação"
                />
              </div>
            </div>

            {/* Values row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Baseline</Label>
                <Input
                  type="number" step="0.01"
                  value={logframeForm.baseline}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, baseline: e.target.value }))}
                />
              </div>
              <div>
                <Label>Meta</Label>
                <Input
                  type="number" step="0.01"
                  value={logframeForm.meta}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, meta: e.target.value }))}
                />
              </div>
              <div>
                <Label>Valor atual</Label>
                <Input
                  type="number" step="0.01"
                  value={logframeForm.valor_atual}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, valor_atual: e.target.value }))}
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input
                  value={logframeForm.unidade}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, unidade: e.target.value }))}
                  placeholder="%"
                />
              </div>
              <div>
                <Label>Próxima revisão</Label>
                <Input
                  type="date"
                  value={logframeForm.proxima_revisao}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, proxima_revisao: e.target.value }))}
                />
              </div>
            </div>

            {/* Source + Responsible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fonte de verificação</Label>
                <Input
                  value={logframeForm.fonte_verificacao}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, fonte_verificacao: e.target.value }))}
                  placeholder="Ex: lista de presenças, inquérito, relatório"
                />
              </div>
              <div>
                <Label>Responsável pela medição</Label>
                <Input
                  value={logframeForm.responsavel_medicao}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, responsavel_medicao: e.target.value }))}
                  placeholder="Ex: Coordenador M&E"
                />
              </div>
            </div>

            {/* Pressupostos — 5th column of LFA */}
            <div>
              <Label>Pressupostos / Riscos externos</Label>
              <Textarea
                value={logframeForm.pressupostos}
                onChange={(e) => setLogframeForm((p) => ({ ...p, pressupostos: e.target.value }))}
                placeholder="Ex: o contexto político permanece estável; os parceiros mantêm o compromisso"
                rows={2}
                className="text-sm"
              />
            </div>

            {editingLogframeId && (
              <div>
                <Label>Notas desta atualização</Label>
                <Input
                  value={logframeForm.notas_medicao}
                  onChange={(e) => setLogframeForm((p) => ({ ...p, notas_medicao: e.target.value }))}
                  placeholder="Opcional — contexto sobre a alteração do valor"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              {editingLogframeId && (
                <Button type="button" variant="outline" onClick={() => { setEditingLogframeId(null); setLogframeForm(initialLogframeForm); }}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={isLogframeSubmitting}>
                {isLogframeSubmitting ? "A guardar..." : editingLogframeId ? "Guardar alterações" : "Adicionar indicador"}
              </Button>
            </div>
          </form>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* LOGFRAME LIST — grouped by level                                 */}
        {/* ---------------------------------------------------------------- */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quadro Lógico</h2>
          {logframe.length === 0 ? (
            <p className="text-sm text-gray-500">Ainda não existem indicadores no quadro lógico.</p>
          ) : (
            <div className="space-y-6">
              {NIVEIS.map((nivel) => {
                const items = logframeByNivel[nivel];
                if (!items || items.length === 0) return null;
                return (
                  <div key={nivel}>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3 ${NIVEL_COLORS[nivel] || "bg-gray-100 text-gray-700"}`}>
                      {nivel}
                    </div>
                    <div className="space-y-3">
                      {items.map((item) => {
                        const progress = item.meta > 0 ? Math.min(100, Math.round(((item.valor_atual - item.baseline) / (item.meta - item.baseline || 1)) * 100)) : 0;
                        const isExpanded = expandedIndicator === item.id;
                        const hist = logframeHistories[item.id] || [];
                        const evs = evidencias[item.id] || [];
                        const isOverdue = item.proxima_revisao && new Date(item.proxima_revisao) < new Date();

                        return (
                          <div key={item.id} className="rounded-md border bg-white">
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{item.resultado}</p>
                                  <p className="text-sm text-gray-600 mt-0.5">{item.indicador}</p>
                                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                                    <span className={`px-1.5 py-0.5 rounded ${ESTADO_COLORS[item.estado] || "bg-gray-50 text-gray-600"}`}>
                                      {item.estado}
                                    </span>
                                    {item.fonte_verificacao && <span>Fonte: {item.fonte_verificacao}</span>}
                                    {item.responsavel_medicao && <span>Resp.: {item.responsavel_medicao}</span>}
                                    {item.frequencia_medicao && <span>Freq.: {item.frequencia_medicao}</span>}
                                    {item.proxima_revisao && (
                                      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                        {isOverdue ? "⚠ " : ""}Revisão: {item.proxima_revisao}
                                      </span>
                                    )}
                                  </div>
                                  {item.pressupostos && (
                                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5">
                                      <span className="font-medium">Pressupostos:</span> {item.pressupostos}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button type="button" variant="outline" size="sm" onClick={() => void handleExpandIndicator(item.id)}>
                                    {isExpanded ? "Fechar" : "Detalhe"}
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => handleLogframeEdit(item)}>Editar</Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => void handleLogframeDelete(item.id)}>Eliminar</Button>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3 grid grid-cols-[80px_80px_80px_minmax(0,1fr)] gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500">Baseline</p>
                                  <p className="font-semibold">{item.baseline} {item.unidade}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Atual</p>
                                  <p className="font-semibold text-blue-700">{item.valor_atual} {item.unidade}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Meta</p>
                                  <p className="font-semibold text-green-700">{item.meta} {item.unidade}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Progresso ({progress}%)</p>
                                  <div className="h-2 rounded-full bg-gray-100">
                                    <div
                                      className={`h-2 rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-orange-400"}`}
                                      style={{ width: `${Math.max(0, progress)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded panel */}
                            {isExpanded && (
                              <div className="border-t bg-gray-50 p-4 space-y-4">
                                {/* Quick measurement */}
                                <div>
                                  <p className="text-sm font-medium text-gray-800 mb-2">Registar medição</p>
                                  <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                      <Label className="text-xs">Novo valor ({item.unidade || "—"})</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 text-sm"
                                        value={medicaoForm.indicadorId === item.id ? medicaoForm.valor : ""}
                                        onFocus={() => setMedicaoForm((p) => ({ ...p, indicadorId: item.id }))}
                                        onChange={(e) => setMedicaoForm((p) => ({ ...p, indicadorId: item.id, valor: e.target.value }))}
                                        placeholder="Ex: 65"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <Label className="text-xs">Notas</Label>
                                      <Input
                                        className="h-8 text-sm"
                                        value={medicaoForm.indicadorId === item.id ? medicaoForm.notas : ""}
                                        onFocus={() => setMedicaoForm((p) => ({ ...p, indicadorId: item.id }))}
                                        onChange={(e) => setMedicaoForm((p) => ({ ...p, indicadorId: item.id, notas: e.target.value }))}
                                        placeholder="Contexto opcional"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => void handleRegistarMedicao(item.id)}
                                      disabled={medicaoForm.indicadorId !== item.id || !medicaoForm.valor}
                                    >
                                      Registar
                                    </Button>
                                  </div>
                                </div>

                                {/* Historical chart */}
                                <div>
                                  <p className="text-sm font-medium text-gray-800 mb-1">Evolução histórica</p>
                                  <HistoryChart
                                    data={hist}
                                    meta={item.meta}
                                    baseline={item.baseline}
                                    unidade={item.unidade || ""}
                                  />
                                  {hist.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                      {[...hist].reverse().map((h) => (
                                        <div key={h.id} className="flex items-center gap-2 text-xs text-gray-600">
                                          <span className="text-gray-400">{new Date(h.criado_em).toLocaleDateString("pt-PT")}</span>
                                          <span className="font-medium">{h.valor} {item.unidade}</span>
                                          {h.notas && <span className="text-gray-400">— {h.notas}</span>}
                                          {h.registado_por && <span className="text-gray-400">por {h.registado_por}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Evidence */}
                                <div>
                                  <p className="text-sm font-medium text-gray-800 mb-2">Evidências</p>
                                  {evs.length > 0 ? (
                                    <div className="space-y-1 mb-2">
                                      {evs.map((ev) => (
                                        <div key={ev.id} className="flex items-center justify-between gap-2 text-xs bg-white border rounded px-2 py-1">
                                          <div>
                                            <span className="font-medium">{ev.descricao}</span>
                                            {ev.documento_nome && <span className="text-gray-400 ml-1">({ev.documento_nome})</span>}
                                            {ev.url_externa && <a href={ev.url_externa} target="_blank" rel="noreferrer" className="text-blue-600 ml-1">link</a>}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-1 text-red-500 hover:text-red-700"
                                            onClick={() => void handleDeleteEvidencia(ev.id, item.id)}
                                          >
                                            ×
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 mb-2">Sem evidências registadas.</p>
                                  )}
                                  <AddEvidenciaForm indicadorId={item.id} onAdded={() => void loadEvidencias(item.id)} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* IMPACT METRICS                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? "Editar Métrica" : "Nova Métrica de Impacto"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="metric-name">Nome</Label>
              <Input
                id="metric-name" required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Pessoas formadas"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Valor atual</Label>
                <Input type="number" step="0.01" required value={form.current}
                  onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))} />
              </div>
              <div>
                <Label>Meta</Label>
                <Input type="number" step="0.01" required value={form.target}
                  onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="pessoas, %, ton" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v: "social" | "ambiental" | "economico") => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="ambiental">Ambiental</SelectItem>
                    <SelectItem value="economico">Económico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ODS (separados por vírgula)</Label>
                <Input value={form.sdg} onChange={(e) => setForm((p) => ({ ...p, sdg: e.target.value }))} placeholder="4,8,13" />
              </div>
              {editingId && (
                <div>
                  <Label>Notas desta atualização</Label>
                  <Input value={form.notas_medicao}
                    onChange={(e) => setForm((p) => ({ ...p, notas_medicao: e.target.value }))}
                    placeholder="Contexto opcional" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancelar</Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : editingId ? "Guardar" : "Criar"}
              </Button>
            </div>
          </form>
        </Card>

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
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleExpandMetric(metric.id)}>
                          {isExpanded ? "Fechar" : "Histórico"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(metric)}>Editar</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleDelete(metric.id)}>Eliminar</Button>
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

        <ImpactDashboard
          metrics={metrics.map((metric) => ({
            id: String(metric.id),
            name: metric.nome,
            current: metric.valor_atual,
            target: metric.meta,
            unit: metric.unidade,
            category: metric.categoria,
            sdg: metric.ods,
          }))}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddEvidenciaForm — small inline form
// ---------------------------------------------------------------------------

function AddEvidenciaForm({ indicadorId, onAdded }: { indicadorId: number; onAdded: () => void }) {
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    if (!descricao.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/api/impact/logframe/${indicadorId}/evidencias`, {
        descricao,
        url_externa: url,
        tipo: url ? "url" : "documento",
      });
      setDescricao("");
      setUrl("");
      setOpen(false);
      onAdded();
    } catch {
      toast.error("Não foi possível adicionar evidência");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Adicionar evidência
      </Button>
    );
  }

  return (
    <div className="space-y-2 bg-white border rounded p-2">
      <Input
        className="h-7 text-xs"
        placeholder="Descrição da evidência *"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <Input
        className="h-7 text-xs"
        placeholder="URL externa (opcional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => void handleSave()} disabled={saving || !descricao.trim()}>
          {saving ? "A guardar..." : "Guardar"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
