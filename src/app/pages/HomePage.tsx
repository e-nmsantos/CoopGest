import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/layout/Header";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { AlertTriangle, Bell, CalendarClock, FolderKanban, Users, CheckSquare, Euro, Activity, Printer } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "../lib/apiClient";

interface Project {
  id: string;
  name: string;
  description: string;
  objectives: string;
  startDate: string;
  endDate: string;
  budget: string;
  status: "Em curso" | "Planeamento" | "Concluído" | "Suspenso";
  progress: number;
  members: number;
}

interface Task {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  dueDate: Date;
  priority: "high" | "medium" | "low";
}

interface ApiProject {
  id: number;
  nome: string;
  descricao: string;
  objetivos: string;
  data_inicio: string;
  data_fim: string;
  estado: "Em curso" | "Planeamento" | "Concluído" | "Suspenso";
  membros?: number;
  tarefas_total?: number;
  tarefas_concluidas?: number;
}

interface ApiDashboard {
  stats: {
    projetos: number;
    parceiros: number;
    tarefas: number;
    milestones: number;
    tarefas_concluidas: number;
    milestones_concluidos: number;
    orcamento_total: number;
    orcamento_executado: number;
    total_beneficiarios: number;
    projetos_por_estado: Record<string, number>;
    saude_sistema: {
      score: number;
      status: string;
      atrasadas: number;
    };
    portfolio: {
      projetos_com_tarefas_atrasadas: number;
      milestones_proximos: number;
      projetos_sem_tarefas: number;
      execucao_orcamental_percent: number;
    };
  };
  tarefas_pendentes: Array<{
    id: number;
    nome: string;
    projeto_id: number;
    projeto_nome: string;
    data_fim: string | null;
    prioridade: string;
  }>;
  portfolio_recommendations?: Array<{
    kind: string;
    title: string;
    description: string;
    priority: "Alta" | "Média" | "Baixa";
    url: string;
    project_id: number;
    project_name: string;
    health_score: number;
    health_status: string;
  }>;
}

interface PortfolioExecutiveReport {
  generated_at: string;
  summary: {
    total_projects: number;
    average_health: number;
    critical_projects: number;
    attention_projects: number;
    high_priority_actions: number;
    total_beneficiaries: number;
    total_budget: number;
    executed_budget: number;
  };
  projects: Array<{
    project_id: number;
    project_name: string;
    estado: string;
    health: {
      score: number;
      status: string;
    };
    summary: {
      tarefas_atrasadas: number;
      milestones_atrasados: number;
      riscos_altos: number;
      progresso_tarefas: number;
      beneficiarios: number;
      impacto_execucao: number;
    };
    finance: {
      execucao_financeira: number;
      receitas_previstas: number;
      receitas_reais: number;
    };
    top_recommendations: Array<{
      title: string;
      description: string;
      priority: "Alta" | "Média" | "Baixa";
      url: string;
    }>;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: "Alta" | "Média" | "Baixa";
    project_id: number;
    project_name: string;
    url: string;
    health_score: number;
    health_status: string;
  }>;
}

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

const PROJECT_STATUS_ORDER = ["Planeamento", "Em curso", "Suspenso", "Concluído"] as const;

const PROJECT_STATUS_META: Record<string, { color: string; label: string }> = {
  Planeamento: { color: "#f59e0b", label: "A preparar" },
  "Em curso": { color: "#2563eb", label: "Em execução" },
  Suspenso: { color: "#64748b", label: "Pausado" },
  Concluído: { color: "#16a34a", label: "Fechado" },
};

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    projetos: 0,
    parceiros: 0,
    tarefas: 0,
    milestones: 0,
    tarefas_concluidas: 0,
    milestones_concluidos: 0,
    orcamento_total: 0,
    orcamento_executado: 0,
    total_beneficiarios: 0,
    projetos_por_estado: {} as Record<string, number>,
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
  });
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
  
  const projectStatusData = PROJECT_STATUS_ORDER.map((name) => {
    const value = stats.projetos_por_estado[name] ?? 0;
    const percentage = stats.projetos > 0 ? Math.round((value / stats.projetos) * 100) : 0;

    return {
      name,
      value,
      percentage,
      ...PROJECT_STATUS_META[name],
    };
  });
  const activeProjects = stats.projetos_por_estado["Em curso"] ?? 0;
  const completedWork = stats.tarefas + stats.tarefas_concluidas;
  const taskCompletion = completedWork > 0 ? Math.round((stats.tarefas_concluidas / completedWork) * 100) : 0;
  const executiveAlerts = [
    {
      label: "Projetos com tarefas atrasadas",
      value: stats.portfolio.projetos_com_tarefas_atrasadas,
      detail: `${stats.saude_sistema.atrasadas} tarefas fora do prazo`,
      href: "/projetos?attention=overdue",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Milestones nos próximos 14 dias",
      value: stats.portfolio.milestones_proximos,
      detail: "Próximas entregas a acompanhar",
      href: "/projetos?attention=upcoming_milestones",
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Projetos sem tarefas",
      value: stats.portfolio.projetos_sem_tarefas,
      detail: "Podem precisar de planeamento",
      href: "/projetos?attention=no_tasks",
      icon: FolderKanban,
      color: "text-slate-600",
      bg: "bg-slate-50",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      <Header />

      <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral dos seus projetos cooperativos.</p>
            {apiUnavailable && (
              <p className="text-sm text-destructive mt-2">
                API indisponível. Alguns dados podem não estar atualizados.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Dialog onOpenChange={(open) => open && void loadPortfolioReport()}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Relatório do Portfólio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Relatório Executivo do Portfólio</DialogTitle>
                </DialogHeader>
                {portfolioReportLoading || !portfolioReport ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">A preparar relatório...</div>
                ) : (
                  <div id="portfolio-report" className="space-y-5 text-sm">
                    <div className="border-b pb-4">
                      <h1 className="text-2xl font-bold text-foreground">Portfólio de Projetos Cooperativos</h1>
                      <p className="text-muted-foreground">
                        Relatório gerado em {new Date(portfolioReport.generated_at).toLocaleString("pt-PT")}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-md bg-blue-50 p-3">
                        <p className="text-xs text-blue-700">Saúde média</p>
                        <p className="text-2xl font-bold text-blue-900">{portfolioReport.summary.average_health}%</p>
                      </div>
                      <div className="rounded-md bg-red-50 p-3">
                        <p className="text-xs text-red-700">Projetos críticos</p>
                        <p className="text-2xl font-bold text-red-900">{portfolioReport.summary.critical_projects}</p>
                      </div>
                      <div className="rounded-md bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">Ações altas</p>
                        <p className="text-2xl font-bold text-amber-900">{portfolioReport.summary.high_priority_actions}</p>
                      </div>
                      <div className="rounded-md bg-green-50 p-3">
                        <p className="text-xs text-green-700">Beneficiários</p>
                        <p className="text-2xl font-bold text-green-900">{portfolioReport.summary.total_beneficiaries.toLocaleString("pt-PT")}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold text-foreground">Prioridades do Portfólio</h3>
                      <div className="space-y-2">
                        {portfolioReport.recommendations.slice(0, 8).map((item) => (
                          <div key={`${item.project_id}-${item.title}`} className="rounded-md border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.project_name} · saúde {item.health_score}%</p>
                              </div>
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
                            <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold text-foreground">Projetos por Nível de Atenção</h3>
                      <div className="overflow-hidden rounded-md border border-border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-2 text-left">Projeto</th>
                              <th className="p-2 text-left">Estado</th>
                              <th className="p-2 text-right">Saúde</th>
                              <th className="p-2 text-right">Tarefas</th>
                              <th className="p-2 text-right">Finanças</th>
                              <th className="p-2 text-right">Impacto</th>
                              <th className="p-2 text-right">Alertas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {portfolioReport.projects.map((project) => (
                              <tr key={project.project_id} className="border-t border-border">
                                <td className="p-2 font-medium">{project.project_name}</td>
                                <td className="p-2">{project.estado}</td>
                                <td className="p-2 text-right">{project.health.score}%</td>
                                <td className="p-2 text-right">{project.summary.progresso_tarefas}%</td>
                                <td className="p-2 text-right">{project.finance.execucao_financeira}%</td>
                                <td className="p-2 text-right">{project.summary.impacto_execucao}%</td>
                                <td className="p-2 text-right">
                                  {project.summary.tarefas_atrasadas + project.summary.milestones_atrasados + project.summary.riscos_altos}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-end border-t pt-3">
                      <Button onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir / Guardar PDF
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <CreateProjectDialog onCreateProject={handleCreateProject} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Atenção Executiva</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {executiveAlerts.map((alert) => {
                  const Icon = alert.icon;

                  return (
                    <Link key={alert.label} to={alert.href} className="block rounded-md border border-border p-4 transition-colors hover:bg-muted/40">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${alert.bg}`}>
                          <Icon className={`h-4 w-4 ${alert.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-foreground">{alert.value}</div>
                      </div>
                      <p className="text-sm font-medium text-foreground">{alert.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Saúde do Portfólio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{stats.saude_sistema.status}</p>
                    <p className="text-xs text-muted-foreground">Baseado em tarefas atrasadas</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">{stats.saude_sistema.score}%</div>
              </div>
              <Progress value={stats.saude_sistema.score} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Execução financeira</p>
                  <p className="font-semibold text-foreground">{stats.portfolio.execucao_orcamental_percent}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarefas concluídas</p>
                  <p className="font-semibold text-foreground">{taskCompletion}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Centro de Decisão</CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={automationLoading || portfolioRecommendations.length === 0}
              onClick={runPortfolioAutomations}
            >
              <Bell className="h-4 w-4 mr-2" />
              {automationLoading ? "A executar..." : "Executar automações"}
            </Button>
          </CardHeader>
          <CardContent>
            {portfolioRecommendations.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Sem ações críticas neste momento</p>
                <p className="text-xs text-muted-foreground">Continue a atualizar tarefas, milestones, orçamento, riscos e impacto para manter esta leitura útil.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {portfolioRecommendations.map((item) => (
                  <Link
                    key={`${item.project_id}-${item.kind}-${item.title}`}
                    to={item.url}
                    className="rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{item.project_name}</p>
                      </div>
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
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Saúde</span>
                      <span className="font-semibold text-foreground">{item.health_score}% · {item.health_status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.projetos}</div>
              <p className="text-xs text-muted-foreground">Total de projetos na plataforma</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Parceiros Envolvidos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.parceiros}</div>
              <p className="text-xs text-muted-foreground">Coletividades e organizações</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tarefas}</div>
              <p className="text-xs text-muted-foreground">Total de tarefas por concluir</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Execução Financeira</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.portfolio.execucao_orcamental_percent}%</div>
              <p className="text-xs text-muted-foreground">
                {(stats.orcamento_executado || 0).toLocaleString('pt-PT')}€ de {(stats.orcamento_total || 0).toLocaleString('pt-PT')}€
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Visão Geral dos Projetos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-3xl font-bold text-foreground">{stats.projetos}</div>
                  <p className="text-sm text-muted-foreground">
                    {activeProjects} em curso, distribuídos por estado do projeto.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada barra representa o número de projetos nesse estado.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectStatusData} margin={{ top: 18, right: 12, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                        formatter={(value, _name, item) => [
                          `${value} projeto${Number(value) === 1 ? "" : "s"} (${item.payload.percentage}%)`,
                          "Total",
                        ]}
                        labelFormatter={(label) => `${label} - ${PROJECT_STATUS_META[label]?.label ?? "Estado"}`}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {projectStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                        <LabelList dataKey="value" position="top" fill="#334155" fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {projectStatusData.map((item) => (
                    <div key={item.name} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{item.value}</p>
                          <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Projetos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
            {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center mb-4">
                    <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium leading-none">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.status}</p>
                    </div>
                    <div className="ml-auto font-medium">{project.progress}%</div>
                </div>
            ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
