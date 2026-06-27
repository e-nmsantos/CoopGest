export interface Stakeholder {
  id: number;
  nome: string;
  organizacao: string;
  papel: string;
  interesse: "Alto" | "Médio" | "Baixo";
  influencia: "Alto" | "Médio" | "Baixo";
  posicao: "Apoiante" | "Neutro" | "Oponente";
  estrategia: string;
  contacto: string;
  notas: string;
  criado_por: string;
}

export interface MatrixData {
  gerir_de_perto: Stakeholder[];
  manter_satisfeito: Stakeholder[];
  manter_informado: Stakeholder[];
  monitorizar: Stakeholder[];
}

export type View = "matriz" | "lista";

export const EMPTY_FORM: Omit<Stakeholder, "id" | "criado_por"> = {
  nome: "",
  organizacao: "",
  papel: "",
  interesse: "Médio",
  influencia: "Médio",
  posicao: "Neutro",
  estrategia: "",
  contacto: "",
  notas: "",
};

export function posicaoBadge(posicao: string) {
  if (posicao === "Apoiante")
    return "bg-green-100 text-green-800 border border-green-200";
  if (posicao === "Oponente")
    return "bg-red-100 text-red-800 border border-red-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

export function interesseBadge(v: string) {
  if (v === "Alto") return "bg-red-50 text-red-700";
  if (v === "Médio") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-600";
}
