export interface PortfolioSummary {
  total_projects: number;
  average_health: number;
  critical_projects: number;
  attention_projects: number;
  high_priority_actions: number;
  total_beneficiaries: number;
  total_budget: number;
  executed_budget: number;
}

export interface ProjectHealth {
  score: number;
  status: "Bom" | "Atenção" | "Crítico" | "Excelente";
}

export interface ProjectSummary {
  tarefas_total: number;
  tarefas_concluidas: number;
  riscos_altos: number;
  beneficiarios: number;
}

export interface ProjectFinance {
  despesas_previstas: number;
  despesas_reais: number;
  despesa_execucao: number;
}

export interface Recommendation {
  kind: string;
  title: string;
  priority: string;
}

export interface CrossRecommendation {
  kind: string;
  title: string;
  description: string;
  priority: string;
  project_id: number;
  project_name: string;
  health_score: number;
}

export interface ProjectEntry {
  project_id: number;
  project_name: string;
  estado: string;
  health: ProjectHealth;
  summary: ProjectSummary;
  finance: ProjectFinance;
  top_recommendations: Recommendation[];
}

export interface PortfolioData {
  generated_at: string;
  summary: PortfolioSummary;
  projects: ProjectEntry[];
  recommendations: CrossRecommendation[];
}
