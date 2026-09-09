// Shared types for project-related entities.

const PROJECT_STATES = ["Planeamento", "Em curso", "Concluído", "Suspenso"] as const;
export type ProjectState = typeof PROJECT_STATES[number];

const STATE_COLORS: Record<string, string> = {
  Planeamento: "bg-blue-100 text-blue-700 border-blue-200",
  "Em curso": "bg-green-100 text-green-700 border-green-200",
  Concluído: "bg-gray-100 text-gray-600 border-gray-200",
  Suspenso: "bg-amber-100 text-amber-700 border-amber-200",
};

interface DbProject {
  id: number;
  nome: string;
  descricao?: string;
  objetivos?: string;
  data_inicio?: string;
  data_fim?: string;
  estado?: ProjectState;
  privado?: number;
  localizacao?: string;
  entidade_proponente?: string;
  ods?: string;
}

interface DbPartner {
  id: number;
  nome: string;
  tipo: string;
  contacto: string;
  email: string;
  telefone: string;
  pais?: string;
  descricao?: string;
  papel?: string;
}

interface DbTask {
  id: number;
  projeto_id: number;
  nome: string;
  descricao?: string;
  responsavel?: string;
  data_fim?: string;
  prioridade?: string;
  estado?: string;
  criado_em?: string;
}

interface DbMilestone {
  id: number;
  projeto_id: number;
  nome: string;
  descricao?: string;
  data_prevista?: string;
  data_concluida?: string;
  estado?: string;
}

interface DbBudgetItem {
  id: number;
  projeto_id: number;
  tipo: string;
  categoria: string;
  descricao: string;
  valor_previsto: number;
  valor_real: number;
  valor_real_origem?: string;
}

interface DbFundingSource {
  id: number;
  projeto_id: number;
  nome: string;
  tipo: string;
  valor_aprovado: number;
  valor_executado: number;
  data_inicio?: string;
  data_fim?: string;
  referencia?: string;
}

interface DbRisk {
  id: number;
  projeto_id: number;
  descricao: string;
  probabilidade?: string;
  impacto?: string;
  estado?: string;
  mitigacao?: string;
  criado_em?: string;
}

interface DbComment {
  id: number;
  projeto_id: number;
  user_nome: string;
  texto: string;
  criado_em: string;
}

interface DbBeneficiario {
  id: number;
  projeto_id: number;
  nome: string;
  tipo: string;
  numero: number;
  descricao: string;
  data_registo: string;
}

interface ExecutiveReport {
  generated_at: string;
  health: {
    score: number;
    status: string;
  };
  summary: {
    tarefas_total: number;
    tarefas_concluidas: number;
    tarefas_atrasadas: number;
    tarefas_criticas: number;
    progresso_tarefas: number;
    milestones_total: number;
    milestones_proximos: number;
    milestones_atrasados: number;
    riscos_abertos: number;
    riscos_altos: number;
    parceiros: number;
    beneficiarios: number;
    indicadores_impacto: number;
    impacto_execucao: number;
  };
  finance: {
    receitas_previstas: number;
    receitas_reais: number;
    despesas_previstas: number;
    despesas_reais: number;
    funding_aprovado: number;
    funding_executado: number;
    execucao_financeira: number;
    despesa_execucao: number;
    funding_execucao: number;
  };
  recommendations: Array<{
    kind: string;
    title: string;
    description: string;
    priority: "Alta" | "Média" | "Baixa";
    url: string;
  }>;
}

interface ProjectPermissions {
  role: string | null;
  can_view: boolean;
  can_edit: boolean;
  can_manage: boolean;
  is_admin: boolean;
}

interface Report {
  projeto: DbProject;
  generated_at: string;
  health: { score: number; status: string };
  summary: Record<string, unknown>;
  finance: Record<string, unknown>;
  recommendations: Array<{ kind: string; title: string; description: string; priority: string; url: string }>;
  highlights: Record<string, unknown>;
}

export {
  PROJECT_STATES,
  STATE_COLORS,
  type DbProject,
  type DbPartner,
  type DbTask,
  type DbMilestone,
  type DbBudgetItem,
  type DbFundingSource,
  type DbRisk,
  type DbComment,
  type DbBeneficiario,
  type ExecutiveReport,
  type ProjectPermissions,
  type Report,
};
