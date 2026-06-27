export interface FinanceProject {
  id: number;
  nome: string;
  estado?: string;
}

export interface FinanceTotals {
  receitas_previstas: number;
  receitas_executadas: number;
  despesas_previstas: number;
  despesas_executadas: number;
  saldo_previsto: number;
  saldo_executado: number;
  execucao_despesa_percent: number;
  execucao_receita_percent: number;
}

export interface FinanceTransaction {
  id: number;
  projeto_id: number;
  projeto_nome: string;
  tipo: "Receita" | "Despesa";
  categoria: string;
  descricao: string;
  entidade?: string;
  referencia?: string;
  valor: number;
  moeda?: string;
  taxa_cambio?: number;
  data_movimento: string;
  estado?: string;
  anexo_nome?: string;
  anexo_url?: string;
}

export interface CategorySummary {
  projeto_id: number;
  projeto_nome: string;
  tipo: "Receita" | "Despesa";
  categoria: string;
  previsto: number;
  executado: number;
  desvio: number;
  execucao_percent: number;
  movimentos: number;
  tem_rubrica_prevista?: boolean;
}

export interface ProjectSummary {
  projeto_id: number;
  projeto_nome: string;
  estado?: string;
  despesas_previstas: number;
  despesas_executadas: number;
  saldo_executado: number;
  execucao_despesa_percent: number;
}

export interface FinancePayload {
  projects: FinanceProject[];
  transactions: FinanceTransaction[];
  categories: string[];
  category_summary: CategorySummary[];
  project_summary: ProjectSummary[];
  totals: FinanceTotals;
}

export const MOEDAS = ["EUR", "USD", "GBP", "CHF", "XOF", "AOA", "MZN", "CVE", "STN", "BRL", "JPY", "CAD", "AUD"];

export const emptyPayload: FinancePayload = {
  projects: [],
  transactions: [],
  categories: [],
  category_summary: [],
  project_summary: [],
  totals: {
    receitas_previstas: 0,
    receitas_executadas: 0,
    despesas_previstas: 0,
    despesas_executadas: 0,
    saldo_previsto: 0,
    saldo_executado: 0,
    execucao_despesa_percent: 0,
    execucao_receita_percent: 0,
  },
};

const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function money(value: number) {
  return currency.format(Number(value || 0));
}

export function pct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
