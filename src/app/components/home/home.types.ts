export interface Project {
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

export interface Task {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  dueDate: Date;
  priority: "high" | "medium" | "low";
}

export interface ApiProject {
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

export interface ApiDashboard {
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

export interface ProjectStatusItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
  label: string;
}

export interface PortfolioExecutiveReport {
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
