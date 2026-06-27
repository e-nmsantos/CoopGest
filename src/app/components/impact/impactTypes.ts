// ---------------------------------------------------------------------------
// Shared types for the Impact M&E module
// ---------------------------------------------------------------------------

export interface ApiImpactMetric {
  id: number;
  nome: string;
  valor_atual: number;
  meta: number;
  unidade: string;
  categoria: "social" | "ambiental" | "economico";
  ods: number[];
}

export interface MetricHistory {
  id: number;
  valor: number;
  notas: string;
  registado_por: string;
  criado_em: string;
}

export interface LogframeItem {
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

export interface LogframeHistory {
  id: number;
  valor: number;
  notas: string;
  registado_por: string;
  criado_em: string;
}

export interface Evidencia {
  id: number;
  descricao: string;
  tipo: string;
  url_externa: string;
  documento_nome: string | null;
  criado_por: string;
  criado_em: string;
}

export interface MetricForm {
  name: string;
  current: string;
  target: string;
  unit: string;
  category: "social" | "ambiental" | "economico";
  sdg: string;
  notas_medicao: string;
}

export interface LogframeForm {
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
// Shared constants
// ---------------------------------------------------------------------------

export const NIVEIS = ["Impacto", "Resultado", "Produção", "Atividade"];
export const FREQUENCIAS = ["Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"];
export const ESTADOS_LFA = ["Em acompanhamento", "Alcançado", "Em risco", "Não iniciado", "Suspenso"];

export const NIVEL_COLORS: Record<string, string> = {
  Impacto: "bg-purple-100 text-purple-800",
  Resultado: "bg-blue-100 text-blue-800",
  Produção: "bg-green-100 text-green-800",
  Atividade: "bg-orange-100 text-orange-800",
};

export const ESTADO_COLORS: Record<string, string> = {
  "Em acompanhamento": "bg-blue-50 text-blue-700",
  Alcançado: "bg-green-50 text-green-700",
  "Em risco": "bg-red-50 text-red-700",
  "Não iniciado": "bg-gray-50 text-gray-700",
  Suspenso: "bg-yellow-50 text-yellow-700",
};

export const initialMetricForm: MetricForm = {
  name: "",
  current: "",
  target: "",
  unit: "",
  category: "social",
  sdg: "",
  notas_medicao: "",
};

export const initialLogframeForm: LogframeForm = {
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
