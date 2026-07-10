import { DEFAULT_CURRENCY, formatMoney } from "../../lib/currency";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcurementItem {
  id: number;
  titulo: string;
  descricao: string;
  tipo: string;
  valor_estimado: number;
  valor_real: number;
  moeda: string;
  estado: string;
  data_lancamento: string;
  data_adjudicacao: string;
  fornecedor: string;
  numero_referencia: string;
  notas: string;
  criado_por: string;
  criado_em: string;
}

export interface ProcurementMeta {
  tipos: string[];
  estados: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MOEDAS = ["EUR", "USD", "GBP", "CHF", "XOF", "AOA", "MZN", "CVE", "STN", "BRL", "JPY", "CAD", "AUD"];

export const DEFAULT_TIPOS = ["Serviços", "Bens", "Obras", "Consultoria", "Formação", "Outro"];
export const DEFAULT_ESTADOS = [
  "A identificar",
  "Em preparação",
  "A concurso",
  "Adjudicado",
  "Em execução",
  "Concluído",
  "Cancelado",
];

export const ESTADO_COLORS: Record<string, string> = {
  "A identificar": "bg-gray-100 text-gray-700",
  "Em preparação": "bg-yellow-100 text-yellow-800",
  "A concurso": "bg-blue-100 text-blue-800",
  Adjudicado: "bg-indigo-100 text-indigo-800",
  "Em execução": "bg-orange-100 text-orange-800",
  Concluído: "bg-green-100 text-green-800",
  Cancelado: "bg-red-100 text-red-800",
};

export const emptyForm = {
  titulo: "",
  descricao: "",
  tipo: "",
  valor_estimado: "",
  valor_real: "",
  moeda: DEFAULT_CURRENCY,
  estado: "A identificar",
  data_lancamento: "",
  data_adjudicacao: "",
  fornecedor: "",
  numero_referencia: "",
  notas: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function money(v: number, moeda?: string) {
  if (!v && v !== 0) return "—";
  return formatMoney(Number(v), moeda || DEFAULT_CURRENCY);
}
