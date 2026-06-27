import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiGet, apiPost } from "../lib/apiClient";
import type {
  Project,
  Task,
  ApiProject,
  ApiDashboard,
  PortfolioExecutiveReport,
} from "../components/home/home.types";

function mapPriority(value: string): Task["priority"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("alta") || normalized.includes("high")) {
    return "high";
  }
  if (normalized.includes("baixa") || normalized.includes("low")) {
    return "low";
  }
  return "medium";
}

const DEFAULT_STATS: ApiDashboard["stats"] = {
  projetos: 0,
  parceiros: 0,
  tarefas: 0,
  milestones: 0,
  tarefas_concluidas: 0,
  milestones_concluidos: 0,
  orcamento_total: 0,
  orcamento_executado: 0,
  total_beneficiarios: 0,
  projetos_por_estado: {},
  saude_sistema: {
    score: 100,
    status: "Excelente",
    atrasadas: 0,
  },
  portfolio: {
    projetos_com_tarefas_atrasadas: 0,
    milestones_proximos: 0,
    projetos_sem_tarefas: 0,
    execucao_orcamental_percent: 0,
  },
};

export function useHomeDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ApiDashboard["stats"]>(DEFAULT_STATS);
  const [portfolioRecommendations, setPortfolioRecommendations] = useState<ApiDashboard["portfolio_recommendations"]>([]);
  const [portfolioReport, setPortfolioReport] = useState<PortfolioExecutiveReport | null>(null);
  const [portfolioReportLoading, setPortfolioReportLoading] = useState(false);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const loadData = async () => {
    try {
      const [dashboard, apiProjects] = await Promise.all([
        apiGet<ApiDashboard>("/api/dashboard"),
        apiGet<ApiProject[]>("/api/projects"),
      ]);

      const mappedProjects: Project[] = apiProjects.map((project) => {
        const totalTasks = project.tarefas_total ?? 0;
        const doneTasks = project.tarefas_concluidas ?? 0;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return {
          id: String(project.id),
          name: project.nome,
          description: project.descricao ?? "",
          objectives: project.objetivos ?? "",
          startDate: project.data_inicio ?? "",
          endDate: project.data_fim ?? "",
          budget: "0",
          status: project.estado,
          progress,
          members: project.membros ?? 0,
        };
      });

      const mappedTasks: Task[] = dashboard.tarefas_pendentes.map((task) => ({
        id: String(task.id),
        title: task.nome,
        projectName: task.projeto_nome,
        projectId: String(task.projeto_id),
        dueDate: task.data_fim ? new Date(task.data_fim) : new Date(),
        priority: mapPriority(task.prioridade || "Normal"),
      }));

      setProjects(mappedProjects);
      setTasks(mappedTasks);
      setStats(dashboard.stats);
      setPortfolioRecommendations(dashboard.portfolio_recommendations || []);
      setApiUnavailable(false);
    } catch {
      setApiUnavailable(true);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const loadPortfolioReport = async () => {
    if (portfolioReport || portfolioReportLoading) return;
    setPortfolioReportLoading(true);
    try {
      const report = await apiGet<PortfolioExecutiveReport>("/api/portfolio/executive-report");
      setPortfolioReport(report);
    } catch {
      setApiUnavailable(true);
    } finally {
      setPortfolioReportLoading(false);
    }
  };

  const runPortfolioAutomations = async () => {
    setAutomationLoading(true);
    try {
      const result = await apiPost<{ created?: number; skipped?: number; projects?: number }>("/api/portfolio/automations/run");
      toast.success(`${result.created || 0} notificação(ões) criada(s)`, {
        description: `${result.skipped || 0} já existiam. ${result.projects || 0} projeto(s) analisado(s).`,
      });
    } catch {
      toast.error("Erro ao executar automações do portfólio");
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleCreateProject = async (projectData: {
    name: string;
    description: string;
    objectives: string;
    startDate: string;
    endDate: string;
    budget: string;
  }) => {
    await apiPost<ApiProject>("/api/projects", {
      nome: projectData.name,
      descricao: projectData.description,
      objetivos: projectData.objectives,
      data_inicio: projectData.startDate,
      data_fim: projectData.endDate,
      estado: "Planeamento",
    });

    await loadData();
  };

  return {
    projects,
    stats,
    portfolioRecommendations,
    portfolioReport,
    portfolioReportLoading,
    automationLoading,
    apiUnavailable,
    loadPortfolioReport,
    runPortfolioAutomations,
    handleCreateProject,
  };
}
