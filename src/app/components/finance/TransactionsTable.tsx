import { FileText, Pencil, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FinanceTransaction, money } from "./finance.types";
import { DEFAULT_CURRENCY } from "../../lib/currency";

interface TransactionsTableProps {
  transactions: FinanceTransaction[];
  onEdit: (t: FinanceTransaction) => void;
  onDelete: (id: number) => void;
}

export function TransactionsTable({ transactions, onEdit, onDelete }: TransactionsTableProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Movimentos recentes</h2>
        <Badge variant="outline">{transactions.length}</Badge>
      </div>
      {transactions.length === 0 ? (
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
              {transactions.map((transaction) => (
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
                    {transaction.tipo === "Receita" ? "+" : "-"}{
                      transaction.moeda && transaction.moeda !== DEFAULT_CURRENCY && transaction.taxa_cambio
                        ? money(transaction.valor * transaction.taxa_cambio)
                        : money(transaction.valor)
                    }
                    {transaction.moeda && transaction.moeda !== DEFAULT_CURRENCY && (
                      <div className="text-xs text-gray-400 font-normal">
                        {Number(transaction.valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 })} {transaction.moeda}
                        {transaction.taxa_cambio && transaction.taxa_cambio !== 1
                          ? ` (×${transaction.taxa_cambio})`
                          : ""}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(transaction)} title="Editar movimento">
                      <Pencil className="size-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(transaction.id)}>
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
  );
}
