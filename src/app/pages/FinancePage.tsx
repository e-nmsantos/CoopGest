import { useEffect, useMemo, useState } from "react";
import { Banknote, BarChart3, Download, FileText, Pencil, Plus, ReceiptText, Trash2, X, WalletCards } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";

interface FinanceProject {
  id: number;
  nome: string;
  estado?: string;
}

interface FinanceTotals {
  receitas_previstas: number;
  receitas_executadas: number;
  despesas_previstas: number;
  despesas_executadas: number;
  saldo_previsto: number;
  saldo_executado: number;
  execucao_despesa_percent: number;
  execucao_receita_percent: number;
}

interface FinanceTransaction {
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

const MOEDAS = ["EUR", "USD", "GBP", "CHF", "XOF", "AOA", "MZN", "CVE", "STN", "BRL", "JPY", "CAD", "AUD"];


interface CategorySummary {
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

interface ProjectSummary {
  projeto_id: number;
  projeto_nome: string;
  estado?: string;
  despesas_previstas: number;
  despesas_executadas: number;
  saldo_executado: number;
  execucao_despesa_percent: number;
}

interface FinancePayload {
  projects: FinanceProject[];
  transactions: FinanceTransaction[];
  categories: string[];
  category_summary: CategorySummary[];
  project_summary: ProjectSummary[];
  totals: FinanceTotals;
}

const emptyPayload: FinancePayload = {
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

function money(value: number) {
  return currency.format(Number(value || 0));
}

function pct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FinancePage() {
  const { activeProject, activeProjectId, projects, setActiveProjectId } = useProjectContext();
  const [data, setData] = useState<FinancePayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState(activeProjectId || "");
  const [form, setForm] = useState({
    projeto_id: activeProjectId || "",
    tipo: "Despesa" as "Receita" | "Despesa",
    categoria: "",
    descricao: "",
    entidade: "",
    referencia: "",
    valor: "",
    moeda: "EUR",
    taxa_cambio: "1",
    data_movimento: today(),
    estado: "Confirmado",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);

  const selectedQuery = projectFilter ? `?projeto_id=${encodeURIComponent(projectFilter)}` : "";

  const loadFinances = async () => {
    setLoading(true);
    if (!projectFilter) {
      setData(emptyPayload);
      setLoading(false);
      return;
    }
    try {
      const payload = await apiGet<FinancePayload>(`/api/finances${selectedQuery}`);
      setData(payload);
      if (!form.projeto_id && payload.projects.length > 0) {
        setForm((prev) => ({ ...prev, projeto_id: String(payload.projects[0].id) }));
      }
    } catch {
      toast.error("Erro ao carregar financas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFinances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter]);

  useEffect(() => {
    if (activeProjectId) {
      setProjectFilter(activeProjectId);
      setForm((prev) => ({ ...prev, projeto_id: activeProjectId }));
    }
  }, [activeProjectId]);

  const expenseCategories = useMemo(
    () => data.category_summary.filter((item) => item.tipo === "Despesa").sort((a, b) => b.executado - a.executado),
    [data.category_summary]
  );

  const riskCategories = expenseCategories.filter((item) => item.previsto > 0 && item.execucao_percent >= 80);

  const handleProjectFilter = (value: string) => {
    setProjectFilter(value);
    setActiveProjectId(value);
  };

  const downloadFinanceReport = () => {
    const rows = [
      ["Relatorio financeiro", activeProject?.name || ""],
      [],
      ["Resumo"],
      ["Receitas previstas", totals.receitas_previstas],
      ["Receitas executadas", totals.receitas_executadas],
      ["Despesas previstas", totals.despesas_previstas],
      ["Despesas executadas", totals.despesas_executadas],
      ["Saldo previsto", totals.saldo_previsto],
      ["Saldo executado", totals.saldo_executado],
      ["Execucao despesa (%)", totals.execucao_despesa_percent],
      [],
      ["Execucao por categoria"],
      ["Projeto", "Tipo", "Categoria", "Previsto", "Executado", "Desvio", "Execucao (%)", "Movimentos"],
      ...data.category_summary.map((item) => [
        item.projeto_nome,
        item.tipo,
        item.categoria,
        item.previsto,
        item.executado,
        item.desvio,
        item.execucao_percent,
        item.movimentos,
      ]),
      [],
      ["Movimentos"],
      ["Data", "Projeto", "Tipo", "Categoria", "Descricao", "Entidade", "Referencia", "Valor", "Estado", "Comprovativo"],
      ...data.transactions.map((item) => [
        item.data_movimento,
        item.projeto_nome,
        item.tipo,
        item.categoria,
        item.descricao,
        item.entidade || "",
        item.referencia || "",
        item.valor,
        item.estado || "",
        item.anexo_nome || "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${projectFilter || "projeto"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setForm((prev) => ({
      ...prev,
      projeto_id: projectFilter || prev.projeto_id,
      tipo: "Despesa",
      categoria: "",
      descricao: "",
      entidade: "",
      referencia: "",
      valor: "",
      moeda: "EUR",
      taxa_cambio: "1",
      data_movimento: today(),
      estado: "Confirmado",
    }));
    setAttachment(null);
    setEditingTransaction(null);
  };

  const startEditTransaction = (transaction: FinanceTransaction) => {
    setEditingTransaction(transaction);
    setAttachment(null);
    setForm({
      projeto_id: String(transaction.projeto_id),
      tipo: transaction.tipo,
      categoria: transaction.categoria || "",
      descricao: transaction.descricao || "",
      entidade: transaction.entidade || "",
      referencia: transaction.referencia || "",
      valor: String(transaction.valor || ""),
      moeda: transaction.moeda || "EUR",
      taxa_cambio: String(transaction.taxa_cambio ?? 1),
      data_movimento: transaction.data_movimento || today(),
      estado: transaction.estado || "Confirmado",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitTransaction = async () => {
    if (!form.projeto_id || !form.descricao || !form.valor) {
      toast.error("Escolha projeto, descricao e valor");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.set("valor", String(parseFloat(form.valor) || 0));
      if (attachment) {
        formData.append("anexo", attachment);
      }

      const endpoint = editingTransaction
        ? `/api/finances/transactions/${editingTransaction.id}`
        : "/api/finances/transactions";
      if (editingTransaction) {
        await apiPut<FinanceTransaction>(endpoint, formData);
      } else {
        await apiPost<FinanceTransaction>(endpoint, formData);
      }
      toast.success(editingTransaction ? "Movimento atualizado" : "Movimento registado");
      resetForm();
      await loadFinances();
    } catch {
      toast.error(editingTransaction ? "Erro ao atualizar movimento" : "Erro ao registar movimento");
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      await apiDelete<null>(`/api/finances/transactions/${id}`);
      setData((prev) => ({ ...prev, transactions: prev.transactions.filter((item) => item.id !== id) }));
      toast.success("Movimento eliminado");
      await loadFinances();
    } catch {
      toast.error("Erro ao eliminar movimento");
    }
  };

  const totals = data.totals;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Financas de projetos</h1>
            <p className="text-gray-600 mt-1">Movimentos, categorias e execucao de {activeProject?.name || "projeto ativo"}</p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-end">
            <div className="w-full lg:w-80">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Projeto de trabalho</label>
              <select
                value={projectFilter}
                onChange={(event) => handleProjectFilter(event.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Escolher projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={downloadFinanceReport} disabled={!projectFilter || data.transactions.length + data.category_summary.length === 0}>
              <Download className="mr-2 size-4" />
              Relatorio CSV
            </Button>
          </div>
        </div>

        {!projectFilter && (
          <Card className="p-10 text-center text-gray-500">
            Escolha o projeto ativo no topo para trabalhar apenas nesse projeto.
          </Card>
        )}

        {projectFilter && <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <WalletCards className="size-4 text-emerald-600" />
              Receita executada
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{money(totals.receitas_executadas)}</div>
            <p className="mt-1 text-xs text-gray-500">Previsto: {money(totals.receitas_previstas)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ReceiptText className="size-4 text-red-600" />
              Despesa executada
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{money(totals.despesas_executadas)}</div>
            <p className="mt-1 text-xs text-gray-500">Execucao: {pct(totals.execucao_despesa_percent)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Banknote className="size-4 text-blue-600" />
              Saldo executado
            </div>
            <div className={`mt-2 text-2xl font-semibold ${totals.saldo_executado >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {money(totals.saldo_executado)}
            </div>
            <p className="mt-1 text-xs text-gray-500">Saldo previsto: {money(totals.saldo_previsto)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="size-4 text-amber-600" />
              Categorias em alerta
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{riskCategories.length}</div>
            <p className="mt-1 text-xs text-gray-500">Despesa acima de 80% do previsto</p>
          </Card>
        </div>}

        {projectFilter && <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              {editingTransaction ? <Pencil className="size-5 text-blue-600" /> : <Plus className="size-5 text-blue-600" />}
              <h2 className="font-semibold text-gray-900">{editingTransaction ? "Editar movimento" : "Novo movimento"}</h2>
            </div>
            {editingTransaction && (
              <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                A editar: <span className="font-semibold">{editingTransaction.descricao}</span>
              </div>
            )}
            <div className="space-y-3">
              <select
                value={form.projeto_id}
                onChange={(event) => setForm((prev) => ({ ...prev, projeto_id: event.target.value }))}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Projeto</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.nome}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.tipo}
                  onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value as "Receita" | "Despesa" }))}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="Despesa">Despesa</option>
                  <option value="Receita">Receita</option>
                </select>
                <Input
                  type="date"
                  value={form.data_movimento}
                  onChange={(event) => setForm((prev) => ({ ...prev, data_movimento: event.target.value }))}
                />
              </div>
              <input
                list="finance-categories"
                value={form.categoria}
                onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))}
                placeholder="Categoria"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              />
              <datalist id="finance-categories">
                {data.categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <Input
                placeholder="Descricao"
                value={form.descricao}
                onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Fornecedor/doador"
                  value={form.entidade}
                  onChange={(event) => setForm((prev) => ({ ...prev, entidade: event.target.value }))}
                />
                <Input
                  placeholder="Referencia"
                  value={form.referencia}
                  onChange={(event) => setForm((prev) => ({ ...prev, referencia: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor"
                  value={form.valor}
                  onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))}
                />
                <select
                  value={form.moeda}
                  onChange={(event) => setForm((prev) => ({ ...prev, moeda: event.target.value }))}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {form.moeda !== "EUR" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Taxa {form.moeda}/EUR</span>
                  <Input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    placeholder="Taxa câmbio"
                    value={form.taxa_cambio}
                    onChange={(event) => setForm((prev) => ({ ...prev, taxa_cambio: event.target.value }))}
                  />
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Comprovativo
                </span>
                <input
                  key={editingTransaction ? `edit-${editingTransaction.id}` : "new"}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                  className="block w-full rounded-md border border-gray-300 bg-white text-sm text-gray-600 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700"
                />
                {attachment && (
                  <span className="mt-1 block truncate text-xs text-gray-500">{attachment.name}</span>
                )}
                {editingTransaction?.anexo_nome && !attachment && (
                  <span className="mt-1 block truncate text-xs text-gray-500">
                    Atual: {editingTransaction.anexo_nome}. Escolha outro ficheiro para substituir.
                  </span>
                )}
              </label>
              <Button onClick={submitTransaction} className="w-full">
                {editingTransaction ? "Guardar alterações" : "Registar movimento"}
              </Button>
              {editingTransaction && (
                <Button variant="outline" onClick={resetForm} className="w-full">
                  <X className="mr-2 size-4" />
                  Cancelar edição
                </Button>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-gray-900">Execucao por categoria</h2>
                <Badge variant="outline">{expenseCategories.length} categorias de despesa</Badge>
              </div>
              {loading ? (
                <p className="py-8 text-center text-sm text-gray-500">A carregar...</p>
              ) : expenseCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Sem rubricas ou movimentos de despesa.</p>
              ) : (
                <div className="space-y-3">
                  {expenseCategories.map((item) => (
                    <div key={`${item.projeto_id}-${item.tipo}-${item.categoria}`} className="rounded-md border border-gray-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.categoria}</p>
                          <p className="text-xs text-gray-500">{item.projeto_nome}</p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-xs text-gray-500">Executado / Previsto</div>
                          <span className="font-semibold">{money(item.executado)}</span>
                          <span className="text-gray-500"> / {money(item.previsto)}</span>
                        </div>
                      </div>
                      {!item.tem_rubrica_prevista && (
                        <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          Movimento sem rubrica prevista correspondente no orçamento.
                        </div>
                      )}
                      <div className="mt-3 h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${item.execucao_percent > 100 ? "bg-red-600" : item.execucao_percent >= 80 ? "bg-amber-500" : "bg-blue-600"}`}
                          style={{ width: `${Math.min(item.execucao_percent || 0, 120)}%`, maxWidth: "100%" }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>{pct(item.execucao_percent)} executado</span>
                        <span>Desvio: {money(item.desvio)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-gray-900">Movimentos recentes</h2>
                <Badge variant="outline">{data.transactions.length}</Badge>
              </div>
              {data.transactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Ainda nao ha movimentos registados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="py-2 pr-3">Data</th>
                        <th className="py-2 pr-3">Projeto</th>
                        <th className="py-2 pr-3">Categoria</th>
                        <th className="py-2 pr-3">Descricao</th>
                        <th className="py-2 pr-3">Comprovativo</th>
                        <th className="py-2 pr-3 text-right">Valor</th>
                        <th className="py-2 pr-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="py-3 pr-3 text-gray-500">{transaction.data_movimento}</td>
                          <td className="py-3 pr-3 text-gray-700">{transaction.projeto_nome}</td>
                          <td className="py-3 pr-3">
                            <Badge variant={transaction.tipo === "Receita" ? "secondary" : "outline"}>{transaction.categoria}</Badge>
                          </td>
                          <td className="py-3 pr-3">
                            <div className="font-medium text-gray-900">{transaction.descricao}</div>
                            <div className="text-xs text-gray-500">{transaction.entidade || transaction.referencia || ""}</div>
                          </td>
                          <td className="py-3 pr-3">
                            {transaction.anexo_url ? (
                              <a
                                href={transaction.anexo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                              >
                                <FileText className="size-3.5" />
                                {transaction.anexo_nome || "Abrir"}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`py-3 pr-3 text-right font-semibold ${transaction.tipo === "Receita" ? "text-emerald-700" : "text-red-700"}`}>
                            {transaction.tipo === "Receita" ? "+" : "-"}{money(transaction.valor)}
                            {transaction.moeda && transaction.moeda !== "EUR" && (
                              <div className="text-xs text-gray-400 font-normal">
                                {transaction.moeda} {transaction.taxa_cambio !== 1 ? `(×${transaction.taxa_cambio})` : ""}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => startEditTransaction(transaction)} title="Editar movimento">
                              <Pencil className="size-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteTransaction(transaction.id)}>
                              <Trash2 className="size-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>}
      </div>
    </div>
  );
}
