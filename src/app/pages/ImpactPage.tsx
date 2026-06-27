import { Header } from "../components/layout/Header";
import { ImpactDashboard } from "../components/impact/ImpactDashboard";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import { Skeleton } from "../components/ui/skeleton";
import { LogframeForm } from "../components/impact/LogframeForm";
import { LogframeList } from "../components/impact/LogframeList";
import { MetricForm } from "../components/impact/MetricForm";
import { MetricList } from "../components/impact/MetricList";
import {
  type ApiImpactMetric,
  type MetricHistory,
  type LogframeItem,
  type LogframeHistory,
  type Evidencia,
  type MetricForm as MetricFormState,
  type LogframeForm as LogframeFormState,
  initialMetricForm,
  initialLogframeForm,
} from "../components/impact/impactTypes";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImpactPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [metrics, setMetrics] = useState<ApiImpactMetric[]>([]);
  const [logframe, setLogframe] = useState<LogframeItem[]>([]);
  const [form, setForm] = useState<MetricFormState>(initialMetricForm);
  const [logframeForm, setLogframeForm] = useState<LogframeFormState>(initialLogframeForm);
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
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setForm(initialMetricForm);
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
      if (editingId === id) { setEditingId(null); setForm(initialMetricForm); }
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

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
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
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard de Impacto e M&E</h1>
          <p className="text-gray-600 mt-1">
            Monitorização e avaliação de {activeProject?.name || "projeto ativo"}
          </p>
        </div>

        <LogframeForm
          logframeForm={logframeForm}
          setLogframeForm={setLogframeForm}
          editingLogframeId={editingLogframeId}
          setEditingLogframeId={setEditingLogframeId}
          isLogframeSubmitting={isLogframeSubmitting}
          handleLogframeSubmit={handleLogframeSubmit}
        />

        <LogframeList
          logframe={logframe}
          logframeHistories={logframeHistories}
          evidencias={evidencias}
          expandedIndicator={expandedIndicator}
          medicaoForm={medicaoForm}
          setMedicaoForm={setMedicaoForm}
          onExpandIndicator={(id) => void handleExpandIndicator(id)}
          onEdit={handleLogframeEdit}
          onDelete={(id) => void handleLogframeDelete(id)}
          onRegistarMedicao={(id) => void handleRegistarMedicao(id)}
          onDeleteEvidencia={(evId, indId) => void handleDeleteEvidencia(evId, indId)}
          onEvidenciaAdded={(id) => void loadEvidencias(id)}
        />

        <MetricForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          setEditingId={setEditingId}
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
        />

        <MetricList
          metrics={metrics}
          isLoading={isLoading}
          metricHistories={metricHistories}
          expandedMetric={expandedMetric}
          onExpandMetric={(id) => void handleExpandMetric(id)}
          onEdit={handleEdit}
          onDelete={(id) => void handleDelete(id)}
        />

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
