import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet, apiPut, apiPost } from "../lib/apiClient";
import type {
  DbProject, DbPartner, DbTask, DbMilestone, DbBudgetItem,
  DbFundingSource, DbComment, DbRisk, DbBeneficiario,
  ExecutiveReport, ProjectPermissions,
} from "../types/project";

interface ProjectDetailPayload {
  projeto: DbProject;
  parceiros?: DbPartner[];
  tarefas?: DbTask[];
  milestones?: DbMilestone[];
  orcamento?: DbBudgetItem[];
  funding?: DbFundingSource[];
  comentarios?: DbComment[];
  riscos?: DbRisk[];
  beneficiarios?: DbBeneficiario[];
  total_beneficiarios?: number;
}

export function useProject(id: string | undefined) {
  const navigate = useNavigate();
  const { setActiveProjectId } = useProjectContext();

  const [project, setProject] = useState<DbProject | null>(null);
  const [partners, setPartners] = useState<DbPartner[]>([]);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [milestones, setMilestones] = useState<DbMilestone[]>([]);
  const [budget, setBudget] = useState<DbBudgetItem[]>([]);
  const [funding, setFunding] = useState<DbFundingSource[]>([]);
  const [comentarios, setComentarios] = useState<DbComment[]>([]);
  const [riscos, setRiscos] = useState<DbRisk[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<DbBeneficiario[]>([]);
  const [totalBeneficiarios, setTotalBeneficiarios] = useState(0);
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReport | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermissions | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<"descricao" | "objetivos" | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (field: "descricao" | "objetivos") => {
    setEditingField(field);
    setEditValue(project?.[field] || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingField || !id) return;
    try {
      const updated = await apiPut<DbProject>(`/api/projects/${id}`, { [editingField]: editValue });
      setProject(updated);
      setEditingField(null);
      toast.success("Projeto atualizado!");
    } catch {
      toast.error("Erro ao guardar alterações");
    }
  };

  const notifyExecutiveActions = async () => {
    if (!id) return;
    setNotifyLoading(true);
    try {
      const payload = await apiPost<{ created?: number }>(`/api/projects/${id}/executive-report/notify`);
      toast.success(`${payload.created || 0} notificação(ões) criada(s)`);
    } catch {
      toast.error("Erro ao criar notificações");
    } finally {
      setNotifyLoading(false);
    }
  };

  useEffect(() => {
    if (id) setActiveProjectId(String(id));
  }, [id, setActiveProjectId]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setProject(null);
    setPartners([]);
    setTasks([]);
    setMilestones([]);
    setBudget([]);
    setFunding([]);
    setComentarios([]);
    setRiscos([]);
    setBeneficiarios([]);
    setTotalBeneficiarios(0);
    setExecutiveReport(null);
    setPermissions(null);
    setEditingField(null);
    setEditValue("");

    Promise.all([
      apiGet<ProjectDetailPayload | null>(`/api/projects/${id}`, { signal: controller.signal }).catch(() => null),
      apiGet<ExecutiveReport | null>(`/api/projects/${id}/executive-report`, { signal: controller.signal }).catch(() => null),
      apiGet<ProjectPermissions | null>(`/api/projects/${id}/permissions`, { signal: controller.signal }).catch(() => null),
    ])
      .then(([data, report, projectPermissions]) => {
        if (!data || controller.signal.aborted) return;
        setProject(data.projeto);
        setPartners(data.parceiros || []);
        setTasks(data.tarefas || []);
        setMilestones(data.milestones || []);
        setBudget(data.orcamento || []);
        setFunding(data.funding || []);
        setComentarios(data.comentarios || []);
        setRiscos(data.riscos || []);
        setBeneficiarios(data.beneficiarios || []);
        setTotalBeneficiarios(data.total_beneficiarios || 0);
        setExecutiveReport(report);
        setPermissions(projectPermissions);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error("Erro ao carregar projeto");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  const fallbackDate = project?.data_inicio ? new Date(project.data_inicio) : new Date();

  const frontendPartners = partners.map((p) => ({
    id: String(p.id),
    name: p.nome,
    type: p.tipo || "",
    country: p.pais || "",
    contactPerson: p.contacto || "",
    email: p.email || "",
    phone: p.telefone || "",
    role: p.papel || "",
    contribution: p.descricao || "",
  }));

  const timelineEvents = [
    ...milestones
      .filter((m) => m.estado === "Concluído")
      .map((m) => ({
        id: `milestone-${m.id}`,
        type: "milestone" as const,
        title: m.nome,
        description: m.descricao,
        date: new Date(m.data_concluida || m.data_prevista || fallbackDate),
        user: "Equipa",
      })),
    ...tasks
      .filter((t) => t.estado === "Concluída")
      .map((t) => ({
        id: `task-${t.id}`,
        type: "task" as const,
        title: t.nome,
        description: t.descricao,
        date: new Date(t.data_fim || t.criado_em || fallbackDate),
        user: t.responsavel || "Equipa",
      })),
    ...budget.map((b) => ({
      id: `budget-${b.id}`,
      type: "budget" as const,
      title: `${b.tipo}: ${b.categoria}`,
      description: b.descricao,
      date: fallbackDate,
      user: "Administração",
      metadata: { amount: b.valor_previsto },
    })),
    ...partners.map((p) => ({
      id: `partner-${p.id}`,
      type: "member" as const,
      title: `Parceiro: ${p.nome}`,
      description: p.papel || p.tipo || "",
      date: fallbackDate,
      user: p.contacto || "",
    })),
  ].filter((e) => !isNaN(e.date.getTime()));

  const dateRange = [project?.data_inicio, project?.data_fim].filter(Boolean).join(" ~ ");
  const totalAprovado = funding.reduce((s, f) => s + (f.valor_aprovado || 0), 0);
  const totalDespesas = budget.filter((b) => b.tipo === "Despesa").reduce((s, b) => s + (b.valor_previsto || 0), 0);

  return {
    project, setProject,
    partners,
    tasks,
    milestones,
    budget,
    funding,
    comentarios,
    riscos,
    beneficiarios,
    totalBeneficiarios,
    executiveReport,
    permissions,
    loading,
    frontendPartners,
    timelineEvents,
    dateRange,
    totalAprovado,
    totalDespesas,
    editingField,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
    notifyLoading,
    notifyExecutiveActions,
    navigate,
  };
}
