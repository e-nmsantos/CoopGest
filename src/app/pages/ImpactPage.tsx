import { Header } from "../components/layout/Header";
import { ImpactDashboard } from "../components/impact/ImpactDashboard";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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

interface ApiImpactMetric {
  id: number;
  nome: string;
  valor_atual: number;
  meta: number;
  unidade: string;
  categoria: "social" | "ambiental" | "economico";
  ods: number[];
}

interface LogframeItem {
  id: number;
  resultado: string;
  indicador: string;
  fonte_verificacao: string;
  baseline: number;
  meta: number;
  valor_atual: number;
  estado: string;
  proxima_revisao: string;
}

interface MetricForm {
  name: string;
  current: string;
  target: string;
  unit: string;
  category: "social" | "ambiental" | "economico";
  sdg: string;
}

interface LogframeForm {
  resultado: string;
  indicador: string;
  fonte_verificacao: string;
  baseline: string;
  meta: string;
  valor_atual: string;
  estado: string;
  proxima_revisao: string;
}

const initialForm: MetricForm = {
  name: "",
  current: "",
  target: "",
  unit: "",
  category: "social",
  sdg: "",
};

const initialLogframeForm: LogframeForm = {
  resultado: "",
  indicador: "",
  fonte_verificacao: "",
  baseline: "",
  meta: "",
  valor_atual: "",
  estado: "Em acompanhamento",
  proxima_revisao: "",
};

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

  const loadMetrics = async () => {
    if (!activeProjectId) {
      setMetrics([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiGet<ApiImpactMetric[]>(`/api/impact/metrics?projeto_id=${encodeURIComponent(activeProjectId)}`);
      setMetrics(data);
    } catch {
      toast.error("Não foi possível carregar métricas de impacto");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogframe = async () => {
    if (!activeProjectId) {
      setLogframe([]);
      return;
    }

    try {
      const data = await apiGet<LogframeItem[]>(`/api/impact/logframe?projeto_id=${encodeURIComponent(activeProjectId)}`);
      setLogframe(data);
    } catch {
      toast.error("Não foi possível carregar o quadro lógico");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void Promise.all([loadMetrics(), loadLogframe()]).finally(() => setIsLoading(false));
  }, [activeProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const sdgValues = form.sdg
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value));

      const payload = {
        nome: form.name,
        valor_atual: Number(form.current),
        meta: Number(form.target),
        unidade: form.unit,
        categoria: form.category,
        ods: sdgValues,
        projeto_id: activeProjectId ? Number(activeProjectId) : null,
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
      const endpoint = editingLogframeId ? `/api/impact/logframe/${editingLogframeId}` : "/api/impact/logframe";
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

  const handleLogframeEdit = (item: LogframeItem) => {
    setEditingLogframeId(item.id);
    setLogframeForm({
      resultado: item.resultado,
      indicador: item.indicador,
      fonte_verificacao: item.fonte_verificacao || "",
      baseline: String(item.baseline ?? ""),
      meta: String(item.meta ?? ""),
      valor_atual: String(item.valor_atual ?? ""),
      estado: item.estado || "Em acompanhamento",
      proxima_revisao: item.proxima_revisao || "",
    });
  };

  const handleLogframeDelete = async (id: number) => {
    try {
      await apiDelete<null>(`/api/impact/logframe/${id}`);
      toast.success("Elemento eliminado");
      if (editingLogframeId === id) {
        setEditingLogframeId(null);
        setLogframeForm(initialLogframeForm);
      }
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
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDelete<null>(`/api/impact/metrics/${id}`);

      toast.success("Métrica eliminada");
      if (editingId === id) {
        setEditingId(null);
        setForm(initialForm);
      }
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

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Dashboard de Impacto
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhe o impacto social, ambiental e económico de {activeProject?.name || "projeto ativo"}
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quadro Lógico</h2>
            <p className="text-sm text-gray-600">
              Ligue resultados esperados a indicadores, fontes de verificação e revisões de monitorização.
            </p>
          </div>

          <form onSubmit={handleLogframeSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="logframe-result">Resultado esperado</Label>
                <Input
                  id="logframe-result"
                  required
                  value={logframeForm.resultado}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, resultado: e.target.value }))}
                  placeholder="Ex: Jovens aumentam competências digitais"
                />
              </div>
              <div>
                <Label htmlFor="logframe-indicator">Indicador</Label>
                <Input
                  id="logframe-indicator"
                  required
                  value={logframeForm.indicador}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, indicador: e.target.value }))}
                  placeholder="Ex: % de participantes que concluem formação"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="logframe-baseline">Baseline</Label>
                <Input
                  id="logframe-baseline"
                  type="number"
                  step="0.01"
                  value={logframeForm.baseline}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, baseline: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="logframe-target">Meta</Label>
                <Input
                  id="logframe-target"
                  type="number"
                  step="0.01"
                  value={logframeForm.meta}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, meta: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="logframe-current">Valor atual</Label>
                <Input
                  id="logframe-current"
                  type="number"
                  step="0.01"
                  value={logframeForm.valor_atual}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, valor_atual: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="logframe-review">Próxima revisão</Label>
                <Input
                  id="logframe-review"
                  type="date"
                  value={logframeForm.proxima_revisao}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, proxima_revisao: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="logframe-source">Fonte de verificação</Label>
                <Input
                  id="logframe-source"
                  value={logframeForm.fonte_verificacao}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, fonte_verificacao: e.target.value }))}
                  placeholder="Ex: lista de presenças, inquérito, relatório"
                />
              </div>
              <div>
                <Label htmlFor="logframe-status">Situação</Label>
                <Input
                  id="logframe-status"
                  value={logframeForm.estado}
                  onChange={(e) => setLogframeForm((prev) => ({ ...prev, estado: e.target.value }))}
                  placeholder="Em acompanhamento"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingLogframeId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingLogframeId(null);
                    setLogframeForm(initialLogframeForm);
                  }}
                >
                  Cancelar edição
                </Button>
              )}
              <Button type="submit" disabled={isLogframeSubmitting}>
                {isLogframeSubmitting ? "A guardar..." : editingLogframeId ? "Guardar quadro lógico" : "Adicionar ao quadro lógico"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Elementos do quadro lógico</h2>
          {logframe.length === 0 ? (
            <p className="text-sm text-gray-500">Ainda não existem resultados/indicadores estruturados.</p>
          ) : (
            <div className="space-y-3">
              {logframe.map((item) => {
                const progress = item.meta > 0 ? Math.min(100, Math.round((item.valor_atual / item.meta) * 100)) : 0;

                return (
                  <div key={item.id} className="rounded-md border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.resultado}</p>
                        <p className="text-sm text-gray-600">{item.indicador}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Fonte: {item.fonte_verificacao || "Não definida"} · Situação: {item.estado}
                          {item.proxima_revisao ? ` · Próxima revisão: ${item.proxima_revisao}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleLogframeEdit(item)}>
                          Editar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleLogframeDelete(item.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-[120px_120px_120px_minmax(0,1fr)] gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Baseline</p>
                        <p className="font-semibold">{item.baseline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Atual</p>
                        <p className="font-semibold">{item.valor_atual}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Meta</p>
                        <p className="font-semibold">{item.meta}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Progresso</p>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? "Editar Métrica" : "Nova Métrica"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="metric-name">Nome</Label>
              <Input
                id="metric-name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pessoas formadas"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="metric-current">Valor atual</Label>
                <Input
                  id="metric-current"
                  type="number"
                  step="0.01"
                  required
                  value={form.current}
                  onChange={(e) => setForm((prev) => ({ ...prev, current: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="metric-target">Meta</Label>
                <Input
                  id="metric-target"
                  type="number"
                  step="0.01"
                  required
                  value={form.target}
                  onChange={(e) => setForm((prev) => ({ ...prev, target: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="metric-unit">Unidade</Label>
                <Input
                  id="metric-unit"
                  value={form.unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="pessoas, %, ton"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(value: "social" | "ambiental" | "economico") =>
                    setForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="ambiental">Ambiental</SelectItem>
                    <SelectItem value="economico">Económico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="metric-sdg">ODS (separados por vírgula)</Label>
                <Input
                  id="metric-sdg"
                  value={form.sdg}
                  onChange={(e) => setForm((prev) => ({ ...prev, sdg: e.target.value }))}
                  placeholder="4,8,13"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                >
                  Cancelar edição
                </Button>
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
            <div className="space-y-2">
              {metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium text-gray-900">{metric.nome}</p>
                    <p className="text-sm text-gray-600">
                      {metric.valor_atual} / {metric.meta} {metric.unidade} • {metric.categoria}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(metric)}>
                      Editar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleDelete(metric.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
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
