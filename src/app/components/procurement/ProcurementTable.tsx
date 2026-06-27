import React from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ESTADO_COLORS, money, ProcurementItem } from "./procurement.types";

interface ProcurementTableProps {
  items: ProcurementItem[];
  loading: boolean;
  expandedId: number | null;
  setExpandedId: React.Dispatch<React.SetStateAction<number | null>>;
  onEdit: (item: ProcurementItem) => void;
  onDelete: (id: number) => void;
  onOpenCreate: () => void;
}

export function ProcurementTable({
  items,
  loading,
  expandedId,
  setExpandedId,
  onEdit,
  onDelete,
  onOpenCreate,
}: ProcurementTableProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-semibold text-gray-900">Contratos</h2>
        <Badge variant="outline">{items.length}</Badge>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">A carregar...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Ainda não existem contratos.{" "}
          <button
            onClick={onOpenCreate}
            className="text-blue-600 hover:underline"
          >
            Criar o primeiro
          </button>
          .
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm text-left">
            <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 pr-3 w-6"></th>
                <th className="py-2 pr-3">Título</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3 text-right">Valor Est.</th>
                <th className="py-2 pr-3">Fornecedor</th>
                <th className="py-2 pr-3">Adj.</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 pr-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 pr-3 font-medium text-gray-900 max-w-[200px] truncate">
                        {item.titulo}
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{item.tipo || "—"}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            ESTADO_COLORS[item.estado] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right text-gray-700 font-medium">
                        {item.valor_estimado != null ? money(item.valor_estimado, item.moeda) : "—"}
                      </td>
                      <td className="py-3 pr-3 text-gray-600 max-w-[140px] truncate">
                        {item.fornecedor || "—"}
                      </td>
                      <td className="py-3 pr-3 text-gray-500 text-xs">
                        {item.data_adjudicacao || "—"}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            title="Editar"
                          >
                            <Pencil className="size-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void onDelete(item.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              {item.descricao && (
                                <div className="mb-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase">Descrição</span>
                                  <p className="text-gray-700 mt-0.5">{item.descricao}</p>
                                </div>
                              )}
                              {item.notas && (
                                <div className="mb-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase">Notas</span>
                                  <p className="text-gray-700 mt-0.5">{item.notas}</p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5 text-gray-600">
                              {item.numero_referencia && (
                                <p>
                                  <span className="font-medium">Referência:</span> {item.numero_referencia}
                                </p>
                              )}
                              {item.data_lancamento && (
                                <p>
                                  <span className="font-medium">Lançamento:</span> {item.data_lancamento}
                                </p>
                              )}
                              {item.valor_real != null && (
                                <p>
                                  <span className="font-medium">Valor real:</span>{" "}
                                  {money(item.valor_real, item.moeda)}
                                </p>
                              )}
                              {item.moeda && item.moeda !== "EUR" && (
                                <p>
                                  <span className="font-medium">Moeda:</span> {item.moeda}
                                </p>
                              )}
                              {item.criado_por && (
                                <p className="text-xs text-gray-400">
                                  Criado por {item.criado_por}
                                  {item.criado_em && ` em ${new Date(item.criado_em).toLocaleDateString("pt-PT")}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
