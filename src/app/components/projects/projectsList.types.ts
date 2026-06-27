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
  tarefas_total: number;
  tarefas_atrasadas: number;
  milestones_proximos: number;
  arquivado: boolean;
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
  tarefas_atrasadas?: number;
  milestones_proximos?: number;
  arquivado?: number;
}

export type AttentionFilter = "overdue" | "upcoming_milestones" | "no_tasks";

export const attentionFilters: Record<AttentionFilter, { label: string; description: string }> = {
  overdue: {
    label: "Projetos com tarefas atrasadas",
    description: "Mostra projetos com tarefas abertas fora do prazo.",
  },
  upcoming_milestones: {
    label: "Projetos com milestones próximos",
    description: "Mostra projetos com entregas nos próximos 14 dias.",
  },
  no_tasks: {
    label: "Projetos sem tarefas",
    description: "Mostra projetos que ainda não têm tarefas planeadas.",
  },
};

export const statusColors: Record<string, string> = {
  "Em curso": "bg-blue-100 text-blue-700 border-blue-200",
  "Planeamento": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Concluído": "bg-green-100 text-green-700 border-green-200",
  "Suspenso": "bg-red-100 text-red-700 border-red-200",
};
