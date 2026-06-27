import { useEffect, useMemo, useState } from "react";
import { Banknote, BarChart3, Download, ReceiptText, WalletCards } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import {
  emptyPayload,
  FinancePayload,
  FinanceTransaction,
  money,
  pct,
  today,
} from "../components/finance/finance.types";
import { TransactionForm } from "../components/finance/TransactionForm";
import { CategorySummaryList } from "../components/finance/CategorySummaryList";
import { TransactionsTable } from "../components/finance/TransactionsTable";

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
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
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
          <TransactionForm
            form={form}
            setForm={setForm}
            editingTransaction={editingTransaction}
            attachment={attachment}
            setAttachment={setAttachment}
            projects={data.projects}
            categories={data.categories}
            onSubmit={submitTransaction}
            onCancel={resetForm}
          />

          <div className="space-y-6">
            <CategorySummaryList items={expenseCategories} loading={loading} />
            <TransactionsTable
              transactions={data.transactions}
              onEdit={startEditTransaction}
              onDelete={deleteTransaction}
            />
          </div>
        </div>}
      </div>
    </div>
  );
}
