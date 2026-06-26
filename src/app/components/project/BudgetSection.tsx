import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPost } from "../../lib/apiClient";

interface DbBudgetItem {
  id: number;
  projeto_id: number;
  tipo: string;
  categoria: string;
  descricao: string;
  valor_previsto: number;
  valor_real: number;
}

interface BudgetItem {
  id: string;
  type: "receita" | "despesa";
  category: string;
  description: string;
  planned: number;
  actual: number;
}

function fromDb(item: DbBudgetItem): BudgetItem {
  return {
    id: String(item.id),
    type: item.tipo === "Receita" ? "receita" : "despesa",
    category: item.categoria || "",
    description: item.descricao || "",
    planned: item.valor_previsto || 0,
    actual: item.valor_real || 0,
  };
}

interface BudgetSectionProps {
  projectId: string;
  initialItems?: DbBudgetItem[];
}

export function BudgetSection({ projectId, initialItems = [] }: BudgetSectionProps) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems.map(fromDb));
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");

  const stats = items.reduce(
    (acc, item) => {
      if (item.type === "receita") {
        acc.receitasPlanned += item.planned;
        acc.receitasActual += item.actual;
      } else {
        acc.despesasPlanned += item.planned;
        acc.despesasActual += item.actual;
      }
      return acc;
    },
    { receitasPlanned: 0, receitasActual: 0, despesasPlanned: 0, despesasActual: 0 }
  );

  const saldoPlanned = stats.receitasPlanned - stats.despesasPlanned;
  const saldoActual = stats.receitasActual - stats.despesasActual;
  const despesaExecution = stats.despesasPlanned > 0 ? (stats.despesasActual / stats.despesasPlanned) * 100 : 0;

  const handleAdd = async () => {
    if (!category || !description) return;
    try {
      const raw = await apiPost<DbBudgetItem>(`/api/projects/${projectId}/budget`, {
        tipo: type === "receita" ? "Receita" : "Despesa",
        categoria: category,
        descricao: description,
        valor_previsto: parseFloat(planned) || 0,
        valor_real: parseFloat(actual) || 0,
      });
      setItems((prev) => [...prev, fromDb(raw)]);
      setCategory("");
      setDescription("");
      setPlanned("");
      setActual("");
      toast.success("Rubrica adicionada!");
    } catch {
      toast.error("Erro ao adicionar rubrica");
    }
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await apiDelete<null>(`/api/budget/${id}`);
      toast.success("Rubrica eliminada");
    } catch {
      toast.error("Erro ao eliminar rubrica");
    }
  };

  const downloadBudgetReport = () => {
    const rows = [
      ["Relatorio de orcamento"],
      [],
      ["Resumo"],
      ["Receitas previstas", stats.receitasPlanned],
      ["Receitas executadas", stats.receitasActual],
      ["Despesas previstas", stats.despesasPlanned],
      ["Despesas executadas", stats.despesasActual],
      ["Saldo previsto", saldoPlanned],
      ["Saldo executado", saldoActual],
      ["Execucao despesa (%)", despesaExecution],
      [],
      ["Rubricas"],
      ["Tipo", "Categoria", "Descricao", "Previsto", "Real/Executado", "Desvio", "Execucao (%)"],
      ...items.map((item) => {
        const execution = item.planned > 0 ? (item.actual / item.planned) * 100 : 0;
        return [
          item.type === "receita" ? "Receita" : "Despesa",
          item.category,
          item.description,
          item.planned,
          item.actual,
          item.planned - item.actual,
          execution,
        ];
      }),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-orcamento-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-700 mb-1">Receitas (Previsto)</div>
          <div className="text-2xl font-semibold text-green-800">
            {stats.receitasPlanned.toFixed(2)} €
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-red-700 mb-1">Despesas (Previsto)</div>
          <div className="text-2xl font-semibold text-red-800">
            {stats.despesasPlanned.toFixed(2)} €
          </div>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Despesas (Real)</div>
          <div className="text-2xl font-semibold text-blue-800">
            {stats.despesasActual.toFixed(2)} €
          </div>
          <p className="text-xs text-blue-700 mt-1">{despesaExecution.toFixed(1)}% executado</p>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="text-sm text-yellow-700 mb-1">Saldo (Real)</div>
          <div className="text-2xl font-semibold text-yellow-800">
            {saldoActual.toFixed(2)} €
          </div>
          <p className="text-xs text-yellow-700 mt-1">Previsto: {saldoPlanned.toFixed(2)} €</p>
        </Card>
      </div>

      {/* Add Budget Item */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-gray-900">Adicionar Rubrica</h3>
          <Button variant="outline" onClick={downloadBudgetReport} disabled={items.length === 0}>
            <Download className="mr-2 size-4" />
            Relatorio CSV
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <Select value={type} onValueChange={(v: "receita" | "despesa") => setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="despesa">Despesa</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <Input
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="md:col-span-2"
          />

          <Input
            type="number"
            placeholder="Previsto (€)"
            value={planned}
            onChange={(e) => setPlanned(e.target.value)}
          />

          <Input
            type="number"
            placeholder="Real (€)"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <Button onClick={handleAdd} className="w-full md:w-auto">
          Adicionar
        </Button>
      </Card>

      {/* Budget Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Sem rubricas de orçamento
        </div>
      ) : (
        <Card className="p-6">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        item.type === "receita"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.type === "receita" ? "Receita" : "Despesa"}
                    </span>
                    <span className="font-medium">{item.category}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Previsto: </span>
                      <span className="font-medium">{item.planned.toFixed(2)} €</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Real: </span>
                      <span className="font-medium">{item.actual.toFixed(2)} €</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
