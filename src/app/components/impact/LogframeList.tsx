import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { HistoryChart } from "./HistoryChart";
import { AddEvidenciaForm } from "./AddEvidenciaForm";
import {
  type LogframeItem,
  type LogframeHistory,
  type Evidencia,
  NIVEIS,
  NIVEL_COLORS,
  ESTADO_COLORS,
} from "./impactTypes";

interface MedicaoFormState {
  indicadorId: number | null;
  valor: string;
  notas: string;
}

interface LogframeListProps {
  logframe: LogframeItem[];
  logframeHistories: Record<number, LogframeHistory[]>;
  evidencias: Record<number, Evidencia[]>;
  expandedIndicator: number | null;
  medicaoForm: MedicaoFormState;
  setMedicaoForm: React.Dispatch<React.SetStateAction<MedicaoFormState>>;
  onExpandIndicator: (id: number) => void;
  onEdit: (item: LogframeItem) => void;
  onDelete: (id: number) => void;
  onRegistarMedicao: (indicadorId: number) => void;
  onDeleteEvidencia: (evidenciaId: number, indicadorId: number) => void;
  onEvidenciaAdded: (indicadorId: number) => void;
}

export function LogframeList({
  logframe,
  logframeHistories,
  evidencias,
  expandedIndicator,
  medicaoForm,
  setMedicaoForm,
  onExpandIndicator,
  onEdit,
  onDelete,
  onRegistarMedicao,
  onDeleteEvidencia,
  onEvidenciaAdded,
}: LogframeListProps) {
  const logframeByNivel = NIVEIS.reduce<Record<string, LogframeItem[]>>((acc, n) => {
    acc[n] = logframe.filter((i) => i.nivel === n);
    return acc;
  }, {});

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quadro Lógico</h2>
      {logframe.length === 0 ? (
        <p className="text-sm text-gray-500">Ainda não existem indicadores no quadro lógico.</p>
      ) : (
        <div className="space-y-6">
          {NIVEIS.map((nivel) => {
            const items = logframeByNivel[nivel];
            if (!items || items.length === 0) return null;
            return (
              <div key={nivel}>
                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-3 ${NIVEL_COLORS[nivel] || "bg-gray-100 text-gray-700"}`}>
                  {nivel}
                </div>
                <div className="space-y-3">
                  {items.map((item) => {
                    const progress = item.meta > 0 ? Math.min(100, Math.round(((item.valor_atual - item.baseline) / (item.meta - item.baseline || 1)) * 100)) : 0;
                    const isExpanded = expandedIndicator === item.id;
                    const hist = logframeHistories[item.id] || [];
                    const evs = evidencias[item.id] || [];
                    const isOverdue = item.proxima_revisao && new Date(item.proxima_revisao) < new Date();

                    return (
                      <div key={item.id} className="rounded-md border bg-white">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.resultado}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{item.indicador}</p>
                              <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                                <span className={`px-1.5 py-0.5 rounded ${ESTADO_COLORS[item.estado] || "bg-gray-50 text-gray-600"}`}>
                                  {item.estado}
                                </span>
                                {item.fonte_verificacao && <span>Fonte: {item.fonte_verificacao}</span>}
                                {item.responsavel_medicao && <span>Resp.: {item.responsavel_medicao}</span>}
                                {item.frequencia_medicao && <span>Freq.: {item.frequencia_medicao}</span>}
                                {item.proxima_revisao && (
                                  <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                    {isOverdue ? "⚠ " : ""}Revisão: {item.proxima_revisao}
                                  </span>
                                )}
                              </div>
                              {item.pressupostos && (
                                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5">
                                  <span className="font-medium">Pressupostos:</span> {item.pressupostos}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button type="button" variant="outline" size="sm" onClick={() => onExpandIndicator(item.id)}>
                                {isExpanded ? "Fechar" : "Detalhe"}
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>Editar</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => onDelete(item.id)}>Eliminar</Button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 grid grid-cols-[80px_80px_80px_minmax(0,1fr)] gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Baseline</p>
                              <p className="font-semibold">{item.baseline} {item.unidade}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Atual</p>
                              <p className="font-semibold text-blue-700">{item.valor_atual} {item.unidade}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Meta</p>
                              <p className="font-semibold text-green-700">{item.meta} {item.unidade}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Progresso ({progress}%)</p>
                              <div className="h-2 rounded-full bg-gray-100">
                                <div
                                  className={`h-2 rounded-full ${progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-orange-400"}`}
                                  style={{ width: `${Math.max(0, progress)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded panel */}
                        {isExpanded && (
                          <div className="border-t bg-gray-50 p-4 space-y-4">
                            {/* Quick measurement */}
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-2">Registar medição</p>
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <Label className="text-xs">Novo valor ({item.unidade || "—"})</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-sm"
                                    value={medicaoForm.indicadorId === item.id ? medicaoForm.valor : ""}
                                    onFocus={() => setMedicaoForm((p) => ({ ...p, indicadorId: item.id }))}
                                    onChange={(e) => setMedicaoForm((p) => ({ ...p, indicadorId: item.id, valor: e.target.value }))}
                                    placeholder="Ex: 65"
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label className="text-xs">Notas</Label>
                                  <Input
                                    className="h-8 text-sm"
                                    value={medicaoForm.indicadorId === item.id ? medicaoForm.notas : ""}
                                    onFocus={() => setMedicaoForm((p) => ({ ...p, indicadorId: item.id }))}
                                    onChange={(e) => setMedicaoForm((p) => ({ ...p, indicadorId: item.id, notas: e.target.value }))}
                                    placeholder="Contexto opcional"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => onRegistarMedicao(item.id)}
                                  disabled={medicaoForm.indicadorId !== item.id || !medicaoForm.valor}
                                >
                                  Registar
                                </Button>
                              </div>
                            </div>

                            {/* Historical chart */}
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-1">Evolução histórica</p>
                              <HistoryChart
                                data={hist}
                                meta={item.meta}
                                baseline={item.baseline}
                                unidade={item.unidade || ""}
                              />
                              {hist.length > 0 && (
                                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                  {[...hist].reverse().map((h) => (
                                    <div key={h.id} className="flex items-center gap-2 text-xs text-gray-600">
                                      <span className="text-gray-400">{new Date(h.criado_em).toLocaleDateString("pt-PT")}</span>
                                      <span className="font-medium">{h.valor} {item.unidade}</span>
                                      {h.notas && <span className="text-gray-400">— {h.notas}</span>}
                                      {h.registado_por && <span className="text-gray-400">por {h.registado_por}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Evidence */}
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-2">Evidências</p>
                              {evs.length > 0 ? (
                                <div className="space-y-1 mb-2">
                                  {evs.map((ev) => (
                                    <div key={ev.id} className="flex items-center justify-between gap-2 text-xs bg-white border rounded px-2 py-1">
                                      <div>
                                        <span className="font-medium">{ev.descricao}</span>
                                        {ev.documento_nome && <span className="text-gray-400 ml-1">({ev.documento_nome})</span>}
                                        {ev.url_externa && <a href={ev.url_externa} target="_blank" rel="noreferrer" className="text-blue-600 ml-1">link</a>}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1 text-red-500 hover:text-red-700"
                                        onClick={() => onDeleteEvidencia(ev.id, item.id)}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 mb-2">Sem evidências registadas.</p>
                              )}
                              <AddEvidenciaForm indicadorId={item.id} onAdded={() => onEvidenciaAdded(item.id)} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
