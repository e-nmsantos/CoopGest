import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { CategorySummary, money, pct } from "./finance.types";

interface CategorySummaryListProps {
  items: CategorySummary[];
  loading: boolean;
}

export function CategorySummaryList({ items, loading }: CategorySummaryListProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Execucao por categoria</h2>
        <Badge variant="outline">{items.length} categorias de despesa</Badge>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">A carregar...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Sem rubricas ou movimentos de despesa.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
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
  );
}
