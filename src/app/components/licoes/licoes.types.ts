import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface Licao {
  id: number;
  projeto_id: number;
  titulo: string;
  descricao: string;
  area: string;
  fase_projeto: string;
  tipo: "Positiva" | "Negativa" | "Neutra";
  impacto: "Alto" | "Médio" | "Baixo";
  recomendacao: string;
  criado_por: string;
  criado_em: string;
}

export interface LicaoForm {
  [key: string]: string;
  titulo: string;
  descricao: string;
  area: string;
  fase_projeto: string;
  tipo: string;
  impacto: string;
  recomendacao: string;
}

export const AREAS = ["M&E", "Financeiro", "Parceiros", "Equipa", "Técnico", "Comunicação", "Gestão", "Outro"];
export const FASES = ["Início", "Planeamento", "Execução", "Monitorização", "Encerramento"];
export const TIPOS = ["Positiva", "Negativa", "Neutra"] as const;
export const IMPACTOS = ["Alto", "Médio", "Baixo"] as const;

export const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Positiva: { label: "Positiva", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: TrendingUp },
  Negativa: { label: "Negativa", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: TrendingDown },
  Neutra: { label: "Neutra", color: "text-gray-700", bg: "bg-gray-50 border-gray-200", icon: Minus },
};

export const IMPACTO_CONFIG: Record<string, { color: string; bg: string }> = {
  Alto: { color: "text-red-700", bg: "bg-red-100" },
  Médio: { color: "text-amber-700", bg: "bg-amber-100" },
  Baixo: { color: "text-blue-700", bg: "bg-blue-100" },
};

export const AREA_COLORS: Record<string, string> = {
  "M&E": "bg-purple-100 text-purple-700",
  Financeiro: "bg-yellow-100 text-yellow-700",
  Parceiros: "bg-blue-100 text-blue-700",
  Equipa: "bg-green-100 text-green-700",
  Técnico: "bg-indigo-100 text-indigo-700",
  Comunicação: "bg-pink-100 text-pink-700",
  Gestão: "bg-orange-100 text-orange-700",
  Outro: "bg-gray-100 text-gray-700",
};

export const initialForm: LicaoForm = {
  titulo: "",
  descricao: "",
  area: "Gestão",
  fase_projeto: "Execução",
  tipo: "Positiva",
  impacto: "Médio",
  recomendacao: "",
};
